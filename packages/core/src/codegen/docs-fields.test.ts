import { NAMED_THEME_IDS } from "@profile-bits/themes";
import { describe, expect, it } from "vitest";
import {
  ChipsOptionsSchema,
  CONFIG_THEME_DEFAULT,
  FeedOptionsSchema,
  FIRST_PARTY_WIDGET_IDS,
  JsonOptionsSchema,
  THEMES,
} from "../types.ts";
import { CodingOptionsSchema } from "../wakatime-schema.ts";
import { getPlaygroundFields } from "./docs-fields.ts";

const TOKEN_FIELD = /token/i;

function optionPaths(
  group: "coding" | "feed" | "json" | "chips",
  schema: { shape: Record<string, unknown> },
): string[] {
  return Object.keys(schema.shape)
    .filter((key) => !TOKEN_FIELD.test(key))
    .map((key) => `${group}.${key}`);
}

describe("getPlaygroundFields", () => {
  it("omits token fields and flattened Action inputs", () => {
    const fields = getPlaygroundFields();
    const paths = fields.map((field) => field.path);

    expect(paths.some((path) => TOKEN_FIELD.test(path))).toBe(false);
    expect(paths).not.toContain("github_token");
    expect(paths).not.toContain("committer_token");
    expect(paths).not.toContain("wakatime_token");
    expect(paths).not.toContain("http_token");
    expect(paths).not.toContain("http_token_env");
    expect(
      paths.some((path) => /^plugin_[a-z0-9]+_[a-z0-9_]+$/.test(path)),
    ).toBe(false);
    expect(JSON.parse(JSON.stringify(fields))).toEqual(fields);
  });

  it("adds coding, feed, json, and chips groups from Zod option schemas", () => {
    const fields = getPlaygroundFields();
    const paths = fields.map((field) => field.path);
    const groups = new Set(fields.map((field) => field.group));

    const playgroundGroups = [...groups]
      .filter((group) => group !== "global")
      .toSorted();
    expect([...FIRST_PARTY_WIDGET_IDS]).toEqual(
      expect.arrayContaining(playgroundGroups),
    );
    expect(playgroundGroups).toEqual(
      [
        "chips",
        "coding",
        "demo",
        "feed",
        "json",
        "languages",
        "repo",
        "stats",
      ].toSorted(),
    );
    expect(groups.has("coding")).toBe(true);
    expect(groups.has("feed")).toBe(true);
    expect(groups.has("json")).toBe(true);
    expect(groups.has("chips")).toBe(true);
    expect(paths.filter((path) => path.startsWith("coding."))).toEqual(
      optionPaths("coding", CodingOptionsSchema),
    );
    expect(paths.filter((path) => path.startsWith("feed."))).toEqual(
      optionPaths("feed", FeedOptionsSchema),
    );
    expect(paths.filter((path) => path.startsWith("json."))).toEqual(
      optionPaths("json", JsonOptionsSchema),
    );
    expect(paths.filter((path) => path.startsWith("chips."))).toEqual(
      optionPaths("chips", ChipsOptionsSchema),
    );
  });

  it("emits named theme ids as the playground theme enum", () => {
    const fields = getPlaygroundFields();
    const theme = fields.find((field) => field.path === "theme");
    const paths = fields.map((field) => field.path);

    expect(theme).toEqual({
      path: "theme",
      label: "Theme",
      type: "string",
      default: CONFIG_THEME_DEFAULT,
      enum: [...THEMES],
      group: "global",
    });
    expect(theme?.enum).toEqual([...NAMED_THEME_IDS]);
    expect(theme?.enum).not.toContain("custom");
    expect(theme?.enum).not.toContain("radical");
    expect(paths.some((path) => path.startsWith("theme."))).toBe(false);
    expect(paths.some((path) => path.includes("custom"))).toBe(false);
    expect(
      paths.some((path) => /^plugin_[a-z0-9]+_[a-z0-9_]+$/.test(path)),
    ).toBe(false);
    expect(paths.some((path) => /color/i.test(path))).toBe(false);
  });

  it("is a stable JSON snapshot", () => {
    expect(getPlaygroundFields()).toMatchSnapshot();
  });
});
