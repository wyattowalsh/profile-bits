import { readFile } from "node:fs/promises";
import { HTTP_BITS_USED } from "@profile-bits/plugins";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_GENERATE_REQUEST } from "@/src/generate/constants";
import {
  PREVIEW_HTTP_WIDGET_IDS,
  PREVIEW_WIDGET_IDS,
} from "@/src/preview/types";
import GenerateHttpPage, {
  HTTP_GENERATE_BITS_USED,
  HTTP_GENERATE_HREF,
  HTTP_GENERATE_WIDGET_IDS,
  HTTP_PLUGIN_ID,
  httpPackRequest,
  httpWidgetHref,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("GET /generate/http", () => {
  it("is a server page that does not remount GenerateShell", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("GenerateShell");
    expect(source).toContain("httpPackRequest");
    expect(source).toContain('data-slot="generate-http"');
    expect(source).toContain("HTTP_BITS_USED");
    expect(source).toContain("PREVIEW_HTTP_WIDGET_IDS");
    expect(source).not.toContain("PREVIEW_WIDGET_IDS");
    expect(source).not.toContain("PREVIEW_GITHUB_WIDGET_IDS");
    expect(source).not.toContain("githubWidgetRegistry");
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/\byaml\b/i);
    expect(source).not.toContain("/generate/github/json");
    expect(source).not.toContain("/generate/github/chips");
    expect(source).not.toContain("plugin_http");
  });

  it("locks the pack request to http json/chips and pack bitsUsed", () => {
    expect(HTTP_PLUGIN_ID).toBe("http");
    expect(HTTP_GENERATE_HREF).toBe("/generate/http");
    expect(HTTP_GENERATE_WIDGET_IDS).toEqual(["json", "chips"]);
    expect(HTTP_GENERATE_WIDGET_IDS).toEqual(PREVIEW_HTTP_WIDGET_IDS);
    expect(PREVIEW_WIDGET_IDS).not.toEqual(PREVIEW_HTTP_WIDGET_IDS);
    expect(HTTP_GENERATE_BITS_USED).toEqual([...HTTP_BITS_USED]);
    expect(httpWidgetHref("json")).toBe("/generate/http/json");
    expect(httpWidgetHref("chips")).toBe("/generate/http/chips");
    expect(httpPackRequest()).toEqual({
      ...DEFAULT_GENERATE_REQUEST,
      scope: "plugin",
      plugin: HTTP_PLUGIN_ID,
    });
  });

  it("renders bitsUsed and json/chips widgets without dumping github ids", () => {
    const html = renderToStaticMarkup(createElement(GenerateHttpPage));

    expect(html).not.toContain('data-slot="generate-shell"');
    expect(html).toContain('data-slot="generate-http"');
    expect(html).toContain('data-plugin="http"');
    expect(html).toContain('data-href="/generate/http"');
    expect(html).toContain(`data-bits-used="${HTTP_BITS_USED.join(" ")}"`);
    expect(html).toContain("<h2>http</h2>");
    expect(html).toContain("<code>http</code>");
    expect(html).toContain("<code>json</code>");
    expect(html).toContain("<code>chips</code>");
    expect(html).toContain("<code>bitsUsed</code>");
    expect(html).toContain('href="/generate/http/json"');
    expect(html).toContain('href="/generate/http/chips"');
    expect(html).not.toContain('href="/generate/github/json"');
    expect(html).not.toContain('href="/generate/github/chips"');
    expect(html).not.toContain("<code>demo</code>");
    expect(html).not.toContain("<code>coding</code>");
    expect(html).not.toContain("<code>feed</code>");
    expect(html).toContain("Download");
    expect(html).toContain("Share");
    expect(html).toContain("480×160");
    expect(html.toLowerCase()).not.toContain("yaml");
    expect(html).not.toContain("source-drop");
    for (const bit of HTTP_BITS_USED) {
      expect(html).toContain(`<li data-slot="generate-pack-bit">${bit}</li>`);
    }
  });
});
