import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/useful-bits");
const BITS_SRC = join(ROOT, "packages/bits/src");

const USEFUL = [
  "Sparkline",
  "Meter",
  "Duration",
  "Relative",
  "Delta",
  "Ordinal",
  "Quote",
  "Timeline",
  "Empty",
  "Figure",
  "Table",
  "StackBar",
  "Compare",
  "Legend",
  "Code",
  "Callout",
  "Dot",
  "Rating",
  "Strip",
  "Wrap",
  "Ring",
  "AvatarStack",
  "KeyValue",
  "Banner",
  "Eyebrow",
  "Status",
] as const;

const REFUSED = ["Dialog", "Toast", "Popover", "Dropdown", "Command"] as const;

const FROZEN_11 = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Stat",
  "Bar",
  "Chip",
  "Avatar",
  "Divider",
] as const;

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("OpenSpec change useful-bits", () => {
  it("names the useful set and refuses overlays", () => {
    const proposal = readChange("proposal.md");
    const spec = readChange("specs/useful-bits/spec.md");
    const author = readChange("specs/author-plugin/spec.md");
    for (const name of USEFUL) {
      expect(proposal).toContain(name);
      expect(spec).toContain(name);
      expect(author).toContain(name);
    }
    for (const name of REFUSED) {
      expect(spec).toContain(name);
      expect(existsSync(join(BITS_SRC, `${name}.tsx`))).toBe(false);
    }
    expect(spec).toContain(
      "### Requirement: Useful bits are an approved shared set",
    );
    expect(spec).toContain("MUST NOT include `Cover`");
    expect(existsSync(join(BITS_SRC, "Cover.tsx"))).toBe(false);
  });

  it("lands sources in the barrel without rewriting Frozen 11", () => {
    const barrel = readFileSync(join(BITS_SRC, "index.ts"), "utf8");
    const frozenBefore = readFileSync(join(BITS_SRC, "Stat.tsx"), "utf8");
    expect(frozenBefore).toContain("export function Stat");
    for (const name of FROZEN_11) {
      expect(existsSync(join(BITS_SRC, `${name}.tsx`))).toBe(true);
      expect(barrel).toContain(`"${name}"`);
    }
    for (const name of USEFUL) {
      expect(existsSync(join(BITS_SRC, `${name}.tsx`))).toBe(true);
      expect(barrel).toContain(`"${name}"`);
      expect(barrel).toMatch(
        new RegExp(
          `export \\{[^\\n]*\\b${name}\\b[^\\n]*\\} from "\\./${name}\\.js"`,
        ),
      );
    }
    const relative = readFileSync(join(BITS_SRC, "Relative.tsx"), "utf8");
    expect(relative).not.toContain("Date.now");
  });

  it("points steam recent at Duration and keeps the catalog locks", () => {
    const widget = readChange("specs/widget-contract/spec.md");
    const recent = readFileSync(
      join(ROOT, "packages/plugins/src/steam/widgets/recent/widget.tsx"),
      "utf8",
    );
    const proposal = readChange("proposal.md");
    expect(widget).toContain(
      "### Requirement: steam recent widget selects from the dump",
    );
    expect(widget).toContain("#### Scenario: recent uses Duration and Image");
    expect(widget).toContain("Math.round(hours * 3600)");
    expect(recent).toContain("Duration");
    expect(recent).toContain("hours * 3600");
    expect(recent).not.toContain("Cover");
    expect(proposal).toContain("No flattened Action inputs");
    expect(proposal).not.toContain("plugin_github_stats_include");
    expect(proposal).toContain("No new first-party pack");
  });
});
