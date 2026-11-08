import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ActionInputs,
  ActionInputsSchema,
  type Capabilities,
  parseConfig,
  themeMembersFor,
} from "@profile-bits/core";
import {
  type WakatimeClient,
  WakatimeStatsEnvelopeSchema,
} from "@profile-bits/integrations";
import { toCodingViewModel } from "@profile-bits/plugins";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WidgetRenderRequest } from "./engine.ts";
import { EngineError, type RenderWidget, runEngine } from "./engine.ts";
import { createWakatimeRenderWidget } from "./render-wakatime.ts";

const GITHUB_TOKEN = "ghs_test_token";
const WAKATIME_TOKEN = "waka_secret_do_not_leak";

const PUBLIC_CAPABILITIES: Capabilities = {
  canPrivate: false,
  canContributions: false,
  canGist: false,
};

const WAKATIME_ONLY_YAML = `version: 1
format: svg
plugins:
  wakatime: {}
`;

const LANGUAGES_ONLY_YAML = `version: 1
format: svg
plugins:
  wakatime:
    widgets:
      coding:
        include: [languages]
        limit: 1
`;

const GITHUB_ONLY_YAML = `version: 1
format: svg
plugins:
  github:
    widgets:
      stats: {}
      languages: {}
`;

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../integrations/src/wakatime/fixtures",
);

function loadDump() {
  return WakatimeStatsEnvelopeSchema.parse(
    JSON.parse(readFileSync(join(fixturesDir, "last_7_days.json"), "utf8")),
  ).data;
}

function inputs(overrides: Record<string, unknown> = {}): ActionInputs {
  return ActionInputsSchema.parse({
    github_token: GITHUB_TOKEN,
    output_action: "none",
    ...overrides,
  });
}

function codingRequest(yaml: string): WidgetRenderRequest {
  const config = parseConfig({ yaml });
  const options = config.plugins.wakatime?.widgets?.coding;
  if (options === undefined) {
    throw new Error("expected coding widget options");
  }
  const theme = themeMembersFor(config)[0]?.theme;
  if (theme === undefined) {
    throw new Error("expected a resolved widget theme");
  }
  return {
    id: "coding",
    options: options as WidgetRenderRequest["options"],
    config,
    inputs: inputs({ wakatime_token: WAKATIME_TOKEN }),
    capabilities: PUBLIC_CAPABILITIES,
    theme,
  };
}

describe("wakatime dump pack-on empty token", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([undefined, "", "   ", "\t\n"] as const)(
    "fail_jobs before render or HTTP when plugins.wakatime is on and the token is missing (%j)",
    async (wakatimeToken) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const renderWidget = vi.fn<RenderWidget>(({ id }) => ({
        id,
        outcome: "render",
      }));

      await expect(
        runEngine(
          {
            inputs: inputs(
              wakatimeToken === undefined
                ? {}
                : { wakatime_token: wakatimeToken },
            ),
            yaml: WAKATIME_ONLY_YAML,
          },
          {
            probeCapabilities: () => PUBLIC_CAPABILITIES,
            renderWidget,
          },
        ),
      ).rejects.toSatisfy((error: unknown) => {
        if (!(error instanceof EngineError) || error.decision !== "fail_job") {
          return false;
        }
        expect(error.message).toContain("wakatime_token");
        expect(error.message).not.toContain(WAKATIME_TOKEN);
        return true;
      });

      expect(renderWidget).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    },
  );

  it("does not fail the job for a missing wakatime_token when the pack is off", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const renderWidget = vi.fn<RenderWidget>(({ id }) => ({
      id,
      outcome: "render",
      files: [{ path: `${id}.svg`, contents: "<svg />" }],
    }));

    const result = await runEngine(
      {
        inputs: inputs(),
        yaml: GITHUB_ONLY_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget,
      },
    );

    expect(renderWidget.mock.calls.map((call) => call[0].id)).toEqual([
      "stats",
      "languages",
    ]);
    expect(result.files).toEqual([
      "profile-bits/stats.svg",
      "profile-bits/languages.svg",
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("wakatime dump through the coding adapter", () => {
  it("keeps dump slices when yaml include is languages-only", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = loadDump();
    const editors = dump.editors;
    const fetchStats = vi.fn<WakatimeClient["fetchStats"]>(async () => dump);
    const render = createWakatimeRenderWidget({
      client: { fetchStats },
    });

    const result = await render(codingRequest(LANGUAGES_ONLY_YAML));
    const model = toCodingViewModel(dump, ["languages"], 1);

    expect(fetchStats).toHaveBeenCalledWith({
      range: "last_7_days",
      include: ["languages"],
      limit: 1,
    });
    expect(result.outcome).toBe("render");
    expect(result.files?.[0]?.path).toBe("wakatime.svg");
    expect(model.slices.map((slice) => slice.key)).toEqual(["languages"]);
    expect(model.slices[0]?.rows).toHaveLength(1);
    expect(model.slices.some((slice) => slice.key === "editors")).toBe(false);
    expect(dump.editors).toBe(editors);
    expect(dump.editors?.map((row) => row.name)).toEqual(["VS Code", "Neovim"]);
    expect(dump.languages).toHaveLength(3);
    expect(dump.projects).toHaveLength(2);
    expect(dump.operating_systems).toHaveLength(2);
    expect(dump).not.toHaveProperty("os");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
