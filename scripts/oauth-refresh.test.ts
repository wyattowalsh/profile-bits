import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/oauth-refresh");

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("OpenSpec change oauth-refresh", () => {
  it("keeps the change in openspec/changes/ (not archived, not a new docs id)", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(
      existsSync(join(ROOT, "openspec/changes/docs-full-catalog-playground")),
    ).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/oauth-refresh"))).toBe(false);
  });

  it("names scheme oauth-refresh and keeps oauth2 unknown", () => {
    const proposal = readChange("proposal.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");

    expect(proposal).toContain("oauth-refresh");
    expect(proposal).toContain("oauth2");
    expect(authorPlugin).toContain(
      "### Requirement: Named scheme oauth-refresh is copyable",
    );
    expect(authorPlugin).toContain("auth.oauth-refresh.ts.template");
    expect(authorPlugin).toContain(
      "### Requirement: Alias oauth2 stays unknown",
    );
    expect(authorPlugin).toContain("`oauth2` MUST remain an unknown scheme");
    expect(authorPlugin).toContain("MUST NOT invent `auth.oauth2.ts.template`");
    expect(authorPlugin).toContain(
      "MUST NOT interpolate `auth.{{scheme}}.ts.template` as a path",
    );
  });

  it("forbids flattened Action inputs and invented thin names", () => {
    const proposal = readChange("proposal.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");
    const integration = readChange("specs/integration-contract/spec.md");

    for (const source of [proposal, authorPlugin, integration]) {
      expect(source).toContain("plugin_<plugin>_<widget>_<option>");
    }
    expect(authorPlugin).toContain("MUST NOT add a `plugin_spotify` bool");
    expect(authorPlugin).toContain(
      "this change MUST NOT invent thin Action input names",
    );
    expect(authorPlugin).toContain("ActionInputsSchema");
    expect(integration).toContain(
      "MUST NOT become flattened `plugin_<plugin>_<widget>_<option>` Action inputs",
    );
  });

  it("requires refresh-then-Bearer and rejects http-optional reuse", () => {
    const integration = readChange("specs/integration-contract/spec.md");

    expect(integration).toContain(
      "### Requirement: oauth-refresh exchanges a refresh token for a Bearer access token",
    );
    expect(integration).toContain("grant_type=refresh_token");
    expect(integration).toContain(`Authorization: Bearer \${access_token}`);
    expect(integration).toContain("MUST NOT be sent as `?key=` or `?api_key=`");
    expect(integration).toContain("MUST NOT reuse `http-optional`");
    expect(integration).toContain(
      "Catalog auth for an `oauth-refresh` consumer MUST be `required`",
    );
    expect(integration).toContain("decideActionToken` MUST remain GitHub-only");
    expect(integration).toContain(
      "{{id}}RequiresAuthorization()` MUST be true",
    );
  });

  it("requires fail_job when the pack is on and keeps preview off the embed API", () => {
    const integration = readChange("specs/integration-contract/spec.md");

    expect(integration).toContain("the Action MUST `fail_job`");
    expect(integration).toContain(
      "MUST NOT treat `POST /api/preview` as a public embed API",
    );
    expect(integration).toContain("MUST return `{}`");
    expect(integration).toContain('`{ Authorization: "" }`');
  });

  it("keeps client credentials as named env and does not add first-party ids", () => {
    const integration = readChange("specs/integration-contract/spec.md");
    const design = readChange("design.md");

    expect(integration).toContain(
      "### Requirement: oauth-refresh client credentials are named env not yaml",
    );
    expect(integration).toContain("MUST NOT appear in yaml");
    expect(integration).toContain(
      "`FIRST_PARTY_PLUGIN_IDS`, `FIRST_PARTY_WIDGET_IDS`, and `FIRST_PARTY_INTEGRATION_IDS` MUST NOT gain a new id from this change",
    );
    expect(design).toContain("W2-A-03");
    expect(design).toContain("query-key");
    expect(design).toMatch(/MUST NOT\s+edit/);
    expect(design).toContain("SKILL.md");
  });

  it("does not author-integration add live first-party dests", () => {
    const proposal = readChange("proposal.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");

    expect(proposal).toContain("author-integration add");
    expect(authorPlugin).toContain(
      "MUST NOT run `author-integration add` for those ids",
    );
    expect(authorPlugin).toContain("github");
    expect(authorPlugin).toContain("wakatime");
    expect(authorPlugin).toContain("rss");
    expect(authorPlugin).toContain("http");
  });
});
