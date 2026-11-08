import { describe, expect, it } from "vitest";
import { readJsonDump } from "./index.js";
import {
  formatJsonRows,
  isEmptyJsonResult,
  JSON_KEY_MAX_CHARS,
  JSON_MAX_OBJECT_ROWS,
  JSON_VALUE_MAX_CHARS,
  JsonJmesError,
  searchJson,
} from "./jmes.js";

describe("json widget jmespath reader", () => {
  it("does not drop dump keys when searching a nested path", () => {
    const dump = {
      hostname: "example.com",
      items: [{ name: "a" }, { name: "b" }],
      extra: { keep: true },
      unused: "still here",
    };
    const snapshot = {
      hostname: "example.com",
      items: [{ name: "a" }, { name: "b" }],
      extra: { keep: true },
      unused: "still here",
    };
    expect(readJsonDump(dump, "items")).toEqual([{ name: "a" }, { name: "b" }]);
    expect(searchJson(dump, "extra.keep")).toBe(true);
    expect(dump).toEqual(snapshot);
    expect(Object.keys(dump)).toEqual(["hostname", "items", "extra", "unused"]);
  });

  it("truncates object rows at render only", () => {
    const dump = {
      alpha: 1,
      bravo: 2,
      charlie: 3,
      delta: 4,
      echo: 5,
    };
    const rows = formatJsonRows(searchJson(dump, "@"));
    expect(Object.keys(dump)).toHaveLength(5);
    expect(rows).toHaveLength(JSON_MAX_OBJECT_ROWS);
    expect(rows).toEqual(["alpha  1", "bravo  2", "charlie  3"]);
    expect(dump).toMatchObject({ delta: 4, echo: 5 });
  });

  it("truncates long keys and values at render only", () => {
    const longKey = "abcdefghijklmnopqr";
    const longValue = "x".repeat(60);
    const dump = { [longKey]: longValue };
    const rows = formatJsonRows(dump);
    expect(longKey.length).toBeGreaterThan(JSON_KEY_MAX_CHARS);
    expect(longValue.length).toBeGreaterThan(JSON_VALUE_MAX_CHARS);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toBe(
      `${longKey.slice(0, JSON_KEY_MAX_CHARS - 1)}…  ${longValue.slice(0, JSON_VALUE_MAX_CHARS - 1)}…`,
    );
    expect(dump[longKey]).toBe(longValue);
  });

  it("treats null empty-string empty-array empty-object as empty and keeps 0 false", () => {
    expect(isEmptyJsonResult(searchJson(null, "@"))).toBe(true);
    expect(isEmptyJsonResult(searchJson("", "@"))).toBe(true);
    expect(isEmptyJsonResult(searchJson([], "@"))).toBe(true);
    expect(isEmptyJsonResult(searchJson({}, "@"))).toBe(true);
    expect(isEmptyJsonResult(searchJson(0, "@"))).toBe(false);
    expect(isEmptyJsonResult(searchJson(false, "@"))).toBe(false);
  });

  it("throws JsonJmesError on invalid expressions without mutating the dump", () => {
    const dump = { keep: true };
    expect(() => searchJson(dump, "[")).toThrow(JsonJmesError);
    expect(dump).toEqual({ keep: true });
  });
});
