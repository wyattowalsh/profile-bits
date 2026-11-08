import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DARK_THEME, fromJsx, LIGHT_THEME } from "@profile-bits/renderer";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Theme } from "./Theme.js";
import { Time } from "./Time.js";

type TakumiNode = {
  type: string;
  text?: string;
  style?: Record<string, unknown>;
  children?: TakumiNode[];
};

const TIME_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "Time.tsx"),
  "utf8",
);

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

function findNode(
  node: TakumiNode,
  predicate: (candidate: TakumiNode) => boolean,
): TakumiNode | undefined {
  if (predicate(node)) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findNode(child, predicate);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

async function renderTime(
  value: string,
  timezone?: string,
): Promise<TakumiNode> {
  return (await fromJsx(
    createElement(
      Theme,
      { theme: "dark" },
      createElement(Time, { value, timezone }),
    ),
  )) as TakumiNode;
}

describe("Time", () => {
  it("formats a provided ISO timestamp in UTC without HTTP", async () => {
    expect(globalThis.document).toBeUndefined();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const node = await renderTime("2026-08-16T11:00:00.000Z");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(collectTexts(node)).toContain("2026-08-16 11:00");
    const label = findNode(
      node,
      (candidate) => candidate.text === "2026-08-16 11:00",
    );
    expect(label?.style).toMatchObject({
      color: DARK_THEME.muted,
      fontFamily: DARK_THEME.font,
      fontSize: 12,
      fontWeight: 400,
    });
    expect(label?.style?.boxShadow).toBeUndefined();
    fetchSpy.mockRestore();
  });

  it("applies an IANA timezone to the formatted timestamp", async () => {
    const node = await renderTime(
      "2026-08-16T11:00:00.000Z",
      "America/New_York",
    );
    expect(collectTexts(node)).toContain("2026-08-16 07:00");
  });

  it("shifts the calendar day when the timezone crosses midnight", async () => {
    const node = await renderTime(
      "2026-08-16T02:00:00.000Z",
      "America/New_York",
    );
    expect(collectTexts(node)).toContain("2026-08-15 22:00");
  });

  it("zero-pads hours and minutes", async () => {
    const node = await renderTime("2026-08-16T04:05:00.000Z");
    expect(collectTexts(node)).toContain("2026-08-16 04:05");
  });

  it("renders an unparseable provided string as-is", async () => {
    const node = await renderTime("not-a-timestamp");
    expect(collectTexts(node)).toContain("not-a-timestamp");
  });

  it("falls back to UTC when the timezone is not IANA", async () => {
    const node = await renderTime("2026-08-16T11:00:00.000Z", "Not/AZone");
    expect(collectTexts(node)).toContain("2026-08-16 11:00");
  });

  it("reads muted ink from light theme context", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "light" },
        createElement(Time, { value: "2026-08-16T11:00:00.000Z" }),
      ),
    )) as TakumiNode;
    const label = findNode(
      node,
      (candidate) => candidate.text === "2026-08-16 11:00",
    );
    expect(label?.style?.color).toBe(LIGHT_THEME.muted);
    expect(label?.style?.fontFamily).toBe(LIGHT_THEME.font);
  });

  it("stays Takumi-safe: span chrome, no react-dom, document, useEffect, or fetch", () => {
    expect(TIME_SOURCE).toContain("export function Time");
    expect(TIME_SOURCE).toContain("<span");
    expect(TIME_SOURCE).not.toContain("react-dom");
    expect(TIME_SOURCE).not.toContain("useEffect");
    expect(TIME_SOURCE).not.toContain("document");
    expect(TIME_SOURCE).not.toMatch(/\bfetch\s*\(/);
    expect(TIME_SOURCE).not.toContain("http://");
    expect(TIME_SOURCE).not.toContain("https://");
  });
});
