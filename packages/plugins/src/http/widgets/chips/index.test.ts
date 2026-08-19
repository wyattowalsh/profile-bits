import { CHIPS_OPTION_DEFAULTS, type ChipsOptions } from "@profile-bits/core";
import {
  chipFixture,
  createHttpClient,
  expandChipsRequest,
  type HttpFetch,
  type HttpLookup,
  normalizeBadgeJson,
} from "@profile-bits/integrations";
import { fromJsx } from "@profile-bits/renderer";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ChipsWidget,
  ChipsWidgetError,
  NO_CHIPS_DATA,
  renderChipsFromClient,
  renderChipsFromPayloads,
  renderChipsSvg,
} from "./index.js";

const PUBLIC_V4 = "93.184.216.34";

const CHIPS_OPTIONS: ChipsOptions = {
  ...CHIPS_OPTION_DEFAULTS,
  preset: "shieldcn",
  types: ["npm", "stars"],
  package: "react",
  repo: "vercel/next.js",
};

type TakumiNode = {
  type: string;
  text?: string;
  children?: TakumiNode[];
};

function assertBakedStillSvg(svg: string): void {
  expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
  expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
  expect(svg).toMatch(/<svg\b[^>]*\bviewBox="0 0 480 160"/);
  expect(svg).not.toMatch(/<text[\s>]/i);
  expect(svg).not.toMatch(/<style[\s>]/i);
  expect(svg).not.toContain("@keyframes");
  expect(svg).not.toMatch(/<(animate|animateTransform|animateMotion|set)\b/i);
  expect(svg).not.toMatch(/<foreignObject[\s>]/i);
}

function collectTexts(node: TakumiNode): string[] {
  const texts: string[] = [];
  if (typeof node.text === "string" && node.text.length > 0) {
    texts.push(node.text);
  }
  for (const child of node.children ?? []) {
    texts.push(...collectTexts(child));
  }
  return texts;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function chipsUrl(type: ChipsOptions["types"][number]): string {
  return expandChipsRequest({
    preset: CHIPS_OPTIONS.preset,
    type,
    user: "vercel",
    repo: CHIPS_OPTIONS.repo,
    packageName: CHIPS_OPTIONS.package,
  }).url.href;
}

describe("chips widget", () => {
  it("renders fixture payloads without fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const payloads = [
      chipFixture("shieldcn", "npm"),
      chipFixture("shields", "stars"),
    ];
    const fromPayloads = await renderChipsFromPayloads({ payloads });
    const fromSvg = await renderChipsSvg({
      badges: payloads.map((payload) => normalizeBadgeJson(payload)),
    });
    assertBakedStillSvg(fromPayloads);
    assertBakedStillSvg(fromSvg);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders No data for empty badges", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const node = (await fromJsx(
      createElement(ChipsWidget, { badges: [] }),
    )) as TakumiNode;
    expect(collectTexts(node)).toContain(NO_CHIPS_DATA);
    const svg = await renderChipsSvg({ badges: [] });
    assertBakedStillSvg(svg);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("fails the widget on missing message", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      renderChipsFromPayloads({ payloads: [{ label: "x" }] }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof ChipsWidgetError && error.outcome === "fail_widget",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("fails the entire widget when one type 404s", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const npmUrl = chipsUrl("npm");
    const starsUrl = chipsUrl("stars");
    const fetch = vi.fn<HttpFetch>(async (url) => {
      if (url === starsUrl) {
        return jsonResponse({ error: true }, 404);
      }
      if (url === npmUrl) {
        return jsonResponse(chipFixture("shieldcn", "npm"));
      }
      throw new Error(`unexpected url ${url}`);
    });
    const lookup = vi.fn<HttpLookup>(async () => [
      { address: PUBLIC_V4, family: 4 },
    ]);
    const client = createHttpClient({ fetch, lookup });
    await expect(
      renderChipsFromClient(client, CHIPS_OPTIONS, { user: "vercel" }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof ChipsWidgetError && error.outcome === "fail_widget",
    );
    expect(fetch).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders distinct light and dark SVGs from ctx.theme", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const npmUrl = chipsUrl("npm");
    const starsUrl = chipsUrl("stars");
    const fetch = vi.fn<HttpFetch>(async (url) => {
      if (url === npmUrl) {
        return jsonResponse(chipFixture("shieldcn", "npm"));
      }
      if (url === starsUrl) {
        return jsonResponse(chipFixture("shieldcn", "stars"));
      }
      throw new Error(`unexpected url ${url}`);
    });
    const lookup = vi.fn<HttpLookup>(async () => [
      { address: PUBLIC_V4, family: 4 },
    ]);
    const client = createHttpClient({ fetch, lookup });
    const light = await renderChipsFromClient(client, CHIPS_OPTIONS, {
      user: "vercel",
      theme: "light",
    });
    const dark = await renderChipsFromClient(client, CHIPS_OPTIONS, {
      user: "vercel",
      theme: "dark",
    });
    assertBakedStillSvg(light);
    assertBakedStillSvg(dark);
    expect(light).not.toEqual(dark);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
