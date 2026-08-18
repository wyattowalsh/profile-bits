import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStaticFixtures, loadPreviewFixtures } from "./fixtures";

const t110 = vi.hoisted(() => ({
  loadPreviewFixtures: vi.fn(
    async (): Promise<unknown> => ({
      wrapped: "t110-static",
    }),
  ),
  getStaticFixtures: vi.fn((): unknown => ({ wrapped: "t110-static" })),
}));

vi.mock("@profile-bits/integrations", () => ({
  loadPreviewFixtures: t110.loadPreviewFixtures,
  getStaticFixtures: t110.getStaticFixtures,
}));

describe("preview fixtures wrap T110 static", () => {
  beforeEach(() => {
    t110.loadPreviewFixtures.mockReset();
    t110.getStaticFixtures.mockReset();
    t110.loadPreviewFixtures.mockResolvedValue({ wrapped: "t110-static" });
    t110.getStaticFixtures.mockReturnValue({ wrapped: "t110-static" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the T110 static payload (wrap, not a second JSON pack)", async () => {
    const payload = { source: "t110", integration: "static" };
    t110.loadPreviewFixtures.mockResolvedValue(payload);

    await expect(loadPreviewFixtures()).resolves.toBe(payload);
    expect(t110.loadPreviewFixtures).toHaveBeenCalledOnce();
    expect(t110.loadPreviewFixtures).toHaveBeenCalledWith();
    expect(t110.getStaticFixtures).not.toHaveBeenCalled();
  });

  it("re-exports T110 getStaticFixtures from the same static pack", async () => {
    const payload = { source: "t110" };
    t110.getStaticFixtures.mockReturnValue(payload);

    await expect(getStaticFixtures()).resolves.toBe(payload);
    expect(t110.getStaticFixtures).toHaveBeenCalledOnce();
    expect(t110.getStaticFixtures).toHaveBeenCalledWith();
    expect(t110.loadPreviewFixtures).not.toHaveBeenCalled();
  });

  it("never sends unauthenticated GitHub requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await loadPreviewFixtures();
    await getStaticFixtures();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dynamic-imports T110 static and does not embed fixture JSON or GitHub URLs", async () => {
    const source = await readFile(
      new URL("./fixtures.ts", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(
      /import\(\s*["']@profile-bits\/integrations["']\s*\)/,
    );
    expect(source).not.toContain("api.github.com");
    expect(source).not.toContain("/users/");
    expect(source).not.toContain("github_token");
    expect(source).not.toContain("?token=");
    expect(source).not.toContain("/api/preview");
    expect(source).not.toContain("application/zip");
    expect(source).not.toMatch(/https?:\/\//);
  });
});
