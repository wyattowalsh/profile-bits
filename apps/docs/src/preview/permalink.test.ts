import { describe, expect, it } from "vitest";
import { parse, serialize, stripTokens, toCrossLink } from "./permalink";
import {
  isPreviewCustomTheme,
  PREVIEW_BIT_IDS,
  PREVIEW_OUTPUT_FORMATS,
  PREVIEW_TOKEN_QUERY_KEYS,
  PREVIEW_WIDGET_IDS,
  type PreviewOptions,
  type PreviewRequest,
} from "./types";

const YAML_OPTIONS: PreviewOptions = {
  demo: {
    text: "profile-bits",
    subtitle: "github pack",
    animate: true,
  },
  stats: {
    filename: "stats",
    include: ["followers", "repos", "stars"],
    hide_rank: true,
    avatar: true,
    animate: false,
    include_private: false,
    include_forks: false,
    include_archived: false,
  },
  languages: {
    filename: "languages",
    limit: 8,
    min_pct: 1,
    exclude: ["HTML"],
    animate: false,
    include_private: false,
    include_forks: false,
    include_archived: false,
  },
  format: "svg",
  theme: "dark",
  output_pair: false,
};

const PLUGIN_STATE: PreviewRequest = {
  scope: "plugin",
  plugin: "github",
  options: YAML_OPTIONS,
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

function roundTrip(state: PreviewRequest): PreviewRequest {
  return parse(serialize(state));
}

function tokenBag(
  state: PreviewRequest,
): PreviewRequest & Record<(typeof PREVIEW_TOKEN_QUERY_KEYS)[number], string> {
  return {
    ...state,
    github_token: "ghp_secret",
    committer_token: "ghs_secret",
    token: "secret-token",
    pat: "pat_secret",
    access_token: "access_secret",
    authorization: "Bearer secret",
    gist_token: "gist_secret",
    http_token_env: "HTTP_TOKEN",
    http_token: "http_secret",
    wakatime_token: "waka_secret",
  };
}

describe("serialize/parse round-trip", () => {
  it("restores plugin scope github", () => {
    expect(roundTrip(PLUGIN_STATE)).toEqual(PLUGIN_STATE);
  });

  it.each(PREVIEW_WIDGET_IDS)("restores widget scope (%s)", (widget) => {
    const state: PreviewRequest = {
      scope: "widget",
      plugin: "github",
      widget,
      options: YAML_OPTIONS,
      format: "png",
      theme: "light",
      output_pair: true,
      user: "hubot",
    };
    expect(roundTrip(state)).toEqual(state);
  });

  it.each(PREVIEW_BIT_IDS)("restores bit scope (%s)", (bit) => {
    const state: PreviewRequest = {
      scope: "bit",
      bit,
      options: {},
      format: "webp",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    };
    expect(roundTrip(state)).toEqual(state);
  });

  it("restores yaml-shaped demo/stats/languages options plus globals", () => {
    const restored = roundTrip(PLUGIN_STATE);
    expect(restored.options).toEqual(YAML_OPTIONS);
    expect(restored.options.demo).toEqual(YAML_OPTIONS.demo);
    expect(restored.options.stats).toEqual(YAML_OPTIONS.stats);
    expect(restored.options.languages).toEqual(YAML_OPTIONS.languages);
    expect(restored.options.format).toBe("svg");
    expect(restored.options.theme).toBe("dark");
    expect(restored.options.output_pair).toBe(false);
  });

  it.each(PREVIEW_OUTPUT_FORMATS)("restores format %s", (format) => {
    const state: PreviewRequest = { ...PLUGIN_STATE, format };
    expect(roundTrip(state).format).toBe(format);
  });

  it("restores theme light and dark", () => {
    expect(roundTrip({ ...PLUGIN_STATE, theme: "light" }).theme).toBe("light");
    expect(roundTrip({ ...PLUGIN_STATE, theme: "dark" }).theme).toBe("dark");
  });

  it("restores a named catalog id", () => {
    expect(
      roundTrip({ ...PLUGIN_STATE, theme: "catppuccin-mocha" }).theme,
    ).toBe("catppuccin-mocha");
  });

  it("round-trips a custom mix via c* params", () => {
    const custom = {
      custom: {
        bg: "catppuccin-mocha.base",
        card: "dark.card",
        text: "dark.text",
        muted: "dark.muted",
        accent: "catppuccin-mocha.mauve",
        border: "dark.border",
      },
    } as const;
    const restored = roundTrip({ ...PLUGIN_STATE, theme: custom });
    expect(restored.theme).toEqual(custom);
    const params = serialize({ ...PLUGIN_STATE, theme: custom });
    expect(params.get("theme")).toBe("custom");
    expect(params.get("caccent")).toBe("catppuccin-mocha.mauve");
  });

  it("does not coerce incomplete custom permalinks to dark", () => {
    const restored = parse(
      "theme=custom&ccard=dark.card&ctext=dark.text&cmuted=dark.muted&caccent=dark.accent&cborder=dark.border",
    );
    expect(restored.theme).not.toBe("dark");
    expect(typeof restored.theme).toBe("object");
    if (typeof restored.theme === "string") {
      throw new Error("expected custom theme object");
    }
    expect(restored.theme.custom.bg).toBe("");
    expect(restored.theme.custom.card).toBe("dark.card");
    expect(isPreviewCustomTheme(restored.theme)).toBe(false);
  });

  it("restores output_pair true and false", () => {
    expect(roundTrip({ ...PLUGIN_STATE, output_pair: true }).output_pair).toBe(
      true,
    );
    expect(roundTrip({ ...PLUGIN_STATE, output_pair: false }).output_pair).toBe(
      false,
    );
  });

  it("restores user", () => {
    expect(roundTrip({ ...PLUGIN_STATE, user: "defunkt" }).user).toBe(
      "defunkt",
    );
  });
});

describe("tokens", () => {
  it("never writes token keys even if the caller passes them", () => {
    const params = serialize(tokenBag(PLUGIN_STATE));
    const query = params.toString();
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(params.has(key)).toBe(false);
      expect(query).not.toContain(key);
    }
    expect(query).not.toContain("ghp_secret");
    expect(query).not.toContain("ghs_secret");
    expect(query).not.toContain("secret-token");
    expect(query).not.toContain("pat_secret");
    expect(query).not.toContain("access_secret");
    expect(query).not.toContain("Bearer");
    expect(query).not.toContain("gist_secret");
    expect(query).not.toContain("HTTP_TOKEN");
    expect(query).not.toContain("http_secret");
    expect(query).not.toContain("http_token_env");
    expect(query).not.toContain("http_token");
    expect(query).not.toContain("waka_secret");
    expect(query).not.toContain("wakatime_token");
  });

  it("drops token keys from options json", () => {
    const state: PreviewRequest = {
      ...PLUGIN_STATE,
      options: {
        ...YAML_OPTIONS,
        github_token: "nested-secret",
        token: "nested-token",
      } as PreviewOptions,
    };
    const query = serialize(state).toString();
    expect(query).not.toContain("nested-secret");
    expect(query).not.toContain("nested-token");
    expect(query).not.toContain("github_token");
    expect(parse(serialize(state)).options).toEqual(YAML_OPTIONS);
  });

  it("parse drops token keys from the query string", () => {
    const params = new URLSearchParams(serialize(PLUGIN_STATE));
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      params.set(key, `leaked-${key}`);
    }
    const restored = parse(params);
    const blob = JSON.stringify(restored);
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(blob).not.toContain(key);
      expect(blob).not.toContain(`leaked-${key}`);
    }
    expect(restored).toEqual(PLUGIN_STATE);
  });
});

describe("permalink shape", () => {
  it("serializes URLSearchParams only (no zip, no embed URL)", () => {
    const withZip = {
      ...PLUGIN_STATE,
      zip: "widgets.zip",
      embed: "https://camo.githubusercontent.com/preview.png",
    } as PreviewRequest;
    const params = serialize(withZip);
    expect(params).toBeInstanceOf(URLSearchParams);
    const query = params.toString();
    expect(query.startsWith("http")).toBe(false);
    expect(query).not.toContain("://");
    expect(query).not.toContain("/api/preview");
    expect(query).not.toContain("/api/");
    expect(params.has("zip")).toBe(false);
    expect(query).not.toContain("widgets.zip");
    expect(query).not.toContain("camo.githubusercontent.com");
    expect(query).not.toContain("embed");
  });

  it("parse reads query from an embed-shaped URL and still drops tokens", () => {
    const query = serialize(PLUGIN_STATE).toString();
    const embed = `https://docs.example/api/preview/github/stats.png?${query}&token=secret&zip=1`;
    const restored = parse(embed);
    expect(restored).toEqual(PLUGIN_STATE);
    expect(JSON.stringify(restored)).not.toContain("secret");
  });
});

describe("stripTokens / toCrossLink", () => {
  it("stripTokens removes every token-like key", () => {
    const params = new URLSearchParams(
      "scope=plugin&plugin=github&user=octocat",
    );
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      params.set(key, "secret");
    }
    const stripped = stripTokens(params);
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(stripped.has(key)).toBe(false);
    }
    expect(stripped.get("scope")).toBe("plugin");
    expect(stripped.get("plugin")).toBe("github");
    expect(stripped.get("user")).toBe("octocat");
  });

  it("drops wakatime_token from serialize, stripTokens, and toCrossLink", () => {
    const leaked = "waka_secret";
    const serialized = serialize({
      ...PLUGIN_STATE,
      wakatime_token: leaked,
    } as PreviewRequest);
    expect(serialized.has("wakatime_token")).toBe(false);
    expect(serialized.toString()).not.toContain("wakatime_token");
    expect(serialized.toString()).not.toContain(leaked);

    const params = new URLSearchParams(serialize(PLUGIN_STATE));
    params.set("wakatime_token", leaked);
    const stripped = stripTokens(params);
    expect(stripped.has("wakatime_token")).toBe(false);
    expect(stripped.toString()).not.toContain(leaked);

    const href = toCrossLink(
      `/playground/github?${serialize(PLUGIN_STATE)}&wakatime_token=${leaked}`,
    );
    expect(href).not.toContain("wakatime_token");
    expect(href).not.toContain(leaked);
    expect(href).toBe(`/generate/github?${serialize(PLUGIN_STATE)}`);
  });

  it("strips unknown *_token and token* query keys, keeps permalink fields", () => {
    const params = new URLSearchParams(
      "scope=plugin&plugin=github&user=octocat&theme=dark&format=svg",
    );
    params.set("api_token", "secret");
    params.set("token_secret", "secret");
    const stripped = stripTokens(params);
    expect(stripped.has("api_token")).toBe(false);
    expect(stripped.has("token_secret")).toBe(false);
    expect(stripped.get("scope")).toBe("plugin");
    expect(stripped.get("plugin")).toBe("github");
    expect(stripped.get("user")).toBe("octocat");
    expect(stripped.get("theme")).toBe("dark");
    expect(stripped.get("format")).toBe("svg");
  });

  it("toCrossLink swaps playground and generate, keeps query, strips tokens", () => {
    const query = serialize(PLUGIN_STATE).toString();
    const fromPlayground = toCrossLink(
      `/playground/github?${query}&token=secret&github_token=ghp_secret`,
    );
    expect(fromPlayground).toBe(`/generate/github?${query}`);
    expect(fromPlayground).not.toContain("token");
    expect(fromPlayground).not.toContain("secret");

    const fromGenerate = toCrossLink(`/generate/github/stats?${query}&pat=x`);
    expect(fromGenerate).toBe(`/playground/github/stats?${query}`);
    expect(fromGenerate).not.toContain("pat=");
  });
});
