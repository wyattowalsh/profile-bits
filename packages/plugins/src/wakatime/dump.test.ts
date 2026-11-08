import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createWakatimeClient } from "@profile-bits/integrations";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toSliceViewModel } from "./slice.js";
import { renderCodingSvg } from "./widgets/coding/render.js";
import { toCodingViewModel } from "./widgets/coding/view-model.js";
import { renderEditorsSvg } from "./widgets/editors/render.js";
import { renderLangsSvg } from "./widgets/langs/render.js";
import { renderOsSvg } from "./widgets/os/render.js";
import { renderProjectsSvg } from "./widgets/projects/render.js";

const TOKEN = "waka_dump_token";
const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../integrations/src/wakatime/fixtures",
);
const last7Days = JSON.parse(
  readFileSync(join(fixturesDir, "last_7_days.json"), "utf8"),
) as unknown;

const publicLookup = (async () => [
  { address: "1.1.1.1", family: 4 as const },
]) as typeof import("node:dns/promises").lookup;

const allTimeBody = {
  data: { total_seconds: 3600, text: "1 hr", is_up_to_date: true },
};
const summariesBody = {
  data: [{ grand_total: { total_seconds: 100, text: "1 min 40 secs" } }],
  start: "2026-08-20",
  end: "2026-08-26",
};
const statusbarBody = {
  data: { grand_total: { total_seconds: 50, text: "50 secs" } },
};
const goalsBody = {
  data: [{ id: "goal-1", title: "Code 1h/day", email: "user@example.com" }],
};

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

function extraRouter(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(requestUrl(input)).pathname;
    if (path.endsWith("/stats/last_7_days")) {
      return jsonResponse(200, last7Days);
    }
    if (path.endsWith("/all_time_since_today")) {
      return jsonResponse(200, allTimeBody);
    }
    if (path.endsWith("/summaries")) {
      return jsonResponse(200, summariesBody);
    }
    if (path.endsWith("/statusbar/today")) {
      return jsonResponse(200, statusbarBody);
    }
    if (path.endsWith("/goals")) {
      return jsonResponse(200, goalsBody);
    }
    throw new Error(`unmocked dump path ${path}`);
  });
}

describe("wakatime dump vs coding widget include", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("omits editors in render when include is languages-only and keeps them on the dump", async () => {
    const fetchImpl = extraRouter();
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    const dump = await client.fetchStats({
      range: "last_7_days",
      include: ["languages"],
      limit: 1,
    });
    const fetchesAfterDump = fetchImpl.mock.calls.length;
    const editors = dump.editors;
    const extras = {
      all_time_since_today: dump.all_time_since_today,
      summaries: dump.summaries,
      statusbar_today: dump.statusbar_today,
      goals: dump.goals,
    };

    expect(dump.languages).toHaveLength(3);
    expect(editors?.map((row) => row.name)).toEqual(["VS Code", "Neovim"]);
    expect(dump.projects).toHaveLength(2);
    expect(dump.operating_systems).toHaveLength(2);
    expect(dump.all_time_since_today?.text).toBe("1 hr");

    const model = toCodingViewModel(dump, ["languages"], 1);
    const svg = await renderCodingSvg({
      payload: dump,
      include: ["languages"],
      limit: 1,
    });

    expect(model.slices.map((slice) => slice.key)).toEqual(["languages"]);
    expect(model.slices[0]?.rows).toHaveLength(1);
    expect(model.slices[0]?.rows[0]?.name).toBe("TypeScript");
    expect(model.slices.some((slice) => slice.key === "editors")).toBe(false);
    expect(dump.editors).toBe(editors);
    expect(dump.editors?.map((row) => row.name)).toEqual(["VS Code", "Neovim"]);
    expect(dump.languages).toHaveLength(3);
    expect(dump.projects?.map((row) => row.name)).toEqual([
      "profile-bits",
      "other",
    ]);
    expect(dump.operating_systems?.map((row) => row.name)).toEqual([
      "Mac",
      "Linux",
    ]);
    expect(dump.all_time_since_today).toEqual(extras.all_time_since_today);
    expect(dump.summaries).toEqual(extras.summaries);
    expect(dump.statusbar_today).toEqual(extras.statusbar_today);
    expect(dump.goals).toEqual(extras.goals);
    expect(dump.goals?.[0]).not.toHaveProperty("email");
    expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
    expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
    expect(fetchImpl).toHaveBeenCalledTimes(fetchesAfterDump);
  });

  it("does not invent os on the dump when the widget maps operating_systems", async () => {
    const fetchImpl = extraRouter();
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    const dump = await client.fetchStats({
      range: "last_7_days",
      include: ["languages"],
      limit: 1,
    });
    const model = toCodingViewModel(dump, ["os"], 8);

    expect(model.slices.map((slice) => slice.key)).toEqual(["os"]);
    expect(model.slices[0]?.rows.map((row) => row.name)).toEqual([
      "Mac",
      "Linux",
    ]);
    expect(dump.operating_systems?.map((row) => row.name)).toEqual([
      "Mac",
      "Linux",
    ]);
    expect(dump).not.toHaveProperty("os");
    expect(dump.editors).toHaveLength(2);
  });

  it("renders slice cards from one shared stats dump without a second fetch", async () => {
    const fetchImpl = extraRouter();
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    const dump = await client.fetchStats({
      range: "last_7_days",
      include: ["languages"],
      limit: 1,
    });
    const fetchesAfterDump = fetchImpl.mock.calls.length;
    const editors = dump.editors;
    const languages = dump.languages;

    const coding = toCodingViewModel(dump, ["languages", "editors"], 8);
    const langs = toSliceViewModel(dump, "langs", 1);
    const [editorsSvg, projectsSvg, osSvg, langsSvg, codingSvg] =
      await Promise.all([
        renderEditorsSvg({ payload: dump, options: { limit: 1 } }),
        renderProjectsSvg({ payload: dump, options: { limit: 1 } }),
        renderOsSvg({ payload: dump, options: { limit: 1 } }),
        renderLangsSvg({ payload: dump, options: { limit: 1 } }),
        renderCodingSvg({
          payload: dump,
          include: ["languages"],
          limit: 1,
        }),
      ]);

    expect(coding.slices.map((slice) => slice.key)).toEqual([
      "languages",
      "editors",
    ]);
    expect(langs.rows).toHaveLength(1);
    expect(langs.rows[0]?.name).toBe("TypeScript");
    expect(langs.rows[0]?.percent).toBe(64.8);
    expect(dump.editors).toBe(editors);
    expect(dump.languages).toBe(languages);
    expect(dump.editors).toHaveLength(2);
    expect(dump.languages).toHaveLength(3);
    expect(dump.projects).toHaveLength(2);
    expect(dump.operating_systems).toHaveLength(2);
    expect(dump).not.toHaveProperty("os");
    for (const svg of [editorsSvg, projectsSvg, osSvg, langsSvg, codingSvg]) {
      expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
      expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(fetchesAfterDump);
  });
});
