import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PREVIEW_PLUGIN_IDS,
  PREVIEW_TOKEN_QUERY_KEYS,
  type PreviewOptions,
  type PreviewRequest,
} from "../preview/types";
import {
  EXPORT_ACTION_USES,
  EXPORT_CONFIG_PATH,
  EXPORT_FEED_SAMPLE_URL,
  EXPORT_JSON_SAMPLE_URL,
  exportWorkflow,
} from "./export-workflow";
import {
  PACK_EMITTER_CONFIG_LABEL,
  PACK_EMITTER_CONFIG_SLOT,
  PACK_EMITTER_WORKFLOW_LABEL,
  PACK_EMITTER_WORKFLOW_SLOT,
  PackEmitter,
  packEmitterState,
} from "./pack-emitter";

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
};

const PLUGIN_REQUEST: PreviewRequest = {
  scope: "plugin",
  plugin: "github",
  options: YAML_OPTIONS,
  format: "svg",
  theme: "dark",
  output_pair: false,
  user: "octocat",
};

const TOKEN_LITERALS = [
  "ghp_secretleaktoken",
  "gho_secretleaktoken",
  "github_pat_secretleaktoken",
];

function tokenBag(
  request: PreviewRequest,
): PreviewRequest & Record<(typeof PREVIEW_TOKEN_QUERY_KEYS)[number], string> {
  return {
    ...request,
    github_token: "ghp_secretleaktoken",
    committer_token: "ghs_secretleaktoken",
    token: "secret-token",
    pat: "pat_secret",
    access_token: "access_secret",
    authorization: "Bearer secret",
    gist_token: "gist_secret",
    http_token_env: "HTTP_TOKEN",
    http_token: "http_secret",
    zip: "widgets.zip",
  };
}

function sourceUrl(): URL {
  return new URL("./pack-emitter.tsx", import.meta.url);
}

function renderedHtml(request: PreviewRequest = PLUGIN_REQUEST): string {
  return renderToStaticMarkup(
    createElement(PackEmitter, { state: packEmitterState(request) }),
  );
}

describe("packEmitterState", () => {
  it("maps PreviewRequest onto ExportWorkflowState without token keys", () => {
    const state = packEmitterState(tokenBag(PLUGIN_REQUEST));

    expect(state).toEqual({
      user: "octocat",
      format: "svg",
      theme: "dark",
      output_pair: false,
      plugin: "github",
      options: {
        demo: YAML_OPTIONS.demo,
        stats: YAML_OPTIONS.stats,
        languages: YAML_OPTIONS.languages,
      },
    });
    expect(state).not.toHaveProperty("github_token");
    expect(state).not.toHaveProperty("committer_token");
    expect(state).not.toHaveProperty("token");
    expect(state).not.toHaveProperty("zip");
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(state).not.toHaveProperty(key);
    }
  });

  it("enables only the focused widget in widget scope", () => {
    const state = packEmitterState({
      scope: "widget",
      plugin: "github",
      widget: "stats",
      options: YAML_OPTIONS,
      format: "png",
      theme: "light",
      output_pair: true,
      user: "octocat",
    });

    expect(state.enabled).toEqual(["stats"]);
    expect(state.plugin).toBe("github");
    expect(state.format).toBe("png");
    expect(state.theme).toBe("light");
    expect(state.output_pair).toBe(true);
  });

  it.each(PREVIEW_PLUGIN_IDS)(
    "carries route plugin %s onto ExportWorkflowState",
    (plugin) => {
      const state = packEmitterState({
        scope: "plugin",
        plugin,
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      });
      expect(state.plugin).toBe(plugin);
    },
  );

  it("maps coding/feed/json/chips options without token keys", () => {
    const state = packEmitterState({
      scope: "plugin",
      plugin: "http",
      options: {
        json: { url: EXPORT_JSON_SAMPLE_URL },
        chips: { preset: "shieldcn", types: ["npm"] },
        feed: { url: EXPORT_FEED_SAMPLE_URL },
        coding: { range: "last_7_days" },
      },
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    });

    expect(state.plugin).toBe("http");
    expect(state.options?.json?.url).toBe(EXPORT_JSON_SAMPLE_URL);
    expect(state.options?.chips?.preset).toBe("shieldcn");
    expect(state.options?.feed?.url).toBe(EXPORT_FEED_SAMPLE_URL);
    expect(state.options?.coding?.range).toBe("last_7_days");
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(state).not.toHaveProperty(key);
    }
  });
});

describe("PackEmitter source", () => {
  it("calls exportWorkflow and does not own Copy, Download, or Share", async () => {
    const source = await readFile(sourceUrl(), "utf8");

    expect(source).toContain('"use client"');
    expect(source).toContain("exportWorkflow");
    expect(source).toContain('from "./export-workflow"');
    expect(source).toContain("export function packEmitterState");
    expect(source).toContain(`data-slot="${PACK_EMITTER_WORKFLOW_SLOT}"`);
    expect(source).toContain(`data-slot="${PACK_EMITTER_CONFIG_SLOT}"`);
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("CopyButton");
    expect(source).not.toContain("copy-button");
    expect(source).not.toMatch(/from ["']@\/src\/generate/);
    expect(source).not.toMatch(/from ["']\.\.\/generate/);
    expect(source).not.toMatch(/\bzip\b/i);
    expect(source).not.toMatch(/\bDownload\b/);
    expect(source).not.toMatch(/\bShare\b/);
  });
});

describe("PackEmitter", () => {
  it("renders thin workflow YAML and profile-bits.yml from exportWorkflow", () => {
    const state = packEmitterState(PLUGIN_REQUEST);
    const { workflowYml, configYml } = exportWorkflow(state);
    const html = renderedHtml();

    expect(html).toContain('data-slot="pack-emitter"');
    expect(html).toContain(`data-slot="${PACK_EMITTER_WORKFLOW_SLOT}"`);
    expect(html).toContain(`data-slot="${PACK_EMITTER_CONFIG_SLOT}"`);
    expect(html).toContain('data-pack-emitter-region="workflow"');
    expect(html).toContain('data-pack-emitter-region="config"');
    expect(html).toContain(PACK_EMITTER_WORKFLOW_LABEL);
    expect(html).toContain(PACK_EMITTER_CONFIG_LABEL);
    expect(html).toContain("name: Profile Bits");
    expect(html).toContain(`uses: ${EXPORT_ACTION_USES}`);
    expect(html).toContain(`config: ${EXPORT_CONFIG_PATH}`);
    expect(html).toContain("version: 1");
    expect(html).toContain("plugins:");
    expect(workflowYml).toContain(`uses: ${EXPORT_ACTION_USES}`);
    expect(workflowYml).toContain(`config: ${EXPORT_CONFIG_PATH}`);
    expect(configYml).toContain("plugins:");
    expect(configYml).toContain("github:");
    expect(html).not.toContain("plugin_github_stats_include");
    expect(workflowYml).not.toContain("plugin_github_stats_include");
    expect(configYml).not.toContain("plugin_github_stats_include");
    expect(html.toLowerCase()).not.toContain("download");
    expect(html.toLowerCase()).not.toContain("share");
    expect(html.toLowerCase()).not.toContain("zip");
    expect(html).not.toContain('data-slot="copy-button"');
    expect(html).not.toContain('data-slot="code-rail"');
  });

  it("renders plugins.wakatime yaml rails for the wakatime pack", () => {
    const html = renderedHtml({
      scope: "plugin",
      plugin: "wakatime",
      options: {},
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    });

    expect(html).toContain("plugins:");
    expect(html).toContain("wakatime:");
    expect(html).toContain("coding:");
    expect(html).not.toContain("plugin_wakatime");
    expect(html).not.toContain("wakatime_token");
  });

  it("renders plugins.rss and plugins.http yaml rails", () => {
    const rss = renderedHtml({
      scope: "plugin",
      plugin: "rss",
      options: {},
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    });
    const http = renderedHtml({
      scope: "plugin",
      plugin: "http",
      options: {},
      format: "svg",
      theme: "dark",
      output_pair: false,
      user: "octocat",
    });

    expect(rss).toContain("rss:");
    expect(rss).toContain("feed:");
    expect(rss).toContain(EXPORT_FEED_SAMPLE_URL);
    expect(rss).not.toContain("plugin_rss");
    expect(http).toContain("http:");
    expect(http).toContain("chips:");
    expect(http).not.toContain("plugin_http");
    expect(http).not.toContain("http_token");
  });

  it("does not emit token literals from a token-bag request", () => {
    const state = packEmitterState(tokenBag(PLUGIN_REQUEST));
    const { workflowYml, configYml } = exportWorkflow(state);
    const html = renderedHtml(tokenBag(PLUGIN_REQUEST));
    const combined = `${workflowYml}\n${configYml}\n${html}`;

    for (const literal of TOKEN_LITERALS) {
      expect(combined).not.toContain(literal);
    }
    expect(combined).not.toMatch(/\bghp_/);
    expect(combined).not.toMatch(/\bgho_/);
    expect(combined).not.toMatch(/\bghs_/);
    expect(combined).not.toContain("github_pat_");
    expect(combined).not.toContain("secret-token");
    expect(combined).not.toContain("pat_secret");
    expect(combined).not.toContain("access_secret");
    expect(combined).not.toContain("Bearer secret");
    expect(combined).not.toContain("gist_secret");
    expect(combined).not.toContain("widgets.zip");
    expect(workflowYml).toContain(`\${{ github.token }}`);
    expect(workflowYml).toContain(`uses: ${EXPORT_ACTION_USES}`);
    expect(workflowYml).toContain(`config: ${EXPORT_CONFIG_PATH}`);
    expect(workflowYml).not.toContain("plugin_github_stats_include");
  });
});
