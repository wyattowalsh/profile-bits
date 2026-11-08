import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/widen-rss");
const MAIN_INTEGRATION = join(
  ROOT,
  "openspec/specs/integration-contract/spec.md",
);
const MAIN_WIDGET = join(ROOT, "openspec/specs/widget-contract/spec.md");
const DOCS_CHANGE = join(ROOT, "openspec/changes/docs-full-catalog-playground");

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("OpenSpec change widen-rss", () => {
  it("keeps the change in openspec/changes/ (not archived, not a new docs id)", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(existsSync(DOCS_CHANGE)).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/widen-rss"))).toBe(false);
    expect(
      existsSync(join(ROOT, "openspec/changes/docs-full-catalog-playground")),
    ).toBe(true);
  });

  it("does not rewrite docs-full-catalog-playground or main specs yet", () => {
    const proposal = readChange("proposal.md");
    const docsTasks = readFileSync(join(DOCS_CHANGE, "tasks.md"), "utf8");
    const mainIntegration = readFileSync(MAIN_INTEGRATION, "utf8");
    const mainWidget = readFileSync(MAIN_WIDGET, "utf8");

    expect(proposal).toContain("docs-full-catalog-playground");
    expect(proposal).toContain("Do not rewrite `docs-full-catalog-playground`");
    expect(docsTasks).toContain(
      "Exclusive: `packages/core/src/codegen/docs-fields.ts`",
    );
    expect(mainIntegration).toContain(
      "### Requirement: rss payload is a frozen item list",
    );
    expect(mainIntegration).toContain(
      "The payload MUST be an `Object.freeze`d array of frozen items `{ title: string, url: string, published_at: string | null }`",
    );
    expect(mainWidget).toContain("### Requirement: Frozen feed widget options");
    expect(mainWidget).not.toContain(
      "leftover frozen triple `{ title, url, published_at }` MUST be the feed widget reader",
    );
  });

  it("names a feed+item dump and removes leftover triple as cache schema", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");

    expect(proposal).toContain("feed + item dump");
    expect(integration).toContain("## REMOVED Requirements");
    expect(integration).toContain(
      "### Requirement: rss payload is a frozen item list",
    );
    expect(integration).toContain("**Reason**:");
    expect(integration).toContain("**Migration**:");
    expect(integration).toContain("## ADDED Requirements");
    expect(integration).toContain(
      "### Requirement: rss payload is a feed and item dump",
    );
    expect(integration).toContain("frozen `{ feed, items }` dump");
    expect(integration).toContain("`id`");
    expect(integration).toContain("`content`");
    expect(integration).toContain("`summary`");
    expect(integration).toContain("`authors`");
    expect(integration).toContain("`categories`");
    expect(integration).toContain("`updated`");
    expect(integration).toContain("`enclosures`");
    expect(integration).toContain("`image`");
    expect(integration).toContain("`description`");
    expect(integration).toContain("`link`");
    expect(integration).not.toMatch(
      /The payload MUST be an `Object\.freeze`d array of frozen items `\{ title: string, url: string, published_at: string \| null \}`/,
    );
  });

  it("keeps the leftover triple as the feed widget reader", () => {
    const proposal = readChange("proposal.md");
    const widget = readChange("specs/widget-contract/spec.md");
    const integration = readChange("specs/integration-contract/spec.md");

    expect(proposal).toContain("feed widget reader");
    expect(widget).toContain("## MODIFIED Requirements");
    expect(widget).toContain("### Requirement: Frozen feed widget options");
    expect(widget).toContain(
      "leftover frozen triple `{ title, url, published_at }` MUST be the feed widget reader",
    );
    expect(widget).toContain("MUST NOT be required for `feed` to render");
    expect(widget).toContain("MUST slice dump `items` to `limit`");
    expect(widget).toContain("MAY still render title, url, and date");
    expect(widget).toContain("No feed items");
    expect(widget).toContain("MUST NOT perform HTTP itself");
    expect(integration).toContain(
      "item MUST still include `{ title, url, published_at }`",
    );
    expect(integration).toContain(
      "MUST NOT be sliced to `limit` inside the client",
    );
  });

  it("keeps parser-without-HTTP and fetch locks", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const design = readChange("design.md");
    const mainIntegration = readFileSync(MAIN_INTEGRATION, "utf8");

    expect(integration).toContain("MUST NOT use any parser HTTP/fetch helper");
    expect(integration).toContain("MUST NOT call a parser-owned URL/fetch API");
    expect(proposal).toContain("SSRF");
    expect(proposal).toContain("1 MiB");
    expect(proposal).toContain("no GitHub-owned hosts");
    expect(proposal).toContain("no URL userinfo");
    expect(design).toContain("SSRF");
    expect(design).toContain("1 MiB");
    expect(design).toContain("GitHub-owned host");
    expect(mainIntegration).toContain(
      "### Requirement: rss GitHub-owned hosts fail before connect",
    );
    expect(mainIntegration).toContain(
      "### Requirement: rss https SSRF protections",
    );
    expect(mainIntegration).toContain("1048576");
  });

  it("forbids flattened Action inputs and invented pack bools", () => {
    const proposal = readChange("proposal.md");
    const design = readChange("design.md");
    const tasks = readChange("tasks.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const widget = readChange("specs/widget-contract/spec.md");

    for (const source of [proposal, design, tasks, integration, widget]) {
      expect(source).toContain("plugin_");
    }
    expect(proposal).toContain("plugin_rss_*");
    expect(proposal).toContain("plugin_*_*_*");
    expect(design).toContain("plugin_*_*_*");
    expect(design).toContain("Do not flatten");
    expect(integration).toContain("plugin_<plugin>_<widget>_<option>");
    expect(integration).toContain("plugin_rss_feed_url");
    expect(widget).toContain("plugin_rss_feed_url");
    expect(widget).toContain("plugin_rss_feed_*");
  });

  it("does not author-integration add live first-party dests or mint latest", () => {
    const proposal = readChange("proposal.md");
    const design = readChange("design.md");
    const tasks = readChange("tasks.md");

    expect(proposal).toContain("author-integration add");
    expect(proposal).toContain("github");
    expect(proposal).toContain("wakatime");
    expect(proposal).toContain("rss");
    expect(proposal).toContain("http");
    expect(proposal).toContain("MUST NOT `author-integration add`");
    expect(proposal).toContain("`latest` stays Wave 3");
    const integration = readChange("specs/integration-contract/spec.md");
    expect(integration).toContain(
      "MUST NOT run `author-integration add` for `rss`",
    );
    expect(integration).toContain(
      "`FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, and `FIRST_PARTY_INTEGRATION_IDS` MUST NOT gain a new id from this change",
    );
    expect(integration).toContain("`latest` is Wave 3");
    expect(proposal).toContain(
      "`POST /api/preview` remains layout preview, not a public embed API",
    );
    expect(design).toContain("W2-RSS-02");
    expect(design).toContain("packages/integrations/src/rss/**");
    expect(design).toContain("Do not run `npx skills add`");
    expect(design).toContain("Do not tag `v1`");
    expect(tasks).toContain("W2-RSS-02");
    expect(tasks).toContain("Do not `author-integration add` rss");
    expect(tasks).toContain("Do not run `npx skills add`");
  });
});
