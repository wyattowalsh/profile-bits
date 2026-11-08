import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/archive/2026-11-08-chess");
const TYPES = join(ROOT, "packages/core/src/types.ts");
const CHESSCOM_CLIENT = join(
  ROOT,
  "packages/integrations/src/chesscom/client.ts",
);
const LICHESS_CLIENT = join(
  ROOT,
  "packages/integrations/src/lichess/client.ts",
);
const RATINGS_WIDGET = join(
  ROOT,
  "packages/plugins/src/chess/widgets/ratings/widget.tsx",
);
const GAME_WIDGET = join(
  ROOT,
  "packages/plugins/src/chess/widgets/game/widget.tsx",
);

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

function readRepo(relativePath: string): string {
  const absolutePath = join(ROOT, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("OpenSpec change chess", () => {
  it("archives chess under 2026-11-08 and does not mint a docs id", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(existsSync(join(ROOT, "openspec/changes/chess"))).toBe(false);
    expect(
      existsSync(
        join(
          ROOT,
          "openspec/changes/archive/2026-11-08-docs-full-catalog-playground",
        ),
      ),
    ).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/chess"))).toBe(false);
  });

  it("names chesscom plus lichess, ratings plus game, and forbids stats id", () => {
    const proposal = readChange("proposal.md");
    const plugin = readChange("specs/plugin-contract/spec.md");
    const widget = readChange("specs/widget-contract/spec.md");
    const integration = readChange("specs/integration-contract/spec.md");

    expect(proposal).toContain("`chesscom`");
    expect(proposal).toContain("`lichess`");
    expect(proposal).toContain("`ratings`");
    expect(proposal).toContain("`game`");
    expect(proposal).toContain("MUST NOT be `stats`");
    expect(plugin).toContain("widgets MUST be `ratings` and `game`");
    expect(plugin).toContain("MUST NOT include an integration id `chess`");
    expect(widget).toContain("MUST NOT be `stats`");
    expect(widget).toContain("Board bit");
    expect(integration).toContain("User-Agent");
    expect(integration).toContain("api.chess.com");
  });

  it("does not append FIRST_PARTY_* or rewrite docs-full-catalog-playground", () => {
    const proposal = readChange("proposal.md");
    const design = readChange("design.md");
    const plugin = readChange("specs/plugin-contract/spec.md");

    expect(proposal).toContain("MUST NOT append `FIRST_PARTY_*`");
    expect(proposal).toContain("docs-full-catalog-playground");
    expect(design).toContain("MUST NOT edit `types.ts`");
    expect(plugin).toContain("MUST NOT edit");
    expect(plugin).toContain("packages/core/src/types.ts");
    expect(readFileSync(TYPES, "utf8")).toContain('"chesscom"');
  });

  it("forbids flatten, unauth GitHub, REST /languages, and embed preview", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const plugin = readChange("specs/plugin-contract/spec.md");

    for (const source of [proposal, integration, plugin]) {
      expect(source).toContain("plugin_*_*_*");
    }
    expect(integration).toContain("REST `/languages`");
    expect(integration).toContain("unauthenticated GitHub");
    expect(plugin).toContain("POST /api/preview");
    expect(plugin).toContain("not a public embed API");
    expect(proposal).toContain("npx skills add");
  });
});

describe("W3-CH-01 chess dest trees", () => {
  it("adds chesscom and lichess clients with User-Agent and no Authorization", () => {
    expect(existsSync(CHESSCOM_CLIENT)).toBe(true);
    expect(existsSync(LICHESS_CLIENT)).toBe(true);
    const chesscom = readFileSync(CHESSCOM_CLIENT, "utf8");
    const lichess = readFileSync(LICHESS_CLIENT, "utf8");
    expect(chesscom).toContain("profile-bits-chesscom/0");
    expect(chesscom).toContain("github.com/wyattowalsh/profile-bits");
    expect(chesscom).toContain("User-Agent");
    expect(chesscom).not.toMatch(/Authorization:\s*""/);
    expect(lichess).toContain("User-Agent");
    expect(lichess).not.toMatch(/Authorization:\s*""/);
  });

  it("registers ratings and game with Board plus Stat, not stats", () => {
    const plugin = readRepo("packages/plugins/src/chess/plugin.ts");
    const ratings = readFileSync(RATINGS_WIDGET, "utf8");
    const game = readFileSync(GAME_WIDGET, "utf8");
    expect(plugin).toContain('"ratings"');
    expect(plugin).toContain('"game"');
    expect(plugin).toContain("chesscom");
    expect(plugin).toContain("lichess");
    expect(plugin).not.toMatch(/widgets:\s*\[[^\]]*"stats"/);
    expect(ratings).toContain("Stat");
    expect(game).toContain("Board");
    expect(plugin).toContain("Board");
    expect(plugin).toContain("Stat");
  });
});
