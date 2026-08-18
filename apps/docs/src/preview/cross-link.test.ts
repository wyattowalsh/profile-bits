import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CrossLink,
  crossLinkHref,
  crossLinkLabel,
  stripTokens,
  toCrossLink,
} from "./cross-link";
import { PREVIEW_TOKEN_QUERY_KEYS } from "./types";

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

const QUERY = "scope=plugin&plugin=github&user=octocat";

function hrefOf(html: string): string {
  const match = html.match(/\bhref="([^"]*)"/);
  expect(match).not.toBeNull();
  return (match?.[1] ?? "").replaceAll("&amp;", "&");
}

describe("crossLinkHref / toCrossLink", () => {
  it("swaps playground → generate and keeps the query", () => {
    const fromPlayground = `/playground/github?${QUERY}`;
    const expected = `/generate/github?${QUERY}`;
    expect(crossLinkHref(fromPlayground)).toBe(expected);
    expect(toCrossLink(fromPlayground)).toBe(expected);
  });

  it("swaps generate → playground and keeps the query", () => {
    const fromGenerate = `/generate/github/stats?${QUERY}`;
    const expected = `/playground/github/stats?${QUERY}`;
    expect(crossLinkHref(fromGenerate)).toBe(expected);
    expect(toCrossLink(fromGenerate)).toBe(expected);
  });

  it("strips every token query key from the href", () => {
    const params = new URLSearchParams(QUERY);
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      params.set(key, `leaked-${key}`);
    }
    const href = crossLinkHref(`/playground/github?${params.toString()}`);
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(href).not.toContain(key);
      expect(href).not.toContain(`leaked-${key}`);
    }
    expect(href).toBe(`/generate/github?${QUERY}`);
  });

  it("re-exports stripTokens from permalink", () => {
    const params = new URLSearchParams("plugin=github&token=secret&pat=x");
    const stripped = stripTokens(params);
    expect(stripped.get("plugin")).toBe("github");
    expect(stripped.has("token")).toBe(false);
    expect(stripped.has("pat")).toBe(false);
  });
});

describe("crossLinkLabel", () => {
  it("labels a generate destination", () => {
    expect(crossLinkLabel("/generate/github")).toBe("Open in Generate");
  });

  it("labels a playground destination", () => {
    expect(crossLinkLabel("/playground/github/stats")).toBe(
      "Open in Playground",
    );
  });
});

describe("CrossLink", () => {
  it("renders an accessible playground → generate link without tokens", () => {
    const html = renderToStaticMarkup(
      createElement(CrossLink, {
        href: `/playground/github?${QUERY}&token=secret&github_token=ghp_secret`,
      }),
    );
    const href = hrefOf(html);
    expect(href).toBe(`/generate/github?${QUERY}`);
    expect(href).not.toContain("token");
    expect(href).not.toContain("github_token");
    expect(href).not.toContain("secret");
    expect(html).toContain("Open in Generate");
    expect(html).toContain('data-slot="cross-link"');
    expect(html.startsWith("<a ")).toBe(true);
  });

  it("renders an accessible generate → playground link without tokens", () => {
    const html = renderToStaticMarkup(
      createElement(CrossLink, {
        href: `/generate/github/stats?${QUERY}&pat=x&access_token=y`,
      }),
    );
    const href = hrefOf(html);
    expect(href).toBe(`/playground/github/stats?${QUERY}`);
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(href).not.toContain(key);
    }
    expect(html).toContain("Open in Playground");
    expect(html.startsWith("<a ")).toBe(true);
  });
});
