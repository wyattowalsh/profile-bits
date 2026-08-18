import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ActionInputsSchema } from "../types.ts";
import {
  generateActionYml,
  renderActionYml,
  THIN_ACTION_INPUT_NAMES,
  THIN_ACTION_INPUTS,
} from "./action-yml.ts";
import { checkActionYml } from "./check.ts";
import { main as generateActionCli } from "./cli.ts";
import {
  assertNoFlattenedActionInputs,
  findFlattenedActionInputs,
  isFlattenedActionInputName,
} from "./flatten.ts";

const FLATTENED_INCLUDE_YAML = [
  "name: poisoned",
  "inputs:",
  "  plugin_github_stats_include:",
  "    description: flattened include CSV",
  "",
].join("\n");

describe("thin action.yml codegen", () => {
  it("emits node24 runtime and only thin inputs", () => {
    const yml = generateActionYml();

    expect(yml).toContain("using: node24");
    expect(yml).toContain("main: dist/index.js");
    expect(yml).toContain("plugin_github:");
    expect(yml).toContain("wakatime_token:");
    expect(yml).toContain("http_token_env:");
    expect(yml).not.toContain("plugin_http");
    expect(yml).not.toContain("plugin_http_json_");
    expect(yml).not.toContain("plugin_http_chips_");
    expect(yml).not.toContain("plugin_http_chips_preset");
    expect(yml).not.toContain("plugin_rss");
    expect(yml).not.toContain("plugin_wakatime:");
    expect(yml).not.toContain("plugin_wakatime_coding_");
    expect(yml).not.toContain("plugin_github_stats_include");
    expect(yml).not.toContain("plugin_github_widgets");
    expect(yml).not.toContain("plugin_github_filename_");
    expect(yml).toMatchSnapshot();
  });

  it("covers every ActionInputsSchema key and no extras", () => {
    const schemaNames = Object.keys(ActionInputsSchema.shape).sort();
    const generated = [...THIN_ACTION_INPUT_NAMES].sort();
    expect(generated).toEqual(schemaNames);
  });

  it("does not treat plugin_github as flattened", () => {
    expect(isFlattenedActionInputName("plugin_github")).toBe(false);
    expect(isFlattenedActionInputName("plugin_wakatime")).toBe(false);
    expect(isFlattenedActionInputName("plugin_rss")).toBe(false);
    expect(isFlattenedActionInputName("plugin_rss_feed_url")).toBe(true);
    expect(isFlattenedActionInputName("plugin_http_json_url")).toBe(true);
    expect(isFlattenedActionInputName("plugin_http_chips_preset")).toBe(true);
    expect(isFlattenedActionInputName("plugin_http")).toBe(false);
    expect(THIN_ACTION_INPUT_NAMES).not.toContain("plugin_http");
    expect(Object.keys(ActionInputsSchema.shape)).not.toContain("plugin_http");
    expect(THIN_ACTION_INPUT_NAMES).not.toContain("plugin_rss");
    expect(Object.keys(ActionInputsSchema.shape)).not.toContain("plugin_rss");
    expect(() =>
      assertNoFlattenedActionInputs(generateActionYml()),
    ).not.toThrow();
  });
});

describe("assertNoFlattenedActionInputs", () => {
  it("fails when yaml contains plugin_github_stats_include", () => {
    expect(findFlattenedActionInputs(FLATTENED_INCLUDE_YAML)).toEqual([
      "plugin_github_stats_include",
    ]);
    expect(() => assertNoFlattenedActionInputs(FLATTENED_INCLUDE_YAML)).toThrow(
      /plugin_github_stats_include/,
    );
  });

  it("fails a yaml fragment that is only the flattened key", () => {
    expect(() =>
      assertNoFlattenedActionInputs(
        "plugin_github_stats_include:\n  description: x\n",
      ),
    ).toThrow(/plugin_github_stats_include/);
  });

  it("fails other plugin_<plugin>_<widget>_<option> names", () => {
    const yaml =
      "inputs:\n  plugin_github_filename_stats:\n    description: x\n";
    expect(() => assertNoFlattenedActionInputs(yaml)).toThrow(
      /plugin_github_filename_stats/,
    );
  });

  it("fails plugin_wakatime_coding_filename", () => {
    const yaml =
      "inputs:\n  plugin_wakatime_coding_filename:\n    description: x\n";
    expect(() => assertNoFlattenedActionInputs(yaml)).toThrow(
      /plugin_wakatime_coding_filename/,
    );
  });

  it("fails banned plugin_wakatime_coding_range", () => {
    const yaml =
      "inputs:\n  plugin_wakatime_coding_range:\n    description: x\n";
    expect(findFlattenedActionInputs(yaml)).toContain(
      "plugin_wakatime_coding_range",
    );
    expect(() => assertNoFlattenedActionInputs(yaml)).toThrow(
      /plugin_wakatime_coding_range/,
    );
  });

  it("fails plugin_rss_feed_url", () => {
    const yaml = "inputs:\n  plugin_rss_feed_url:\n    description: x\n";
    expect(findFlattenedActionInputs(yaml)).toEqual(["plugin_rss_feed_url"]);
    expect(() => assertNoFlattenedActionInputs(yaml)).toThrow(
      /plugin_rss_feed_url/,
    );
  });

  it("fails plugin_http_json_url", () => {
    const yaml = "inputs:\n  plugin_http_json_url:\n    description: x\n";
    expect(findFlattenedActionInputs(yaml)).toEqual(["plugin_http_json_url"]);
    expect(() => assertNoFlattenedActionInputs(yaml)).toThrow(
      /plugin_http_json_url/,
    );
  });

  it("fails plugin_http_chips_preset", () => {
    const yaml = "inputs:\n  plugin_http_chips_preset:\n    description: x\n";
    expect(findFlattenedActionInputs(yaml)).toEqual([
      "plugin_http_chips_preset",
    ]);
    expect(() => assertNoFlattenedActionInputs(yaml)).toThrow(
      /plugin_http_chips_preset/,
    );
  });
});

describe("generate-action --check", () => {
  it("exits ok when current matches the thin generated file", () => {
    const yml = generateActionYml();
    const result = checkActionYml(yml, yml);
    expect(result).toEqual({ ok: true });
  });

  it("fails --check when current yaml has plugin_github_stats_include", () => {
    const result = checkActionYml(FLATTENED_INCLUDE_YAML, generateActionYml());
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.join("\n")).toMatch(/plugin_github_stats_include/);
  });

  it("fails --check when current yaml has plugin_rss_feed_url", () => {
    const poisoned = [
      "name: poisoned",
      "inputs:",
      "  plugin_rss_feed_url:",
      "    description: flattened rss feed url",
      "",
    ].join("\n");
    const result = checkActionYml(poisoned, generateActionYml());
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.join("\n")).toMatch(/plugin_rss_feed_url/);
  });

  it("fails --check when current yaml has plugin_http_chips_preset", () => {
    const poisoned = [
      "name: poisoned",
      "inputs:",
      "  plugin_http_chips_preset:",
      "    description: flattened http chips preset",
      "",
    ].join("\n");
    const result = checkActionYml(poisoned, generateActionYml());
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.join("\n")).toMatch(/plugin_http_chips_preset/);
  });

  it("fails --check when current yaml has plugin_wakatime_coding_filename", () => {
    const poisoned = [
      "name: poisoned",
      "inputs:",
      "  plugin_wakatime_coding_filename:",
      "    description: flattened filename",
      "",
    ].join("\n");
    const result = checkActionYml(poisoned, generateActionYml());
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.join("\n")).toMatch(/plugin_wakatime_coding_filename/);
  });

  it("fails --check when a would-be generated input is flattened", () => {
    const poisonedInputs = [
      ...THIN_ACTION_INPUTS,
      {
        name: "plugin_github_stats_include",
        description: "must not ship",
      },
    ];
    const generated = renderActionYml(poisonedInputs);
    const result = checkActionYml(generated, generated, poisonedInputs);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.join("\n")).toMatch(/plugin_github_stats_include/);
  });

  it("fails --check when action.yml is stale", () => {
    const generated = generateActionYml();
    const stale = `${generated}# extra\n`;
    const result = checkActionYml(stale, generated);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.join("\n")).toMatch(/stale/);
  });

  it("accepts just/pnpm -- --check against a thin file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "profile-bits-action-"));
    try {
      await writeFile(join(dir, "action.yml"), generateActionYml(), "utf8");
      await expect(generateActionCli(["--", "--check"], dir)).resolves.toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
