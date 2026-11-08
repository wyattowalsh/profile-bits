import {
  CHIPS_OPTION_DEFAULTS,
  CODING_LIMIT_MAX,
  CODING_LIMIT_MIN,
  CODING_OPTION_DEFAULTS,
  FEED_ANIMATE_DEFAULT,
  FEED_FILENAME_DEFAULT,
  FEED_LIMIT_DEFAULT,
  FEED_LIMIT_MAX,
  FEED_LIMIT_MIN,
  isForbiddenApiDomain,
  JSON_OPTION_DEFAULTS,
  JSON_TIMEOUT_MS_MAX,
  JSON_TIMEOUT_MS_MIN,
} from "@profile-bits/core";
import {
  isPreviewChipPreset,
  isPreviewChipType,
  isPreviewCodingIncludeToken,
  isPreviewCodingRange,
  isPreviewPluginId,
  isPreviewRepoIncludeToken,
  isPreviewStatsIncludeToken,
  type PreviewChipsOptions,
  type PreviewCodingOptions,
  type PreviewDemoOptions,
  type PreviewFeedOptions,
  type PreviewJsonOptions,
  type PreviewLanguagesOptions,
  type PreviewOptions,
  type PreviewOutputFormat,
  type PreviewPluginId,
  type PreviewRepoIncludeToken,
  type PreviewRepoOptions,
  type PreviewStatsIncludeToken,
  type PreviewStatsOptions,
  type PreviewTheme,
  type PreviewWidgetId,
  widgetsForPlugin,
} from "../preview/types";

/** Consumer pin. `@v1` is the floating tag on orphan `release/v1`, not `main`. */
export const EXPORT_ACTION_USES = "wyattowalsh/profile-bits@v1";

export const EXPORT_CONFIG_PATH = ".github/profile-bits.yml";

export const EXPORT_OUTPUT_ACTIONS = [
  "none",
  "commit",
  "pull-request",
  "gist",
] as const;
export type ExportOutputAction = (typeof EXPORT_OUTPUT_ACTIONS)[number];

/** Thin `with:` keys the emitter may write. Widget options belong in config yaml. */
export const EXPORT_THIN_WITH_KEYS = [
  "user",
  "github_token",
  "committer_token",
  "config",
  "output_action",
  "dry_run",
  "format",
  "theme",
  "plugin_github",
] as const;
export type ExportThinWithKey = (typeof EXPORT_THIN_WITH_KEYS)[number];

const GITHUB_PACK_DEFAULT_WIDGETS = [
  "stats",
  "languages",
] as const satisfies readonly PreviewWidgetId[];

/** Playground sample https URLs so rss/json rails parse without visitor input. */
export const EXPORT_FEED_SAMPLE_URL = "https://example.com/feed.xml";
export const EXPORT_JSON_SAMPLE_URL = "https://example.com/api.json";

const CHIPS_PRESET_DEFAULT = "shieldcn";
const CHIPS_TYPES_DEFAULT = ["npm"] as const satisfies readonly NonNullable<
  PreviewChipsOptions["types"]
>[number][];

const CONFIG_VERSION = 1;
const CONFIG_FORMAT_DEFAULT: PreviewOutputFormat = "svg";
const CONFIG_THEME_DEFAULT: PreviewTheme = "dark";
const CONFIG_ANIMATED_DEFAULT = false;
const CONFIG_TIMEZONE_DEFAULT = "UTC";
const CONFIG_OUTPUT_DIR_DEFAULT = "profile-bits";
const OUTPUT_ACTION_DEFAULT: ExportOutputAction = "commit";

const LANGUAGES_LIMIT_MIN = 1;
const LANGUAGES_LIMIT_MAX = 16;

const DEMO_OPTION_DEFAULTS: Required<
  Pick<PreviewDemoOptions, "text" | "animate">
> = {
  text: "profile-bits",
  animate: true,
};

const STATS_OPTION_DEFAULTS: {
  filename: string;
  include: PreviewStatsIncludeToken[];
  hide_rank: boolean;
  avatar: boolean;
  animate: boolean;
  include_private: boolean;
  include_forks: boolean;
  include_archived: boolean;
} = {
  filename: "stats",
  include: ["followers", "repos", "stars"],
  hide_rank: true,
  avatar: true,
  animate: false,
  include_private: false,
  include_forks: false,
  include_archived: false,
};

const LANGUAGES_OPTION_DEFAULTS: Required<PreviewLanguagesOptions> = {
  filename: "languages",
  limit: 8,
  min_pct: 1,
  exclude: [],
  animate: false,
  include_private: false,
  include_forks: false,
  include_archived: false,
};

const REPO_OPTION_DEFAULTS: {
  filename: string;
  include: PreviewRepoIncludeToken[];
  avatar: boolean;
  animate: boolean;
} = {
  filename: "repo",
  include: ["stars", "forks", "issues", "license"],
  avatar: true,
  animate: false,
};

/** Action-default token expressions only. Never visitor PATs. */
const GITHUB_TOKEN_EXPR = `\${{ github.token }}`;
const GITHUB_USER_EXPR = `\${{ github.repository_owner }}`;
const SCHEDULE_CRON = "0 0 * * *";

const TOKEN_LITERAL =
  /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+/;

export type ExportWorkflowWidgets = {
  demo?: PreviewDemoOptions;
  stats?: PreviewStatsOptions;
  languages?: PreviewLanguagesOptions;
  repo?: PreviewRepoOptions;
  coding?: PreviewCodingOptions;
  feed?: PreviewFeedOptions;
  json?: PreviewJsonOptions;
  chips?: PreviewChipsOptions;
};

/**
 * Playground tuner state. Extra enumerable keys (tokens, zip, unknown plugins)
 * are ignored. `plugin` selects the yaml rail `plugins.<pack>`.
 */
export type ExportWorkflowState = {
  user: string;
  format: PreviewOutputFormat;
  theme: PreviewTheme;
  output_pair: boolean;
  animated?: boolean;
  output_action?: ExportOutputAction;
  dry_run?: boolean;
  timezone?: string;
  output_dir?: string;
  /** Route/selector pack. Omitted → github. */
  plugin?: PreviewPluginId;
  /** Checkbox list. Omitted → keys present on widgets/options, else pack defaults. */
  enabled?: readonly PreviewWidgetId[];
  widgets?: ExportWorkflowWidgets;
  /** PreviewRequest.options alias when `widgets` is omitted. */
  options?: PreviewOptions;
};

export type ExportWorkflowResult = {
  workflowYml: string;
  configYml: string;
};

export function exportWorkflow(
  state: ExportWorkflowState,
): ExportWorkflowResult {
  return {
    workflowYml: renderWorkflowYml(state),
    configYml: renderConfigYml(state),
  };
}

function renderWorkflowYml(state: ExportWorkflowState): string {
  const outputAction = resolveOutputAction(state.output_action);
  const withLines = renderWithLines(state, outputAction);
  const permissionLines = ["  contents: write"];
  if (outputAction === "pull-request") {
    permissionLines.push("  pull-requests: write");
  }

  return [
    "name: Profile Bits",
    "on:",
    "  schedule:",
    `    - cron: ${quoteDouble(SCHEDULE_CRON)}`,
    "  workflow_dispatch:",
    "permissions:",
    ...permissionLines,
    "jobs:",
    "  profile-bits:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    `      - uses: ${EXPORT_ACTION_USES}`,
    "        with:",
    ...withLines.map((line) => `          ${line}`),
    "",
  ].join("\n");
}

function renderWithLines(
  state: ExportWorkflowState,
  outputAction: ExportOutputAction,
): string[] {
  const lines: string[] = [
    `user: ${resolveUser(state.user)}`,
    `github_token: ${GITHUB_TOKEN_EXPR}`,
    `committer_token: ${GITHUB_TOKEN_EXPR}`,
    `config: ${EXPORT_CONFIG_PATH}`,
    `output_action: ${outputAction}`,
  ];

  if (state.dry_run !== undefined) {
    lines.push(`dry_run: ${state.dry_run}`);
  }
  if (state.format !== CONFIG_FORMAT_DEFAULT) {
    lines.push(`format: ${state.format}`);
  }
  if (typeof state.theme === "string" && state.theme !== CONFIG_THEME_DEFAULT) {
    lines.push(`theme: ${state.theme}`);
  }

  return lines;
}

function renderThemeYaml(theme: PreviewTheme): string {
  if (typeof theme === "string") {
    return `theme: ${theme}`;
  }
  const roles = theme.custom;
  const lines = [
    "theme:",
    "  custom:",
    `    bg: ${yamlScalar(roles.bg)}`,
    `    card: ${yamlScalar(roles.card)}`,
    `    text: ${yamlScalar(roles.text)}`,
    `    muted: ${yamlScalar(roles.muted)}`,
    `    accent: ${yamlScalar(roles.accent)}`,
    `    border: ${yamlScalar(roles.border)}`,
  ];
  if (roles.pair !== undefined) {
    lines.push(`    pair: ${yamlScalar(roles.pair)}`);
  }
  return lines.join("\n");
}

function renderConfigYml(state: ExportWorkflowState): string {
  const plugin = resolvePlugin(state.plugin);
  const widgets = resolveWidgets(state);
  const widgetIds = widgetsForPlugin(plugin).filter(
    (id) => widgets[id] !== undefined,
  );

  const globals: string[] = [
    `version: ${CONFIG_VERSION}`,
    `format: ${state.format}`,
    renderThemeYaml(state.theme),
    `output_pair: ${state.output_pair}`,
    `animated: ${state.animated ?? CONFIG_ANIMATED_DEFAULT}`,
    `timezone: ${yamlScalar(state.timezone?.trim() || CONFIG_TIMEZONE_DEFAULT)}`,
    `output_dir: ${yamlScalar(state.output_dir?.trim() || CONFIG_OUTPUT_DIR_DEFAULT)}`,
  ];

  if (widgetIds.length === 0) {
    return `${[...globals, "plugins: {}"].join("\n")}\n`;
  }

  const lines = [
    ...globals,
    "plugins:",
    `  ${plugin}:`,
    "    widgets:",
    ...renderWidgetBlocks(plugin, widgets, widgetIds),
  ];

  return `${lines.join("\n")}\n`;
}

function renderWidgetBlocks(
  plugin: PreviewPluginId,
  widgets: ExportWorkflowWidgets,
  widgetIds: readonly PreviewWidgetId[],
): string[] {
  const lines: string[] = [];
  for (const id of widgetIds) {
    if (plugin === "github" && id === "demo" && widgets.demo !== undefined) {
      lines.push(...renderDemoBlock(widgets.demo));
    }
    if (plugin === "github" && id === "stats" && widgets.stats !== undefined) {
      lines.push(...renderStatsBlock(widgets.stats));
    }
    if (
      plugin === "github" &&
      id === "languages" &&
      widgets.languages !== undefined
    ) {
      lines.push(...renderLanguagesBlock(widgets.languages));
    }
    if (plugin === "github" && id === "repo" && widgets.repo !== undefined) {
      lines.push(...renderRepoBlock(widgets.repo));
    }
    if (
      plugin === "wakatime" &&
      id === "coding" &&
      widgets.coding !== undefined
    ) {
      lines.push(...renderCodingBlock(widgets.coding));
    }
    if (plugin === "rss" && id === "feed" && widgets.feed !== undefined) {
      lines.push(...renderFeedBlock(widgets.feed));
    }
    if (plugin === "http" && id === "json" && widgets.json !== undefined) {
      lines.push(...renderJsonBlock(widgets.json));
    }
    if (plugin === "http" && id === "chips" && widgets.chips !== undefined) {
      lines.push(...renderChipsBlock(widgets.chips));
    }
  }
  return lines;
}

function resolveUser(user: string): string {
  const trimmed = user.trim();
  if (trimmed === "" || TOKEN_LITERAL.test(trimmed)) {
    return GITHUB_USER_EXPR;
  }
  return yamlScalar(trimmed);
}

function resolveOutputAction(
  value: ExportOutputAction | undefined,
): ExportOutputAction {
  if (
    value !== undefined &&
    (EXPORT_OUTPUT_ACTIONS as readonly string[]).includes(value)
  ) {
    return value;
  }
  return OUTPUT_ACTION_DEFAULT;
}

function resolvePlugin(plugin: PreviewPluginId | undefined): PreviewPluginId {
  return plugin !== undefined && isPreviewPluginId(plugin) ? plugin : "github";
}

function defaultEnabledForPlugin(
  plugin: PreviewPluginId,
): readonly PreviewWidgetId[] {
  if (plugin === "github") {
    return GITHUB_PACK_DEFAULT_WIDGETS;
  }
  if (plugin === "wakatime") {
    return ["coding"];
  }
  if (plugin === "rss") {
    return ["feed"];
  }
  return ["chips"];
}

function resolveWidgets(state: ExportWorkflowState): ExportWorkflowWidgets {
  const plugin = resolvePlugin(state.plugin);
  const allowed = widgetsForPlugin(plugin);
  const source: ExportWorkflowWidgets = {
    ...(state.options?.demo !== undefined ? { demo: state.options.demo } : {}),
    ...(state.options?.stats !== undefined
      ? { stats: state.options.stats }
      : {}),
    ...(state.options?.languages !== undefined
      ? { languages: state.options.languages }
      : {}),
    ...(state.options?.repo !== undefined ? { repo: state.options.repo } : {}),
    ...(state.options?.coding !== undefined
      ? { coding: state.options.coding }
      : {}),
    ...(state.options?.feed !== undefined ? { feed: state.options.feed } : {}),
    ...(state.options?.json !== undefined ? { json: state.options.json } : {}),
    ...(state.options?.chips !== undefined
      ? { chips: state.options.chips }
      : {}),
    ...state.widgets,
  };

  const present = allowed.filter((id) => source[id] !== undefined);
  const requested =
    state.enabled ??
    (present.length > 0 ? present : defaultEnabledForPlugin(plugin));
  const enabled = requested.filter((id) =>
    (allowed as readonly string[]).includes(id),
  );

  const out: ExportWorkflowWidgets = {};
  for (const id of enabled) {
    if (id === "demo") {
      out.demo = mergeDemo(source.demo);
    } else if (id === "stats") {
      out.stats = mergeStats(source.stats);
    } else if (id === "languages") {
      out.languages = mergeLanguages(source.languages);
    } else if (id === "repo") {
      const repo = mergeRepo(source.repo);
      if (repo !== undefined) {
        out.repo = repo;
      }
    } else if (id === "coding") {
      out.coding = mergeCoding(source.coding);
    } else if (id === "feed") {
      const feed = mergeFeed(source.feed);
      if (feed !== undefined) {
        out.feed = feed;
      }
    } else if (id === "json") {
      const json = mergeJson(source.json);
      if (json !== undefined) {
        out.json = json;
      }
    } else if (id === "chips") {
      out.chips = mergeChips(source.chips);
    }
  }
  return out;
}

function mergeDemo(
  options: PreviewDemoOptions | undefined,
): PreviewDemoOptions {
  const out: PreviewDemoOptions = {
    text: options?.text ?? DEMO_OPTION_DEFAULTS.text,
    animate: options?.animate ?? DEMO_OPTION_DEFAULTS.animate,
  };
  if (options?.subtitle !== undefined) {
    out.subtitle = options.subtitle;
  }
  return out;
}

function mergeStats(
  options: PreviewStatsOptions | undefined,
): PreviewStatsOptions {
  const include = options?.include
    ? options.include.filter(isPreviewStatsIncludeToken)
    : [...STATS_OPTION_DEFAULTS.include];
  return {
    filename: options?.filename ?? STATS_OPTION_DEFAULTS.filename,
    include,
    hide_rank: options?.hide_rank ?? STATS_OPTION_DEFAULTS.hide_rank,
    avatar: options?.avatar ?? STATS_OPTION_DEFAULTS.avatar,
    animate: options?.animate ?? STATS_OPTION_DEFAULTS.animate,
    include_private:
      options?.include_private ?? STATS_OPTION_DEFAULTS.include_private,
    include_forks:
      options?.include_forks ?? STATS_OPTION_DEFAULTS.include_forks,
    include_archived:
      options?.include_archived ?? STATS_OPTION_DEFAULTS.include_archived,
  };
}

function mergeLanguages(
  options: PreviewLanguagesOptions | undefined,
): PreviewLanguagesOptions {
  const limitRaw = options?.limit ?? LANGUAGES_OPTION_DEFAULTS.limit;
  const limit = Math.min(
    LANGUAGES_LIMIT_MAX,
    Math.max(LANGUAGES_LIMIT_MIN, Math.trunc(limitRaw)),
  );
  return {
    filename: options?.filename ?? LANGUAGES_OPTION_DEFAULTS.filename,
    limit,
    min_pct: options?.min_pct ?? LANGUAGES_OPTION_DEFAULTS.min_pct,
    exclude: options?.exclude
      ? [...options.exclude]
      : [...LANGUAGES_OPTION_DEFAULTS.exclude],
    animate: options?.animate ?? LANGUAGES_OPTION_DEFAULTS.animate,
    include_private:
      options?.include_private ?? LANGUAGES_OPTION_DEFAULTS.include_private,
    include_forks:
      options?.include_forks ?? LANGUAGES_OPTION_DEFAULTS.include_forks,
    include_archived:
      options?.include_archived ?? LANGUAGES_OPTION_DEFAULTS.include_archived,
  };
}

function mergeRepo(
  options: PreviewRepoOptions | undefined,
): PreviewRepoOptions | undefined {
  const repo = options?.repo?.trim() ?? "";
  if (repo === "") {
    return undefined;
  }
  const include = options?.include
    ? options.include.filter(isPreviewRepoIncludeToken)
    : [...REPO_OPTION_DEFAULTS.include];
  return {
    filename: options?.filename ?? REPO_OPTION_DEFAULTS.filename,
    repo,
    include,
    avatar: options?.avatar ?? REPO_OPTION_DEFAULTS.avatar,
    animate: options?.animate ?? REPO_OPTION_DEFAULTS.animate,
  };
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function isSafeHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.username === "" &&
      parsed.password === ""
    );
  } catch {
    return false;
  }
}

function mergeCoding(
  options: PreviewCodingOptions | undefined,
): PreviewCodingOptions {
  const include = options?.include
    ? options.include.filter(isPreviewCodingIncludeToken)
    : [...CODING_OPTION_DEFAULTS.include];
  const range =
    options?.range !== undefined && isPreviewCodingRange(options.range)
      ? options.range
      : CODING_OPTION_DEFAULTS.range;
  const domain = options?.api_domain?.trim() ?? "";
  const api_domain =
    domain !== "" && !isForbiddenApiDomain(domain)
      ? domain
      : CODING_OPTION_DEFAULTS.api_domain;
  return {
    filename: options?.filename ?? CODING_OPTION_DEFAULTS.filename,
    range,
    include: include.length > 0 ? include : [...CODING_OPTION_DEFAULTS.include],
    limit: clampInt(
      options?.limit ?? CODING_OPTION_DEFAULTS.limit,
      CODING_LIMIT_MIN,
      CODING_LIMIT_MAX,
    ),
    api_domain,
    animate: options?.animate ?? CODING_OPTION_DEFAULTS.animate,
  };
}

function mergeFeed(
  options: PreviewFeedOptions | undefined,
): PreviewFeedOptions | undefined {
  const raw = options?.url?.trim() ?? "";
  const url = isSafeHttpsUrl(raw) ? raw : EXPORT_FEED_SAMPLE_URL;
  if (!isSafeHttpsUrl(url)) {
    return undefined;
  }
  return {
    filename: options?.filename ?? FEED_FILENAME_DEFAULT,
    url,
    limit: clampInt(
      options?.limit ?? FEED_LIMIT_DEFAULT,
      FEED_LIMIT_MIN,
      FEED_LIMIT_MAX,
    ),
    animate: options?.animate ?? FEED_ANIMATE_DEFAULT,
  };
}

function mergeJson(
  options: PreviewJsonOptions | undefined,
): PreviewJsonOptions | undefined {
  const raw = options?.url?.trim() ?? "";
  const url = isSafeHttpsUrl(raw) ? raw : EXPORT_JSON_SAMPLE_URL;
  if (!isSafeHttpsUrl(url)) {
    return undefined;
  }
  return {
    filename: options?.filename ?? JSON_OPTION_DEFAULTS.filename,
    url,
    jmespath: options?.jmespath ?? JSON_OPTION_DEFAULTS.jmespath,
    timeout_ms: clampInt(
      options?.timeout_ms ?? JSON_OPTION_DEFAULTS.timeout_ms,
      JSON_TIMEOUT_MS_MIN,
      JSON_TIMEOUT_MS_MAX,
    ),
    animate: options?.animate ?? JSON_OPTION_DEFAULTS.animate,
  };
}

function mergeChips(
  options: PreviewChipsOptions | undefined,
): PreviewChipsOptions {
  const types = options?.types
    ? options.types.filter(isPreviewChipType)
    : [...CHIPS_TYPES_DEFAULT];
  const preset =
    options?.preset !== undefined && isPreviewChipPreset(options.preset)
      ? options.preset
      : CHIPS_PRESET_DEFAULT;
  const out: PreviewChipsOptions = {
    filename: options?.filename ?? CHIPS_OPTION_DEFAULTS.filename,
    preset,
    types: types.length > 0 ? types : [...CHIPS_TYPES_DEFAULT],
    workflow: options?.workflow ?? CHIPS_OPTION_DEFAULTS.workflow,
    timeout_ms: clampInt(
      options?.timeout_ms ?? CHIPS_OPTION_DEFAULTS.timeout_ms,
      JSON_TIMEOUT_MS_MIN,
      JSON_TIMEOUT_MS_MAX,
    ),
    animate: options?.animate ?? CHIPS_OPTION_DEFAULTS.animate,
  };
  if (options?.package !== undefined) {
    out.package = options.package;
  }
  if (options?.repo !== undefined) {
    out.repo = options.repo;
  }
  return out;
}

function renderDemoBlock(options: PreviewDemoOptions): string[] {
  const lines = [
    "      demo:",
    `        text: ${yamlScalar(options.text ?? DEMO_OPTION_DEFAULTS.text)}`,
  ];
  if (options.subtitle !== undefined) {
    lines.push(`        subtitle: ${yamlScalar(options.subtitle)}`);
  }
  lines.push(
    `        animate: ${options.animate ?? DEMO_OPTION_DEFAULTS.animate}`,
  );
  return lines;
}

function renderStatsBlock(options: PreviewStatsOptions): string[] {
  const include = options.include ?? STATS_OPTION_DEFAULTS.include;
  return [
    "      stats:",
    `        filename: ${yamlScalar(options.filename ?? STATS_OPTION_DEFAULTS.filename)}`,
    `        include: ${yamlFlowSeq(include)}`,
    `        hide_rank: ${options.hide_rank ?? STATS_OPTION_DEFAULTS.hide_rank}`,
    `        avatar: ${options.avatar ?? STATS_OPTION_DEFAULTS.avatar}`,
    `        animate: ${options.animate ?? STATS_OPTION_DEFAULTS.animate}`,
    `        include_private: ${options.include_private ?? STATS_OPTION_DEFAULTS.include_private}`,
    `        include_forks: ${options.include_forks ?? STATS_OPTION_DEFAULTS.include_forks}`,
    `        include_archived: ${options.include_archived ?? STATS_OPTION_DEFAULTS.include_archived}`,
  ];
}

function renderLanguagesBlock(options: PreviewLanguagesOptions): string[] {
  const exclude = options.exclude ?? LANGUAGES_OPTION_DEFAULTS.exclude;
  return [
    "      languages:",
    `        filename: ${yamlScalar(options.filename ?? LANGUAGES_OPTION_DEFAULTS.filename)}`,
    `        limit: ${options.limit ?? LANGUAGES_OPTION_DEFAULTS.limit}`,
    `        min_pct: ${options.min_pct ?? LANGUAGES_OPTION_DEFAULTS.min_pct}`,
    `        exclude: ${yamlFlowSeq(exclude)}`,
    `        animate: ${options.animate ?? LANGUAGES_OPTION_DEFAULTS.animate}`,
    `        include_private: ${options.include_private ?? LANGUAGES_OPTION_DEFAULTS.include_private}`,
    `        include_forks: ${options.include_forks ?? LANGUAGES_OPTION_DEFAULTS.include_forks}`,
    `        include_archived: ${options.include_archived ?? LANGUAGES_OPTION_DEFAULTS.include_archived}`,
  ];
}

function renderRepoBlock(options: PreviewRepoOptions): string[] {
  const include = options.include ?? REPO_OPTION_DEFAULTS.include;
  return [
    "      repo:",
    `        filename: ${yamlScalar(options.filename ?? REPO_OPTION_DEFAULTS.filename)}`,
    `        repo: ${yamlScalar(options.repo ?? "")}`,
    `        include: ${yamlFlowSeq(include)}`,
    `        avatar: ${options.avatar ?? REPO_OPTION_DEFAULTS.avatar}`,
    `        animate: ${options.animate ?? REPO_OPTION_DEFAULTS.animate}`,
  ];
}

function renderCodingBlock(options: PreviewCodingOptions): string[] {
  const include = options.include ?? CODING_OPTION_DEFAULTS.include;
  return [
    "      coding:",
    `        filename: ${yamlScalar(options.filename ?? CODING_OPTION_DEFAULTS.filename)}`,
    `        range: ${options.range ?? CODING_OPTION_DEFAULTS.range}`,
    `        include: ${yamlFlowSeq(include)}`,
    `        limit: ${options.limit ?? CODING_OPTION_DEFAULTS.limit}`,
    `        api_domain: ${yamlScalar(options.api_domain ?? CODING_OPTION_DEFAULTS.api_domain)}`,
    `        animate: ${options.animate ?? CODING_OPTION_DEFAULTS.animate}`,
  ];
}

function renderFeedBlock(options: PreviewFeedOptions): string[] {
  return [
    "      feed:",
    `        filename: ${yamlScalar(options.filename ?? FEED_FILENAME_DEFAULT)}`,
    `        url: ${yamlScalar(options.url ?? EXPORT_FEED_SAMPLE_URL)}`,
    `        limit: ${options.limit ?? FEED_LIMIT_DEFAULT}`,
    `        animate: ${options.animate ?? FEED_ANIMATE_DEFAULT}`,
  ];
}

function renderJsonBlock(options: PreviewJsonOptions): string[] {
  return [
    "      json:",
    `        filename: ${yamlScalar(options.filename ?? JSON_OPTION_DEFAULTS.filename)}`,
    `        url: ${yamlScalar(options.url ?? EXPORT_JSON_SAMPLE_URL)}`,
    `        jmespath: ${yamlScalar(options.jmespath ?? JSON_OPTION_DEFAULTS.jmespath)}`,
    `        timeout_ms: ${options.timeout_ms ?? JSON_OPTION_DEFAULTS.timeout_ms}`,
    `        animate: ${options.animate ?? JSON_OPTION_DEFAULTS.animate}`,
  ];
}

function renderChipsBlock(options: PreviewChipsOptions): string[] {
  const types = options.types ?? CHIPS_TYPES_DEFAULT;
  const lines = [
    "      chips:",
    `        filename: ${yamlScalar(options.filename ?? CHIPS_OPTION_DEFAULTS.filename)}`,
    `        preset: ${options.preset ?? CHIPS_PRESET_DEFAULT}`,
    `        types: ${yamlFlowSeq(types)}`,
  ];
  if (options.package !== undefined) {
    lines.push(`        package: ${yamlScalar(options.package)}`);
  }
  if (options.repo !== undefined) {
    lines.push(`        repo: ${yamlScalar(options.repo)}`);
  }
  lines.push(
    `        workflow: ${yamlScalar(options.workflow ?? CHIPS_OPTION_DEFAULTS.workflow)}`,
    `        timeout_ms: ${options.timeout_ms ?? CHIPS_OPTION_DEFAULTS.timeout_ms}`,
    `        animate: ${options.animate ?? CHIPS_OPTION_DEFAULTS.animate}`,
  );
  return lines;
}

function yamlFlowSeq(items: readonly string[]): string {
  return `[${items.map((item) => yamlScalar(item)).join(", ")}]`;
}

function yamlScalar(value: string): string {
  if (value.startsWith(`\${{`) && value.endsWith("}}")) {
    return value;
  }
  if (value === "" || needsYamlQuotes(value)) {
    return quoteDouble(value);
  }
  return value;
}

function needsYamlQuotes(value: string): boolean {
  return (
    /[:#{}[\],&*!|>'"%@`]/.test(value) ||
    /^(?:true|false|null|yes|no|on|off)$/i.test(value) ||
    /^[\s-]/.test(value) ||
    /\s$/.test(value)
  );
}

function quoteDouble(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
