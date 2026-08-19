import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTION_CONFIG_PATH_DEFAULT,
  CodingOptionsSchema,
  DemoOptionsSchema,
  FeedOptionsSchema,
  GithubWidgetsConfigSchema,
  HttpWidgetsConfigSchema,
  LanguagesOptionsSchema,
  PluginsConfigSchema,
  RssWidgetsConfigSchema,
  StatsOptionsSchema,
  WakatimeWidgetsConfigSchema,
} from "@profile-bits/core";
import { describe, expect, it } from "vitest";
import {
  githubWidgetIdsFromSchemas,
  pluginIdsFromSchemas,
  pluginWidgetEntriesFromSchemas,
  renderLlmsTxt,
} from "@/src/llms/llms-txt";

const PUBLIC_LLMS_TXT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/llms.txt",
);

describe("llms.txt stub from schemas", () => {
  it("lists github widgets from widget option schemas, not a parallel table", () => {
    const fromSchema = githubWidgetIdsFromSchemas();

    expect(Object.keys(GithubWidgetsConfigSchema.shape)).toEqual(fromSchema);
    expect(fromSchema).toEqual(["demo", "stats", "languages"]);

    const txt = renderLlmsTxt();
    expect(txt).toContain("### `github`");
    for (const id of fromSchema) {
      expect(txt).toContain(`- \`${id}\``);
    }
  });

  it("names plugins and widgets from option schemas", () => {
    const plugins = pluginIdsFromSchemas();
    const entries = pluginWidgetEntriesFromSchemas();

    expect(Object.keys(PluginsConfigSchema.shape)).toEqual(plugins);
    expect(plugins).toEqual(["github", "wakatime", "rss", "http"]);
    expect(renderLlmsTxt()).toContain("`github`");

    const wakatime = entries.find((entry) => entry.plugin === "wakatime");
    expect(wakatime?.widgets).toEqual(
      Object.keys(WakatimeWidgetsConfigSchema.shape),
    );
    expect(wakatime?.widgets).toEqual(["coding"]);
    expect(renderLlmsTxt()).toContain("### `wakatime`");
    for (const id of wakatime?.widgets ?? []) {
      expect(renderLlmsTxt()).toContain(`- \`${id}\``);
    }

    const rss = entries.find((entry) => entry.plugin === "rss");
    expect(rss?.widgets).toEqual(Object.keys(RssWidgetsConfigSchema.shape));
    expect(rss?.widgets).toEqual(["feed"]);
    expect(renderLlmsTxt()).toContain("### `rss`");
    for (const id of rss?.widgets ?? []) {
      expect(renderLlmsTxt()).toContain(`- \`${id}\``);
    }

    const http = entries.find((entry) => entry.plugin === "http");
    expect(http?.widgets).toEqual(Object.keys(HttpWidgetsConfigSchema.shape));
    expect(http?.widgets).toEqual(["json", "chips"]);
    expect(renderLlmsTxt()).toContain("### `http`");
    for (const id of http?.widgets ?? []) {
      expect(renderLlmsTxt()).toContain(`- \`${id}\``);
    }
  });

  it("states yaml SSOT, thin action, and no flattened inputs", () => {
    const txt = renderLlmsTxt();

    expect(txt).toContain(ACTION_CONFIG_PATH_DEFAULT);
    expect(txt).toContain("additionalProperties: false");
    expect(txt).toContain("action.yml");
    expect(txt).toContain("thin");
    expect(txt).toContain("`user`");
    expect(txt).toContain("`github_token`");
    expect(txt).toContain("`committer_token`");
    expect(txt).toContain("`config`");
    expect(txt).toContain("`output_action`");
    expect(txt).toContain("`dry_run`");
    expect(txt).toContain("`plugin_github`");
    expect(txt).toContain("plugin_<plugin>_<widget>_<option>");
    expect(txt).toContain("plugin_github_stats_include");
  });

  it("distinguishes Action delivery, local CLI, playground, catalog, gist, and customization", () => {
    const txt = renderLlmsTxt();

    expect(txt).toContain(
      "README delivery is the Action (commit widget files)",
    );
    expect(txt).toContain("`just render`");
    expect(txt).toContain("`profile-bits render`");
    expect(txt).toContain("local engine runner");
    expect(txt).toContain("not a public embed API");
    expect(txt).toContain("layout preview only");
    expect(txt).toContain("`/generate/catalog`");
    expect(txt).toContain("first-party visual gallery");
    expect(txt).toContain("not a plugin marketplace");
    expect(txt).toContain("optional `output_action`");
    expect(txt).toContain("not a CDN");
    expect(txt).toContain(
      "first-party packs `github` / `wakatime` / `rss` / `http`",
    );
    expect(txt).toContain("http widgets include `json` and `chips`");
    expect(txt).toContain("not a user plugin loader");
  });

  it("is a stub, not a full widget option schema dump", () => {
    const txt = renderLlmsTxt();
    const optionKeys = [
      ...Object.keys(DemoOptionsSchema.shape),
      ...Object.keys(StatsOptionsSchema.shape),
      ...Object.keys(LanguagesOptionsSchema.shape),
      ...Object.keys(CodingOptionsSchema.shape),
      ...Object.keys(FeedOptionsSchema.shape),
    ];

    expect(txt).not.toContain("hide_rank");
    expect(txt).not.toContain("include_archived");
    expect(txt).not.toContain("include_private");
    expect(txt).not.toContain("min_pct");
    expect(txt).not.toContain("subtitle");
    expect(txt).not.toContain("api_domain");
    expect(optionKeys.length).toBeGreaterThan(0);
  });

  it("publishes the stub at apps/docs/public/llms.txt", () => {
    const published = readFileSync(PUBLIC_LLMS_TXT, "utf8");

    expect(published).toBe(renderLlmsTxt());
  });
});
