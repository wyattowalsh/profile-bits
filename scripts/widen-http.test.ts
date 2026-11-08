import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/widen-http");
const SHIELDCN_NPM = join(
  ROOT,
  "packages/integrations/src/http/fixtures/chips/shieldcn/npm.json",
);
const SHIELDS_NPM = join(
  ROOT,
  "packages/integrations/src/http/fixtures/chips/shields/npm.json",
);

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("OpenSpec change widen-http", () => {
  it("keeps the change in openspec/changes/ (not archived, not a new docs id)", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "openspec/changes/archive/2026-11-08-docs-full-catalog-playground",
        ),
      ),
    ).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/widen-http"))).toBe(false);
  });

  it("keeps json as a full JSON dump and jmespath as a widget reader", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const widget = readChange("specs/widget-contract/spec.md");

    expect(proposal).toContain("full parsed JSON value");
    expect(proposal).toContain("jmespath");
    expect(integration).toContain(
      "### Requirement: http json cache is the full JSON value",
    );
    expect(integration).toContain("MUST NOT drop keys");
    expect(integration).toContain("MUST NOT apply `jmespath`");
    expect(integration).toContain(
      "### Requirement: http HTTP skip and fail matrix",
    );
    expect(integration).toContain("JSON parse throw");
    expect(integration).toContain("jmespath throw is widget-side");
    expect(widget).toContain(
      "### Requirement: json jmespath is a widget reader",
    );
    expect(widget).toContain("MUST NOT ask the http client to filter");
  });

  it("caches raw badge JSON and keeps normalize as a widget reader", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const widget = readChange("specs/widget-contract/spec.md");

    expect(proposal).toContain("{ label, message, color, name, value, link }");
    expect(proposal).toContain("normalizeBadgeJson");
    expect(integration).toContain(
      "### Requirement: chips cache is raw badge JSON",
    );
    expect(integration).toContain(
      "`label`, `message`, `color`, `name`, `value`, and `link`",
    );
    expect(integration).toContain("MUST NOT drop `name`, `value`, or `link`");
    expect(integration).toContain("shieldcn cache keeps value and link");
    expect(integration).toContain(
      "MUST NOT normalize to `{ label, message, color? }` at fetch",
    );
    expect(widget).toContain(
      "### Requirement: chips normalize is a widget reader",
    );
    expect(widget).toContain("message = message ?? value");
    expect(widget).toContain(
      "MUST leave `value` and `link` on the cached dump",
    );
    expect(widget).toContain("cache retains link while render ignores it");
    expect(widget).toContain("label");
    expect(widget).toContain("message");
    expect(widget).toContain("color");
  });

  it("keeps chips GET auth none and forbids extra vendor clients", () => {
    const integration = readChange("specs/integration-contract/spec.md");
    const widget = readChange("specs/widget-contract/spec.md");
    const design = readChange("design.md");

    expect(integration).toContain("auth: none");
    expect(integration).toContain('cache auth `"none"`');
    expect(integration).toContain("shieldcn.dev");
    expect(integration).toContain("img.shields.io");
    expect(integration).toContain("MUST NOT add ids `shieldcn` or `shields`");
    expect(integration).toContain("MUST NOT import octokit");
    expect(widget).toContain("per-request auth `none`");
    expect(design).toContain("W2-HTTP-03");
    expect(design).toContain("no extra vendor client");
  });

  it("forbids flattened Action inputs and author-integration add on live dests", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const design = readChange("design.md");

    for (const source of [proposal, integration, design]) {
      expect(source).toContain("plugin_<plugin>_<widget>_<option>");
    }
    expect(proposal).toContain("author-integration add");
    expect(proposal).toContain("github");
    expect(proposal).toContain("wakatime");
    expect(proposal).toContain("rss");
    expect(proposal).toContain("http");
    expect(integration).toContain(
      "MUST NOT run `author-integration add` for `github`, `wakatime`, `rss`, or `http`",
    );
    expect(design).toContain("MUST NOT `author-integration add`");
    expect(design).toContain("docs-full-catalog-playground");
    expect(design).toContain("POST /api/preview");
    expect(design).toContain("Do not run `npx skills add`");
    expect(design).toContain("Do not tag `v1` on `main`");
  });

  it("keeps shieldcn fixture link/value and shields name/value for later dump nodes", () => {
    const shieldcn = JSON.parse(readFileSync(SHIELDCN_NPM, "utf8")) as {
      label?: unknown;
      value?: unknown;
      link?: unknown;
      message?: unknown;
    };
    const shields = JSON.parse(readFileSync(SHIELDS_NPM, "utf8")) as {
      label?: unknown;
      message?: unknown;
      color?: unknown;
      name?: unknown;
      value?: unknown;
    };

    expect(shieldcn).toMatchObject({
      label: "npm",
      value: "19.1.1",
      link: "https://www.npmjs.com/package/react",
    });
    expect(shieldcn).not.toHaveProperty("message");
    expect(shields).toMatchObject({
      label: "npm",
      message: "v19.1.1",
      color: "blue",
      name: "npm",
      value: "v19.1.1",
    });
  });
});
