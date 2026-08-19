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
});
