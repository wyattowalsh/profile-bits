import { describe, expect, it } from "vitest";
import {
  isPreviewCustomTheme,
  isPreviewPluginId,
  isPreviewWidgetId,
  isTokenQueryKey,
  PREVIEW_PLUGIN_ID,
  PREVIEW_PLUGIN_IDS,
  PREVIEW_STATS_INCLUDE_TOKENS,
  PREVIEW_TOKEN_QUERY_KEYS,
  PREVIEW_WIDGET_IDS,
} from "./types";

const PERMALINK_FIELDS = [
  "scope",
  "plugin",
  "widget",
  "bit",
  "options",
  "format",
  "theme",
  "output_pair",
  "user",
] as const;

describe("preview plugin and widget ids", () => {
  it("appends http after github without widening github widgets", () => {
    expect(PREVIEW_PLUGIN_IDS).toEqual(["github", "http"]);
    expect(PREVIEW_PLUGIN_IDS[0]).toBe("github");
    expect(PREVIEW_PLUGIN_ID).toBe("github");
    expect(isPreviewPluginId("github")).toBe(true);
    expect(isPreviewPluginId("http")).toBe(true);
    expect(isPreviewPluginId("wakatime")).toBe(false);
    expect(PREVIEW_WIDGET_IDS).toEqual(["demo", "stats", "languages"]);
    expect(isPreviewWidgetId("chips")).toBe(false);
    expect(isPreviewWidgetId("json")).toBe(false);
  });

  it("keeps http secret query keys denied", () => {
    expect(PREVIEW_TOKEN_QUERY_KEYS).toContain("http_token_env");
    expect(PREVIEW_TOKEN_QUERY_KEYS).toContain("http_token");
    expect(isTokenQueryKey("http_token_env")).toBe(true);
    expect(isTokenQueryKey("http_token")).toBe(true);
  });
});

describe("isTokenQueryKey", () => {
  it.each(PREVIEW_TOKEN_QUERY_KEYS)("denies named secret key %s", (key) => {
    expect(isTokenQueryKey(key)).toBe(true);
    expect(isTokenQueryKey(key.toUpperCase())).toBe(true);
  });

  it("denies wakatime_token", () => {
    expect(isTokenQueryKey("wakatime_token")).toBe(true);
    expect(PREVIEW_TOKEN_QUERY_KEYS).toContain("wakatime_token");
  });

  it("denies token prefix and _token suffix keys", () => {
    expect(isTokenQueryKey("token")).toBe(true);
    expect(isTokenQueryKey("token_secret")).toBe(true);
    expect(isTokenQueryKey("api_token")).toBe(true);
    expect(isTokenQueryKey("custom_token")).toBe(true);
  });

  it.each(PERMALINK_FIELDS)("keeps non-secret permalink field %s", (key) => {
    expect(isTokenQueryKey(key)).toBe(false);
  });

  it.each(PREVIEW_STATS_INCLUDE_TOKENS)(
    "does not treat stats include value %s as a secret query key",
    (token) => {
      expect(isTokenQueryKey(token)).toBe(false);
    },
  );
});

describe("isPreviewCustomTheme", () => {
  it("rejects incomplete custom role maps", () => {
    expect(
      isPreviewCustomTheme({
        custom: {
          bg: "",
          card: "dark.card",
          text: "dark.text",
          muted: "dark.muted",
          accent: "dark.accent",
          border: "dark.border",
        },
      }),
    ).toBe(false);
  });

  it("accepts a complete custom mix without tokens", () => {
    expect(
      isPreviewCustomTheme({
        custom: {
          bg: "catppuccin-mocha.bg",
          card: "catppuccin-mocha.card",
          text: "catppuccin-mocha.text",
          muted: "catppuccin-mocha.muted",
          accent: "catppuccin-mocha.accent",
          border: "catppuccin-mocha.border",
        },
      }),
    ).toBe(true);
  });
});
