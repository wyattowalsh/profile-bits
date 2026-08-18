import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COPY_BUTTON_LABEL } from "../preview/copy-button";
import {
  CODE_RAIL_LABELS,
  CODE_RAIL_TARGET_IDS,
  CodeRail,
  type CodeRailValues,
  codeRailTargets,
} from "./code-rail";

const VALUES: CodeRailValues = {
  workflowYml: "name: Profile Bits\non:\n  schedule:\n  workflow_dispatch:\n",
  configYml: "version: 1\nplugins:\n  github:\n    widgets:\n      stats: {}\n",
  readmeMd: "![stats](./profile-bits/stats.svg)\n",
};

function sourceUrl(): URL {
  return new URL("./code-rail.tsx", import.meta.url);
}

function renderedHtml(values: CodeRailValues = VALUES): string {
  return renderToStaticMarkup(createElement(CodeRail, values));
}

describe("codeRailTargets", () => {
  it("returns three labeled copy values for playground emit strings", () => {
    const targets = codeRailTargets(VALUES);

    expect(CODE_RAIL_TARGET_IDS).toEqual(["workflow", "config", "readme"]);
    expect(targets).toHaveLength(3);
    expect(targets.map((target) => target.id)).toEqual([
      "workflow",
      "config",
      "readme",
    ]);
    expect(targets.map((target) => target.label)).toEqual([
      CODE_RAIL_LABELS.workflow,
      CODE_RAIL_LABELS.config,
      CODE_RAIL_LABELS.readme,
    ]);
    expect(targets.map((target) => target.value)).toEqual([
      VALUES.workflowYml,
      VALUES.configYml,
      VALUES.readmeMd,
    ]);
    expect(CODE_RAIL_LABELS.workflow).toMatch(/workflow/i);
    expect(CODE_RAIL_LABELS.config).toMatch(/config/i);
    expect(CODE_RAIL_LABELS.config).toContain(".github/profile-bits.yml");
    expect(CODE_RAIL_LABELS.readme).toMatch(/README/);
  });
});

describe("CodeRail source", () => {
  it("is a client island that copies via CopyButton only", async () => {
    const source = await readFile(sourceUrl(), "utf8");

    expect(source).toContain('"use client"');
    expect(source).toContain('from "../preview/copy-button"');
    expect(source).toContain("workflowYml");
    expect(source).toContain("configYml");
    expect(source).toContain("readmeMd");
    expect(source).toContain("<CopyButton value={target.value} />");
    expect(source).toContain('data-slot="code-rail"');
    expect(source).not.toMatch(/from ["']@\/src\/generate/);
    expect(source).not.toMatch(/from ["']\.\.\/generate/);
    expect(source).not.toContain("pack-emitter");
    expect(source).not.toContain("source-drop");
    expect(source).not.toMatch(/\bzip\b/i);
    expect(source).not.toMatch(/\bDownload\b/);
    expect(source).not.toMatch(/\bShare\b/);
  });
});

describe("CodeRail", () => {
  it("renders three labeled copy targets with Copy as the primary CTA", () => {
    const html = renderedHtml();
    const copyButtons =
      html.match(/<button[^>]*data-slot="copy-button"/g) ?? [];
    const targets = html.match(/data-code-rail-target="[^"]+"/g) ?? [];

    expect(html).toContain('data-slot="code-rail"');
    expect(html).toMatch(/workflow/i);
    expect(html).toMatch(/config/i);
    expect(html).toMatch(/README/);
    expect(html).toContain(CODE_RAIL_LABELS.workflow);
    expect(html).toContain(CODE_RAIL_LABELS.config);
    expect(html).toContain(CODE_RAIL_LABELS.readme);
    expect(html).toContain(VALUES.workflowYml);
    expect(html).toContain(VALUES.configYml);
    expect(html).toContain(VALUES.readmeMd);
    expect(html).toContain('data-code-rail-target="workflow"');
    expect(html).toContain('data-code-rail-target="config"');
    expect(html).toContain('data-code-rail-target="readme"');
    expect(copyButtons).toHaveLength(3);
    expect(targets).toHaveLength(3);
    expect(html).toContain(COPY_BUTTON_LABEL);
    expect(html).toContain('type="button"');
    expect(html.toLowerCase()).not.toContain("download");
    expect(html.toLowerCase()).not.toContain("share");
    expect(html.toLowerCase()).not.toContain("zip");
  });

  it("passes workflow, config, and README values through to CopyButton", async () => {
    const source = await readFile(sourceUrl(), "utf8");
    const html = renderedHtml();
    const copyButtons =
      html.match(/<button[^>]*data-slot="copy-button"/g) ?? [];

    expect(source).toContain("value: values[VALUE_KEY[id]]");
    expect(source).toContain("<CopyButton value={target.value} />");
    expect(source).toContain('readme: "readmeMd"');
    expect(copyButtons).toHaveLength(3);
    expect(html).toContain(VALUES.workflowYml);
    expect(html).toContain(VALUES.configYml);
    expect(html).toContain(VALUES.readmeMd);
  });
});
