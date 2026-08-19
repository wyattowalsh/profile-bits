import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ActionInputs,
  ActionInputsSchema,
  type Capabilities,
  parseConfig,
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
  return {
    id: "coding",
    options: options as WidgetRenderRequest["options"],
    config,
    inputs,
    capabilities: PUBLIC_CAPABILITIES,
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

describe("createWakatimeRenderWidget", () => {
  afterEach(() => {
    vi.mocked(renderCodingSvg).mockClear();
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

    expect(toCodingViewModel(payload, ["languages", "editors"], 8).empty).toBe(
      true,
    );
    expect(result.id).toBe("coding");
    expect(result.outcome).toBe("render");
    expect(result.files).toHaveLength(1);
    expect(result.files?.[0]?.path).toBe("wakatime.svg");
    expect(typeof result.files?.[0]?.contents).toBe("string");
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

    const result = await render(codingRequest());

    expect(result).toEqual({ id: "coding", outcome: "fail_widget" });
    expect(result.files).toBeUndefined();
    expect(vi.mocked(renderCodingSvg)).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("maps 401 WakatimeClientError fail_run to no files", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetchStats = vi.fn<WakatimeClient["fetchStats"]>(async () => {
      throw new WakatimeClientError("fail_run", `unauthorized ${TOKEN}`, 401);
    });
    const render = createWakatimeRenderWidget({
      client: fakeClient(fetchStats),
    });

    const result = await render(codingRequest());

    expect(result).toEqual({ id: "coding", outcome: "fail_run" });
    expect(result.files).toBeUndefined();
    expect(result).not.toHaveProperty("code");
    expect(JSON.stringify(result)).not.toContain(TOKEN);
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
