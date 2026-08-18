import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** packages/plugins/src → repo root (three levels up). Never process.cwd(). */
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const WIDGET_TEMPLATES =
  ".agents/profile-bits/skills/author-widget/assets/templates";
const PLUGIN_TEMPLATES =
  ".agents/profile-bits/skills/author-plugin/assets/templates";
const INTEGRATION_TEMPLATES =
  ".agents/profile-bits/skills/author-integration/assets/templates";

const SIX_LAYOUT_BITS_ARRAY = new RegExp(
  String.raw`\[\s*["']Theme["']\s*,\s*["']Frame["']\s*,\s*` +
    String.raw`["']Stack["']\s*,\s*["']Row["']\s*,\s*` +
    String.raw`["']Text["']\s*,\s*["']Muted["']\s*,?\s*\]`,
);

const AUTH_SCHEME_FILES = [
  "auth.none.ts.template",
  "auth.github-bearer.ts.template",
  "auth.wakatime-basic.ts.template",
  "auth.http-optional.ts.template",
] as const;

function readExisting(relativePath: string): string {
  const absolutePath = join(repoRoot, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

function namedImportsFromBits(source: string): string[] {
  const match = source.match(
    /import\s*\{([^}]+)\}\s*from\s*["']@profile-bits\/bits["']/,
  );
  if (match?.[1] === undefined) {
    return [];
  }
  return match[1]
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

describe("author skill templates", () => {
  describe("widget.tsx.template and widget.mdx.template", () => {
    it.each(["widget.tsx.template", "widget.mdx.template"] as const)(
      "%s has no tw=, no Bar value=, and uses pct=",
      (filename) => {
        const source = readExisting(`${WIDGET_TEMPLATES}/${filename}`);
        expect(source).not.toContain("tw=");
        expect(source).not.toMatch(/<Bar[^>]*\bvalue=/);
        expect(source).toContain("pct=");
      },
    );

    it("tsx Avatar import uses a guarded non-empty src", () => {
      const source = readExisting(`${WIDGET_TEMPLATES}/widget.tsx.template`);
      const bitsNames = namedImportsFromBits(source);
      if (bitsNames.includes("Avatar")) {
        expect(source).toMatch(
          /typeof data\.avatarUrl === ["']string["']\s*&&\s*data\.avatarUrl\.length\s*>\s*0/,
        );
        expect(source).toMatch(/<Avatar\b[^>]*\bsrc=\{data\.avatarUrl\}/);
      }
      expect(source).not.toContain('src=""');
      expect(source).not.toContain("src=''");
    });

    it("mdx omits Avatar from JSX and the bits import list", () => {
      const source = readExisting(`${WIDGET_TEMPLATES}/widget.mdx.template`);
      expect(source).not.toContain("<Avatar");
      expect(namedImportsFromBits(source)).not.toContain("Avatar");
    });
  });

  it("fetch.ts.template does not read options.include_private", () => {
    const source = readExisting(`${WIDGET_TEMPLATES}/fetch.ts.template`);
    expect(source).not.toContain("options.include_private");
  });

  describe("integration auth templates", () => {
    it("auth.ts.template must not exist", () => {
      const relativePath = `${INTEGRATION_TEMPLATES}/auth.ts.template`;
      expect(existsSync(join(repoRoot, relativePath))).toBe(false);
    });

    it.each(AUTH_SCHEME_FILES)("%s exists", (filename) => {
      const source = readExisting(`${INTEGRATION_TEMPLATES}/${filename}`);
      expect(source.length).toBeGreaterThan(0);
    });

    it("auth.github-bearer.ts.template may contain decideActionToken", () => {
      const source = readExisting(
        `${INTEGRATION_TEMPLATES}/auth.github-bearer.ts.template`,
      );
      expect(source).toMatch(/Bearer/);
    });

    it("auth.wakatime-basic.ts.template encodes Basic api_key, not Bearer or decideActionToken", () => {
      const source = readExisting(
        `${INTEGRATION_TEMPLATES}/auth.wakatime-basic.ts.template`,
      );
      expect(source).toMatch(/\bBasic\b/);
      expect(source).toMatch(/api_key|base64|btoa/);
      expect(source).not.toContain("decideActionToken");
      expect(source).not.toMatch(/\?api_key=/);
      expect(source).not.toMatch(/`Bearer \$\{/);
      expect(source).not.toMatch(/["']Bearer /);
    });

    it("auth.http-optional.ts.template and auth.none.ts.template omit decideActionToken", () => {
      const httpOptional = readExisting(
        `${INTEGRATION_TEMPLATES}/auth.http-optional.ts.template`,
      );
      const none = readExisting(
        `${INTEGRATION_TEMPLATES}/auth.none.ts.template`,
      );
      expect(httpOptional).not.toContain("decideActionToken");
      expect(none).not.toContain("decideActionToken");
    });

    it("scopes.ts.template and inputs.ts.template omit decideActionToken", () => {
      const scopes = readExisting(
        `${INTEGRATION_TEMPLATES}/scopes.ts.template`,
      );
      const inputs = readExisting(
        `${INTEGRATION_TEMPLATES}/inputs.ts.template`,
      );
      expect(scopes).not.toContain("decideActionToken");
      expect(inputs).not.toContain("decideActionToken");
    });
  });

  describe("plugin templates", () => {
    it("plugin.test.ts.template has no closed six-name Theme…Muted array", () => {
      const source = readExisting(
        `${PLUGIN_TEMPLATES}/plugin.test.ts.template`,
      );
      expect(source).not.toMatch(SIX_LAYOUT_BITS_ARRAY);
    });

    it("plugin.ts.template starter bitsUsed does not require Stat or Avatar", () => {
      const source = readExisting(`${PLUGIN_TEMPLATES}/plugin.ts.template`);
      expect(source).toContain('"Theme"');
      expect(source).toContain('"Frame"');
      expect(source).toContain('"Stack"');
      expect(source).toContain('"Row"');
      expect(source).toContain('"Text"');
      expect(source).toContain('"Muted"');
      expect(source).not.toMatch(/["']Stat["']/);
      expect(source).not.toMatch(/["']Avatar["']/);
    });
  });

  it("client.test.ts.template switches on {{scheme}} and does not always expect Bearer", () => {
    const source = readExisting(
      `${INTEGRATION_TEMPLATES}/client.test.ts.template`,
    );
    expect(source).toContain("{{scheme}}");
    expect(source).toContain('case "none"');
    expect(source).toContain('case "github-bearer"');
    expect(source).toContain('case "wakatime-basic"');
    expect(source).toContain('case "http-optional"');
    expect(source).not.toMatch(/\{\{scheme\}\}\s*!==?\s*["']none["']/);
  });

  it("ci.yml runs both generate-action and generate-docs --check", () => {
    const source = readExisting(".github/workflows/ci.yml");
    expect(source).toContain("Generate action --check");
    expect(source).toContain("pnpm generate-action --check");
    expect(source).toContain("Generate docs --check");
    expect(source).toContain("pnpm generate-docs --check");
  });
});
