import {
  type ActionInputs,
  type AuthDecision,
  type Capabilities,
  type ChipsOptions,
  type CodingOptions,
  type Config,
  type DemoOptions,
  decideActionToken,
  decideAllGithubWidgetsSkipped,
  decideContributionsField,
  decideGistOutput,
  decideHttpOnlyRunFailed,
  decideIncludePrivate,
  decideWakatimeToken,
  type FeedOptions,
  type GithubWidgetOutcome,
  type JsonOptions,
  type LanguagesOptions,
  parseConfig,
  type SkipFailOutcome,
  type StatsOptions,
  themeMembersFor,
  type ThemeMember,
  type TokenClass,
  usesGithubIntegration,
  usesHttpIntegration,
  type WidgetId,
  widgetOutputFlags,
} from "@profile-bits/core";
import {
  type ActionRunOutputs,
  createNoopOutputPorts,
  type OutputPorts,
  type WidgetBlob,
  widgetCommitMessage,
} from "./output.ts";

const PUBLIC_CAPABILITIES: Capabilities = {
  canPrivate: false,
  canContributions: false,
  canGist: false,
};

const DEFAULT_TOKEN_CLASS: TokenClass = "actions_installation";

export class EngineError extends Error {
  override readonly name: string = "EngineError";
  readonly decision: AuthDecision;

  constructor(
    message: string,
    decision: AuthDecision,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.decision = decision;
  }
}

export class AllGithubWidgetsSkippedError extends EngineError {
  override readonly name = "AllGithubWidgetsSkippedError";

  constructor() {
    super(
      "every github widget was skipped; set allow_skipped: true to succeed without widget files",
      "fail_job",
    );
  }
}

export class GistOutputError extends EngineError {
  override readonly name = "GistOutputError";

  constructor(message: string) {
    super(message, "fail_run");
  }
}

export type EnabledWidget =
  | { id: "demo"; options: DemoOptions }
  | { id: "stats"; options: StatsOptions }
  | { id: "languages"; options: LanguagesOptions }
  | { id: "coding"; options: CodingOptions }
  | { id: "feed"; options: FeedOptions }
  | { id: "json"; options: JsonOptions }
  | { id: "chips"; options: ChipsOptions };

export type CapabilityProbeContext = {
  inputs: ActionInputs;
  config: Config;
};

export type CapabilityProbe = (
  context: CapabilityProbeContext,
) => Capabilities | Promise<Capabilities>;

export type WidgetRenderRequest = {
  id: WidgetId;
  options: EnabledWidget["options"];
  config: Config;
  inputs: ActionInputs;
  capabilities: Capabilities;
  theme: ThemeMember["theme"];
};

export type WidgetRenderResult = {
  id: WidgetId;
  outcome: SkipFailOutcome;
  files?: readonly WidgetBlob[];
  skipped?: readonly string[];
};

export type RenderWidget = (
  request: WidgetRenderRequest,
) => WidgetRenderResult | Promise<WidgetRenderResult>;

export type WriteWidgetFiles = (
  files: readonly WidgetBlob[],
) => readonly string[] | Promise<readonly string[]>;

/**
 * Loaded Action config (T120a) plus optional yaml for engine-owned parse.
 * `runEngine(loaded)` matches T120c `main.ts`.
 */
export type RunEngineInput = {
  inputs: ActionInputs;
  config?: Config;
  yaml?: string;
  configPath?: string;
  configFileExists?: boolean;
};

export type EngineDependencies = {
  /** Injected identity/capability probe. Must not perform GitHub HTTP here. */
  probeCapabilities?: CapabilityProbe;
  /** Injected per-widget fetch/render. Must not perform GitHub HTTP here. */
  renderWidget?: RenderWidget;
  writeFiles?: WriteWidgetFiles;
  output?: OutputPorts;
  tokenClass?: TokenClass;
};

/**
 * Parse → capability → per-widget fetch/render → skip policy → publish.
 * `output_action: none` and `dry_run` never commit, open a PR, or update a gist.
 */
export async function runEngine(
  loaded: RunEngineInput,
  deps: EngineDependencies = {},
): Promise<ActionRunOutputs> {
  const inputs = loaded.inputs;
  if (decideActionToken(inputs.github_token) === "fail_job") {
    throw new EngineError(
      'github_token is missing: empty, "", or whitespace fails the job (unauthenticated GitHub is not allowed)',
      "fail_job",
    );
  }

  const config = resolveConfig(loaded);
  if (
    decideWakatimeToken({
      token: inputs.wakatime_token,
      packEnabled: config.plugins.wakatime !== undefined,
    }) === "fail_job"
  ) {
    throw new EngineError(
      'wakatime_token is missing: empty, "", or whitespace fails the job when plugins.wakatime is on',
      "fail_job",
    );
  }
  const capabilities = await Promise.resolve(
    deps.probeCapabilities?.({ inputs, config }) ?? PUBLIC_CAPABILITIES,
  );
  assertGistAllowed(inputs, config, capabilities);

  const enabled = enabledWidgets(config);
  const writeFiles = deps.writeFiles ?? defaultWriteFiles;
  const ports = deps.output ?? createNoopOutputPorts();
  const tokenClass = deps.tokenClass ?? DEFAULT_TOKEN_CLASS;

  const outcomes: GithubWidgetOutcome[] = [];
  const skipped: string[] = [];
  const pendingWrites: WidgetBlob[] = [];
  let dataChanged = false;
  let failedWidget: WidgetId | undefined;

  for (const widget of enabled) {
    const preflight = preflightWidget(widget, capabilities);
    if (widget.id === "stats") {
      const field = decideContributionsField({
        requested: widget.options.include.includes("contributions"),
        canContributions: capabilities.canContributions,
      });
      skipped.push(...field.skipped);
    }

    if (preflight !== "render") {
      outcomes.push({ id: widget.id, outcome: preflight });
      recordSkipOrFail(widget.id, preflight, skipped);
      if (preflight === "fail_widget" && usesGithubIntegration(widget.id)) {
        failedWidget = widget.id;
      }
      continue;
    }

    const render = requireRenderWidget(deps.renderWidget);
    const members = themeMembersFor(config);
    const polarityFiles: WidgetBlob[] = [];
    let renderedOutcome: WidgetRenderResult["outcome"] | undefined;
    let renderedSkipped: string[] | undefined;
    let polarityFailed = false;

    for (const member of members) {
      const rendered = await Promise.resolve(
        render({
          id: widget.id,
          options: widget.options,
          config,
          inputs,
          capabilities,
          theme: member.theme,
        }),
      );
      renderedOutcome = rendered.outcome;
      if (rendered.skipped !== undefined) {
        renderedSkipped = [...(renderedSkipped ?? []), ...rendered.skipped];
      }
      if (
        rendered.outcome === "fail_job" ||
        rendered.outcome === "fail_run" ||
        rendered.outcome === "fail_after_backoff"
      ) {
        throw new EngineError(
          `widget ${widget.id} ${rendered.outcome.replaceAll("_", " ")}`,
          rendered.outcome,
        );
      }
      if (rendered.outcome === "fail_widget") {
        polarityFailed = true;
        break;
      }
      const flags = widgetOutputFlags(rendered.outcome);
      if (!flags.write) {
        continue;
      }
      polarityFiles.push(
        ...(rendered.files ?? []).map((file) => ({
          ...file,
          path: applyPolarityFilename(
            file.path,
            member.polarity,
            config.output_pair,
          ),
        })),
      );
    }

    const outcome = renderedOutcome ?? "fail_widget";
    outcomes.push({ id: widget.id, outcome });
    if (renderedSkipped !== undefined) {
      skipped.push(...renderedSkipped);
    }
    recordSkipOrFail(widget.id, outcome, skipped);

    if (polarityFailed || outcome === "fail_widget") {
      if (usesGithubIntegration(widget.id)) {
        failedWidget = widget.id;
      }
      continue;
    }

    const flags = widgetOutputFlags(outcome);
    if (!flags.write) {
      continue;
    }
    const blobs = polarityFiles.map((file) =>
      locateBlob(config.output_dir, file),
    );
    pendingWrites.push(...blobs);
    if (flags.dataChanged && blobs.length > 0) {
      dataChanged = true;
    }
  }

  const allSkipped = decideAllGithubWidgetsSkipped({
    widgets: outcomes,
    allowSkipped: inputs.allow_skipped,
  });
  if (allSkipped === "fail_job") {
    throw new AllGithubWidgetsSkippedError();
  }
  const httpOnly = decideHttpOnlyRunFailed({
    widgets: outcomes,
    allowSkipped: inputs.allow_skipped,
  });
  if (httpOnly === "fail_job") {
    throw new EngineError(
      "http widget did not render; set allow_skipped: true to succeed without widget files",
      "fail_job",
    );
  }
  if (failedWidget !== undefined) {
    throw new EngineError(`widget ${failedWidget} failed`, "fail_widget");
  }

  const files =
    pendingWrites.length === 0
      ? []
      : [...(await Promise.resolve(writeFiles(pendingWrites)))];

  const dryRun = inputs.dry_run === true;
  const outputAction = inputs.output_action;
  let didCommit = false;

  if (!dryRun && outputAction === "gist") {
    await ports.gistWidgets({
      files: pendingWrites,
      gistId: inputs.committer_gist,
      format: config.format,
      canGist: capabilities.canGist,
      dryRun: false,
    });
  } else if (
    !dryRun &&
    (outputAction === "commit" || outputAction === "pull-request")
  ) {
    const published = await ports.commitWidgets({
      mode: outputAction,
      files: pendingWrites,
      outputDir: config.output_dir,
      branch: inputs.committer_branch,
      dryRun: false,
      tokenClass,
      message: widgetCommitMessage(tokenClass),
      dataChanged,
      outputCondition: inputs.output_condition,
    });
    didCommit = published.didCommit;
  }

  return {
    files,
    did_commit: didCommit,
    skipped: unique(skipped),
  };
}

function resolveConfig(loaded: RunEngineInput): Config {
  if (loaded.config !== undefined) {
    return loaded.config;
  }
  return parseConfig({
    ...(loaded.yaml !== undefined ? { yaml: loaded.yaml } : {}),
    plugin_github: loaded.inputs.plugin_github,
    format: loaded.inputs.format,
    theme: loaded.inputs.theme,
    output_pair: loaded.inputs.output_pair,
    animated: loaded.inputs.animated,
    timezone: loaded.inputs.timezone,
  });
}

function enabledWidgets(config: Config): EnabledWidget[] {
  const enabled: EnabledWidget[] = [];
  const widgets = config.plugins.github?.widgets;
  if (widgets !== undefined) {
    if (widgets.demo !== undefined) {
      enabled.push({ id: "demo", options: widgets.demo });
    }
    if (widgets.stats !== undefined) {
      enabled.push({ id: "stats", options: widgets.stats });
    }
    if (widgets.languages !== undefined) {
      enabled.push({ id: "languages", options: widgets.languages });
    }
  }
  const coding = config.plugins.wakatime?.widgets?.coding;
  if (coding !== undefined) {
    enabled.push({ id: "coding", options: coding });
  }
  const feed = config.plugins.rss?.widgets.feed;
  if (feed !== undefined) {
    enabled.push({ id: "feed", options: feed });
  }
  const json = config.plugins.http?.widgets?.json;
  if (json !== undefined) {
    enabled.push({ id: "json", options: json });
  }
  const chips = config.plugins.http?.widgets?.chips;
  if (chips !== undefined) {
    enabled.push({ id: "chips", options: chips });
  }
  return enabled;
}

function preflightWidget(
  widget: EnabledWidget,
  capabilities: Capabilities,
): SkipFailOutcome {
  if (
    usesHttpIntegration(widget.id) ||
    widget.id === "feed" ||
    widget.id === "demo" ||
    widget.id === "coding"
  ) {
    return "render";
  }
  return decideIncludePrivate({
    includePrivate: widget.options.include_private,
    canPrivate: capabilities.canPrivate,
  });
}

function recordSkipOrFail(
  id: WidgetId,
  outcome: SkipFailOutcome,
  skipped: string[],
): void {
  if (outcome === "skip_widget") {
    skipped.push(id);
  }
}

function requireRenderWidget(
  renderWidget: RenderWidget | undefined,
): RenderWidget {
  if (renderWidget === undefined) {
    throw new EngineError(
      "renderWidget is not injected (engine fetch/render is a port; no GitHub HTTP)",
      "fail_run",
    );
  }
  return renderWidget;
}

function assertGistAllowed(
  inputs: ActionInputs,
  config: Config,
  capabilities: Capabilities,
): void {
  const decision = decideGistOutput({
    outputAction: inputs.output_action,
    format: config.format,
    canGist: capabilities.canGist,
  });
  if (decision !== "fail_run") {
    return;
  }
  if (!capabilities.canGist) {
    throw new GistOutputError(
      "output_action: gist requires canGist (user PAT); installation tokens cannot create gists",
    );
  }
  throw new GistOutputError(
    `output_action: gist requires format: svg (got ${config.format})`,
  );
}

export { themesFor } from "@profile-bits/core";

export function applyPolarityFilename(
  path: string,
  polarity: ThemeMember["polarity"],
  outputPair: boolean,
): string {
  if (!outputPair || polarity === "light") {
    return path;
  }
  const slash = path.lastIndexOf("/");
  const dir = slash === -1 ? "" : path.slice(0, slash + 1);
  const name = slash === -1 ? path : path.slice(slash + 1);
  const dot = name.lastIndexOf(".");
  if (dot <= 0) {
    return `${dir}${name}-dark`;
  }
  return `${dir}${name.slice(0, dot)}-dark${name.slice(dot)}`;
}

function locateBlob(outputDir: string, file: WidgetBlob): WidgetBlob {
  return { ...file, path: underOutputDir(outputDir, file.path) };
}

function underOutputDir(outputDir: string, relativePath: string): string {
  const trimmed = relativePath.replaceAll("\\", "/").replace(/^\.?\//, "");
  if (trimmed === "README.md" || trimmed.endsWith("/README.md")) {
    throw new EngineError("Action must not patch README.md", "fail_run");
  }
  if (trimmed.startsWith("../") || trimmed.split("/").includes("..")) {
    throw new EngineError("widget file path escapes output_dir", "fail_run");
  }
  const root = outputDir.replace(/\/$/, "");
  if (trimmed === root || trimmed.startsWith(`${root}/`)) {
    return trimmed;
  }
  return `${root}/${trimmed}`;
}

function defaultWriteFiles(files: readonly WidgetBlob[]): readonly string[] {
  return files.map((file) => file.path);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
