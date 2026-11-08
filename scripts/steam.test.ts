import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/steam");
const TYPES = join(ROOT, "packages/core/src/types.ts");

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("OpenSpec change steam (W3-ST-01)", () => {
  it("keeps the change in openspec/changes/ (not archived, not a new docs id)", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(
      existsSync(join(ROOT, "openspec/changes/docs-full-catalog-playground")),
    ).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/steam"))).toBe(false);
    expect(existsSync(join(ROOT, "openspec/changes/archive/steam"))).toBe(
      false,
    );
  });

  it("names query-key ?key=, steam_token, and widgets player and recent", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const widgets = readChange("specs/widget-contract/spec.md");
    const plugins = readChange("specs/plugin-contract/spec.md");

    expect(proposal).toContain("query-key");
    expect(proposal).toContain("?key=");
    expect(proposal).toContain("steam_token");
    expect(proposal).toContain("`player`");
    expect(proposal).toContain("`recent`");
    expect(integration).toContain(
      "### Requirement: steam client authenticates with query-key ?key=",
    );
    expect(integration).toContain("MUST NEVER send");
    expect(integration).toContain("`Authorization`");
    expect(widgets).toContain(
      "### Requirement: steam player widget selects from the dump",
    );
    expect(widgets).toContain(
      "### Requirement: steam recent widget selects from the dump",
    );
    expect(plugins).toContain("steam_token");
    expect(plugins).toContain("token_env");
  });

  it("requires the complete Steam Web API dump and widgets that select", () => {
    const integration = readChange("specs/integration-contract/spec.md");
    const widgets = readChange("specs/widget-contract/spec.md");
    const design = readChange("design.md");

    expect(integration).toContain(
      "### Requirement: steam cached payload is the Steam Web API dump",
    );
    expect(integration).toContain("ISteamUser/GetPlayerSummaries/v2");
    expect(integration).toContain("IPlayerService/GetRecentlyPlayedGames/v1");
    expect(integration).toContain("ISteamUser/ResolveVanityURL/v1");
    expect(integration).toContain(
      "#### Scenario: Widgets select from the steam dump",
    );
    expect(integration).toContain("MUST NOT perform HTTP");
    expect(integration).toContain(
      "#### Scenario: Fetch does not apply recent limit",
    );
    expect(widgets).toContain("MUST NOT perform HTTP");
    expect(widgets).toContain("apply in the widget reader");
    expect(design).toContain("W3-ST-02");
    expect(design).toContain("packages/integrations/src/steam/");
  });

  it("keeps the Web API key out of logs and cache keys", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");

    expect(proposal).toContain('REST cache auth is `"query-key"`');
    expect(proposal).toContain("MUST omit");
    expect(proposal).toContain("`key`");
    expect(integration).toContain(
      "### Requirement: steam cache and logs never store the Web API key",
    );
    expect(integration).toContain('auth` is `"query-key"`');
    expect(integration).toContain(
      "#### Scenario: cache auth is query-key never the secret",
    );
    expect(integration).toContain(
      "#### Scenario: cache url and params omit key",
    );
    expect(integration).toContain("#### Scenario: logs redact the steam token");
    expect(integration).toContain("MUST NOT contain the raw `steam_token`");
  });

  it("requires pack-on missing token fail_job and no Bearer", () => {
    const integration = readChange("specs/integration-contract/spec.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");

    expect(integration).toContain(
      "#### Scenario: missing steam_token with pack on fails the job",
    );
    expect(integration).toContain("MUST fail and MUST NOT send a request");
    expect(integration).toContain(
      "#### Scenario: Bearer is not used for steam keys",
    );
    expect(integration).toContain("MUST NOT send `Authorization: Bearer`");
    expect(authorPlugin).toContain(
      "MUST NOT copy `auth.http-optional.ts.template`",
    );
  });

  it("forbids flatten, extra pack bools, types.ts edits, and live dest add", () => {
    const proposal = readChange("proposal.md");
    const plugins = readChange("specs/plugin-contract/spec.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");
    const integration = readChange("specs/integration-contract/spec.md");

    for (const source of [proposal, plugins, authorPlugin, integration]) {
      expect(source).toContain("plugin_<plugin>_<widget>_<option>");
    }
    expect(plugins).toContain("plugin_steam");
    expect(authorPlugin).toContain(
      "MUST NOT edit `packages/core/src/types.ts`",
    );
    expect(authorPlugin).toContain(
      "MUST NOT run `author-integration add` for those ids",
    );
    expect(authorPlugin).toContain("github");
    expect(authorPlugin).toContain("wakatime");
    expect(authorPlugin).toContain("rss");
    expect(authorPlugin).toContain("http");
    expect(authorPlugin).toContain("auth.query-key.ts.template");
    expect(integration).toContain("/repos/{owner}/{repo}/languages");
    expect(authorPlugin).toContain("POST /api/preview");
    expect(authorPlugin).toContain("not a public embed API");
  });

  it("lands the steam client and pack on query-key", () => {
    const design = readChange("design.md");
    const types = readFileSync(TYPES, "utf8");
    const clientPath = join(ROOT, "packages/integrations/src/steam/client.ts");
    const pluginPath = join(ROOT, "packages/plugins/src/steam");

    expect(design).toContain("W3-ST-01 is");
    expect(design).toContain("spec-only");
    expect(design).toContain("docs-full-catalog-playground");
    expect(existsSync(clientPath)).toBe(true);
    expect(existsSync(pluginPath)).toBe(true);
    const client = readFileSync(clientPath, "utf8");
    expect(client).toContain("?key=");
    expect(client).toContain("query-key");
    expect(client).toContain("GetPlayerSummaries");
    expect(client).toContain("GetRecentlyPlayedGames");
    expect(client).toContain("ResolveVanityURL");
    expect(client).not.toContain("Bearer");
    expect(types).toContain('"steam"');
    expect(types).toContain("player:");
    expect(types).toContain("recent:");
    expect(types).toContain("steam_token:");
    expect(types).not.toMatch(/plugin_steam:/);
    expect(types).not.toMatch(/plugin_steam_player_/);
  });
});
