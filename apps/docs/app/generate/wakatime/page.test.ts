import { readFile } from "node:fs/promises";
import { WAKATIME_BITS_USED } from "@profile-bits/plugins";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_GENERATE_REQUEST } from "@/src/generate/constants";
import {
  PREVIEW_WAKATIME_WIDGET_IDS,
  PREVIEW_WIDGET_IDS,
} from "@/src/preview/types";
import GenerateWakatimePage, {
  WAKATIME_GENERATE_BITS_USED,
  WAKATIME_GENERATE_HREF,
  WAKATIME_GENERATE_WIDGET_IDS,
  WAKATIME_PLUGIN_ID,
  wakatimePackRequest,
  wakatimeWidgetHref,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("GET /generate/wakatime", () => {
  it("is a server page that does not remount GenerateShell", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("GenerateShell");
    expect(source).toContain("wakatimePackRequest");
    expect(source).toContain('data-slot="generate-wakatime"');
    expect(source).toContain("WAKATIME_BITS_USED");
    expect(source).toContain("PREVIEW_WAKATIME_WIDGET_IDS");
    expect(source).not.toContain("PREVIEW_WIDGET_IDS");
    expect(source).not.toContain("PREVIEW_GITHUB_WIDGET_IDS");
    expect(source).not.toContain("githubWidgetRegistry");
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/\byaml\b/i);
    expect(source).not.toContain("/generate/github/coding");
    expect(source).not.toContain("plugin_wakatime");
  });

  it("locks the pack request to wakatime coding and pack bitsUsed", () => {
    expect(WAKATIME_PLUGIN_ID).toBe("wakatime");
    expect(WAKATIME_GENERATE_HREF).toBe("/generate/wakatime");
    expect(WAKATIME_GENERATE_WIDGET_IDS).toEqual(["coding"]);
    expect(WAKATIME_GENERATE_WIDGET_IDS).toEqual(PREVIEW_WAKATIME_WIDGET_IDS);
    expect(PREVIEW_WIDGET_IDS).not.toEqual(PREVIEW_WAKATIME_WIDGET_IDS);
    expect(WAKATIME_GENERATE_BITS_USED).toEqual([...WAKATIME_BITS_USED]);
    expect(wakatimeWidgetHref("coding")).toBe("/generate/wakatime/coding");
    expect(wakatimePackRequest()).toEqual({
      ...DEFAULT_GENERATE_REQUEST,
      scope: "plugin",
      plugin: WAKATIME_PLUGIN_ID,
    });
  });

  it("renders bitsUsed and the coding widget without dumping github ids", () => {
    const html = renderToStaticMarkup(createElement(GenerateWakatimePage));

    expect(html).not.toContain('data-slot="generate-shell"');
    expect(html).toContain('data-slot="generate-wakatime"');
    expect(html).toContain('data-plugin="wakatime"');
    expect(html).toContain('data-href="/generate/wakatime"');
    expect(html).toContain(`data-bits-used="${WAKATIME_BITS_USED.join(" ")}"`);
    expect(html).toContain("<h2>wakatime</h2>");
    expect(html).toContain("<code>wakatime</code>");
    expect(html).toContain("<code>coding</code>");
    expect(html).toContain("<code>bitsUsed</code>");
    expect(html).toContain('href="/generate/wakatime/coding"');
    expect(html).not.toContain('href="/generate/github/coding"');
    expect(html).not.toContain("<code>demo</code>");
    expect(html).not.toContain("<code>feed</code>");
    expect(html).not.toContain("<code>chips</code>");
    expect(html).toContain("Download");
    expect(html).toContain("Share");
    expect(html).toContain("480×160");
    expect(html.toLowerCase()).not.toContain("yaml");
    expect(html).not.toContain("source-drop");
    for (const bit of WAKATIME_BITS_USED) {
      expect(html).toContain(`<li data-slot="generate-pack-bit">${bit}</li>`);
    }
  });
});
