import { describe, expect, it, vi } from "vitest";
import {
  assertPinnedLichessUrl,
  createLichessClient,
  LichessClientError,
} from "./client.js";

describe("lichess SSRF gate", () => {
  it("does not fetch when username looks like a URL", async () => {
    const fetchMock = vi.fn();
    await expect(
      createLichessClient({ fetch: fetchMock }).fetchDump(
        "https://evil.example/pwn",
      ),
    ).rejects.toBeInstanceOf(LichessClientError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pins https lichess.org /api paths only", () => {
    expect(
      assertPinnedLichessUrl("https://lichess.org/api/user/alice").href,
    ).toContain("/api/user/alice");
    expect(() =>
      assertPinnedLichessUrl("http://lichess.org/api/user/alice"),
    ).toThrow(/https only/);
    expect(() =>
      assertPinnedLichessUrl("https://evil.example/api/user/alice"),
    ).toThrow(/pinned host/);
    expect(() =>
      assertPinnedLichessUrl("https://user:pass@lichess.org/api/user/alice"),
    ).toThrow(/userinfo/);
  });
});
