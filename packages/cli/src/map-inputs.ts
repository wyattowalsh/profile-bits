import type { RenderParserValue } from "./program.ts";

export { CLI_OUTPUT_ACTION_DEFAULT } from "./program.ts";

const BOOLEAN_TRUE_KEYS = new Set([
  "plugin_github",
  "output_pair",
  "animated",
  "dry_run",
  "allow_skipped",
]);

export type { RenderParserValue };

export function mapInputs(parsed: RenderParserValue): Record<string, unknown> {
  const inputs: Record<string, unknown> = {
    output_action: parsed.output_action,
  };

  assignOptional(inputs, "user", parsed.user);
  assignOptional(inputs, "github_token", parsed.github_token);
  assignOptional(inputs, "committer_token", parsed.committer_token);
  assignOptional(inputs, "config", parsed.config);
  assignOptional(inputs, "wakatime_token", parsed.wakatime_token);
  assignOptional(inputs, "http_token_env", parsed.http_token_env);
  assignOptional(inputs, "format", parsed.format);
  assignOptional(inputs, "theme", parsed.theme);
  assignOptional(inputs, "committer_branch", parsed.committer_branch);
  assignOptional(inputs, "output_condition", parsed.output_condition);
  assignOptional(inputs, "committer_gist", parsed.committer_gist);
  assignOptional(inputs, "timezone", parsed.timezone);
  assignTrueFlag(inputs, "plugin_github", parsed.plugin_github);
  assignTrueFlag(inputs, "output_pair", parsed.output_pair);
  assignTrueFlag(inputs, "animated", parsed.animated);
  assignTrueFlag(inputs, "dry_run", parsed.dry_run);
  assignTrueFlag(inputs, "allow_skipped", parsed.allow_skipped);

  return inputs;
}

function assignOptional(
  inputs: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (value === undefined) {
    return;
  }
  inputs[key] = value;
}

function assignTrueFlag(
  inputs: Record<string, unknown>,
  key: string,
  value: boolean,
): void {
  if (!value || !BOOLEAN_TRUE_KEYS.has(key)) {
    return;
  }
  inputs[key] = true;
}
