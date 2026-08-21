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
  type CodingPayload,
  selectCodingPayload,
  type WakatimeClient,
  WakatimeClientError,
  WakatimeStatsEnvelopeSchema,
} from "@profile-bits/integrations";
import { renderCodingSvg, toCodingViewModel } from "@profile-bits/plugins";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WidgetRenderRequest } from "./engine.ts";
import {
  createWakatimeRenderWidget,
  UnhandledWakatimeWidgetError,
} from "./render-wakatime.ts";

vi.mock("@profile-bits/plugins", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@profile-bits/plugins")>();
  return {
    ...actual,
    renderCodingSvg: vi.fn(actual.renderCodingSvg),
  };
});

const TOKEN = "ghs_test_token";

const WAKATIME_YAML = `version: 1
format: svg
plugins:
  wakatime: {}
`;

const PUBLIC_CAPABILITIES: Capabilities = {
  canPrivate: false,
  canContributions: false,
  canGist: false,
};

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../integrations/src/wakatime/fixtures",
);

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as unknown;
}

function payloadFromFixture(name: string): CodingPayload {
  const envelope = WakatimeStatsEnvelopeSchema.parse(loadFixture(name));
  return selectCodingPayload(envelope.data, ["languages", "editors"], 8);
}

function codingRequest(): WidgetRenderRequest {
  const config = parseConfig({ yaml: WAKATIME_YAML });
  const options = config.plugins.wakatime?.widgets?.coding;
  if (options === undefined) {
    throw new Error("expected coding widget options");
  }
  const inputs: ActionInputs = ActionInputsSchema.parse({
    github_token: TOKEN,
    output_action: "none",
  });
  const theme = themeMembersFor(config)[0]?.theme;
  if (theme === undefined) {
    throw new Error("expected a resolved widget theme");
  }
  return {
    id: "coding",
    options: options as WidgetRenderRequest["options"],
    config,
    inputs,
    capabilities: PUBLIC_CAPABILITIES,
    theme,
  };
}

function fakeClient(fetchStats: WakatimeClient["fetchStats"]): WakatimeClient {
  return { fetchStats };
}

function assertCardSvg(svg: string): void {
  expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
  expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
  expect(svg).toMatch(/<svg\b[^>]*\bviewBox="0 0 480 160"/);
}

const WAKATIME_FAIL_WIDGET_LINE = "wakatime coding fail_widget";

function capturedWrites(spy: {
  mock: { calls: readonly unknown[][] };
}): string {
  return spy.mock.calls.map((args) => String(args[0] ?? "")).join("");
}

describe("createWakatimeRenderWidget", () => {
  afterEach(() => {
    vi.mocked(renderCodingSvg).mockClear();
    vi.unstubAllEnvs();
  });

  it("renders last_7_days from a fake fetchStats as a 480×160 svg", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const payload = payloadFromFixture("last_7_days.json");
    const fetchStats = vi.fn<WakatimeClient["fetchStats"]>(async () => payload);
    const render = createWakatimeRenderWidget({
      client: fakeClient(fetchStats),
    });

    const result = await render(codingRequest());

    expect(result.id).toBe("coding");
    expect(result.outcome).toBe("render");
    expect(result.files).toHaveLength(1);
    expect(result.files?.[0]?.path).toBe("wakatime.svg");
    expect(typeof result.files?.[0]?.contents).toBe("string");
    assertCardSvg(String(result.files?.[0]?.contents));
    expect(fetchStats).toHaveBeenCalledWith({
      range: "last_7_days",
      include: ["languages", "editors"],
      limit: 8,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vi.mocked(renderCodingSvg)).toHaveBeenCalledOnce();
    fetchSpy.mockRestore();
  });

  it("writes an empty-state card when fetchStats returns empty.json", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const payload = payloadFromFixture("empty.json");
    const fetchStats = vi.fn<WakatimeClient["fetchStats"]>(async () => payload);
    const render = createWakatimeRenderWidget({
      client: fakeClient(fetchStats),
    });

    const result = await render(codingRequest());

    const model = toCodingViewModel(payload, ["languages", "editors"], 8);
    expect(model.empty).toBe(true);
    expect(model.totalText).toBe("No coding data");
    expect(result.id).toBe("coding");
    expect(result.outcome).toBe("render");
    expect(result.files).toHaveLength(1);
    expect(result.files?.[0]?.path).toBe("wakatime.svg");
    expect(typeof result.files?.[0]?.contents).toBe("string");
    const contents = String(result.files?.[0]?.contents);
    assertCardSvg(contents);
    expect(contents).not.toMatch(/<text[\s>]/i);
    expect(vi.mocked(renderCodingSvg)).toHaveBeenCalledWith(
      expect.objectContaining({
        payload,
        include: ["languages", "editors"],
        limit: 8,
      }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("maps 404 WakatimeClientError fail_widget to no files", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetchStats = vi.fn<WakatimeClient["fetchStats"]>(async () => {
      throw new WakatimeClientError("fail_widget", "stats not found", 404);
    });
    const render = createWakatimeRenderWidget({
      client: fakeClient(fetchStats),
    });
    const request = codingRequest();
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const result = await render(request);
    const logged = capturedWrites(stderr);

    expect(result).toEqual({ id: "coding", outcome: "fail_widget" });
    expect(result.files).toBeUndefined();
    expect(result).not.toHaveProperty("code");
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(logged).toBe(`${WAKATIME_FAIL_WIDGET_LINE}\n`);
    expect(logged).not.toContain("code=");
    expect(vi.mocked(renderCodingSvg)).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    stderr.mockRestore();
    fetchSpy.mockRestore();
  });

  it("emits ::warning:: for 404 fail_widget when GITHUB_ACTIONS is true", async () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetchStats = vi.fn<WakatimeClient["fetchStats"]>(async () => {
      throw new WakatimeClientError("fail_widget", "stats not found", 404);
    });
    const render = createWakatimeRenderWidget({
      client: fakeClient(fetchStats),
    });
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const result = await render(codingRequest());
    const stdoutLog = capturedWrites(stdout);
    const stderrLog = capturedWrites(stderr);
    const haystack = `${stdoutLog}${stderrLog}`;

    expect(result).toEqual({ id: "coding", outcome: "fail_widget" });
    expect(result.files).toBeUndefined();
    expect(result).not.toHaveProperty("code");
    expect(stdoutLog).toContain(`::warning::${WAKATIME_FAIL_WIDGET_LINE}\n`);
    expect(stdoutLog).toContain("::group::wakatime coding\n");
    expect(stdoutLog).toContain(`${WAKATIME_FAIL_WIDGET_LINE}\n`);
    expect(stdoutLog).toContain("::endgroup::\n");
    expect(stdoutLog.match(/::warning::/g)).toHaveLength(1);
    expect(stdoutLog.match(/::group::/g)).toHaveLength(1);
    expect(stdoutLog).not.toContain("::error::");
    expect(stderrLog).toContain(`${WAKATIME_FAIL_WIDGET_LINE}\n`);
    expect(haystack).not.toContain(TOKEN);
    expect(haystack).not.toContain("code=");
    expect(vi.mocked(renderCodingSvg)).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    stdout.mockRestore();
    stderr.mockRestore();
    fetchSpy.mockRestore();
  });

  it("maps 401 WakatimeClientError fail_run to no files", async () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetchStats = vi.fn<WakatimeClient["fetchStats"]>(async () => {
      throw new WakatimeClientError("fail_run", `unauthorized ${TOKEN}`, 401);
    });
    const render = createWakatimeRenderWidget({
      client: fakeClient(fetchStats),
    });
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const result = await render(codingRequest());
    const haystack = `${capturedWrites(stdout)}${capturedWrites(stderr)}`;

    expect(result).toEqual({ id: "coding", outcome: "fail_run" });
    expect(result.files).toBeUndefined();
    expect(result).not.toHaveProperty("code");
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(haystack).not.toContain("::warning::");
    expect(haystack).not.toContain("::error::");
    expect(haystack).not.toContain(TOKEN);
    expect(vi.mocked(renderCodingSvg)).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    stdout.mockRestore();
    stderr.mockRestore();
    fetchSpy.mockRestore();
  });

  it("maps fail_after_backoff WakatimeClientError to no files", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetchStats = vi.fn<WakatimeClient["fetchStats"]>(async () => {
      throw new WakatimeClientError(
        "fail_after_backoff",
        `rate limited ${TOKEN}`,
        429,
      );
    });
    const render = createWakatimeRenderWidget({
      client: fakeClient(fetchStats),
    });

    const result = await render(codingRequest());

    expect(result).toEqual({ id: "coding", outcome: "fail_after_backoff" });
    expect(result.files).toBeUndefined();
    expect(result).not.toHaveProperty("code");
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(vi.mocked(renderCodingSvg)).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("maps fail_job WakatimeClientError to no files", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetchStats = vi.fn<WakatimeClient["fetchStats"]>(async () => {
      throw new WakatimeClientError("fail_job", `job failed ${TOKEN}`);
    });
    const render = createWakatimeRenderWidget({
      client: fakeClient(fetchStats),
    });

    const result = await render(codingRequest());

    expect(result).toEqual({ id: "coding", outcome: "fail_job" });
    expect(result.files).toBeUndefined();
    expect(result).not.toHaveProperty("code");
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(vi.mocked(renderCodingSvg)).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("rethrows unknown errors via mapRenderError", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const boom = new Error("disk full");
    const fetchStats = vi.fn<WakatimeClient["fetchStats"]>(async () => {
      throw boom;
    });
    const render = createWakatimeRenderWidget({
      client: fakeClient(fetchStats),
    });

    await expect(render(codingRequest())).rejects.toBe(boom);
    expect(vi.mocked(renderCodingSvg)).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("throws UnhandledWakatimeWidgetError for non-coding ids", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetchStats = vi.fn<WakatimeClient["fetchStats"]>(async () =>
      payloadFromFixture("last_7_days.json"),
    );
    const render = createWakatimeRenderWidget({
      client: fakeClient(fetchStats),
    });
    const request = codingRequest();

    await expect(render({ ...request, id: "stats" })).rejects.toBeInstanceOf(
      UnhandledWakatimeWidgetError,
    );
    expect(fetchStats).not.toHaveBeenCalled();
    expect(vi.mocked(renderCodingSvg)).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
