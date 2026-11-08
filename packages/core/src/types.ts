import { NAMED_THEME_IDS } from "@profile-bits/themes";
import * as z from "zod";
import {
  dedupePreserveOrder,
  WakatimePluginConfigSchema,
} from "./wakatime-schema.ts";

export {
  ApiDomainSchema,
  CODING_ANIMATE_DEFAULT,
  CODING_API_DOMAIN_DEFAULT,
  CODING_FILENAME_DEFAULT,
  CODING_INCLUDE_DEFAULT,
  CODING_INCLUDE_TOKENS,
  CODING_LIMIT_DEFAULT,
  CODING_LIMIT_MAX,
  CODING_LIMIT_MIN,
  CODING_OPTION_DEFAULTS,
  CODING_RANGE_DEFAULT,
  CODING_RANGE_TOKENS,
  type CodingIncludeToken,
  CodingIncludeTokenSchema,
  type CodingOptions,
  CodingOptionsSchema,
  type CodingRange,
  CodingRangeSchema,
  dedupePreserveOrder,
  EDITORS_FILENAME_DEFAULT,
  type EditorsOptions,
  EditorsOptionsSchema,
  isForbiddenApiDomain,
  LANGS_FILENAME_DEFAULT,
  type LangsOptions,
  LangsOptionsSchema,
  OS_FILENAME_DEFAULT,
  type OsOptions,
  OsOptionsSchema,
  PROJECTS_FILENAME_DEFAULT,
  type ProjectsOptions,
  ProjectsOptionsSchema,
  type WakatimePluginConfig,
  WakatimePluginConfigSchema,
  type WakatimeWidgetsConfig,
  WakatimeWidgetsConfigSchema,
} from "./wakatime-schema.ts";

/** First-party plugin packs. Live catalog SSOT; pack agents consume these ids. */
export const FIRST_PARTY_PLUGIN_IDS = [
  "github",
  "wakatime",
  "rss",
  "http",
  "spotify",
  "leetcode",
  "chess",
  "steam",
] as const;
export const PluginIdSchema = z.enum(FIRST_PARTY_PLUGIN_IDS);
export type PluginId = z.infer<typeof PluginIdSchema>;

export const FIRST_PARTY_WIDGET_IDS = [
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
] as const;
export const WidgetIdSchema = z.enum(FIRST_PARTY_WIDGET_IDS);
export type WidgetId = z.infer<typeof WidgetIdSchema>;

export const FIRST_PARTY_INTEGRATION_IDS = [
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
] as const;
export const IntegrationIdSchema = z.enum(FIRST_PARTY_INTEGRATION_IDS);
export type IntegrationId = z.infer<typeof IntegrationIdSchema>;

export const AUTH_REQUIREMENTS = ["none", "optional", "required"] as const;
export const AuthRequirementSchema = z.enum(AUTH_REQUIREMENTS);
export type AuthRequirement = z.infer<typeof AuthRequirementSchema>;

export const INTEGRATION_AUTH = {
  static: "none",
  github: "optional",
  wakatime: "required",
  rss: "none",
  http: "optional",
  spotify: "required",
  leetcode: "none",
  chesscom: "none",
  lichess: "none",
  steam: "required",
} as const satisfies Record<IntegrationId, AuthRequirement>;

export const WIDGET_INTEGRATIONS = {
  demo: ["static"],
  stats: ["github"],
  languages: ["github"],
  repo: ["github"],
  coding: ["wakatime"],
  feed: ["rss"],
  json: ["http"],
  chips: ["http"],
  "top-repos": ["github"],
  contributions: ["github"],
  editors: ["wakatime"],
  projects: ["wakatime"],
  os: ["wakatime"],
  langs: ["wakatime"],
  latest: ["rss"],
  "now-playing": ["spotify"],
  top: ["spotify"],
  solved: ["leetcode"],
  heatmap: ["leetcode"],
  ratings: ["chesscom", "lichess"],
  game: ["chesscom", "lichess"],
  player: ["steam"],
  recent: ["steam"],
} as const satisfies Record<WidgetId, readonly IntegrationId[]>;

/** Pack defaults when github is on with no widget list. `demo` is opt-in. */
export const GITHUB_PACK_DEFAULT_WIDGETS = [
  "stats",
  "languages",
] as const satisfies readonly WidgetId[];

/** Pack defaults when wakatime is on with no widget list. */
export const WAKATIME_PACK_DEFAULT_WIDGETS = [
  "coding",
] as const satisfies readonly WidgetId[];

/** Pack defaults when spotify is on with no widget list. */
export const SPOTIFY_PACK_DEFAULT_WIDGETS = [
  "now-playing",
] as const satisfies readonly WidgetId[];

/** Pack defaults when leetcode is on with no widget list. */
export const LEETCODE_PACK_DEFAULT_WIDGETS = [
  "solved",
] as const satisfies readonly WidgetId[];

/** Pack defaults when chess is on with no widget list. */
export const CHESS_PACK_DEFAULT_WIDGETS = [
  "ratings",
] as const satisfies readonly WidgetId[];

/** Pack defaults when steam is on with no widget list. */
export const STEAM_PACK_DEFAULT_WIDGETS = [
  "player",
] as const satisfies readonly WidgetId[];

export const OUTPUT_FORMATS = [
  "svg",
  "png",
  "jpeg",
  "webp",
  "ico",
  "gif",
  "apng",
] as const;
export const OutputFormatSchema = z.enum(OUTPUT_FORMATS);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

/** Named catalog ids. Same reference as `@profile-bits/themes` `NAMED_THEME_IDS`. */
export const THEMES = NAMED_THEME_IDS;
export const ThemeSchema = z.enum(THEMES);
export type Theme = z.infer<typeof ThemeSchema>;

export const ColorRefSchema = z.string().min(1);
export type ParsedColorRef = z.infer<typeof ColorRefSchema>;

export const CustomRoleMapSchema = z.strictObject({
  bg: ColorRefSchema,
  card: ColorRefSchema,
  text: ColorRefSchema,
  muted: ColorRefSchema,
  accent: ColorRefSchema,
  border: ColorRefSchema,
});
export type CustomRoleMap = z.infer<typeof CustomRoleMapSchema>;

export const CustomPairSchema = z.union([ThemeSchema, CustomRoleMapSchema]);
export type CustomPair = z.infer<typeof CustomPairSchema>;

export const CustomThemeObjectSchema = CustomRoleMapSchema.extend({
  pair: CustomPairSchema.optional(),
});
export type CustomThemeObject = z.infer<typeof CustomThemeObjectSchema>;

export const CustomThemeConfigSchema = z.strictObject({
  custom: CustomThemeObjectSchema,
});
export type CustomThemeConfig = z.infer<typeof CustomThemeConfigSchema>;

export const ThemeConfigSchema = z.union([
  ThemeSchema,
  CustomThemeConfigSchema,
]);
export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

export function isCustomThemeConfig(
  theme: ThemeConfig,
): theme is CustomThemeConfig {
  return typeof theme === "object" && theme !== null && "custom" in theme;
}

export function customThemeMissingPair(theme: ThemeConfig): boolean {
  return isCustomThemeConfig(theme) && theme.custom.pair === undefined;
}

export const THEME_TOKENS = [
  "bg",
  "card",
  "text",
  "muted",
  "accent",
  "border",
  "font",
] as const;
export const ThemeTokenSchema = z.enum(THEME_TOKENS);
export type ThemeToken = z.infer<typeof ThemeTokenSchema>;

/** Widget authoring source kinds for discoverSource (T109). Not yaml. */
export const SOURCE_KINDS = ["react", "md", "mdx", "html"] as const;
export const SourceKindSchema = z.enum(SOURCE_KINDS);
export type SourceKind = z.infer<typeof SourceKindSchema>;

export const DiscoverSourceInputSchema = z.strictObject({
  path: z.string().optional(),
  filename: z.string().optional(),
  mime: z.string().optional(),
  body: z.string().optional(),
});
export type DiscoverSourceInput = z.infer<typeof DiscoverSourceInputSchema>;

/** `.md` sniff promotion records promotedFrom: "md" when kind is mdx. */
export const DiscoverSourceResultSchema = z.strictObject({
  kind: SourceKindSchema,
  promotedFrom: z.literal("md").optional(),
});
export type DiscoverSourceResult = z.infer<typeof DiscoverSourceResultSchema>;

export const CARD_WIDTH = 480;
export const CARD_HEIGHT = 160;
export const CARD_SIZE = { width: CARD_WIDTH, height: CARD_HEIGHT } as const;
export const CardSizeSchema = z.strictObject({
  width: z.literal(CARD_WIDTH),
  height: z.literal(CARD_HEIGHT),
});
export type CardSize = z.infer<typeof CardSizeSchema>;

export const OUTPUT_ACTIONS = [
  "none",
  "commit",
  "pull-request",
  "gist",
] as const;
export const OutputActionSchema = z.enum(OUTPUT_ACTIONS);
export type OutputAction = z.infer<typeof OutputActionSchema>;

export const OUTPUT_CONDITIONS = ["always", "data-changed"] as const;
export const OutputConditionSchema = z.enum(OUTPUT_CONDITIONS);
export type OutputCondition = z.infer<typeof OutputConditionSchema>;

export const TOKEN_CLASSES = [
  "actions_installation",
  "user_pat",
  "github_app_install",
] as const;
export const TokenClassSchema = z.enum(TOKEN_CLASSES);
export type TokenClass = z.infer<typeof TokenClassSchema>;

export const SKIP_FAIL_OUTCOMES = [
  "fail_job",
  "fail_widget",
  "fail_run",
  "fail_after_backoff",
  "skip_widget",
  "render",
] as const;
export const SkipFailOutcomeSchema = z.enum(SKIP_FAIL_OUTCOMES);
export type SkipFailOutcome = z.infer<typeof SkipFailOutcomeSchema>;
export const AuthDecisionSchema = SkipFailOutcomeSchema;
export type AuthDecision = SkipFailOutcome;

export const DEMO_TEXT_DEFAULT = "profile-bits";
export const DEMO_ANIMATE_DEFAULT = true;

export const STATS_FILENAME_DEFAULT = "stats";
export const STATS_INCLUDE_TOKENS = [
  "followers",
  "following",
  "repos",
  "stars",
  "forks",
  "gists",
  "contributions",
] as const;
export const STATS_INCLUDE_DEFAULT = [
  "followers",
  "repos",
  "stars",
] as const satisfies readonly (typeof STATS_INCLUDE_TOKENS)[number][];
export const STATS_HIDE_RANK_DEFAULT = true;
export const STATS_AVATAR_DEFAULT = true;
export const STATS_ANIMATE_DEFAULT = false;
export const STATS_INCLUDE_PRIVATE_DEFAULT = false;
export const STATS_INCLUDE_FORKS_DEFAULT = false;
export const STATS_INCLUDE_ARCHIVED_DEFAULT = false;

export const LANGUAGES_FILENAME_DEFAULT = "languages";
export const LANGUAGES_LIMIT_MIN = 1;
export const LANGUAGES_LIMIT_MAX = 16;
export const LANGUAGES_LIMIT_DEFAULT = 8;
export const LANGUAGES_MIN_PCT_DEFAULT = 1;
export const LANGUAGES_EXCLUDE_DEFAULT: readonly string[] = [];
export const LANGUAGES_ANIMATE_DEFAULT = false;
export const LANGUAGES_INCLUDE_PRIVATE_DEFAULT = false;
export const LANGUAGES_INCLUDE_FORKS_DEFAULT = false;
export const LANGUAGES_INCLUDE_ARCHIVED_DEFAULT = false;

export const REPO_FILENAME_DEFAULT = "repo";
export const REPO_INCLUDE_TOKENS = [
  "stars",
  "forks",
  "watchers",
  "issues",
  "license",
  "language",
] as const;
export const REPO_INCLUDE_DEFAULT = [
  "stars",
  "forks",
  "issues",
  "license",
] as const satisfies readonly (typeof REPO_INCLUDE_TOKENS)[number][];
export const REPO_AVATAR_DEFAULT = true;
export const REPO_ANIMATE_DEFAULT = false;
export const GITHUB_REPO_FULL_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const FEED_FILENAME_DEFAULT = "feed";
export const FEED_LIMIT_MIN = 1;
export const FEED_LIMIT_MAX = 8;
export const FEED_LIMIT_DEFAULT = 5;
export const FEED_ANIMATE_DEFAULT = false;

export const JSON_FILENAME_DEFAULT = "json";
export const JSON_JMESPATH_DEFAULT = "@";
export const JSON_TIMEOUT_MS_DEFAULT = 10_000;
export const JSON_TIMEOUT_MS_MAX = 20_000;
export const JSON_TIMEOUT_MS_MIN = 1;
export const JSON_METHOD = "GET";
export const JSON_ANIMATE_DEFAULT = false;
export const HTTP_RESPONSE_MAX_BYTES = 1_048_576;
export const HTTP_CHIP_PRESETS = ["shieldcn", "shields"] as const;
export const HTTP_CHIP_TYPES = [
  "npm",
  "stars",
  "forks",
  "license",
  "release",
  "issues",
  "prs",
  "ci",
] as const;
export const CHIPS_FILENAME_DEFAULT = "chips";
export const CHIPS_TYPES_MAX = 8;
export const CHIPS_TYPES_MIN = 1;
export const CHIPS_WORKFLOW_DEFAULT = "ci.yml";
export const CHIPS_ANIMATE_DEFAULT = false;

export const TOP_REPOS_FILENAME_DEFAULT = "top-repos";
export const TOP_REPOS_LIMIT_MIN = 1;
export const TOP_REPOS_LIMIT_MAX = 16;
export const TOP_REPOS_LIMIT_DEFAULT = 8;
export const TOP_REPOS_ANIMATE_DEFAULT = false;

export const CONTRIBUTIONS_FILENAME_DEFAULT = "contributions";
export const CONTRIBUTIONS_ANIMATE_DEFAULT = false;

export const LATEST_FILENAME_DEFAULT = "latest";
export const LATEST_LIMIT_MIN = 1;
export const LATEST_LIMIT_MAX = 8;
export const LATEST_LIMIT_DEFAULT = 1;
export const LATEST_ANIMATE_DEFAULT = false;

export const NOW_PLAYING_FILENAME_DEFAULT = "now-playing";
export const NOW_PLAYING_ANIMATE_DEFAULT = false;

export const TOP_FILENAME_DEFAULT = "top";
export const TOP_LIMIT_MIN = 1;
export const TOP_LIMIT_MAX = 16;
export const TOP_LIMIT_DEFAULT = 5;
export const TOP_ANIMATE_DEFAULT = false;

export const SOLVED_FILENAME_DEFAULT = "solved";
export const SOLVED_ANIMATE_DEFAULT = false;

export const HEATMAP_FILENAME_DEFAULT = "heatmap";
export const HEATMAP_ANIMATE_DEFAULT = false;

export const RATINGS_FILENAME_DEFAULT = "ratings";
export const RATINGS_ANIMATE_DEFAULT = false;

export const GAME_FILENAME_DEFAULT = "game";
export const GAME_ANIMATE_DEFAULT = false;

export const PLAYER_FILENAME_DEFAULT = "player";
export const PLAYER_ANIMATE_DEFAULT = false;

export const RECENT_FILENAME_DEFAULT = "recent";
export const RECENT_LIMIT_MIN = 1;
export const RECENT_LIMIT_MAX = 16;
export const RECENT_LIMIT_DEFAULT = 5;
export const RECENT_ANIMATE_DEFAULT = false;

const FORBIDDEN_HTTP_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
]);

function isForbiddenHttpHeaderName(name: string): boolean {
  return (
    FORBIDDEN_HTTP_HEADER_NAMES.has(name.toLowerCase()) || /token/i.test(name)
  );
}

function isForbiddenHttpHeaderValue(value: string): boolean {
  return /^(Bearer|token|Basic)\s/i.test(value);
}

export const CONFIG_VERSION_DEFAULT = 1;
export const CONFIG_FORMAT_DEFAULT = "svg" as const satisfies OutputFormat;
export const CONFIG_THEME_DEFAULT = "dark" as const satisfies Theme;
export const CONFIG_OUTPUT_PAIR_DEFAULT = false;
export const CONFIG_ANIMATED_DEFAULT = false;
export const CONFIG_TIMEZONE_DEFAULT = "UTC";
export const CONFIG_OUTPUT_DIR_DEFAULT = "profile-bits";

export const ACTION_CONFIG_PATH_DEFAULT = ".github/profile-bits.yml";
export const ACTION_OUTPUT_ACTION_DEFAULT =
  "commit" as const satisfies OutputAction;
export const ACTION_ALLOW_SKIPPED_DEFAULT = false;
export const ACTION_USER_DEFAULT = "github.repository_owner";
export const ACTION_OMITTED_TOKEN_DEFAULT = "$" + "{{ github.token }}";

/**
 * Yaml `token_env` (http pattern): process env **name**, not a token value.
 * POSIX-ish `[A-Za-z_][A-Za-z0-9_]*`. Not `INPUT_*`. No default.
 */
export const TOKEN_ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const TokenEnvSchema = z
  .string()
  .trim()
  .min(1)
  .regex(
    TOKEN_ENV_NAME_PATTERN,
    "token_env must be an environment variable name",
  )
  .refine((value) => !value.toUpperCase().startsWith("INPUT_"), {
    message: "token_env must not be an INPUT_* name",
  });
export type TokenEnv = z.infer<typeof TokenEnvSchema>;

/**
 * Thin Action secret (wakatime_token pattern). Optional; no default.
 * Empty / whitespace is missing at auth policy, not a schema default.
 */
export const OptionalActionTokenSchema = z.string().optional();
export type OptionalActionToken = z.infer<typeof OptionalActionTokenSchema>;

export const StatsIncludeTokenSchema = z.enum(STATS_INCLUDE_TOKENS);
export type StatsIncludeToken = z.infer<typeof StatsIncludeTokenSchema>;

export const DemoOptionsSchema = z.strictObject({
  text: z.string().default(DEMO_TEXT_DEFAULT),
  subtitle: z.string().optional(),
  animate: z.boolean().default(DEMO_ANIMATE_DEFAULT),
});
export type DemoOptions = z.infer<typeof DemoOptionsSchema>;

export const StatsOptionsSchema = z.strictObject({
  filename: z.string().default(STATS_FILENAME_DEFAULT),
  include: z
    .array(StatsIncludeTokenSchema)
    .default(() => [...STATS_INCLUDE_DEFAULT]),
  hide_rank: z.boolean().default(STATS_HIDE_RANK_DEFAULT),
  avatar: z.boolean().default(STATS_AVATAR_DEFAULT),
  animate: z.boolean().default(STATS_ANIMATE_DEFAULT),
  include_private: z.boolean().default(STATS_INCLUDE_PRIVATE_DEFAULT),
  include_forks: z.boolean().default(STATS_INCLUDE_FORKS_DEFAULT),
  include_archived: z.boolean().default(STATS_INCLUDE_ARCHIVED_DEFAULT),
});
export type StatsOptions = z.infer<typeof StatsOptionsSchema>;

export const RepoIncludeTokenSchema = z.enum(REPO_INCLUDE_TOKENS);
export type RepoIncludeToken = z.infer<typeof RepoIncludeTokenSchema>;

export const GithubRepoFullNameSchema = z
  .string()
  .regex(GITHUB_REPO_FULL_NAME, "repo must be owner/name");

export const RepoOptionsSchema = z.strictObject({
  filename: z.string().default(REPO_FILENAME_DEFAULT),
  repo: GithubRepoFullNameSchema,
  include: z
    .array(RepoIncludeTokenSchema)
    .min(1)
    .transform((items) => dedupePreserveOrder(items))
    .pipe(z.array(RepoIncludeTokenSchema).min(1))
    .default(() => [...REPO_INCLUDE_DEFAULT]),
  avatar: z.boolean().default(REPO_AVATAR_DEFAULT),
  animate: z.boolean().default(REPO_ANIMATE_DEFAULT),
});
export type RepoOptions = z.infer<typeof RepoOptionsSchema>;

export const LanguagesOptionsSchema = z.strictObject({
  filename: z.string().default(LANGUAGES_FILENAME_DEFAULT),
  limit: z
    .int()
    .min(LANGUAGES_LIMIT_MIN)
    .max(LANGUAGES_LIMIT_MAX)
    .default(LANGUAGES_LIMIT_DEFAULT),
  min_pct: z.number().default(LANGUAGES_MIN_PCT_DEFAULT),
  exclude: z.array(z.string()).default(() => [...LANGUAGES_EXCLUDE_DEFAULT]),
  animate: z.boolean().default(LANGUAGES_ANIMATE_DEFAULT),
  include_private: z.boolean().default(LANGUAGES_INCLUDE_PRIVATE_DEFAULT),
  include_forks: z.boolean().default(LANGUAGES_INCLUDE_FORKS_DEFAULT),
  include_archived: z.boolean().default(LANGUAGES_INCLUDE_ARCHIVED_DEFAULT),
});
export type LanguagesOptions = z.infer<typeof LanguagesOptionsSchema>;

export const FeedOptionsSchema = z
  .strictObject({
    filename: z.string().default(FEED_FILENAME_DEFAULT),
    url: z.url({ protocol: /^https$/ }),
    limit: z
      .int()
      .min(FEED_LIMIT_MIN)
      .max(FEED_LIMIT_MAX)
      .default(FEED_LIMIT_DEFAULT),
    animate: z.boolean().default(FEED_ANIMATE_DEFAULT),
  })
  .superRefine((value, ctx) => {
    const parsed = new URL(value.url);
    if (parsed.username !== "" || parsed.password !== "") {
      ctx.addIssue({
        code: "custom",
        message: "url must not include username or password",
        path: ["url"],
      });
    }
  });
export type FeedOptions = z.infer<typeof FeedOptionsSchema>;

export const JsonOptionsSchema = z
  .strictObject({
    filename: z.string().default(JSON_FILENAME_DEFAULT),
    url: z.url({ protocol: /^https$/ }),
    headers: z.record(z.string(), z.string()).optional(),
    jmespath: z.string().default(JSON_JMESPATH_DEFAULT),
    timeout_ms: z
      .int()
      .min(JSON_TIMEOUT_MS_MIN)
      .max(JSON_TIMEOUT_MS_MAX)
      .default(JSON_TIMEOUT_MS_DEFAULT),
    method: z.literal(JSON_METHOD).default(JSON_METHOD),
    animate: z.boolean().default(JSON_ANIMATE_DEFAULT),
  })
  .superRefine((value, ctx) => {
    if (value.headers == null) {
      return;
    }
    for (const [name, headerValue] of Object.entries(value.headers)) {
      if (
        isForbiddenHttpHeaderName(name) ||
        isForbiddenHttpHeaderValue(headerValue)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "forbidden header",
          path: ["headers", name],
        });
      }
    }
  });
export type JsonOptions = z.infer<typeof JsonOptionsSchema>;

export const HttpChipPresetSchema = z.enum(HTTP_CHIP_PRESETS);
export type HttpChipPreset = z.infer<typeof HttpChipPresetSchema>;

export const HttpChipTypeSchema = z.enum(HTTP_CHIP_TYPES);
export type HttpChipType = z.infer<typeof HttpChipTypeSchema>;

export const ChipsOptionsSchema = z.strictObject({
  filename: z.string().default(CHIPS_FILENAME_DEFAULT),
  preset: HttpChipPresetSchema,
  types: z
    .array(HttpChipTypeSchema)
    .min(CHIPS_TYPES_MIN)
    .transform((items) => dedupePreserveOrder(items))
    .pipe(
      z.array(HttpChipTypeSchema).min(CHIPS_TYPES_MIN).max(CHIPS_TYPES_MAX),
    ),
  package: z.string().optional(),
  repo: z.string().optional(),
  workflow: z.string().default(CHIPS_WORKFLOW_DEFAULT),
  timeout_ms: z
    .int()
    .min(JSON_TIMEOUT_MS_MIN)
    .max(JSON_TIMEOUT_MS_MAX)
    .default(JSON_TIMEOUT_MS_DEFAULT),
  animate: z.boolean().default(CHIPS_ANIMATE_DEFAULT),
});
export type ChipsOptions = z.infer<typeof ChipsOptionsSchema>;

export const TopReposOptionsSchema = z.strictObject({
  filename: z.string().default(TOP_REPOS_FILENAME_DEFAULT),
  limit: z
    .int()
    .min(TOP_REPOS_LIMIT_MIN)
    .max(TOP_REPOS_LIMIT_MAX)
    .default(TOP_REPOS_LIMIT_DEFAULT),
  animate: z.boolean().default(TOP_REPOS_ANIMATE_DEFAULT),
});
export type TopReposOptions = z.infer<typeof TopReposOptionsSchema>;

export const ContributionsOptionsSchema = z.strictObject({
  filename: z.string().default(CONTRIBUTIONS_FILENAME_DEFAULT),
  animate: z.boolean().default(CONTRIBUTIONS_ANIMATE_DEFAULT),
});
export type ContributionsOptions = z.infer<typeof ContributionsOptionsSchema>;

export const LatestOptionsSchema = z
  .strictObject({
    filename: z.string().default(LATEST_FILENAME_DEFAULT),
    url: z.url({ protocol: /^https$/ }),
    limit: z
      .int()
      .min(LATEST_LIMIT_MIN)
      .max(LATEST_LIMIT_MAX)
      .default(LATEST_LIMIT_DEFAULT),
    animate: z.boolean().default(LATEST_ANIMATE_DEFAULT),
  })
  .superRefine((value, ctx) => {
    const parsed = new URL(value.url);
    if (parsed.username !== "" || parsed.password !== "") {
      ctx.addIssue({
        code: "custom",
        message: "url must not include username or password",
        path: ["url"],
      });
    }
  });
export type LatestOptions = z.infer<typeof LatestOptionsSchema>;

export const NowPlayingOptionsSchema = z.strictObject({
  filename: z.string().default(NOW_PLAYING_FILENAME_DEFAULT),
  animate: z.boolean().default(NOW_PLAYING_ANIMATE_DEFAULT),
});
export type NowPlayingOptions = z.infer<typeof NowPlayingOptionsSchema>;

export const TopOptionsSchema = z.strictObject({
  filename: z.string().default(TOP_FILENAME_DEFAULT),
  limit: z
    .int()
    .min(TOP_LIMIT_MIN)
    .max(TOP_LIMIT_MAX)
    .default(TOP_LIMIT_DEFAULT),
  animate: z.boolean().default(TOP_ANIMATE_DEFAULT),
});
export type TopOptions = z.infer<typeof TopOptionsSchema>;

export const SolvedOptionsSchema = z.strictObject({
  filename: z.string().default(SOLVED_FILENAME_DEFAULT),
  animate: z.boolean().default(SOLVED_ANIMATE_DEFAULT),
});
export type SolvedOptions = z.infer<typeof SolvedOptionsSchema>;

export const HeatmapOptionsSchema = z.strictObject({
  filename: z.string().default(HEATMAP_FILENAME_DEFAULT),
  animate: z.boolean().default(HEATMAP_ANIMATE_DEFAULT),
});
export type HeatmapOptions = z.infer<typeof HeatmapOptionsSchema>;

export const RatingsOptionsSchema = z.strictObject({
  filename: z.string().default(RATINGS_FILENAME_DEFAULT),
  animate: z.boolean().default(RATINGS_ANIMATE_DEFAULT),
});
export type RatingsOptions = z.infer<typeof RatingsOptionsSchema>;

export const GameOptionsSchema = z.strictObject({
  filename: z.string().default(GAME_FILENAME_DEFAULT),
  animate: z.boolean().default(GAME_ANIMATE_DEFAULT),
});
export type GameOptions = z.infer<typeof GameOptionsSchema>;

export const PlayerOptionsSchema = z.strictObject({
  filename: z.string().default(PLAYER_FILENAME_DEFAULT),
  animate: z.boolean().default(PLAYER_ANIMATE_DEFAULT),
});
export type PlayerOptions = z.infer<typeof PlayerOptionsSchema>;

export const RecentOptionsSchema = z.strictObject({
  filename: z.string().default(RECENT_FILENAME_DEFAULT),
  limit: z
    .int()
    .min(RECENT_LIMIT_MIN)
    .max(RECENT_LIMIT_MAX)
    .default(RECENT_LIMIT_DEFAULT),
  animate: z.boolean().default(RECENT_ANIMATE_DEFAULT),
});
export type RecentOptions = z.infer<typeof RecentOptionsSchema>;

export const GithubWidgetsConfigSchema = z.strictObject({
  demo: DemoOptionsSchema.optional(),
  stats: StatsOptionsSchema.optional(),
  languages: LanguagesOptionsSchema.optional(),
  repo: RepoOptionsSchema.optional(),
  "top-repos": TopReposOptionsSchema.optional(),
  contributions: ContributionsOptionsSchema.optional(),
});
export type GithubWidgetsConfig = z.infer<typeof GithubWidgetsConfigSchema>;

export const GithubPluginConfigSchema = z.strictObject({
  widgets: GithubWidgetsConfigSchema.optional(),
});
export type GithubPluginConfig = z.infer<typeof GithubPluginConfigSchema>;

export const RssWidgetsConfigSchema = z.strictObject({
  feed: FeedOptionsSchema,
  latest: LatestOptionsSchema.optional(),
});
export type RssWidgetsConfig = z.infer<typeof RssWidgetsConfigSchema>;

export const RssPluginConfigSchema = z.strictObject({
  widgets: RssWidgetsConfigSchema,
});
export type RssPluginConfig = z.infer<typeof RssPluginConfigSchema>;

export const HttpWidgetsConfigSchema = z.strictObject({
  json: JsonOptionsSchema.optional(),
  chips: ChipsOptionsSchema.optional(),
});
export type HttpWidgetsConfig = z.infer<typeof HttpWidgetsConfigSchema>;

export const HttpPluginConfigSchema = z.strictObject({
  token_env: TokenEnvSchema.optional(),
  widgets: HttpWidgetsConfigSchema.optional(),
});
export type HttpPluginConfig = z.infer<typeof HttpPluginConfigSchema>;

export const SpotifyWidgetsConfigSchema = z.strictObject({
  "now-playing": NowPlayingOptionsSchema.optional(),
  top: TopOptionsSchema.optional(),
});
export type SpotifyWidgetsConfig = z.infer<typeof SpotifyWidgetsConfigSchema>;

export const SpotifyPluginConfigSchema = z.strictObject({
  token_env: TokenEnvSchema.optional(),
  widgets: SpotifyWidgetsConfigSchema.optional(),
});
export type SpotifyPluginConfig = z.infer<typeof SpotifyPluginConfigSchema>;

export const LeetcodeWidgetsConfigSchema = z.strictObject({
  solved: SolvedOptionsSchema.optional(),
  heatmap: HeatmapOptionsSchema.optional(),
});
export type LeetcodeWidgetsConfig = z.infer<typeof LeetcodeWidgetsConfigSchema>;

export const LeetcodePluginConfigSchema = z.strictObject({
  user: z.string().min(1).optional(),
  widgets: LeetcodeWidgetsConfigSchema.optional(),
});
export type LeetcodePluginConfig = z.infer<typeof LeetcodePluginConfigSchema>;

export const ChessWidgetsConfigSchema = z.strictObject({
  ratings: RatingsOptionsSchema.optional(),
  game: GameOptionsSchema.optional(),
});
export type ChessWidgetsConfig = z.infer<typeof ChessWidgetsConfigSchema>;

export const ChessPluginConfigSchema = z.strictObject({
  user: z.string().min(1).optional(),
  widgets: ChessWidgetsConfigSchema.optional(),
});
export type ChessPluginConfig = z.infer<typeof ChessPluginConfigSchema>;

export const SteamWidgetsConfigSchema = z.strictObject({
  player: PlayerOptionsSchema.optional(),
  recent: RecentOptionsSchema.optional(),
});
export type SteamWidgetsConfig = z.infer<typeof SteamWidgetsConfigSchema>;

export const SteamPluginConfigSchema = z.strictObject({
  token_env: TokenEnvSchema.optional(),
  user: z.string().min(1).optional(),
  widgets: SteamWidgetsConfigSchema.optional(),
});
export type SteamPluginConfig = z.infer<typeof SteamPluginConfigSchema>;

export const PluginsConfigSchema = z.strictObject({
  github: GithubPluginConfigSchema.optional(),
  wakatime: WakatimePluginConfigSchema.optional(),
  rss: RssPluginConfigSchema.optional(),
  http: HttpPluginConfigSchema.optional(),
  spotify: SpotifyPluginConfigSchema.optional(),
  leetcode: LeetcodePluginConfigSchema.optional(),
  chess: ChessPluginConfigSchema.optional(),
  steam: SteamPluginConfigSchema.optional(),
});
export type PluginsConfig = z.infer<typeof PluginsConfigSchema>;

export const ConfigSchema = z.strictObject({
  version: z.literal(CONFIG_VERSION_DEFAULT),
  format: OutputFormatSchema.default(CONFIG_FORMAT_DEFAULT),
  theme: ThemeConfigSchema.default(CONFIG_THEME_DEFAULT),
  output_pair: z.boolean().default(CONFIG_OUTPUT_PAIR_DEFAULT),
  animated: z.boolean().default(CONFIG_ANIMATED_DEFAULT),
  timezone: z.string().default(CONFIG_TIMEZONE_DEFAULT),
  output_dir: z.string().default(CONFIG_OUTPUT_DIR_DEFAULT),
  plugins: PluginsConfigSchema,
});
export type Config = z.infer<typeof ConfigSchema>;

export const ActionInputsSchema = z.strictObject({
  user: z.string().optional(),
  github_token: z.string().optional(),
  committer_token: z.string().optional(),
  config: z.string().default(ACTION_CONFIG_PATH_DEFAULT),
  plugin_github: z.boolean().optional(),
  wakatime_token: OptionalActionTokenSchema,
  http_token_env: z.string().optional(),
  spotify_token: OptionalActionTokenSchema,
  steam_token: OptionalActionTokenSchema,
  format: OutputFormatSchema.optional(),
  theme: ThemeSchema.optional(),
  output_pair: z.boolean().optional(),
  animated: z.boolean().optional(),
  output_action: OutputActionSchema.default(ACTION_OUTPUT_ACTION_DEFAULT),
  committer_branch: z.string().optional(),
  committer_gist: z.string().optional(),
  output_condition: OutputConditionSchema.optional(),
  timezone: z.string().optional(),
  dry_run: z.boolean().optional(),
  allow_skipped: z.boolean().default(ACTION_ALLOW_SKIPPED_DEFAULT),
});
export type ActionInputs = z.infer<typeof ActionInputsSchema>;

export const CapabilitiesSchema = z.strictObject({
  canPrivate: z.boolean(),
  canContributions: z.boolean(),
  canGist: z.boolean(),
});
export type Capabilities = z.infer<typeof CapabilitiesSchema>;

export const IntegrationIdentitySchema = z.strictObject({
  id: IntegrationIdSchema,
  auth: AuthRequirementSchema,
  scopes: z.array(z.string()),
});
export type IntegrationIdentity = z.infer<typeof IntegrationIdentitySchema>;

export const WidgetIdentitySchema = z.strictObject({
  id: WidgetIdSchema,
  title: z.string(),
  description: z.string(),
  integrations: z.array(IntegrationIdSchema).min(1),
  size: CardSizeSchema,
  formats: z.array(OutputFormatSchema).min(1),
  source: SourceKindSchema.optional(),
});
export type WidgetIdentity = z.infer<typeof WidgetIdentitySchema>;

export const PluginIdentitySchema = z.strictObject({
  id: PluginIdSchema,
  title: z.string(),
  docsPath: z.string(),
  widgets: z.array(WidgetIdSchema).min(1),
  integrations: z.array(IntegrationIdSchema),
  defaults: z.strictObject({
    widgets: z.array(WidgetIdSchema).min(1),
  }),
});
export type PluginIdentity = z.infer<typeof PluginIdentitySchema>;

export const DEMO_OPTION_DEFAULTS = {
  text: DEMO_TEXT_DEFAULT,
  animate: DEMO_ANIMATE_DEFAULT,
} as const;

export const STATS_OPTION_DEFAULTS = {
  filename: STATS_FILENAME_DEFAULT,
  include: STATS_INCLUDE_DEFAULT,
  hide_rank: STATS_HIDE_RANK_DEFAULT,
  avatar: STATS_AVATAR_DEFAULT,
  animate: STATS_ANIMATE_DEFAULT,
  include_private: STATS_INCLUDE_PRIVATE_DEFAULT,
  include_forks: STATS_INCLUDE_FORKS_DEFAULT,
  include_archived: STATS_INCLUDE_ARCHIVED_DEFAULT,
} as const;

export const LANGUAGES_OPTION_DEFAULTS = {
  filename: LANGUAGES_FILENAME_DEFAULT,
  limit: LANGUAGES_LIMIT_DEFAULT,
  min_pct: LANGUAGES_MIN_PCT_DEFAULT,
  exclude: LANGUAGES_EXCLUDE_DEFAULT,
  animate: LANGUAGES_ANIMATE_DEFAULT,
  include_private: LANGUAGES_INCLUDE_PRIVATE_DEFAULT,
  include_forks: LANGUAGES_INCLUDE_FORKS_DEFAULT,
  include_archived: LANGUAGES_INCLUDE_ARCHIVED_DEFAULT,
} as const;

export const REPO_OPTION_DEFAULTS = {
  filename: REPO_FILENAME_DEFAULT,
  include: REPO_INCLUDE_DEFAULT,
  avatar: REPO_AVATAR_DEFAULT,
  animate: REPO_ANIMATE_DEFAULT,
} as const;

export const JSON_OPTION_DEFAULTS = {
  filename: JSON_FILENAME_DEFAULT,
  jmespath: JSON_JMESPATH_DEFAULT,
  timeout_ms: JSON_TIMEOUT_MS_DEFAULT,
  method: JSON_METHOD,
  animate: JSON_ANIMATE_DEFAULT,
} as const;

export const CHIPS_OPTION_DEFAULTS = {
  filename: CHIPS_FILENAME_DEFAULT,
  timeout_ms: JSON_TIMEOUT_MS_DEFAULT,
  workflow: CHIPS_WORKFLOW_DEFAULT,
  animate: CHIPS_ANIMATE_DEFAULT,
} as const;

export const CONFIG_DEFAULTS = {
  version: CONFIG_VERSION_DEFAULT,
  format: CONFIG_FORMAT_DEFAULT,
  theme: CONFIG_THEME_DEFAULT,
  output_pair: CONFIG_OUTPUT_PAIR_DEFAULT,
  animated: CONFIG_ANIMATED_DEFAULT,
  timezone: CONFIG_TIMEZONE_DEFAULT,
  output_dir: CONFIG_OUTPUT_DIR_DEFAULT,
} as const;
