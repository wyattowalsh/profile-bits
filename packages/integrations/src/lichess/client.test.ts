import { describe, expect, it, vi } from "vitest";
import { assertLichessActionToken } from "./auth.js";
import {
  assertNotRestLanguages,
  createLichessClient,
  getSharedLichessClient,
  LICHESS_USER_AGENT,
  LichessClientError,
  lichessUserUrl,
} from "./client.js";
import { loadFixture, loadFixtureText } from "./loadFixture.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

function headerOf(
  fetchMock: ReturnType<typeof vi.fn>,
  name: string,
  call = 0,
): string | undefined {
  const init = fetchMock.mock.calls[call]?.[1] as RequestInit | undefined;
  const headers = init?.headers as Record<string, string> | undefined;
  return headers?.[name];
}

function fixtureRouter(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url.includes("/api/games/user/DrNykterstein")) {
      return new Response(loadFixtureText("recent-games.ndjson"), {
        status: 200,
        headers: { "Content-Type": "application/x-ndjson" },
      });
    }
    if (url.endsWith("/api/user/DrNykterstein/current-game")) {
      return jsonResponse(loadFixture("current-game.json"));
    }
    if (url.endsWith("/api/user/DrNykterstein")) {
      return jsonResponse(loadFixture("user.json"));
    }
    return jsonResponse({ error: "not found" }, 404);
  });
}

describe("lichess client (mocked HTTP)", () => {
  it("asserts tokens as auth none", () => {
    expect(() => assertLichessActionToken(undefined)).not.toThrow();
    expect(() => assertLichessActionToken("")).not.toThrow();
    expect(() => assertLichessActionToken("   ")).not.toThrow();
  });

  it("shares one client instance per run", () => {
    const run = {};
    const fetchMock = fixtureRouter();
    expect(getSharedLichessClient(run, { fetch: fetchMock })).toBe(
      getSharedLichessClient(run, { fetch: fetchMock }),
    );
  });

  it("sends User-Agent and omits Authorization", async () => {
    const fetchMock = fixtureRouter();
    await createLichessClient({ fetch: fetchMock }).fetchDump("DrNykterstein");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    for (let index = 0; index < fetchMock.mock.calls.length; index += 1) {
      expect(headerOf(fetchMock, "User-Agent", index)).toBe(LICHESS_USER_AGENT);
      expect(headerOf(fetchMock, "Authorization", index)).toBeUndefined();
    }
  });

  it("treats current-game 404 as optional", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes("/api/games/user/DrNykterstein")) {
        return new Response("", { status: 404 });
      }
      if (url.endsWith("/current-game")) {
        return jsonResponse({ error: "not found" }, 404);
      }
      if (url.endsWith("/api/user/DrNykterstein")) {
        return jsonResponse(loadFixture("user.json"));
      }
      return jsonResponse({}, 404);
    });
    const dump = await createLichessClient({ fetch: fetchMock }).fetchDump(
      "DrNykterstein",
    );
    expect(dump.user.username).toBe("DrNykterstein");
    expect(dump.current).toEqual({});
    expect(dump.recent.games).toEqual([]);
  });

  it("does not send HTTP for invalid usernames", async () => {
    const fetchMock = vi.fn();
    const client = createLichessClient({ fetch: fetchMock });
    await expect(
      client.fetchDump("https://evil.example"),
    ).rejects.toBeInstanceOf(LichessClientError);
    await expect(client.fetchDump("a/b")).rejects.toBeInstanceOf(
      LichessClientError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails the widget on unknown user 404", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: "not found" }, 404),
    );
    await expect(
      createLichessClient({ fetch: fetchMock }).fetchDump("nobody"),
    ).rejects.toMatchObject({
      name: "LichessClientError",
      outcome: "fail_widget",
      status: 404,
    });
  });

  it("never calls REST /languages", () => {
    expect(() =>
      assertNotRestLanguages(
        "https://api.github.com/repos/octocat/hello/languages",
      ),
    ).toThrow(/REST \/languages/);
    expect(lichessUserUrl("DrNykterstein")).toContain(
      "/api/user/DrNykterstein",
    );
  });
});
