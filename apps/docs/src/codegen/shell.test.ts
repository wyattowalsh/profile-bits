import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { COPY_BUTTON_LABEL } from "../preview/copy-button";
import { PREVIEW_OUTPUT_FORMATS, PREVIEW_WIDGET_IDS } from "../preview/types";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: import("react").ReactNode;
  }) => createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/playground/github",
  useSearchParams: () => new URLSearchParams(),
}));

import {
  GENERATE_BUTTON_LABEL,
  PLAYGROUND_PLUGIN,
  PlaygroundShell,
  widgetFromPathname,
} from "./shell";

const LAYOUT_URL = new URL("../../app/playground/layout.tsx", import.meta.url);
const SHELL_URL = new URL("./shell.tsx", import.meta.url);

describe("playground layout (server)", () => {
  it("is a server layout with no client directive", async () => {
    const source = await readFile(LAYOUT_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("PlaygroundShell");
    expect(source).toContain("HomeLayout");
    expect(source).toContain("baseOptions");
    expect(source).toContain('title: "Playground"');
    expect(source).not.toContain("app/generate");
    expect(source).not.toContain("/playground/generate");
    expect(source).not.toContain("source-drop");
  });
});

describe("widgetFromPathname", () => {
  it("reads v0 github widget ids from the playground path", () => {
    expect(widgetFromPathname("/playground/github")).toBeUndefined();
    expect(widgetFromPathname("/playground/github/demo")).toBe("demo");
    expect(widgetFromPathname("/playground/github/stats")).toBe("stats");
    expect(widgetFromPathname("/playground/github/languages")).toBe(
      "languages",
    );
    expect(widgetFromPathname("/playground/github/coding")).toBeUndefined();
  });
});

describe("PlaygroundShell (client island)", () => {
  it("declares a client module that statically imports sibling chrome", async () => {
    const source = await readFile(SHELL_URL, "utf8");
    const firstLine = source.split("\n").find((line) => line.trim() !== "");

    expect(firstLine).toBe('"use client";');
    expect(source).toContain('data-slot="playground-tuners"');
    expect(source).toContain('data-slot="playground-stage"');
    expect(source).toContain('data-slot="playground-emit"');
    expect(source).toContain("SchemaForm");
    expect(source).toContain("GlobalBar");
    expect(source).toContain("PreviewStage");
    expect(source).toContain("CodeRail");
    expect(source).toContain("PackEmitter");
    expect(source).toContain("packEmitterState");
    expect(source).toContain("exportReadmeMarkdown");
    expect(source).toContain("FixturePill");
    expect(source).toContain("CrossLink");
    expect(source).toContain("usePreview");
    expect(source).toContain(GENERATE_BUTTON_LABEL);
    expect(source).toContain("source-drop");
    expect(source).not.toMatch(/\bDownload\b/);
    expect(source).not.toMatch(/\bShare\b/);
  });

  it("renders three-column github codegen chrome with Copy as primary CTA", () => {
    const html = renderToStaticMarkup(createElement(PlaygroundShell));

    expect(html).toContain('data-slot="playground-shell"');
    expect(html).toContain('data-plugin="github"');
    expect(html).toContain('data-slot="playground-tuners"');
    expect(html).toContain('data-slot="playground-stage"');
    expect(html).toContain('data-slot="playground-emit"');
    expect(html).toContain('data-slot="plugin-selector"');
    expect(html).toContain('data-slot="widget-checkboxes"');
    expect(html).toContain('data-slot="schema-form"');
    expect(html).toContain('data-slot="preview-stage"');
    expect(html).toContain('data-slot="code-rail"');
    expect(html).toContain('data-slot="pack-emitter"');
    expect(html).toContain('data-slot="global-bar"');
    expect(html).toContain('data-slot="fixture-pill"');
    expect(html).toContain('data-slot="cross-link"');
    expect(html).toContain('data-slot="copy-button"');
    expect(html).toContain('data-slot="playground-page"');
    expect(html).toContain(COPY_BUTTON_LABEL);
    expect(html).toContain('value="github"');
    expect(html).toContain("/generate/github");
    expect(html).not.toContain("wakatime");
    expect(html).not.toContain("rss");
    expect(html.toLowerCase()).not.toContain("download");
    expect(html.toLowerCase()).not.toContain("share");
    expect(html).toContain("source-drop");

    for (const widget of PREVIEW_WIDGET_IDS) {
      expect(html).toContain(`value="${widget}"`);
    }
    for (const format of PREVIEW_OUTPUT_FORMATS) {
      expect(html).toContain(`value="${format}"`);
    }
    expect(PREVIEW_OUTPUT_FORMATS).toEqual(
      expect.arrayContaining(["gif", "apng", "webp"]),
    );
    expect(PLAYGROUND_PLUGIN).toBe("github");
  });

  it("renders children into the shell", () => {
    const html = renderToStaticMarkup(
      createElement(
        PlaygroundShell,
        null,
        createElement("p", null, "injected"),
      ),
    );
    expect(html).toContain("injected");
    expect(html).toContain('data-slot="playground-page"');
  });
});
