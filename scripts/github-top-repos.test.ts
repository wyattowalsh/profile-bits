import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/github-top-repos");
const WIDGET = join(ROOT, "packages/plugins/src/github/widgets/top-repos");
const PLUGIN = join(ROOT, "packages/plugins/src/github/plugin.ts");
const ACTION_YML = join(ROOT, "action.yml");

function read(path: string): string {
  expect(existsSync(path), path).toBe(true);
  return readFileSync(path, "utf8");
}

const READER_FILES = ["view-model.ts", "render.ts", "widget.tsx"] as const;

describe("OpenSpec change github-top-repos", () => {
  it("keeps the change in openspec/changes/ (not archived, not a new docs id)", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(
      existsSync(join(ROOT, "openspec/changes/docs-full-catalog-playground")),
    ).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/github-top-repos"))).toBe(
      false,
    );
    expect(
      existsSync(join(ROOT, "openspec/changes/archive/github-top-repos")),
    ).toBe(false);
  });

  it("completes existing widget id top-repos on pack github without a new plugin", () => {
    const proposal = read(join(CHANGE, "proposal.md"));
    const widgets = read(join(CHANGE, "specs/widget-contract/spec.md"));
    const plugin = read(PLUGIN);

    expect(proposal).toContain("Complete widget id `top-repos`");
    expect(proposal).toContain("Do **not** append `FIRST_PARTY_*`");
    expect(widgets).toContain(
      "Widget `top-repos` MUST use integration `github` only",
    );
    expect(widgets).toContain("MUST NOT become a pack default");
    expect(plugin).toContain('"top-repos"');
    expect(plugin).toContain('defaults: { widgets: ["stats", "languages"] }');
    expect(plugin).not.toContain("plugin_github_top_repos");
  });

  it("ranks the owner-crawl dump and forbids HTTP in the widget", () => {
    const widgets = read(join(CHANGE, "specs/widget-contract/spec.md"));
    const proposal = read(join(CHANGE, "proposal.md"));

    expect(widgets).toContain("owner-crawl");
    expect(widgets).toContain("stars descending");
    expect(widgets).toContain("forks descending");
    expect(widgets).toContain("widget-side");
    expect(widgets).toContain("MUST NOT call `fetch`");
    expect(widgets).toContain("/repos/{owner}/{repo}/languages");
    expect(proposal).toContain("The widget MUST NOT perform HTTP");
    expect(widgets).toContain("No repositories");

    for (const relative of READER_FILES) {
      const text = read(join(WIDGET, relative));
      expect(text, relative).not.toMatch(/\bfetch\s*\(/);
      expect(text, relative).not.toContain("/repos/{owner}/{repo}/languages");
      expect(text, relative).not.toMatch(/https?:\/\/api\.github\.com/);
    }
  });

  it("does not invent flattened Action inputs or extra pack bools", () => {
    const actionYml = read(ACTION_YML);
    const proposal = read(join(CHANGE, "proposal.md"));

    expect(actionYml).not.toMatch(/plugin_[a-z0-9]+_[a-z0-9]+_[a-z0-9]+/);
    expect(actionYml).not.toContain("plugin_github_top_repos");
    expect(proposal).toContain("plugin_*_*_*");
    expect(proposal).not.toContain("author-integration add github");
  });
});
