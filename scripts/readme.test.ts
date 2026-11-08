import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const README_PATH = join(ROOT, "README.md");
const ASSETS_DIR = join(ROOT, ".github/assets");

const WIDGET_STILLS = [
  "github-demo",
  "github-stats",
  "github-languages",
  "github-repo",
  "wakatime-coding",
  "rss-feed",
  "http-json",
  "http-chips",
] as const;

function readme(): string {
  return readFileSync(README_PATH, "utf8");
}

describe("root README", () => {
  it("pins wyattowalsh/profile-bits@v1 and never uses @main", () => {
    const body = readme();
    expect(body).toContain("wyattowalsh/profile-bits@v1");
    expect(body).toMatch(/uses:\s+wyattowalsh\/profile-bits@v1/);
    expect(body).not.toMatch(/uses:\s+\S+@main\b/);
    expect(body).not.toContain("profile-bits@main");
  });

  it("embeds stills from .github/assets and not docs/assets/readme/", () => {
    const body = readme();
    expect(body).not.toContain("docs/assets/readme");
    for (const id of WIDGET_STILLS) {
      expect(body).toContain(
        `<picture><source media="(prefers-color-scheme: light)" srcset=".github/assets/${id}-light.png"><img src=".github/assets/${id}.png"`,
      );
    }
  });

  it("keeps all eight widget dark/light stills on disk", () => {
    for (const id of WIDGET_STILLS) {
      expect(existsSync(join(ASSETS_DIR, `${id}.png`)), `${id}.png`).toBe(true);
      expect(
        existsSync(join(ASSETS_DIR, `${id}-light.png`)),
        `${id}-light.png`,
      ).toBe(true);
    }
  });

  it("documents output_pair: false as the selected flavor, not always-dark", () => {
    const body = readme();
    expect(body).toMatch(
      /With `output_pair: false` \(default\), `stats\.svg` is the \*\*selected flavor\*\*/,
    );
    expect(body).toMatch(/`false` writes the \*\*selected\*\* flavor only/);
    expect(body).not.toMatch(
      /With `output_pair: false` \(default\), `stats\.svg` is the \*\*dark\*\* card/,
    );
    expect(body).not.toMatch(/always-dark|always dark/i);
  });
});
