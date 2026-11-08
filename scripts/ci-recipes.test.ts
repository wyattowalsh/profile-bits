import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const PLAYGROUND_GROUPS = ["coding", "feed", "json", "chips"] as const;

const TOKEN_PATHS = [
  "github_token",
  "committer_token",
  "wakatime_token",
  "http_token",
  "http_token_env",
] as const;

type PlaygroundField = {
  path: string;
  group: string;
};

function read(relativePath: string): string {
  const path = join(ROOT, relativePath);
  expect(existsSync(path), relativePath).toBe(true);
  return readFileSync(path, "utf8");
}

describe("W1-D-13 CI recipes", () => {
  it("ci.yml runs lint, generate-action --check, generate-docs --check, and test", () => {
    const source = read(".github/workflows/ci.yml");
    expect(source).toContain("run: pnpm lint");
    expect(source).toContain("run: pnpm generate-action --check");
    expect(source).toContain("run: pnpm generate-docs --check");
    expect(source).toContain("run: pnpm test");
    expect(source).not.toContain("npx skills add");
  });

  it("justfile exposes lint, generate-docs, generate-action, and check", () => {
    const source = read("justfile");
    expect(source).toMatch(/^lint:\n {4}pnpm lint$/m);
    expect(source).toMatch(
      /^generate-action \*args:\n {4}pnpm generate-action \{\{ args \}\}$/m,
    );
    expect(source).toMatch(
      /^generate-docs \*args:\n {4}pnpm generate-docs \{\{ args \}\}$/m,
    );
    expect(source).toContain("pnpm check");
    expect(source).toContain("just validate-agent-plugins");
  });

  it("package.json check runs lint, test, and both --check recipes", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.check).toBe(
      "pnpm lint && pnpm test && pnpm generate-action --check && pnpm generate-docs --check",
    );
    expect(pkg.scripts.lint).toBe("biome check .");
    expect(pkg.scripts.test).toBe("vitest run");
    expect(pkg.scripts["generate-action"]).toContain(
      "packages/core/src/codegen/cli.ts",
    );
    expect(pkg.scripts["generate-docs"]).toContain(
      "packages/core/src/codegen/docs-cli.ts",
    );
  });

  it("playground-fields snapshot has coding/feed/json/chips and omits tokens", () => {
    const fields = JSON.parse(
      read("packages/core/src/codegen/__snapshots__/playground-fields.json"),
    ) as PlaygroundField[];
    const groups = new Set(fields.map((field) => field.group));
    const paths = fields.map((field) => field.path);
    for (const group of PLAYGROUND_GROUPS) {
      expect(groups.has(group), group).toBe(true);
    }
    expect(paths.some((path) => /token/i.test(path))).toBe(false);
    for (const path of TOKEN_PATHS) {
      expect(paths).not.toContain(path);
    }
    expect(
      paths.some((path) => /^plugin_[a-z0-9]+_[a-z0-9_]+$/.test(path)),
    ).toBe(false);
  });

  it("action.yml stays thin with no plugin_*_*_* or extra pack bools", () => {
    const yml = read("action.yml");
    expect(yml).toMatch(/^ {2}plugin_github:/m);
    expect(yml).toMatch(/^ {2}wakatime_token:/m);
    expect(yml).toMatch(/^ {2}http_token_env:/m);
    expect(yml).not.toMatch(/^ {2}plugin_[a-z0-9]+_[a-z0-9_]+:/m);
    expect(yml).not.toMatch(/^ {2}plugin_wakatime:/m);
    expect(yml).not.toMatch(/^ {2}plugin_rss:/m);
    expect(yml).not.toMatch(/^ {2}plugin_http:/m);
  });

  it("finishes docs-full-catalog-playground in place including task 5.2", () => {
    const tasks = read(
      "openspec/changes/archive/2026-11-08-docs-full-catalog-playground/tasks.md",
    );
    expect(existsSync(join(ROOT, "openspec/changes/marketplace-release"))).toBe(
      true,
    );
    expect(tasks).toContain(
      "- [x] 5.2 Tests + `just generate-docs --check` after docs-fields snapshot. `just lint` / targeted vitest. Do not commit. Do not tag `v1`. Do not edit marketplace-release.",
    );
    expect(tasks).not.toMatch(/^- \[ \]/m);
    expect(tasks).not.toContain("marketplace-release/**");
  });
});
