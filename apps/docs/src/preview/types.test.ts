import { describe, expect, it } from "vitest";
import {
  defaultWidgetsForPlugin,
  isPreviewCustomTheme,
  isPreviewGithubWidgetId,
  isPreviewHttpWidgetId,
  isPreviewPluginId,
  isPreviewRepoIncludeToken,
  isPreviewRssWidgetId,
  isPreviewWakatimeWidgetId,
  isPreviewWidgetId,
  isTokenQueryKey,
  isWidgetIdForPlugin,
  PREVIEW_DEFAULT_WIDGETS_BY_PLUGIN,
  PREVIEW_GITHUB_PLUGIN_SCOPE_WIDGETS,
  PREVIEW_GITHUB_WIDGET_IDS,
  PREVIEW_HTTP_WIDGET_IDS,
  PREVIEW_PLUGIN_ID,
  PREVIEW_PLUGIN_IDS,
  PREVIEW_REPO_INCLUDE_TOKENS,
  PREVIEW_RSS_WIDGET_IDS,
  PREVIEW_STATS_INCLUDE_TOKENS,
  PREVIEW_TOKEN_QUERY_KEYS,
  PREVIEW_WAKATIME_WIDGET_IDS,
  PREVIEW_WIDGET_IDS,
  pluginForWidget,
  pluginScopeWidgets,
  widgetsForPlugin,
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
  it("lists all first-party packs", () => {
    expect(PREVIEW_PLUGIN_IDS).toEqual(["github", "wakatime", "rss", "http"]);
    expect(PREVIEW_PLUGIN_IDS[0]).toBe("github");
    expect(PREVIEW_PLUGIN_ID).toBe("github");
    expect(isPreviewPluginId("github")).toBe(true);
    expect(isPreviewPluginId("http")).toBe(true);
    expect(isPreviewPluginId("wakatime")).toBe(true);
    expect(isPreviewPluginId("rss")).toBe(true);
    expect(isPreviewPluginId("chess")).toBe(false);
  });

  it("keeps github widget ids to demo, stats, languages, and repo", () => {
    expect(PREVIEW_GITHUB_WIDGET_IDS).toEqual([
      "demo",
      "stats",
      "languages",
      "repo",
    ]);
    expect(widgetsForPlugin("github")).toEqual(PREVIEW_GITHUB_WIDGET_IDS);
    expect(PREVIEW_GITHUB_WIDGET_IDS).not.toContain("chips");
    expect(PREVIEW_GITHUB_WIDGET_IDS).not.toContain("json");
    expect(PREVIEW_GITHUB_WIDGET_IDS).not.toContain("coding");
    expect(PREVIEW_GITHUB_WIDGET_IDS).not.toContain("feed");
  });

  it("unions eight widgets for POST widget without dumping them onto github", () => {
    expect(PREVIEW_WIDGET_IDS).toEqual([
      "demo",
      "stats",
      "languages",
      "repo",
      "coding",
      "feed",
      "json",
      "chips",
    ]);
    expect(PREVIEW_WIDGET_IDS).not.toEqual(PREVIEW_GITHUB_WIDGET_IDS);
    expect(PREVIEW_WAKATIME_WIDGET_IDS).toEqual(["coding"]);
    expect(PREVIEW_RSS_WIDGET_IDS).toEqual(["feed"]);
    expect(PREVIEW_HTTP_WIDGET_IDS).toEqual(["json", "chips"]);
    expect(widgetsForPlugin("wakatime")).toEqual(PREVIEW_WAKATIME_WIDGET_IDS);
    expect(widgetsForPlugin("rss")).toEqual(PREVIEW_RSS_WIDGET_IDS);
    expect(widgetsForPlugin("http")).toEqual(PREVIEW_HTTP_WIDGET_IDS);
  });

  it.each(["demo", "stats", "languages", "repo"] as const)(
    "accepts github widget %s on both the github list and POST union",
    (id) => {
      expect(isPreviewGithubWidgetId(id)).toBe(true);
      expect(isPreviewWidgetId(id)).toBe(true);
      expect(isWidgetIdForPlugin("github", id)).toBe(true);
      expect(pluginForWidget(id)).toBe("github");
    },
  );

  it.each(["coding", "feed", "json", "chips"] as const)(
    "keeps pack widget %s off the github list",
    (id) => {
      expect(isPreviewWidgetId(id)).toBe(true);
      expect(isPreviewGithubWidgetId(id)).toBe(false);
      expect(isWidgetIdForPlugin("github", id)).toBe(false);
      expect(PREVIEW_GITHUB_WIDGET_IDS).not.toContain(id);
    },
  );

  it("maps widgets back to packs with pack-local guards", () => {
    expect(pluginForWidget("repo")).toBe("github");
    expect(pluginForWidget("coding")).toBe("wakatime");
    expect(pluginForWidget("feed")).toBe("rss");
    expect(pluginForWidget("json")).toBe("http");
    expect(pluginForWidget("chips")).toBe("http");
    expect(isPreviewWakatimeWidgetId("coding")).toBe(true);
    expect(isPreviewWakatimeWidgetId("stats")).toBe(false);
    expect(isPreviewRssWidgetId("feed")).toBe(true);
    expect(isPreviewRssWidgetId("repo")).toBe(false);
    expect(isPreviewHttpWidgetId("json")).toBe(true);
    expect(isPreviewHttpWidgetId("chips")).toBe(true);
    expect(isPreviewHttpWidgetId("demo")).toBe(false);
    expect(isWidgetIdForPlugin("wakatime", "coding")).toBe(true);
    expect(isWidgetIdForPlugin("rss", "feed")).toBe(true);
    expect(isWidgetIdForPlugin("http", "chips")).toBe(true);
    expect(isWidgetIdForPlugin("http", "repo")).toBe(false);
    expect(isPreviewWidgetId("nope")).toBe(false);
    expect(isPreviewGithubWidgetId("nope")).toBe(false);
  });

  it("defaults and plugin-scope widgets stay per pack", () => {
    expect(PREVIEW_DEFAULT_WIDGETS_BY_PLUGIN).toEqual({
      github: ["demo"],
      wakatime: ["coding"],
      rss: ["feed"],
      http: ["chips"],
    });
    expect(defaultWidgetsForPlugin("github")).toEqual(["demo"]);
    expect(defaultWidgetsForPlugin("wakatime")).toEqual(["coding"]);
    expect(defaultWidgetsForPlugin("rss")).toEqual(["feed"]);
    expect(defaultWidgetsForPlugin("http")).toEqual(["chips"]);
    expect(PREVIEW_GITHUB_PLUGIN_SCOPE_WIDGETS).toEqual([
      "demo",
      "stats",
      "languages",
    ]);
    expect(pluginScopeWidgets("github")).toEqual(
      PREVIEW_GITHUB_PLUGIN_SCOPE_WIDGETS,
    );
    expect(pluginScopeWidgets("github")).not.toContain("repo");
    expect(pluginScopeWidgets("http")).toEqual(["json", "chips"]);
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

  it.each(PREVIEW_REPO_INCLUDE_TOKENS)(
    "does not treat repo include value %s as a secret query key",
    (token) => {
      expect(isPreviewRepoIncludeToken(token)).toBe(true);
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
