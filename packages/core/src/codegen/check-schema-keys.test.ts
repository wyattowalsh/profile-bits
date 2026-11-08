import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { ActionInputsSchema } from "../types.ts";
import { generateActionYml, THIN_ACTION_INPUT_NAMES } from "./action-yml.ts";
import {
  actionYmlInputNames,
  checkActionYml,
  schemaActionInputNames,
} from "./check.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const ACTION_YML = join(ROOT, "action.yml");
const DOCS_CHANGE = join(ROOT, "openspec/changes/docs-full-catalog-playground");

const EXTRA_PACK_BOOLS = [
  "plugin_wakatime",
  "plugin_rss",
  "plugin_http",
  "plugin_spotify",
  "plugin_steam",
] as const;

const NO_DEFAULT_TOKENS = [
  "wakatime_token",
  "http_token_env",
  "spotify_token",
  "steam_token",
] as const;

function committedActionYml(): string {
  expect(existsSync(ACTION_YML), "action.yml").toBe(true);
  return readFileSync(ACTION_YML, "utf8");
}

describe("W2-A-04 schema keys ≡ action.yml", () => {
  it("ActionInputsSchema keys equal thin, generated, and committed inputs", () => {
    const schema = schemaActionInputNames();
    const generated = actionYmlInputNames(generateActionYml()).sort();
    const committed = actionYmlInputNames(committedActionYml()).sort();
    const thin = [...THIN_ACTION_INPUT_NAMES].sort();

    expect(schema).toEqual(Object.keys(ActionInputsSchema.shape).sort());
    expect(thin).toEqual(schema);
    expect(generated).toEqual(schema);
    expect(committed).toEqual(schema);
    expect(schema).toEqual(
      expect.arrayContaining([
        "plugin_github",
        "wakatime_token",
        "http_token_env",
        "spotify_token",
        "steam_token",
      ]),
    );
  });

  it("pnpm generate-action --check is green when schema keys equal action.yml", () => {
    const current = committedActionYml();
    expect(checkActionYml(current, generateActionYml())).toEqual({ ok: true });
    expect(current).toBe(generateActionYml());
  });

  it("fails --check when generated yaml omits a schema key", () => {
    const generated = generateActionYml().replace(
      /^ {2}spotify_token:\n {4}description: .+\n/m,
      "",
    );
    const result = checkActionYml(generated, generated);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.join("\n")).toMatch(/spotify_token/);
    expect(result.errors.join("\n")).toMatch(/ActionInputsSchema keys/);
  });

  it("fails --check when current and generated yaml add a pack bool", () => {
    const poisoned = generateActionYml().replace(
      /^ {2}dry_run:/m,
      "  plugin_spotify:\n    description: extra pack bool\n  dry_run:",
    );
    const result = checkActionYml(poisoned, poisoned);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.join("\n")).toMatch(/plugin_spotify/);
    expect(result.errors.join("\n")).toMatch(/ActionInputsSchema keys/);
  });

  it("committed action.yml omits defaults on required-auth tokens", () => {
    const doc = parse(committedActionYml()) as {
      inputs?: Record<string, { default?: unknown } | undefined>;
    };
    const inputs = doc.inputs;
    expect(inputs).toBeDefined();
    if (inputs === undefined) {
      return;
    }
    for (const name of NO_DEFAULT_TOKENS) {
      expect(inputs[name], name).toBeDefined();
      expect(inputs[name]?.default, name).toBeUndefined();
    }
  });

  it("rejects flattened names and extra pack bools", () => {
    const names = schemaActionInputNames();
    const committed = committedActionYml();
    for (const banned of EXTRA_PACK_BOOLS) {
      expect(names).not.toContain(banned);
      expect(committed).not.toMatch(new RegExp(`^ {2}${banned}:`, "m"));
    }
    expect(
      names.some((name) => /^plugin_[a-z0-9]+_[a-z0-9_]+$/.test(name)),
    ).toBe(false);
    expect(committed).not.toMatch(/^ {2}plugin_[a-z0-9]+_[a-z0-9_]+:/m);
    expect(committed).not.toContain("plugin_github_stats_include");
    expect(committed).not.toContain("plugin_wakatime_coding_range");
    expect(committed).not.toContain("plugin_rss_feed_url");
    expect(committed).not.toContain("plugin_http_json_url");
    expect(committed).not.toContain("plugin_http_chips_preset");
  });

  it("finishes docs-full-catalog-playground in place (no new docs id)", () => {
    expect(existsSync(join(DOCS_CHANGE, "tasks.md"))).toBe(true);
    expect(existsSync(join(ROOT, "openspec/changes/action-token-env"))).toBe(
      true,
    );
    const tasks = readFileSync(join(DOCS_CHANGE, "tasks.md"), "utf8");
    expect(tasks).not.toMatch(/^- \[ \]/m);
  });
});
