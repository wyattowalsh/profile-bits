import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertSpotifyActionToken,
  SPOTIFY_TOKEN_URL,
  spotifyClientBasicAuthorization,
} from "./auth.js";
import { spotifyRestCacheKey } from "./cache.js";
import {
  assertNotRestLanguages,
  createSpotifyClient,
  getSharedSpotifyClient,
  SPOTIFY_CURRENTLY_PLAYING_URL,
  SPOTIFY_RECENTLY_PLAYED_URL,
  SPOTIFY_TOP_TRACKS_URL,
  SpotifyClientError,
} from "./client.js";
import { loadFixture } from "./loadFixture.js";

const REFRESH = "spotify-refresh-do-not-log";
const ACCESS = "spotify-access-do-not-log";
const CLIENT_ID = "spotify-client-id";
const CLIENT_SECRET = "spotify-client-secret-value";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

function router(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(requestUrl(input));
    if (url.href === SPOTIFY_TOKEN_URL) {
      return jsonResponse({ access_token: ACCESS, token_type: "Bearer" });
    }
    if (url.pathname.endsWith("/currently-playing")) {
      return jsonResponse(loadFixture("currently-playing.json"));
    }
    if (url.pathname.endsWith("/recently-played")) {
      return jsonResponse(loadFixture("recently-played.json"));
    }
    if (url.pathname.endsWith("/top/tracks")) {
      return jsonResponse(loadFixture("top-tracks.json"));
    }
    throw new Error(`unmocked ${url.href}`);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("spotify client (mocked HTTP)", () => {
  it("fail_jobs missing refresh token or client credentials before fetch", () => {
    const fetchMock = vi.fn();
    expect(() => assertSpotifyActionToken("")).toThrow(
      /spotify_token|fail_job/,
    );
    expect(() =>
      createSpotifyClient({
        token: "",
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        fetch: fetchMock,
      }),
    ).toThrow(/spotify_token/);
    expect(() =>
      createSpotifyClient({
        token: REFRESH,
        clientId: "",
        clientSecret: CLIENT_SECRET,
        fetch: fetchMock,
      }),
    ).toThrow(/SPOTIFY_CLIENT_ID/);
    expect(() =>
      createSpotifyClient({
        token: REFRESH,
        clientId: CLIENT_ID,
        clientSecret: "  ",
        fetch: fetchMock,
      }),
    ).toThrow(/SPOTIFY_CLIENT_SECRET/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exchanges refresh_token then sends Bearer access on resource GETs", async () => {
    const fetchMock = router();
    const client = createSpotifyClient({
      token: REFRESH,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      fetch: fetchMock,
    });
    const dump = await client.fetchDump();
    const tokenCall = fetchMock.mock.calls.find(
      (call) => requestUrl(call[0] as RequestInfo | URL) === SPOTIFY_TOKEN_URL,
    );
    expect(tokenCall).toBeDefined();
    const tokenInit = tokenCall?.[1] as RequestInit;
    const tokenHeaders = tokenInit.headers as Record<string, string>;
    expect(tokenInit.method).toBe("POST");
    expect(String(tokenInit.body)).toContain("grant_type=refresh_token");
    expect(String(tokenInit.body)).toContain(REFRESH);
    expect(tokenHeaders.Authorization).toEqual(
      spotifyClientBasicAuthorization(CLIENT_ID, CLIENT_SECRET).Authorization,
    );
    expect(tokenHeaders.Authorization).not.toMatch(/^Bearer /);

    const resourceCalls = fetchMock.mock.calls.filter(
      (call) => requestUrl(call[0] as RequestInfo | URL) !== SPOTIFY_TOKEN_URL,
    );
    expect(resourceCalls.length).toBeGreaterThanOrEqual(3);
    for (const call of resourceCalls) {
      const init = call[1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Bearer ${ACCESS}`);
      expect(headers.Authorization).not.toContain(REFRESH);
      expect(requestUrl(call[0] as RequestInfo | URL)).not.toMatch(
        /[?&](key|api_key)=/,
      );
    }
    expect(dump.currently_playing).toEqual(
      expect.objectContaining({ is_playing: true }),
    );
    expect(dump.recently_played).toEqual(
      expect.objectContaining({ extra_recent_flag: true }),
    );
    expect(dump.top_tracks).toEqual(
      expect.objectContaining({ extra_top_flag: true }),
    );
  });

  it("treats 204 currently-playing as null and still dumps recently-played", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(requestUrl(input));
      if (url.href === SPOTIFY_TOKEN_URL) {
        return jsonResponse({ access_token: ACCESS });
      }
      if (url.pathname.endsWith("/currently-playing")) {
        return emptyResponse(204);
      }
      if (url.pathname.endsWith("/recently-played")) {
        return jsonResponse(loadFixture("recently-played.json"));
      }
      if (url.pathname.endsWith("/top/tracks")) {
        return jsonResponse(loadFixture("top-tracks.json"));
      }
      throw new Error(url.href);
    });
    const client = createSpotifyClient({
      token: REFRESH,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      fetch: fetchMock,
    });
    const dump = await client.fetchDump();
    expect(dump.currently_playing).toBeNull();
    expect(dump.recently_played).toEqual(
      expect.objectContaining({ extra_recent_flag: true }),
    );
  });

  it("shares one client instance per run", () => {
    const run = {};
    const fetchMock = router();
    const context = {
      token: REFRESH,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      fetch: fetchMock,
    };
    expect(getSharedSpotifyClient(run, context)).toBe(
      getSharedSpotifyClient(run, context),
    );
  });

  it("keys REST cache on (method, url, params, auth bearer) without secrets", async () => {
    const fetchMock = router();
    const client = createSpotifyClient({
      token: REFRESH,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      fetch: fetchMock,
    });
    await client.fetchDump();
    await client.fetchDump();
    const topCalls = fetchMock.mock.calls.filter((call) =>
      requestUrl(call[0] as RequestInfo | URL).startsWith(
        SPOTIFY_TOP_TRACKS_URL,
      ),
    );
    expect(topCalls).toHaveLength(1);
    const key = spotifyRestCacheKey({
      method: "GET",
      url: SPOTIFY_TOP_TRACKS_URL,
      params: { limit: "50" },
    });
    expect(key).toContain("bearer");
    expect(key).not.toContain(REFRESH);
    expect(key).not.toContain(ACCESS);
    expect(key).not.toContain(CLIENT_SECRET);
  });

  it("never logs the refresh token on token failure", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (requestUrl(input) === SPOTIFY_TOKEN_URL) {
        return jsonResponse({ error: "invalid_grant" }, 400);
      }
      throw new Error("resource must not run");
    });
    const client = createSpotifyClient({
      token: REFRESH,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      fetch: fetchMock,
    });
    await expect(client.fetchDump()).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(SpotifyClientError);
      if (!(error instanceof SpotifyClientError)) {
        return false;
      }
      expect(error.outcome).toBe("fail_job");
      expect(error.message).not.toContain(REFRESH);
      expect(error.message).not.toContain(CLIENT_SECRET);
      expect(error.message).not.toContain(ACCESS);
      return true;
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never calls REST /languages", () => {
    expect(() =>
      assertNotRestLanguages(
        "https://api.github.com/repos/octocat/hello/languages",
      ),
    ).toThrow(/REST \/languages/);
    expect(SPOTIFY_CURRENTLY_PLAYING_URL).not.toMatch(/\/languages(?:\?|$)/);
    expect(SPOTIFY_RECENTLY_PLAYED_URL).not.toMatch(/\/languages(?:\?|$)/);
    expect(SPOTIFY_TOP_TRACKS_URL).not.toMatch(/\/languages(?:\?|$)/);
  });
});
