import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PREVIEW_GITHUB_WIDGET_IDS,
  PREVIEW_PLUGIN_IDS,
  PREVIEW_WIDGET_IDS,
} from "@/src/preview/types";

const SRC_DIR = dirname(fileURLToPath(import.meta.url));
const DESIGN_MD = join(SRC_DIR, "../../../DESIGN.md");
const DOCS_AGENTS_MD = join(SRC_DIR, "../AGENTS.md");

const FOUR_PACKS = ["github", "wakatime", "rss", "http"] as const;
const EIGHT_WIDGETS = [
  "demo",
  "stats",
  "languages",
  "repo",
  "coding",
  "feed",
  "json",
  "chips",
] as const;

const EMBED_CLAIM_RE =
  /POST \/api\/preview is (?:a |an )?(?:stable |public )?embed/i;

function loadHonestyDocs(): { design: string; agents: string } {
  return {
    design: readFileSync(DESIGN_MD, "utf8"),
    agents: readFileSync(DOCS_AGENTS_MD, "utf8"),
  };
}

describe("docs honesty (DESIGN.md + apps/docs/AGENTS.md)", () => {
  it("lists all four packs and eight widgets on playground and catalog", () => {
    const { design, agents } = loadHonestyDocs();

    expect([...PREVIEW_PLUGIN_IDS]).toEqual([...FOUR_PACKS]);
    expect([...PREVIEW_WIDGET_IDS]).toEqual([...EIGHT_WIDGETS]);
    expect([...PREVIEW_GITHUB_WIDGET_IDS]).toEqual([
      "demo",
      "stats",
      "languages",
      "repo",
    ]);

    for (const source of [design, agents]) {
      expect(source).toContain("four packs");
      expect(source).toContain("eight widgets");
      expect(source).toContain("/playground/{github,wakatime,rss,http}");
      expect(source).toContain("/generate/catalog");
      expect(source).toContain("/generate/{github,wakatime,rss,http}");
      for (const plugin of FOUR_PACKS) {
        expect(source).toContain(`\`${plugin}\``);
      }
      for (const widget of EIGHT_WIDGETS) {
        expect(source).toContain(`\`${widget}\``);
      }
    }

    expect(design).toContain("/playground/github");
    expect(agents).toContain("/playground/github");
    expect(agents).toContain("/playground/wakatime");
    expect(agents).toContain("/playground/rss");
    expect(agents).toContain("/playground/http");
  });

  it("keeps github widget ids per pack and does not dump the union onto github", () => {
    const { design, agents } = loadHonestyDocs();

    for (const source of [design, agents]) {
      expect(source).toContain("PREVIEW_GITHUB_WIDGET_IDS");
      expect(source).toContain("PREVIEW_WIDGET_IDS");
      expect(source.toLowerCase()).toContain("do not add `coding`");
      expect(source).toContain("`json`");
      expect(source).toContain("`chips`");
    }

    expect(agents).not.toMatch(/PREVIEW_PLUGIN_IDS` is `github` then `http`/);
    expect(design).toContain(
      "Github playground and generate routes use `PREVIEW_GITHUB_WIDGET_IDS` only",
    );
    expect(agents).toContain(
      "Github routes use `PREVIEW_GITHUB_WIDGET_IDS`: `demo` / `stats` / `languages` / `repo`",
    );
  });

  it("states preview is not an embed API and GET stays 405", () => {
    const { design, agents } = loadHonestyDocs();

    for (const source of [design, agents]) {
      expect(source).toContain("POST /api/preview");
      expect(source).toContain("not a stable embed API");
      expect(source).toContain("GET /api/preview");
      expect(source).toContain("405");
      expect(source).not.toMatch(EMBED_CLAIM_RE);
    }

    expect(design).toContain(
      "Don't document `POST /api/preview` as an embed API",
    );
    expect(agents).toContain("still not an embed API");
    expect(agents).toContain("Do not cache or document it as an embed");
  });

  it("drops the github-only playground freeze", () => {
    const { design, agents } = loadHonestyDocs();

    for (const source of [design, agents]) {
      expect(source).not.toContain("No `/playground/wakatime`");
      expect(source).not.toContain("No `/playground/rss`");
      expect(source).not.toContain("Rss has no playground route");
      expect(source).not.toContain("seven widgets");
      expect(source).not.toContain("fixtures-only chips explorer");
      expect(source).not.toContain("**Zero live URLs.**");
    }

    expect(design).toContain("Landing redirect stays github");
    expect(agents).toContain("`/playground` redirects to `/playground/github`");
    expect(design).toContain("non-empty fixtures");
    expect(agents).toContain("non-empty fixtures");
    expect(design).toContain("Optional live");
    expect(agents).toContain("Optional live");
  });
});
