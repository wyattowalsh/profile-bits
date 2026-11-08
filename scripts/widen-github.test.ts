import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/widen-github");

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("OpenSpec change widen-github", () => {
  it("keeps the change in openspec/changes/ (not archived, not a new docs id)", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(
      existsSync(join(ROOT, "openspec/changes/docs-full-catalog-playground")),
    ).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/widen-github"))).toBe(false);
    expect(
      existsSync(join(ROOT, "openspec/changes/archive/widen-github")),
    ).toBe(false);
  });

  it("names the cached payload as the fetched REST/GraphQL JSON dump", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");

    expect(proposal).toContain("fetched REST/GraphQL JSON dump");
    expect(proposal).toContain("Widgets select");
    expect(integration).toContain(
      "### Requirement: Github cached payload is the fetched REST/GraphQL JSON dump",
    );
    expect(integration).toContain("already-fetched REST and GraphQL JSON");
    expect(integration).toContain("Widgets MUST select fields from that dump");
  });

  it("requires dropped-today user and owner-repo dump fields", () => {
    const integration = readChange("specs/integration-contract/spec.md");

    for (const field of ["name", "bio", "avatar_url", "created_at"]) {
      expect(integration).toContain(field);
    }
    expect(integration).toContain(
      "#### Scenario: User dump keeps dropped-today profile fields",
    );
    expect(integration).toContain("html_url");
    expect(integration).toContain("description");
    expect(integration).toContain("language");
    expect(integration).toContain("topics");
    expect(integration).toContain(
      "#### Scenario: Owner-repo dump keeps html_url description language topics",
    );
  });

  it("forbids REST /languages and keeps filter-then-cap 500", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const fetchPolicy = readChange("specs/github-api-fetch-policy/spec.md");

    for (const source of [proposal, integration, fetchPolicy]) {
      expect(source).toContain("/repos/{owner}/{repo}/languages");
    }
    expect(integration).toContain(
      "#### Scenario: REST languages endpoint is forbidden",
    );
    expect(integration).toContain("capped at 500");
    expect(integration).toContain(
      "#### Scenario: Filter forks and archived then cap 500",
    );
    expect(fetchPolicy).toContain(
      "MUST NOT call REST `/repos/{owner}/{repo}/languages`",
    );
  });

  it("keeps language color/id and paginates GraphQL languages after first 10", () => {
    const fetchPolicy = readChange("specs/github-api-fetch-policy/spec.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const design = readChange("design.md");

    expect(fetchPolicy).toContain("node { name color id }");
    expect(fetchPolicy).toContain(
      "#### Scenario: Language nodes keep color and id",
    );
    expect(fetchPolicy).toContain(
      "#### Scenario: GraphQL languages paginate after first 10",
    );
    expect(fetchPolicy).toContain("nodes(ids:)");
    expect(fetchPolicy).toContain("batches of 100");
    expect(integration).toContain("node { name color id }");
    expect(design).toContain("first: 10");
  });

  it("dumps calendar weeks when canContributions and omits without inventing 0", () => {
    const fetchPolicy = readChange("specs/github-api-fetch-policy/spec.md");
    const integration = readChange("specs/integration-contract/spec.md");

    expect(fetchPolicy).toContain("contributionCalendar.totalContributions");
    expect(fetchPolicy).toContain("weeks");
    expect(fetchPolicy).toContain("MUST NOT invent `0`");
    expect(integration).toContain(
      "#### Scenario: Calendar weeks dump when capable",
    );
    expect(integration).toContain("MUST NOT be invented as `0`");
  });

  it("requires empty token fail_job and widgets that select without HTTP", () => {
    const integration = readChange("specs/integration-contract/spec.md");
    const widgets = readChange("specs/widget-contract/spec.md");

    expect(integration).toContain("MUST `fail_job` before any GitHub request");
    expect(integration).toContain(
      "#### Scenario: Empty token fails the job before dump fetch",
    );
    expect(widgets).toContain(
      "### Requirement: GitHub widgets select from the cached dump",
    );
    expect(widgets).toContain("MUST NOT perform HTTP");
    expect(widgets).toContain(
      "#### Scenario: Extra dump keys do not fail parse",
    );
    expect(widgets).toContain(
      "MUST NOT treat `POST /api/preview` as a public embed API",
    );
  });

  it("forbids flattened Action inputs and author-integration add on live dests", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const design = readChange("design.md");

    for (const source of [proposal, integration]) {
      expect(source).toContain("plugin_<plugin>_<widget>_<option>");
    }
    expect(integration).toContain(
      "MUST NOT run `author-integration add` for those ids",
    );
    expect(integration).toContain("github");
    expect(integration).toContain("wakatime");
    expect(integration).toContain("rss");
    expect(integration).toContain("http");
    expect(design).toContain("W2-G-02");
    expect(design).toContain("packages/integrations/src/github/**");
    expect(design).toContain("docs-full-catalog-playground");
  });
});
