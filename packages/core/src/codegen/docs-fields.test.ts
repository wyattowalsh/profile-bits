import { describe, expect, it } from "vitest";
import { getPlaygroundFields } from "./docs-fields.ts";

describe("getPlaygroundFields", () => {
  it("omits token fields and covers demo, stats, and languages", () => {
    const fields = getPlaygroundFields();
    const paths = fields.map((field) => field.path);
    const groups = new Set(fields.map((field) => field.group));

    expect(paths.some((path) => /token/i.test(path))).toBe(false);
    expect(paths).not.toContain("github_token");
    expect(paths).not.toContain("committer_token");
    expect(
      paths.some((path) => /^plugin_[a-z0-9]+_[a-z0-9_]+$/.test(path)),
    ).toBe(false);
    expect(groups.has("demo")).toBe(true);
    expect(groups.has("stats")).toBe(true);
    expect(groups.has("languages")).toBe(true);
    expect(groups.has("coding")).toBe(false);
    expect(groups.has("feed")).toBe(false);
    expect(paths).not.toContain("wakatime_token");
    expect(paths.some((path) => path.startsWith("coding."))).toBe(false);
    expect(paths.some((path) => path.startsWith("feed."))).toBe(false);
    expect(JSON.parse(JSON.stringify(fields))).toEqual(fields);
  });

  it("is a stable JSON snapshot", () => {
    expect(getPlaygroundFields()).toMatchSnapshot();
  });
});
