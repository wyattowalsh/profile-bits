import * as z from "zod";

/** v0 first-party plugin pack. Do not add more plugin ids here. */
export const FIRST_PARTY_PLUGIN_IDS = ["github"] as const;
export const PluginIdSchema = z.enum(FIRST_PARTY_PLUGIN_IDS);
export type PluginId = z.infer<typeof PluginIdSchema>;

export const FIRST_PARTY_WIDGET_IDS = ["demo", "stats", "languages"] as const;
export const WidgetIdSchema = z.enum(FIRST_PARTY_WIDGET_IDS);
export type WidgetId = z.infer<typeof WidgetIdSchema>;

export const FIRST_PARTY_INTEGRATION_IDS = ["static", "github"] as const;
export const IntegrationIdSchema = z.enum(FIRST_PARTY_INTEGRATION_IDS);
export type IntegrationId = z.infer<typeof IntegrationIdSchema>;

export const AUTH_REQUIREMENTS = ["none", "optional", "required"] as const;
export const AuthRequirementSchema = z.enum(AUTH_REQUIREMENTS);
export type AuthRequirement = z.infer<typeof AuthRequirementSchema>;

export const INTEGRATION_AUTH = {
  static: "none",
  github: "optional",
} as const satisfies Record<IntegrationId, AuthRequirement>;

export const WIDGET_INTEGRATIONS = {
  demo:      ["static"],
  stats:     ["github"],
  languages: ["github"],
} as const satisfies Record<WidgetId, readonly IntegrationId[]>;

/** Pack defaults when github is on with no widget list. `demo` is opt-in. */
export const GITHUB_PACK_DEFAULT_WIDGETS = ["stats", "languages"] as const satisfies readonly WidgetId[];

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

export const THEMES = ["light", "dark"] as const;
export const ThemeSchema = z.enum(THEMES);
export type Theme = z.infer<typeof ThemeSchema>;

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

export const CARD_WIDTH  = 480;
export const CARD_HEIGHT = 160;
export const CARD_SIZE   = { width: CARD_WIDTH, height: CARD_HEIGHT } as const;
export const CardSizeSchema = z.strictObject({
  width:  z.literal(CARD_WIDTH),
  height: z.literal(CARD_HEIGHT),
});
export type CardSize = z.infer<typeof CardSizeSchema>;

export const OUTPUT_ACTIONS = ["none", "commit", "pull-request", "gist"] as const;
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

export const DEMO_TEXT_DEFAULT    = "profile-bits";
export const DEMO_ANIMATE_DEFAULT = true;

export const STATS_FILENAME_DEFAULT        = "stats";
export const STATS_INCLUDE_TOKENS          = [
  "followers",
  "following",
  "repos",
  "stars",
  "forks",
  "gists",
  "contributions",
] as const;
export const STATS_INCLUDE_DEFAULT         = [
  "followers",
  "repos",
  "stars",
] as const satisfies readonly (typeof STATS_INCLUDE_TOKENS)[number][];
export const STATS_HIDE_RANK_DEFAULT       = true;
export const STATS_AVATAR_DEFAULT          = true;
export const STATS_ANIMATE_DEFAULT         = false;
export const STATS_INCLUDE_PRIVATE_DEFAULT = false;
export const STATS_INCLUDE_FORKS_DEFAULT   = false;
export const STATS_INCLUDE_ARCHIVED_DEFAULT = false;

export const LANGUAGES_FILENAME_DEFAULT         = "languages";
export const LANGUAGES_LIMIT_MIN                = 1;
export const LANGUAGES_LIMIT_MAX                = 16;
export const LANGUAGES_LIMIT_DEFAULT            = 8;
export const LANGUAGES_MIN_PCT_DEFAULT          = 1;
export const LANGUAGES_EXCLUDE_DEFAULT: readonly string[] = [];
export const LANGUAGES_ANIMATE_DEFAULT          = false;
export const LANGUAGES_INCLUDE_PRIVATE_DEFAULT  = false;
export const LANGUAGES_INCLUDE_FORKS_DEFAULT    = false;
export const LANGUAGES_INCLUDE_ARCHIVED_DEFAULT = false;

export const CONFIG_VERSION_DEFAULT     = 1;
export const CONFIG_FORMAT_DEFAULT      = "svg" as const satisfies OutputFormat;
export const CONFIG_THEME_DEFAULT       = "dark" as const satisfies Theme;
export const CONFIG_OUTPUT_PAIR_DEFAULT = false;
export const CONFIG_ANIMATED_DEFAULT    = false;
export const CONFIG_TIMEZONE_DEFAULT    = "UTC";
export const CONFIG_OUTPUT_DIR_DEFAULT  = "profile-bits";

export const ACTION_CONFIG_PATH_DEFAULT      = ".github/profile-bits.yml";
export const ACTION_OUTPUT_ACTION_DEFAULT    = "commit" as const satisfies OutputAction;
export const ACTION_ALLOW_SKIPPED_DEFAULT    = false;
export const ACTION_USER_DEFAULT             = "github.repository_owner";
export const ACTION_OMITTED_TOKEN_DEFAULT    = "${{ github.token }}";

export const StatsIncludeTokenSchema = z.enum(STATS_INCLUDE_TOKENS);
export type StatsIncludeToken = z.infer<typeof StatsIncludeTokenSchema>;

export const DemoOptionsSchema = z.strictObject({
  text:     z.string().default(DEMO_TEXT_DEFAULT),
  subtitle: z.string().optional(),
  animate:  z.boolean().default(DEMO_ANIMATE_DEFAULT),
});
export type DemoOptions = z.infer<typeof DemoOptionsSchema>;

export const StatsOptionsSchema = z.strictObject({
  filename:         z.string().default(STATS_FILENAME_DEFAULT),
  include:          z.array(StatsIncludeTokenSchema).default(() => [...STATS_INCLUDE_DEFAULT]),
  hide_rank:        z.boolean().default(STATS_HIDE_RANK_DEFAULT),
  avatar:           z.boolean().default(STATS_AVATAR_DEFAULT),
  animate:          z.boolean().default(STATS_ANIMATE_DEFAULT),
  include_private:  z.boolean().default(STATS_INCLUDE_PRIVATE_DEFAULT),
  include_forks:    z.boolean().default(STATS_INCLUDE_FORKS_DEFAULT),
  include_archived: z.boolean().default(STATS_INCLUDE_ARCHIVED_DEFAULT),
});
export type StatsOptions = z.infer<typeof StatsOptionsSchema>;

export const LanguagesOptionsSchema = z.strictObject({
  filename:         z.string().default(LANGUAGES_FILENAME_DEFAULT),
  limit:            z.int().min(LANGUAGES_LIMIT_MIN).max(LANGUAGES_LIMIT_MAX).default(LANGUAGES_LIMIT_DEFAULT),
  min_pct:          z.number().default(LANGUAGES_MIN_PCT_DEFAULT),
  exclude:          z.array(z.string()).default(() => [...LANGUAGES_EXCLUDE_DEFAULT]),
  animate:          z.boolean().default(LANGUAGES_ANIMATE_DEFAULT),
  include_private:  z.boolean().default(LANGUAGES_INCLUDE_PRIVATE_DEFAULT),
  include_forks:    z.boolean().default(LANGUAGES_INCLUDE_FORKS_DEFAULT),
  include_archived: z.boolean().default(LANGUAGES_INCLUDE_ARCHIVED_DEFAULT),
});
export type LanguagesOptions = z.infer<typeof LanguagesOptionsSchema>;

export const GithubWidgetsConfigSchema = z.strictObject({
  demo:      DemoOptionsSchema.optional(),
  stats:     StatsOptionsSchema.optional(),
  languages: LanguagesOptionsSchema.optional(),
});
export type GithubWidgetsConfig = z.infer<typeof GithubWidgetsConfigSchema>;

export const GithubPluginConfigSchema = z.strictObject({
  widgets: GithubWidgetsConfigSchema.optional(),
});
export type GithubPluginConfig = z.infer<typeof GithubPluginConfigSchema>;

export const PluginsConfigSchema = z.strictObject({
  github: GithubPluginConfigSchema.optional(),
});
export type PluginsConfig = z.infer<typeof PluginsConfigSchema>;

export const ConfigSchema = z.strictObject({
  version:     z.literal(CONFIG_VERSION_DEFAULT),
  format:      OutputFormatSchema.default(CONFIG_FORMAT_DEFAULT),
  theme:       ThemeSchema.default(CONFIG_THEME_DEFAULT),
  output_pair: z.boolean().default(CONFIG_OUTPUT_PAIR_DEFAULT),
  animated:    z.boolean().default(CONFIG_ANIMATED_DEFAULT),
  timezone:    z.string().default(CONFIG_TIMEZONE_DEFAULT),
  output_dir:  z.string().default(CONFIG_OUTPUT_DIR_DEFAULT),
  plugins:     PluginsConfigSchema,
});
export type Config = z.infer<typeof ConfigSchema>;

export const ActionInputsSchema = z.strictObject({
  user:             z.string().optional(),
  github_token:     z.string().optional(),
  committer_token:  z.string().optional(),
  config:           z.string().default(ACTION_CONFIG_PATH_DEFAULT),
  plugin_github:    z.boolean().optional(),
  format:           OutputFormatSchema.optional(),
  theme:            ThemeSchema.optional(),
  output_pair:      z.boolean().optional(),
  animated:         z.boolean().optional(),
  output_action:    OutputActionSchema.default(ACTION_OUTPUT_ACTION_DEFAULT),
  committer_branch: z.string().optional(),
  committer_gist:   z.string().optional(),
  output_condition: OutputConditionSchema.optional(),
  timezone:         z.string().optional(),
  dry_run:          z.boolean().optional(),
  allow_skipped:    z.boolean().default(ACTION_ALLOW_SKIPPED_DEFAULT),
});
export type ActionInputs = z.infer<typeof ActionInputsSchema>;

export const CapabilitiesSchema = z.strictObject({
  canPrivate:        z.boolean(),
  canContributions:  z.boolean(),
  canGist:           z.boolean(),
});
export type Capabilities = z.infer<typeof CapabilitiesSchema>;

export const IntegrationIdentitySchema = z.strictObject({
  id:     IntegrationIdSchema,
  auth:   AuthRequirementSchema,
  scopes: z.array(z.string()),
});
export type IntegrationIdentity = z.infer<typeof IntegrationIdentitySchema>;

export const WidgetIdentitySchema = z.strictObject({
  id:           WidgetIdSchema,
  title:        z.string(),
  description:  z.string(),
  integrations: z.array(IntegrationIdSchema).min(1),
  size:         CardSizeSchema,
  formats:      z.array(OutputFormatSchema).min(1),
});
export type WidgetIdentity = z.infer<typeof WidgetIdentitySchema>;

export const PluginIdentitySchema = z.strictObject({
  id:            PluginIdSchema,
  title:         z.string(),
  docsPath:      z.string(),
  widgets:       z.array(WidgetIdSchema).min(1),
  integrations:  z.array(IntegrationIdSchema),
  defaults:      z.strictObject({
    widgets: z.array(WidgetIdSchema).min(1),
  }),
});
export type PluginIdentity = z.infer<typeof PluginIdentitySchema>;

export const DEMO_OPTION_DEFAULTS = {
  text:    DEMO_TEXT_DEFAULT,
  animate: DEMO_ANIMATE_DEFAULT,
} as const;

export const STATS_OPTION_DEFAULTS = {
  filename:         STATS_FILENAME_DEFAULT,
  include:          STATS_INCLUDE_DEFAULT,
  hide_rank:        STATS_HIDE_RANK_DEFAULT,
  avatar:           STATS_AVATAR_DEFAULT,
  animate:          STATS_ANIMATE_DEFAULT,
  include_private:  STATS_INCLUDE_PRIVATE_DEFAULT,
  include_forks:    STATS_INCLUDE_FORKS_DEFAULT,
  include_archived: STATS_INCLUDE_ARCHIVED_DEFAULT,
} as const;

export const LANGUAGES_OPTION_DEFAULTS = {
  filename:         LANGUAGES_FILENAME_DEFAULT,
  limit:            LANGUAGES_LIMIT_DEFAULT,
  min_pct:          LANGUAGES_MIN_PCT_DEFAULT,
  exclude:          LANGUAGES_EXCLUDE_DEFAULT,
  animate:          LANGUAGES_ANIMATE_DEFAULT,
  include_private:  LANGUAGES_INCLUDE_PRIVATE_DEFAULT,
  include_forks:    LANGUAGES_INCLUDE_FORKS_DEFAULT,
  include_archived: LANGUAGES_INCLUDE_ARCHIVED_DEFAULT,
} as const;

export const CONFIG_DEFAULTS = {
  version:     CONFIG_VERSION_DEFAULT,
  format:      CONFIG_FORMAT_DEFAULT,
  theme:       CONFIG_THEME_DEFAULT,
  output_pair: CONFIG_OUTPUT_PAIR_DEFAULT,
  animated:    CONFIG_ANIMATED_DEFAULT,
  timezone:    CONFIG_TIMEZONE_DEFAULT,
  output_dir:  CONFIG_OUTPUT_DIR_DEFAULT,
} as const;
