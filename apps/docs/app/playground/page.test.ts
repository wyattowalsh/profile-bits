import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import PlaygroundPage from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("GET /playground", () => {
  beforeEach(() => {
    mocks.redirect.mockClear();
  });

  it("is a server page that redirects to /playground/github only", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain('from "next/navigation"');
    expect(source).toMatch(/redirect\(\s*"\/playground\/github"\s*\)/);
    expect(source).not.toContain("/playground/wakatime");
    expect(source).not.toContain("/playground/rss");
    expect(source).not.toContain("/playground/http");
    expect(source).not.toContain("/playground/generate");
    expect(source).not.toContain("/generate/");
  });

  it("calls redirect('/playground/github')", () => {
    expect(() => PlaygroundPage()).toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith("/playground/github");
  });
});
