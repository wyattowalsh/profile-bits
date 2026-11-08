import { describe, expect, it, vi } from "vitest";
import { loadChessDump } from "./load.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("loadChessDump", () => {
  it("uses chess.com when the player exists", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("api.chess.com") && url.endsWith("/stats")) {
        return jsonResponse(200, {
          chess_blitz: { last: { rating: 2800 } },
        });
      }
      if (url.includes("api.chess.com/pub/player/")) {
        return jsonResponse(200, { username: "hikaru" });
      }
      return jsonResponse(404, {});
    });
    const loaded = await loadChessDump("hikaru", { fetch: fetchImpl });
    expect(loaded.source).toBe("chesscom");
    expect(
      fetchImpl.mock.calls.some((call) =>
        String(call[0]).includes("lichess.org"),
      ),
    ).toBe(false);
  });

  it("falls back to lichess only on chess.com 404", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("api.chess.com")) {
        return jsonResponse(404, {});
      }
      if (url.includes("lichess.org/api/user/")) {
        return jsonResponse(200, {
          id: "drnykterstein",
          perfs: { rapid: { rating: 2700 } },
        });
      }
      if (url.includes("lichess.org/api/games/")) {
        return new Response("", {
          status: 200,
          headers: { "content-type": "application/x-ndjson" },
        });
      }
      return jsonResponse(404, {});
    });
    const loaded = await loadChessDump("DrNykterstein", { fetch: fetchImpl });
    expect(loaded.source).toBe("lichess");
  });

  it("does not call lichess on a non-404 chess.com error", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("api.chess.com")) {
        return jsonResponse(500, {});
      }
      return jsonResponse(200, { id: "x" });
    });
    await expect(loadChessDump("hikaru", { fetch: fetchImpl })).rejects.toThrow(
      /chesscom HTTP 500/,
    );
    expect(
      fetchImpl.mock.calls.some((call) =>
        String(call[0]).includes("lichess.org"),
      ),
    ).toBe(false);
  });
});
