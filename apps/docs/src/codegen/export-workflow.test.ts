import { describe, expect, it } from "vitest";
import { THIN_ACTION_INPUT_NAMES } from "../../../../packages/core/src/codegen/action-yml.ts";
import {
  assertNoFlattenedActionInputs,
  findFlattenedActionInputs,
  isFlattenedActionInputName,
} from "../../../../packages/core/src/codegen/flatten.ts";
import { parseConfig } from "../../../../packages/core/src/parse-config.ts";
import {
  PREVIEW_TOKEN_QUERY_KEYS,
  type PreviewOptions,
} from "../preview/types";
import {
  EXPORT_ACTION_USES,
  EXPORT_CONFIG_PATH,
  EXPORT_THIN_WITH_KEYS,
  type ExportWorkflowState,
  exportWorkflow,
} from "./export-workflow";

const DEFAULT_STATE: ExportWorkflowState = {
  user: "octocat",
  format: "svg",
  theme: "dark",
  output_pair: false,
};

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

const TOKEN_LITERALS = [
  "ghp_secretleaktoken",
  "gho_secretleaktoken",
  "github_pat_secretleaktoken",
];

function tokenBag(state: ExportWorkflowState): ExportWorkflowState {
  return {
    ...state,
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
  } as ExportWorkflowState;
}

function workflowWithKeys(yml: string): string[] {
  const lines = yml.split("\n");
  const keys: string[] = [];
  let inWith = false;
  let withIndent = -1;
  for (const line of lines) {
    if (!inWith) {
      const start = line.match(/^(\s*)with:\s*$/);
      if (start) {
        inWith = true;
        withIndent = start[1].length;
      }
      continue;
    }
    const key = line.match(/^(\s*)([A-Za-z0-9_]+):/);
    if (!key) {
      if (line.trim() === "") {
        continue;
      }
      break;
    }
    const indent = key[1].length;
    if (indent <= withIndent) {
      break;
    }
    if (indent === withIndent + 2) {
      keys.push(key[2]);
    }
  }
  return keys;
}

describe("exportWorkflow", () => {
  it("emits schedule + workflow_dispatch, not bare on: push", () => {
    const { workflowYml } = exportWorkflow(DEFAULT_STATE);

    expect(workflowYml).toMatch(/^\s*schedule:/m);
    expect(workflowYml).toMatch(/workflow_dispatch:/);
    expect(workflowYml).toMatch(/cron:/);
    expect(workflowYml).not.toMatch(/^on:\s*push\s*$/m);
    expect(workflowYml).not.toMatch(/on:\s*\n\s*push:/);
    expect(workflowYml).toContain(`uses: ${EXPORT_ACTION_USES}`);
  });

  it("uses only thin with: keys", () => {
    const { workflowYml } = exportWorkflow({
      ...DEFAULT_STATE,
      format: "png",
      theme: "light",
      dry_run: true,
      output_action: "commit",
    });
    const keys = workflowWithKeys(workflowYml);

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(THIN_ACTION_INPUT_NAMES).toContain(key);
      expect(EXPORT_THIN_WITH_KEYS).toContain(key);
      expect(isFlattenedActionInputName(key)).toBe(false);
    }
    expect(keys).toContain("user");
    expect(keys).toContain("github_token");
    expect(keys).toContain("committer_token");
    expect(keys).toContain("config");
    expect(keys).toContain("output_action");
    expect(keys).toContain("dry_run");
    expect(keys).toContain("format");
    expect(keys).toContain("theme");
    expect(workflowYml).toContain(`config: ${EXPORT_CONFIG_PATH}`);
  });

  it("does not emit flattened plugin_<plugin>_<widget>_<option> names", () => {
    const { workflowYml, configYml } = exportWorkflow({
      ...DEFAULT_STATE,
      options: YAML_OPTIONS,
      enabled: ["demo", "stats", "languages"],
    });
    const combined = `${workflowYml}\n${configYml}`;

    expect(combined).not.toContain("plugin_github_stats_include");
    expect(combined).not.toContain("plugin_github_widgets");
    expect(combined).not.toContain("plugin_github_filename_");
    expect(findFlattenedActionInputs(workflowYml)).toEqual([]);
    expect(findFlattenedActionInputs(configYml)).toEqual([]);
    expect(() => assertNoFlattenedActionInputs(workflowYml)).not.toThrow();
    expect(() => assertNoFlattenedActionInputs(configYml)).not.toThrow();
  });

  it("puts stats include in config yaml, not as an Action input", () => {
    const { workflowYml, configYml } = exportWorkflow({
      ...DEFAULT_STATE,
      widgets: {
        stats: { include: ["followers", "stars", "contributions"] },
      },
      enabled: ["stats"],
    });

    expect(configYml).toMatch(/include: \[followers, stars, contributions\]/);
    expect(workflowYml).not.toContain("plugin_github_stats_include");
    expect(workflowWithKeys(workflowYml)).not.toContain(
      "plugin_github_stats_include",
    );
  });

  it("round-trips configYml through parseConfig (pack defaults)", () => {
    const { configYml } = exportWorkflow(DEFAULT_STATE);
    const config = parseConfig({ yaml: configYml });

    expect(config.version).toBe(1);
    expect(config.format).toBe("svg");
    expect(config.theme).toBe("dark");
    expect(config.output_pair).toBe(false);
    expect(config.animated).toBe(false);
    expect(config.timezone).toBe("UTC");
    expect(config.output_dir).toBe("profile-bits");
    expect(config.plugins.github?.widgets?.demo).toBeUndefined();
    expect(config.plugins.github?.widgets?.stats).toMatchObject({
      filename: "stats",
      include: ["followers", "repos", "stars"],
    });
    expect(config.plugins.github?.widgets?.languages).toMatchObject({
      filename: "languages",
      limit: 8,
    });
  });

  it("round-trips enabled demo/stats/languages options", () => {
    const { configYml } = exportWorkflow({
      ...DEFAULT_STATE,
      format: "png",
      theme: "light",
      output_pair: true,
      animated: true,
      timezone: "America/New_York",
      output_dir: "bits",
      enabled: ["demo", "stats", "languages"],
      options: YAML_OPTIONS,
    });
    const config = parseConfig({ yaml: configYml });

    expect(config.format).toBe("png");
    expect(config.theme).toBe("light");
    expect(config.output_pair).toBe(true);
    expect(config.animated).toBe(true);
    expect(config.timezone).toBe("America/New_York");
    expect(config.output_dir).toBe("bits");
    expect(config.plugins.github?.widgets?.demo).toMatchObject({
      text: "profile-bits",
      subtitle: "github pack",
      animate: true,
    });
    expect(config.plugins.github?.widgets?.stats?.include).toEqual([
      "followers",
      "repos",
      "stars",
    ]);
    expect(config.plugins.github?.widgets?.languages?.exclude).toEqual([
      "HTML",
    ]);
  });

  it("emits pair for custom + output_pair and parseConfig succeeds", () => {
    const { configYml } = exportWorkflow({
      ...DEFAULT_STATE,
      theme: {
        custom: {
          bg: "catppuccin-mocha.bg",
          card: "catppuccin-mocha.card",
          text: "catppuccin-mocha.text",
          muted: "catppuccin-mocha.muted",
          accent: "catppuccin-mocha.accent",
          border: "catppuccin-mocha.border",
          pair: "catppuccin-latte",
        },
      },
      output_pair: true,
    });
    expect(configYml).toMatch(/pair:\s*catppuccin-latte/);
    const config = parseConfig({ yaml: configYml });
    expect(config.output_pair).toBe(true);
    expect(config.theme).toMatchObject({
      custom: { pair: "catppuccin-latte" },
    });
  });

  it("emits only enabled widgets", () => {
    const { configYml } = exportWorkflow({
      ...DEFAULT_STATE,
      enabled: ["demo"],
      widgets: { demo: { text: "hello" } },
    });
    const config = parseConfig({ yaml: configYml });

    expect(config.plugins.github?.widgets?.demo?.text).toBe("hello");
    expect(config.plugins.github?.widgets?.stats).toBeUndefined();
    expect(config.plugins.github?.widgets?.languages).toBeUndefined();
  });

  it("emits empty plugins when every widget is disabled", () => {
    const { configYml, workflowYml } = exportWorkflow({
      ...DEFAULT_STATE,
      enabled: [],
    });
    const config = parseConfig({ yaml: configYml });

    expect(configYml).toMatch(/plugins: \{\}\s*$/m);
    expect(config.plugins.github).toBeUndefined();
    expect(workflowYml).not.toContain("plugin_github_stats_include");
  });

  it("never emits visitor tokens, zip, or extra plugins", () => {
    const { workflowYml, configYml } = exportWorkflow(
      tokenBag({
        ...DEFAULT_STATE,
        enabled: ["stats", "languages"],
        options: YAML_OPTIONS,
      }),
    );
    const combined = `${workflowYml}\n${configYml}`;

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
    expect(configYml).not.toContain("gitlab");
    expect(configYml).toContain("github:");
    expect(workflowYml).toContain(`\${{ github.token }}`);
    expect(workflowYml).not.toContain("secrets.VISITOR");
    for (const key of PREVIEW_TOKEN_QUERY_KEYS) {
      expect(configYml).not.toMatch(new RegExp(`^\\s*${key}:`, "m"));
    }
  });

  it("defaults empty user to the repository owner expression", () => {
    const { workflowYml } = exportWorkflow({ ...DEFAULT_STATE, user: "  " });
    expect(workflowYml).toContain(`user: \${{ github.repository_owner }}`);
  });
});
