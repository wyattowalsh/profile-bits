import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/readme-card-bits");
const BITS_SRC = join(ROOT, "packages/bits/src");

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

const APPROVED = [
  "Image",
  "Heatmap",
  "Board",
  "Icon",
  "Grid",
  "List",
  "Time",
] as const;

const REFUSED = ["Dialog", "Toast", "Popover", "Dropdown", "Command"] as const;

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("OpenSpec change readme-card-bits", () => {
  it("keeps the change in openspec/changes/ (not archived, not a new docs id)", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(
      existsSync(join(ROOT, "openspec/changes/docs-full-catalog-playground")),
    ).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/bits-contract"))).toBe(false);
    expect(existsSync(join(ROOT, "openspec/specs/readme-card-bits"))).toBe(
      false,
    );
  });

  it("names Image Heatmap Board Icon Grid List Time and maps Cover to Image", () => {
    const proposal = readChange("proposal.md");
    const bits = readChange("specs/bits-contract/spec.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");

    for (const name of APPROVED) {
      expect(proposal).toContain(name);
      expect(bits).toContain(name);
      expect(authorPlugin).toContain(name);
    }
    expect(bits).toContain(
      "### Requirement: Approved README-card primitives are Image Heatmap Board Icon Grid List Time",
    );
    expect(bits).toContain("Ranking name Cover MUST map to `Image`");
    expect(bits).toContain("MUST NOT create `Cover.tsx`");
    expect(authorPlugin).toContain("MUST NOT create `Cover.tsx`");
    expect(authorPlugin).toContain(
      "### Requirement: Author-bit may copy Bit.template for approved README-card names",
    );
    expect(authorPlugin).toContain("templates/Bit.template");
  });

  it("keeps Frozen 11 complete-existing and does not rewrite those sources", () => {
    const proposal = readChange("proposal.md");
    const bits = readChange("specs/bits-contract/spec.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");
    const barrel = readFileSync(join(BITS_SRC, "index.ts"), "utf8");

    expect(proposal).toContain("Frozen 11");
    expect(bits).toContain("### Requirement: Frozen 11 stay complete-existing");
    expect(bits).toContain("MUST stop as complete-existing");
    expect(bits).toContain("MUST NOT copy `Bit.template` onto Frozen 11 files");
    expect(authorPlugin).toContain(
      "MUST NOT copy `Bit.template` onto Frozen 11 files",
    );
    for (const name of FROZEN_11) {
      expect(bits).toContain(`\`${name}\``);
      expect(existsSync(join(BITS_SRC, `${name}.tsx`))).toBe(true);
      expect(barrel).toContain(`export { ${name}`);
    }
    expect(barrel).toContain("export const BIT_EXPORTS");
    for (const name of FROZEN_11) {
      expect(barrel).toContain(`"${name}"`);
    }
  });

  it("refuses Dialog Toast Popover Dropdown Command", () => {
    const proposal = readChange("proposal.md");
    const bits = readChange("specs/bits-contract/spec.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");

    for (const name of REFUSED) {
      expect(proposal).toContain(name);
      expect(bits).toContain(name);
      expect(authorPlugin).toContain(name);
      expect(existsSync(join(BITS_SRC, `${name}.tsx`))).toBe(false);
    }
    expect(bits).toContain("### Requirement: Overlay primitives stay refused");
    expect(authorPlugin).toContain(
      "### Requirement: Author-bit refuses overlay primitives",
    );
    expect(authorPlugin).toContain("MUST NOT create `author-dialog`");
  });

  it("lands the approved README-card sources and keeps Cover absent", () => {
    const bits = readChange("specs/bits-contract/spec.md");
    const barrel = readFileSync(join(BITS_SRC, "index.ts"), "utf8");

    expect(bits).toContain(
      "### Requirement: This change does not land bit sources",
    );
    expect(existsSync(join(BITS_SRC, "Cover.tsx"))).toBe(false);
    for (const name of APPROVED) {
      expect(existsSync(join(BITS_SRC, `${name}.tsx`))).toBe(true);
      expect(barrel).toContain(`./${name}.js`);
      expect(barrel).toContain(`"${name}"`);
    }
    for (const name of REFUSED) {
      expect(barrel).not.toContain(`"${name}"`);
    }
  });

  it("keeps bits Takumi-safe, out of yaml, and without flatten or first-party ids", () => {
    const proposal = readChange("proposal.md");
    const bits = readChange("specs/bits-contract/spec.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");

    expect(bits).toContain(
      "### Requirement: Bits stay Takumi-safe and out of yaml",
    );
    expect(bits).toContain("`div` / `span` / `img`");
    expect(bits).toContain("MUST NOT import `react-dom`");
    expect(bits).toContain(
      "MUST NEVER put `bits:` in `.github/profile-bits.yml`",
    );
    expect(bits).toContain("plugin_<plugin>_<widget>_<option>");
    expect(bits).toContain("MUST NOT append `FIRST_PARTY_PLUGIN_IDS`");
    expect(proposal).toContain("plugin_<plugin>_<widget>_<option>");
    expect(authorPlugin).toContain("plugin_<plugin>_<widget>_<option>");
    expect(authorPlugin).toContain(
      "MUST NOT run `author-integration add` for github, wakatime, rss, or http",
    );
    expect(authorPlugin).toContain("POST /api/preview");
    expect(authorPlugin).toContain("not a public embed API");
  });

  it("distinguishes Image Heatmap Board Grid and keeps starter bitsUsed six", () => {
    const bits = readChange("specs/bits-contract/spec.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");
    const design = readChange("design.md");

    expect(bits).toContain("### Requirement: Image is rectangular cover art");
    expect(bits).toContain("### Requirement: Heatmap is a day grid");
    expect(bits).toContain("### Requirement: Board is an 8x8 grid");
    expect(bits).toContain("MUST NOT be a chess `Board`");
    expect(bits).toContain("MUST NOT specialize into `Heatmap` or `Board`");
    expect(authorPlugin).toContain(
      "Starter `BITS_USED` for new packs MUST remain Theme, Frame, Stack, Row, Text, and Muted",
    );
    expect(design).toContain("W3-B-02");
    expect(design).toContain("docs-full-catalog-playground");
    expect(design).toContain("MUST NOT edit `openspec/specs/**` until archive");
  });
});
