import { describe, expect, it, vi } from "vitest";
import { assertChesscomActionToken } from "./auth.js";
import {
  assertNotRestLanguages,
  CHESSCOM_USER_AGENT,
  ChesscomClient,
  ChesscomClientError,
  chesscomPlayerUrl,
  createChesscomClient,
  getSharedChesscomClient,
  restCacheKey,
} from "./client.js";
import { loadFixture } from "./loadFixture.js";

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
    if (url.endsWith("/pub/player/hikaru")) {
      return jsonResponse(loadFixture("player.json"));
    }
    if (url.endsWith("/pub/player/hikaru/stats")) {
      return jsonResponse(loadFixture("stats.json"));
    }
    if (url.endsWith("/pub/player/hikaru/games/to-move")) {
      return jsonResponse(loadFixture("games-to-move.json"));
    }
    if (url.endsWith("/pub/player/hikaru/games/archives")) {
      return jsonResponse(loadFixture("archives.json"));
    }
    if (url.endsWith("/pub/player/hikaru/games/2026/08")) {
      return jsonResponse(loadFixture("games-month.json"));
    }
    return jsonResponse({ message: "not found" }, 404);
  });
}

describe("chesscom client (mocked HTTP)", () => {
  it("asserts tokens as auth none", () => {
    expect(() => assertChesscomActionToken(undefined)).not.toThrow();
    expect(() => assertChesscomActionToken("")).not.toThrow();
    expect(() => assertChesscomActionToken("   ")).not.toThrow();
  });

  it("shares one client instance per run", () => {
    const run = {};
    const fetchMock = fixtureRouter();
    const first = getSharedChesscomClient(run, { fetch: fetchMock });
    const second = getSharedChesscomClient(run, { fetch: fetchMock });
    expect(first).toBe(second);
  });

  it("sends identifying User-Agent and omits Authorization", async () => {
    const fetchMock = fixtureRouter();
    const client = createChesscomClient({ fetch: fetchMock });
    await client.fetchDump("hikaru");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    for (let index = 0; index < fetchMock.mock.calls.length; index += 1) {
      expect(headerOf(fetchMock, "User-Agent", index)).toBe(
        CHESSCOM_USER_AGENT,
      );
      expect(headerOf(fetchMock, "Authorization", index)).toBeUndefined();
    }
  });

  it("keys REST cache on method url params and does not refetch", async () => {
    const fetchMock = fixtureRouter();
    const client = new ChesscomClient({ fetch: fetchMock });
    await client.fetchDump("hikaru");
    const firstCalls = fetchMock.mock.calls.length;
    await client.fetchDump("hikaru");
    expect(fetchMock.mock.calls.length).toBe(firstCalls);
    expect(
      restCacheKey({
        method: "GET",
        url: chesscomPlayerUrl("hikaru"),
        params: {},
        auth: "none",
      }),
    ).toContain("hikaru");
  });

  it("never calls REST /languages", () => {
    expect(() =>
      assertNotRestLanguages(
        "https://api.github.com/repos/octocat/hello/languages",
      ),
    ).toThrow(/REST \/languages/);
  });

  it("does not send HTTP for invalid usernames", async () => {
    const fetchMock = vi.fn();
    const client = createChesscomClient({ fetch: fetchMock });
    for (const user of [
      "",
      "   ",
      "https://evil.example/pwn",
      "hikaru@evil.example",
      "../admin",
      "a/b",
      "name:port",
    ]) {
      await expect(client.fetchDump(user)).rejects.toBeInstanceOf(
        ChesscomClientError,
      );
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails the widget on unknown player 404", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ message: "not found" }, 404),
    );
    const client = createChesscomClient({ fetch: fetchMock });
    await expect(client.fetchDump("nobody")).rejects.toMatchObject({
      name: "ChesscomClientError",
      outcome: "fail_widget",
      status: 404,
    });
  });
});
