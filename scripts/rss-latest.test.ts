import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/rss-latest");
const DOCS_CHANGE = join(ROOT, "openspec/changes/docs-full-catalog-playground");
const PLUGIN = join(ROOT, "packages/plugins/src/rss/plugin.ts");
const WIDGET = join(ROOT, "packages/plugins/src/rss/widgets/latest/widget.tsx");
const TYPES = join(ROOT, "packages/core/src/types.ts");
const ACTION = join(ROOT, "action.yml");
const MAIN_WIDGET = join(ROOT, "openspec/specs/widget-contract/spec.md");

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("OpenSpec change rss-latest", () => {
  it("keeps the change in openspec/changes/ (not archived, not a new docs id)", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(existsSync(DOCS_CHANGE)).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/rss-latest"))).toBe(false);
    expect(
      existsSync(join(ROOT, "openspec/changes/docs-full-catalog-playground")),
    ).toBe(true);
  });

  it("does not rewrite docs-full-catalog-playground or mint a new widget id", () => {
    const proposal = readChange("proposal.md");
    const widget = readChange("specs/widget-contract/spec.md");
    const docsTasks = readFileSync(join(DOCS_CHANGE, "tasks.md"), "utf8");
    const types = readFileSync(TYPES, "utf8");
    const mainWidget = readFileSync(MAIN_WIDGET, "utf8");

    expect(proposal).toContain("docs-full-catalog-playground");
    expect(proposal).toContain("Do not rewrite `docs-full-catalog-playground`");
    expect(proposal).toContain("Do not mint a new catalog id");
    expect(widget).toContain("MUST NOT mint a new first-party widget id");
    expect(docsTasks).toContain(
      "Exclusive: `packages/core/src/codegen/docs-fields.ts`",
    );
    expect(types).toContain('"latest"');
    expect(mainWidget).not.toContain("### Requirement: Frozen latest widget");
  });

  it("names Time-bit latest on the rss pack without flattening or author-integration add", () => {
    const proposal = readChange("proposal.md");
    const design = readChange("design.md");
    const widget = readChange("specs/widget-contract/spec.md");
    const plugin = readChange("specs/plugin-contract/spec.md");

    expect(widget).toContain("## ADDED Requirements");
    expect(widget).toContain("### Requirement: Frozen latest widget options");
    expect(widget).toContain("Time bit");
    expect(widget).toContain("No latest item");
    expect(widget).toContain("MUST NOT perform HTTP itself");
    expect(widget).toContain("`limit` 1–8 default 1");
    expect(widget).toContain("plugin_rss_latest_url");
    expect(plugin).toContain("[feed, latest]");
    expect(plugin).toContain("defaults MUST remain `[feed]`");
    expect(proposal).toContain("MUST NOT `author-integration add`");
    expect(design).toContain("Do not edit `packages/core/src/types.ts`");
    expect(design).toContain("Time bit");
  });

  it("lands the latest widget on the rss pack with Time and no flattened inputs", () => {
    const plugin = readFileSync(PLUGIN, "utf8");
    const widget = readFileSync(WIDGET, "utf8");
    const action = readFileSync(ACTION, "utf8");

    expect(plugin).toContain('"latest"');
    expect(plugin).toContain('"Time"');
    expect(plugin).toContain('defaults: { widgets: ["feed"] }');
    expect(widget).toContain("<Time");
    expect(widget).toContain("No latest item");
    expect(action).not.toContain("plugin_rss_latest");
    expect(action).not.toMatch(/plugin_[a-z]+_[a-z]+_[a-z]+/);
  });
});
