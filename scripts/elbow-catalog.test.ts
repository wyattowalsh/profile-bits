import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/archive/2026-11-08-elbow-catalog");
const TYPES = join(ROOT, "packages/core/src/types.ts");

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

const ELBOW_PLUGINS = ["spotify", "leetcode", "chess", "steam"] as const;
const ELBOW_INTEGRATIONS = [
  "spotify",
  "leetcode",
  "chesscom",
  "lichess",
  "steam",
] as const;
const WAVE3_WIDGETS = [
  "top-repos",
  "contributions",
  "editors",
  "projects",
  "os",
  "langs",
  "latest",
  "now-playing",
  "top",
  "solved",
  "heatmap",
  "ratings",
  "game",
  "player",
  "recent",
] as const;

describe("OpenSpec change elbow-catalog", () => {
  it("archives elbow-catalog under 2026-11-08 and does not mint a docs id", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(existsSync(join(ROOT, "openspec/changes/elbow-catalog"))).toBe(
      false,
    );
    expect(
      existsSync(
        join(
          ROOT,
          "openspec/changes/archive/2026-11-08-docs-full-catalog-playground",
        ),
      ),
    ).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/elbow-catalog"))).toBe(false);
  });

  it("names elbow packs, collision-free widgets, and chesscom/lichess", () => {
    const proposal = readChange("proposal.md");
    const widgets = readChange("specs/widget-contract/spec.md");
    const plugins = readChange("specs/plugin-contract/spec.md");
    const integrations = readChange("specs/integration-contract/spec.md");

    for (const id of ELBOW_PLUGINS) {
      expect(proposal).toContain(id);
      expect(plugins).toContain(id);
    }
    for (const id of ELBOW_INTEGRATIONS) {
      expect(integrations).toContain(id);
    }
    expect(integrations).toContain("MUST NOT contain `chess`");
    for (const id of WAVE3_WIDGETS) {
      expect(widgets).toContain(`\`${id}\``);
    }
    expect(widgets).toContain("WakaTime languages slice MUST use `langs`");
    expect(widgets).toContain(
      "github contribution heatmap MUST use `contributions`",
    );
    expect(widgets).toContain("MUST NOT be `stats`");
  });

  it("locks types.ts as the single FIRST_PARTY writer", () => {
    const authorPlugin = readChange("specs/author-plugin/spec.md");
    const design = readChange("design.md");
    const types = readFileSync(TYPES, "utf8");

    expect(authorPlugin).toContain(
      "MUST NOT edit `packages/core/src/types.ts`",
    );
    expect(authorPlugin).toContain("MUST NOT append `FIRST_PARTY_*`");
    expect(authorPlugin).toContain(
      "MUST NOT run `author-integration add` for those ids",
    );
    expect(design).toContain("W3-T-01");
    expect(design).toContain("docs-full-catalog-playground");
    expect(types).toContain('"spotify"');
    expect(types).toContain('"chesscom"');
    expect(types).toContain('"langs"');
    expect(types).toContain('"contributions"');
    expect(types).not.toMatch(/plugin_spotify:/);
    expect(types).not.toMatch(/plugin_leetcode:/);
  });

  it("forbids flatten, extra pack bools, and embed-API preview", () => {
    const proposal = readChange("proposal.md");
    const plugins = readChange("specs/plugin-contract/spec.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");

    for (const source of [proposal, plugins, authorPlugin]) {
      expect(source).toContain("plugin_<plugin>_<widget>_<option>");
    }
    expect(plugins).toContain("plugin_spotify");
    expect(authorPlugin).toContain("POST /api/preview");
    expect(authorPlugin).toContain("not a public embed API");
  });
});
