import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/action-token-env");

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("OpenSpec change action-token-env", () => {
  it("keeps the change in openspec/changes/ (not archived, not a new docs id)", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(
      existsSync(join(ROOT, "openspec/changes/docs-full-catalog-playground")),
    ).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/action-token-env"))).toBe(
      false,
    );
  });

  it("names optional *_token with no default and yaml token_env", () => {
    const proposal = readChange("proposal.md");
    const actionApi = readChange("specs/action-public-api/spec.md");
    const plugin = readChange("specs/plugin-contract/spec.md");

    expect(proposal).toContain("spotify_token");
    expect(proposal).toContain("steam_token");
    expect(proposal).toContain("token_env");
    expect(proposal).toContain("no default");
    expect(actionApi).toContain(
      "### Requirement: Optional required-auth Action tokens have no default",
    );
    expect(actionApi).toContain("spotify_token");
    expect(actionApi).toContain("steam_token");
    expect(plugin).toContain(
      "### Requirement: Yaml token_env is an environment variable name",
    );
    expect(plugin).toContain("plugins.http.token_env");
  });

  it("forbids flattened Action inputs and extra pack bools", () => {
    const proposal = readChange("proposal.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");
    const plugin = readChange("specs/plugin-contract/spec.md");

    for (const source of [proposal, authorPlugin, plugin]) {
      expect(source).toContain("plugin_<plugin>_<widget>_<option>");
    }
    expect(authorPlugin).toContain("plugin_wakatime");
    expect(authorPlugin).toContain("plugin_spotify");
    expect(authorPlugin).toContain("plugin_steam");
    expect(plugin).toContain("MUST NOT expose `plugin_spotify`");
  });

  it("does not add first-party ids or author-integration add live dests", () => {
    const proposal = readChange("proposal.md");
    const authorPlugin = readChange("specs/author-plugin/spec.md");
    const design = readChange("design.md");

    expect(authorPlugin).toContain("FIRST_PARTY_PLUGIN_IDS");
    expect(authorPlugin).toContain(
      "MUST NOT run `author-integration add` for those ids",
    );
    expect(proposal).toContain("author-integration add");
    expect(proposal).toContain("github");
    expect(proposal).toContain("wakatime");
    expect(proposal).toContain("rss");
    expect(proposal).toContain("http");
    expect(design).toContain("W2-A-03");
    expect(design).toContain("W2-A-04");
    expect(design).toContain("Do not run `npx skills add`");
  });
});
