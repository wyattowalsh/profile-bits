import { describe, expect, it } from "vitest";
import { throwCliExit } from "./errors.ts";
import { CLI_OUTPUT_ACTION_DEFAULT, mapInputs } from "./map-inputs.ts";
import { parseCli } from "./program.ts";

describe("mapInputs", () => {
  it("always passes CLI default output_action none", async () => {
    const parsed = await parseCli({
      args: ["render"],
      env: {},
      stdout: () => {},
      stderr: () => {},
      onExit: throwCliExit,
      colors: false,
    });
    expect(mapInputs(parsed)).toEqual({
      output_action: CLI_OUTPUT_ACTION_DEFAULT,
    });
  });

  it("omits false boolean flags so yaml defaults stay intact", async () => {
    const parsed = await parseCli({
      args: ["render", "--user", "octocat"],
      env: {},
      stdout: () => {},
      stderr: () => {},
      onExit: throwCliExit,
      colors: false,
    });
    const inputs = mapInputs(parsed);
    expect(inputs.plugin_github).toBeUndefined();
    expect(inputs.output_pair).toBeUndefined();
    expect(inputs.animated).toBeUndefined();
    expect(inputs.dry_run).toBeUndefined();
    expect(inputs.allow_skipped).toBeUndefined();
    expect(inputs.user).toBe("octocat");
  });

  it("passes true boolean flags through", async () => {
    const parsed = await parseCli({
      args: [
        "render",
        "--plugin-github",
        "--dry-run",
        "--output-pair",
        "--animated",
        "--allow-skipped",
      ],
      env: {},
      stdout: () => {},
      stderr: () => {},
      onExit: throwCliExit,
      colors: false,
    });
    expect(mapInputs(parsed)).toEqual({
      output_action: CLI_OUTPUT_ACTION_DEFAULT,
      plugin_github: true,
      dry_run: true,
      output_pair: true,
      animated: true,
      allow_skipped: true,
    });
  });

  it("passes optional thin overrides through", async () => {
    const parsed = await parseCli({
      args: [
        "render",
        "--http-token-env",
        "HTTP_TOKEN",
        "--format",
        "svg",
        "--theme",
        "dark",
        "--output-action",
        "gist",
        "--timezone",
        "UTC",
      ],
      env: {},
      stdout: () => {},
      stderr: () => {},
      onExit: throwCliExit,
      colors: false,
    });
    expect(mapInputs(parsed)).toEqual({
      http_token_env: "HTTP_TOKEN",
      format: "svg",
      theme: "dark",
      output_action: "gist",
      timezone: "UTC",
    });
  });
});
