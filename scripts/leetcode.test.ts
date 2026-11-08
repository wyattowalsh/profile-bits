import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/leetcode");
const TYPES = join(ROOT, "packages/core/src/types.ts");

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("OpenSpec change leetcode", () => {
  it("keeps the change in openspec/changes/ (not archived, not a new docs id)", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(
      existsSync(join(ROOT, "openspec/changes/docs-full-catalog-playground")),
    ).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/leetcode"))).toBe(false);
    expect(existsSync(join(ROOT, "openspec/changes/archive/leetcode"))).toBe(
      false,
    );
  });

  it("names GraphQL POST auth none with no Authorization header", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");

    expect(proposal).toContain("POST https://leetcode.com/graphql");
    expect(proposal).toContain("auth none");
    expect(integration).toContain(
      "### Requirement: LeetCode fetch is GraphQL POST with auth none",
    );
    expect(integration).toContain("POST https://leetcode.com/graphql");
    expect(integration).toContain("JSON body `{ query, variables }`");
    expect(integration).toContain(
      "#### Scenario: Auth none sends no Authorization",
    );
    expect(integration).toContain("MUST NOT include an `Authorization` header");
    expect(integration).toContain('`{ Authorization: "" }`');
    expect(integration).toContain(
      "the cache key MUST be `(query, variables)` and MUST NOT be `POST /graphql` alone",
    );
  });

  it("requires the complete public GraphQL dump of profile contest calendar and recent AC", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");

    expect(proposal).toContain("public GraphQL dump");
    expect(integration).toContain(
      "### Requirement: LeetCode cached payload is the complete public GraphQL dump",
    );
    expect(integration).toContain(
      "#### Scenario: Dump keeps public profile fields",
    );
    expect(integration).toContain("#### Scenario: Dump keeps contest ranking");
    expect(integration).toContain(
      "#### Scenario: Dump keeps submission calendar",
    );
    expect(integration).toContain("#### Scenario: Dump keeps recent AC");
    expect(integration).toContain("submitStatsGlobal.acSubmissionNum");
    expect(integration).toContain("userContestRanking");
    expect(integration).toContain("submissionCalendar");
    expect(integration).toContain("recentAcSubmissionList");
    expect(integration).toContain("MUST NOT invent `0`");
  });

  it("maps Cloudflare 403 to fail_widget not fail_job", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");

    expect(proposal).toContain("CF 403");
    expect(proposal).toContain("fail_widget");
    expect(integration).toContain(
      "### Requirement: LeetCode Cloudflare 403 is fail_widget not fail_job",
    );
    expect(integration).toContain(
      "#### Scenario: GraphQL 403 fails the widget not the job",
    );
    expect(integration).toContain(
      "MUST be `fail_widget` and MUST NOT be `fail_job`",
    );
    expect(integration).toContain("MUST NOT be `fail_job`");
    expect(integration).toContain(
      "MUST NOT classify that as GitHub `fail_after_backoff`",
    );
  });

  it("allows HTML scrape only as an SSRF fallback and forbids Playwright and community proxies", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const design = readChange("design.md");

    expect(proposal).toContain("HTML scrape");
    expect(proposal).toContain("SSRF fallback");
    expect(integration).toContain(
      "### Requirement: HTML scrape is SSRF fallback only",
    );
    expect(integration).toContain(
      "#### Scenario: Scrape is not the primary path",
    );
    expect(integration).toContain(
      "#### Scenario: Scrape runs only after GraphQL is blocked",
    );
    expect(integration).toContain("html-scrape SSRF");
    expect(integration).toContain(
      "### Requirement: LeetCode must not use community proxies or Playwright",
    );
    expect(integration).toContain("MUST NOT call a community proxy");
    expect(integration).toContain("MUST NOT use Playwright");
    expect(integration).toContain(
      "Playwright MUST NOT enter the Action runtime",
    );
    expect(design).toContain("No Playwright");
    expect(design).toContain("No community proxy");
  });

  it("requires solved and heatmap widgets that select without HTTP", () => {
    const proposal = readChange("proposal.md");
    const widgets = readChange("specs/widget-contract/spec.md");
    const plugins = readChange("specs/plugin-contract/spec.md");

    expect(proposal).toContain("`solved` and `heatmap`");
    expect(widgets).toContain(
      "### Requirement: LeetCode widgets select from the cached dump",
    );
    expect(widgets).toContain("MUST NOT perform HTTP");
    expect(widgets).toContain(
      "#### Scenario: Extra dump keys do not fail parse",
    );
    expect(widgets).toContain(
      "MUST NOT treat `POST /api/preview` as a public embed API",
    );
    expect(widgets).toContain(
      "### Requirement: Heatmap widget uses the Heatmap bit",
    );
    expect(widgets).toContain("MUST use `Heatmap` and MUST NOT use `Board`");
    expect(plugins).toContain(
      "### Requirement: LeetCode pack binds integration leetcode only",
    );
    expect(plugins).toContain(
      "the enabled widgets MUST be `solved` and `heatmap` MUST remain disabled until explicitly enabled",
    );
  });

  it("forbids flattened Action inputs and live dest add; allows leetcode add only when client.ts is absent", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");
    const design = readChange("design.md");
    const types = readFileSync(TYPES, "utf8");

    for (const source of [proposal, integration, authorPlugin]) {
      expect(source).toContain("plugin_<plugin>_<widget>_<option>");
    }
    expect(integration).toContain(
      "MUST NOT run `author-integration add` for those ids",
    );
    expect(authorPlugin).toContain("author-integration add leetcode");
    expect(authorPlugin).toContain("dest `client.ts` is absent");
    expect(authorPlugin).toContain("auth.none.ts.template");
    expect(authorPlugin).toContain(
      "MUST NOT edit `packages/core/src/types.ts`",
    );
    expect(authorPlugin).toContain("MUST NOT add a `plugin_leetcode` bool");
    expect(design).toContain("W3-LC-02");
    expect(design).toContain("docs-full-catalog-playground");
    expect(design).toContain("packages/integrations/src/leetcode/**");
    expect(types).toContain('"leetcode"');
    expect(types).toContain('"solved"');
    expect(types).toContain('"heatmap"');
    expect(types).not.toMatch(/plugin_leetcode:/);
    expect(types).not.toMatch(/leetcode_token/);
  });
});
