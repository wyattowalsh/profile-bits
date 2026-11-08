import { describe, expect, it, vi } from "vitest";
import {
  assertPinnedChesscomUrl,
  ChesscomClientError,
  createChesscomClient,
} from "./client.js";

describe("chesscom SSRF gate", () => {
  it("refuses non-api.chess.com archive URLs without fetching", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.endsWith("/pub/player/hikaru")) {
        return new Response(JSON.stringify({ username: "hikaru" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/stats")) {
        return new Response(JSON.stringify({ chess_blitz: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/to-move")) {
        return new Response(JSON.stringify({ games: [] }), { status: 200 });
      }
      if (url.endsWith("/archives")) {
        return new Response(
          JSON.stringify({ archives: ["https://evil.example/games"] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("nope", { status: 500 });
    });
    const client = createChesscomClient({ fetch: fetchMock });
    await expect(client.fetchDump("hikaru")).rejects.toBeInstanceOf(
      ChesscomClientError,
    );
    const urls = fetchMock.mock.calls.map((call) =>
      typeof call[0] === "string" ? call[0] : String(call[0]),
    );
    expect(urls.some((url) => url.includes("evil.example"))).toBe(false);
  });

  it("pins https api.chess.com /pub paths only", () => {
    expect(
      assertPinnedChesscomUrl("https://api.chess.com/pub/player/hikaru").href,
    ).toContain("/pub/player/hikaru");
    expect(() => assertPinnedChesscomUrl("http://api.chess.com/pub/x")).toThrow(
      /https only/,
    );
    expect(() =>
      assertPinnedChesscomUrl("https://evil.example/pub/player/hikaru"),
    ).toThrow(/pinned host/);
    expect(() =>
      assertPinnedChesscomUrl("https://user:pass@api.chess.com/pub/x"),
    ).toThrow(/userinfo/);
  });
});
