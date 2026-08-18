import {
  isPreviewStatsIncludeToken,
  type PreviewDemoOptions,
  type PreviewLanguagesOptions,
  type PreviewOptions,
  type PreviewOutputFormat,
  type PreviewStatsIncludeToken,
  type PreviewStatsOptions,
  type PreviewTheme,
  type PreviewWidgetId,
} from "../preview/types";

/** Consumer pin placeholder. `@v1` is the orphan release tag, not `main`. */
export const EXPORT_ACTION_USES = "wyatt/profile-bits@v1";

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

const PACK_DEFAULT_WIDGETS = [
  "stats",
  "languages",
] as const satisfies readonly PreviewWidgetId[];

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
};

/**
 * Playground tuner state. Extra enumerable keys (tokens, zip, unknown plugins)
 * are ignored.
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
  if (state.theme !== CONFIG_THEME_DEFAULT) {
    lines.push(`theme: ${state.theme}`);
  }

  return lines;
}

function renderConfigYml(state: ExportWorkflowState): string {
  const widgets = resolveWidgets(state);
  const widgetIds = (["demo", "stats", "languages"] as const).filter(
    (id) => widgets[id] !== undefined,
  );

  const globals: string[] = [
    `version: ${CONFIG_VERSION}`,
    `format: ${state.format}`,
    `theme: ${state.theme}`,
    `output_pair: ${state.output_pair}`,
    `animated: ${state.animated ?? CONFIG_ANIMATED_DEFAULT}`,
    `timezone: ${yamlScalar(state.timezone?.trim() || CONFIG_TIMEZONE_DEFAULT)}`,
    `output_dir: ${yamlScalar(state.output_dir?.trim() || CONFIG_OUTPUT_DIR_DEFAULT)}`,
  ];

  if (widgetIds.length === 0) {
    return `${[...globals, "plugins: {}"].join("\n")}\n`;
  }

  const lines = [...globals, "plugins:", "  github:", "    widgets:"];

  for (const id of widgetIds) {
    if (id === "demo" && widgets.demo !== undefined) {
      lines.push(...renderDemoBlock(widgets.demo));
    }
    if (id === "stats" && widgets.stats !== undefined) {
      lines.push(...renderStatsBlock(widgets.stats));
    }
    if (id === "languages" && widgets.languages !== undefined) {
      lines.push(...renderLanguagesBlock(widgets.languages));
    }
  }

  return `${lines.join("\n")}\n`;
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

function resolveWidgets(state: ExportWorkflowState): ExportWorkflowWidgets {
  const source: ExportWorkflowWidgets = {
    ...(state.options?.demo !== undefined ? { demo: state.options.demo } : {}),
    ...(state.options?.stats !== undefined
      ? { stats: state.options.stats }
      : {}),
    ...(state.options?.languages !== undefined
      ? { languages: state.options.languages }
      : {}),
    ...state.widgets,
  };

  const present = (["demo", "stats", "languages"] as const).filter(
    (id) => source[id] !== undefined,
  );
  const enabled =
    state.enabled ?? (present.length > 0 ? present : PACK_DEFAULT_WIDGETS);

  const out: ExportWorkflowWidgets = {};
  for (const id of enabled) {
    if (id === "demo") {
      out.demo = mergeDemo(source.demo);
    } else if (id === "stats") {
      out.stats = mergeStats(source.stats);
    } else if (id === "languages") {
      out.languages = mergeLanguages(source.languages);
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
