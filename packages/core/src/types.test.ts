import { describe, expect, it } from "vitest";
import {
  ACTION_CONFIG_PATH_DEFAULT,
  ActionInputsSchema,
  CARD_HEIGHT,
  CARD_SIZE,
  CARD_WIDTH,
  CHESS_PACK_DEFAULT_WIDGETS,
  ConfigSchema,
  DemoOptionsSchema,
  DiscoverSourceInputSchema,
  DiscoverSourceResultSchema,
  FIRST_PARTY_INTEGRATION_IDS,
  FIRST_PARTY_PLUGIN_IDS,
  FIRST_PARTY_WIDGET_IDS,
  GITHUB_PACK_DEFAULT_WIDGETS,
  GithubWidgetsConfigSchema,
  HttpPluginConfigSchema,
  INTEGRATION_AUTH,
  LanguagesOptionsSchema,
  LEETCODE_PACK_DEFAULT_WIDGETS,
  PluginsConfigSchema,
  RepoOptionsSchema,
  RssWidgetsConfigSchema,
  SOURCE_KINDS,
  SourceKindSchema,
  SPOTIFY_PACK_DEFAULT_WIDGETS,
  STEAM_PACK_DEFAULT_WIDGETS,
  StatsOptionsSchema,
  TokenEnvSchema,
  WAKATIME_PACK_DEFAULT_WIDGETS,
  WakatimeWidgetsConfigSchema,
  WIDGET_INTEGRATIONS,
  WidgetIdentitySchema,
} from "./types.js";

const WIDGET_IDENTITY = {
  id: "stats" as const,
  title: "Stats",
  description: "GitHub stats",
  integrations: ["github"] as const,
  size: CARD_SIZE,
  formats: ["svg"] as const,
};

describe("SourceKindSchema", () => {
  it.each([...SOURCE_KINDS])("parses kind %s", (kind) => {
    expect(SourceKindSchema.parse(kind)).toBe(kind);
  });

  it("rejects unknown kinds", () => {
    for (const kind of ["tsx", "jsx", "markdown", "vue", "", "css"]) {
      const result = SourceKindSchema.safeParse(kind);
      expect(result.success).toBe(false);
    }
  });
});

describe("DiscoverSourceInputSchema", () => {
  it("parses an empty object (all fields optional)", () => {
    expect(DiscoverSourceInputSchema.parse({})).toEqual({});
  });

  it("parses optional string fields", () => {
    expect(
      DiscoverSourceInputSchema.parse({
        path: "packages/plugins/src/github/widgets/stats/widget.tsx",
        filename: "widget.tsx",
        mime: "text/tsx",
        body: "export function Widget() { return null; }",
      }),
    ).toEqual({
      path: "packages/plugins/src/github/widgets/stats/widget.tsx",
      filename: "widget.tsx",
      mime: "text/tsx",
      body: "export function Widget() { return null; }",
    });
  });

  it("rejects extra keys", () => {
    expect(
      DiscoverSourceInputSchema.safeParse({ source: "react" }).success,
    ).toBe(false);
  });

  it("rejects non-string field values", () => {
    expect(DiscoverSourceInputSchema.safeParse({ path: 1 }).success).toBe(
      false,
    );
    expect(
      DiscoverSourceInputSchema.safeParse({ filename: true }).success,
    ).toBe(false);
  });
});

describe("DiscoverSourceResultSchema", () => {
  it.each([...SOURCE_KINDS])("parses kind %s without promotion", (kind) => {
    expect(DiscoverSourceResultSchema.parse({ kind })).toEqual({ kind });
  });

  it("parses mdx promoted from md", () => {
    expect(
      DiscoverSourceResultSchema.parse({
        kind: "mdx",
        promotedFrom: "md",
      }),
    ).toEqual({
      kind: "mdx",
      promotedFrom: "md",
    });
  });

  it("rejects unknown kinds", () => {
    expect(DiscoverSourceResultSchema.safeParse({ kind: "tsx" }).success).toBe(
      false,
    );
  });

  it("rejects promotedFrom values other than md", () => {
    expect(
      DiscoverSourceResultSchema.safeParse({
        kind: "mdx",
        promotedFrom: "mdx",
      }).success,
    ).toBe(false);
    expect(
      DiscoverSourceResultSchema.safeParse({
        kind: "react",
        promotedFrom: "html",
      }).success,
    ).toBe(false);
  });

  it("rejects extra keys", () => {
    expect(
      DiscoverSourceResultSchema.safeParse({
        kind: "md",
        reason: "sniff",
      }).success,
    ).toBe(false);
  });
});

describe("WidgetIdentitySchema source", () => {
  it("omits source when absent", () => {
    expect(WidgetIdentitySchema.parse(WIDGET_IDENTITY)).toEqual({
      ...WIDGET_IDENTITY,
      size: { width: CARD_WIDTH, height: CARD_HEIGHT },
    });
  });

  it.each([...SOURCE_KINDS])("parses optional source %s", (source) => {
    expect(WidgetIdentitySchema.parse({ ...WIDGET_IDENTITY, source })).toEqual({
      ...WIDGET_IDENTITY,
      size: { width: CARD_WIDTH, height: CARD_HEIGHT },
      source,
    });
  });

  it("rejects unknown source kinds", () => {
    expect(
      WidgetIdentitySchema.safeParse({
        ...WIDGET_IDENTITY,
        source: "tsx",
      }).success,
    ).toBe(false);
  });
});

describe("yaml option schemas stay additionalProperties-false", () => {
  it("rejects source on demo/stats/languages/repo options", () => {
    expect(DemoOptionsSchema.safeParse({ source: "md" }).success).toBe(false);
    expect(StatsOptionsSchema.safeParse({ source: "react" }).success).toBe(
      false,
    );
    expect(LanguagesOptionsSchema.safeParse({ source: "html" }).success).toBe(
      false,
    );
    expect(
      RepoOptionsSchema.safeParse({
        repo: "wyattowalsh/profile-bits",
        source: "react",
      }).success,
    ).toBe(false);
  });

  it("rejects source on yaml config", () => {
    expect(
      ConfigSchema.safeParse({
        version: 1,
        plugins: { github: { widgets: { stats: { source: "react" } } } },
      }).success,
    ).toBe(false);
  });
});

describe("ActionInputsSchema thin tokens", () => {
  const shape = ActionInputsSchema.shape;

  it("keeps optional *_token and http_token_env with no defaults", () => {
    const parsed = ActionInputsSchema.parse({});
    expect(parsed.wakatime_token).toBeUndefined();
    expect(parsed.http_token_env).toBeUndefined();
    expect(parsed.spotify_token).toBeUndefined();
    expect(parsed.steam_token).toBeUndefined();
    expect(parsed.config).toBe(ACTION_CONFIG_PATH_DEFAULT);
  });

  it("parses optional required-auth tokens without inventing pack bools", () => {
    expect(
      ActionInputsSchema.parse({
        wakatime_token: "wk-secret",
        spotify_token: "sp-refresh",
        steam_token: "steam-key",
        http_token_env: "HTTP_JSON_TOKEN",
      }),
    ).toMatchObject({
      wakatime_token: "wk-secret",
      spotify_token: "sp-refresh",
      steam_token: "steam-key",
      http_token_env: "HTTP_JSON_TOKEN",
    });
    expect(Object.keys(shape)).toEqual(
      expect.arrayContaining([
        "wakatime_token",
        "http_token_env",
        "spotify_token",
        "steam_token",
        "plugin_github",
      ]),
    );
    for (const key of [
      "plugin_wakatime",
      "plugin_rss",
      "plugin_http",
      "plugin_spotify",
      "plugin_steam",
      "plugin_github_stats_include",
      "plugin_wakatime_coding_range",
      "plugin_http_json_url",
    ]) {
      expect(Object.keys(shape)).not.toContain(key);
      expect(ActionInputsSchema.safeParse({ [key]: true }).success).toBe(false);
    }
  });

  it("does not add extra pack bools when elbow packs land", () => {
    expect([...FIRST_PARTY_PLUGIN_IDS]).toEqual(
      expect.arrayContaining(["spotify", "leetcode", "chess", "steam"]),
    );
    for (const key of [
      "plugin_leetcode",
      "plugin_chess",
      "plugin_spotify",
      "plugin_steam",
    ]) {
      expect(Object.keys(shape)).not.toContain(key);
    }
  });
});

describe("Wave 3 FIRST_PARTY catalog", () => {
  it("appends elbow plugin, widget, and integration ids", () => {
    expect([...FIRST_PARTY_PLUGIN_IDS]).toEqual([
      "github",
      "wakatime",
      "rss",
      "http",
      "spotify",
      "leetcode",
      "chess",
      "steam",
    ]);
    expect([...FIRST_PARTY_INTEGRATION_IDS]).toEqual([
      "static",
      "github",
      "wakatime",
      "rss",
      "http",
      "spotify",
      "leetcode",
      "chesscom",
      "lichess",
      "steam",
    ]);
    expect([...FIRST_PARTY_INTEGRATION_IDS]).not.toContain("chess");
    expect([...FIRST_PARTY_WIDGET_IDS]).toEqual(
      expect.arrayContaining([
        "demo",
        "stats",
        "languages",
        "repo",
        "coding",
        "feed",
        "json",
        "chips",
        "top-repos",
        "contributions",
        "editors",
        "projects",
        "os",
        "langs",
        "latest",
        "now-playing",
        "top",
        "solved",
        "heatmap",
        "ratings",
        "game",
        "player",
        "recent",
      ]),
    );
    expect(new Set(FIRST_PARTY_WIDGET_IDS).size).toBe(
      FIRST_PARTY_WIDGET_IDS.length,
    );
  });

  it("maps widget integrations without colliding languages or heatmap", () => {
    expect(WIDGET_INTEGRATIONS.languages).toEqual(["github"]);
    expect(WIDGET_INTEGRATIONS.langs).toEqual(["wakatime"]);
    expect(WIDGET_INTEGRATIONS.heatmap).toEqual(["leetcode"]);
    expect(WIDGET_INTEGRATIONS.contributions).toEqual(["github"]);
    expect(WIDGET_INTEGRATIONS["top-repos"]).toEqual(["github"]);
    expect(WIDGET_INTEGRATIONS["now-playing"]).toEqual(["spotify"]);
    expect(WIDGET_INTEGRATIONS.top).toEqual(["spotify"]);
    expect(WIDGET_INTEGRATIONS.solved).toEqual(["leetcode"]);
    expect(WIDGET_INTEGRATIONS.ratings).toEqual(["chesscom", "lichess"]);
    expect(WIDGET_INTEGRATIONS.game).toEqual(["chesscom", "lichess"]);
    expect(WIDGET_INTEGRATIONS.player).toEqual(["steam"]);
    expect(WIDGET_INTEGRATIONS.recent).toEqual(["steam"]);
    expect(WIDGET_INTEGRATIONS.latest).toEqual(["rss"]);
    expect(WIDGET_INTEGRATIONS.editors).toEqual(["wakatime"]);
    expect(Object.keys(WIDGET_INTEGRATIONS).toSorted()).toEqual(
      [...FIRST_PARTY_WIDGET_IDS].toSorted(),
    );
  });

  it("sets elbow integration auth and keeps github optional", () => {
    expect(INTEGRATION_AUTH.spotify).toBe("required");
    expect(INTEGRATION_AUTH.steam).toBe("required");
    expect(INTEGRATION_AUTH.leetcode).toBe("none");
    expect(INTEGRATION_AUTH.chesscom).toBe("none");
    expect(INTEGRATION_AUTH.lichess).toBe("none");
    expect(INTEGRATION_AUTH.github).toBe("optional");
    expect(INTEGRATION_AUTH.wakatime).toBe("required");
    expect(Object.keys(INTEGRATION_AUTH).toSorted()).toEqual(
      [...FIRST_PARTY_INTEGRATION_IDS].toSorted(),
    );
  });

  it("keeps shipped pack defaults and treats reuse widgets as opt-in", () => {
    expect([...GITHUB_PACK_DEFAULT_WIDGETS]).toEqual(["stats", "languages"]);
    expect([...WAKATIME_PACK_DEFAULT_WIDGETS]).toEqual(["coding"]);
    expect([...SPOTIFY_PACK_DEFAULT_WIDGETS]).toEqual(["now-playing"]);
    expect([...LEETCODE_PACK_DEFAULT_WIDGETS]).toEqual(["solved"]);
    expect([...CHESS_PACK_DEFAULT_WIDGETS]).toEqual(["ratings"]);
    expect([...STEAM_PACK_DEFAULT_WIDGETS]).toEqual(["player"]);
    expect(GITHUB_PACK_DEFAULT_WIDGETS).not.toContain("top-repos");
    expect(GITHUB_PACK_DEFAULT_WIDGETS).not.toContain("contributions");
    expect(WAKATIME_PACK_DEFAULT_WIDGETS).not.toContain("langs");
    expect(CHESS_PACK_DEFAULT_WIDGETS).not.toContain("stats");
  });

  it("parses elbow and reuse yaml keys without flatten or extra pack bools", () => {
    expect(Object.keys(PluginsConfigSchema.shape)).toEqual([
      "github",
      "wakatime",
      "rss",
      "http",
      "spotify",
      "leetcode",
      "chess",
      "steam",
    ]);
    expect(Object.keys(GithubWidgetsConfigSchema.shape)).toEqual(
      expect.arrayContaining(["top-repos", "contributions"]),
    );
    expect(Object.keys(WakatimeWidgetsConfigSchema.shape)).toEqual(
      expect.arrayContaining(["coding", "editors", "projects", "os", "langs"]),
    );
    expect(Object.keys(RssWidgetsConfigSchema.shape)).toEqual(
      expect.arrayContaining(["feed", "latest"]),
    );
    expect(
      ConfigSchema.parse({
        version: 1,
        plugins: {
          github: { widgets: { contributions: {} } },
          spotify: { token_env: "SPOTIFY_REFRESH_ENV", widgets: { top: {} } },
          chess: { user: "hikaru", widgets: { ratings: {}, game: {} } },
        },
      }).plugins.spotify?.token_env,
    ).toBe("SPOTIFY_REFRESH_ENV");
    expect(
      ConfigSchema.safeParse({
        version: 1,
        plugins: { spotify: { token: "secret" } },
      }).success,
    ).toBe(false);
    expect(ActionInputsSchema.safeParse({ plugin_spotify: true }).success).toBe(
      false,
    );
    expect(
      ActionInputsSchema.safeParse({
        plugin_spotify_now_playing_filename: "np",
      }).success,
    ).toBe(false);
  });
});

describe("yaml token_env http pattern", () => {
  it("accepts a POSIX env name and rejects token values", () => {
    expect(TokenEnvSchema.parse("HTTP_JSON_TOKEN")).toBe("HTTP_JSON_TOKEN");
    expect(TokenEnvSchema.parse("  STEAM_WEB_API_KEY  ")).toBe(
      "STEAM_WEB_API_KEY",
    );
    expect(HttpPluginConfigSchema.parse({}).token_env).toBeUndefined();
    expect(
      HttpPluginConfigSchema.parse({ token_env: "HTTP_JSON_TOKEN" }).token_env,
    ).toBe("HTTP_JSON_TOKEN");
    expect(
      ConfigSchema.parse({
        version: 1,
        plugins: { http: { token_env: "HTTP_JSON_TOKEN" } },
      }).plugins.http?.token_env,
    ).toBe("HTTP_JSON_TOKEN");
  });

  it("rejects INPUT_* names, non-env strings, and secret yaml keys", () => {
    expect(TokenEnvSchema.safeParse("").success).toBe(false);
    expect(TokenEnvSchema.safeParse("not valid").success).toBe(false);
    expect(TokenEnvSchema.safeParse("INPUT_HTTP_TOKEN").success).toBe(false);
    expect(TokenEnvSchema.safeParse("input_secret").success).toBe(false);
    expect(TokenEnvSchema.safeParse("HTTP-TOKEN").success).toBe(false);
    expect(HttpPluginConfigSchema.safeParse({ token: "secret" }).success).toBe(
      false,
    );
    expect(
      HttpPluginConfigSchema.safeParse({ api_key: "secret" }).success,
    ).toBe(false);
    expect(
      HttpPluginConfigSchema.safeParse({ wakatime_token: "secret" }).success,
    ).toBe(false);
    expect(
      ConfigSchema.safeParse({
        version: 1,
        plugins: { http: { token_env: "Bearer secret" } },
      }).success,
    ).toBe(false);
  });
});
