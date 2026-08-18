import { describe, expect, it } from "vitest";
import {
  assertSafeYamlHeaders,
  isForbiddenHeaderName,
  isForbiddenHeaderValue,
} from "./headers.js";

describe("forbidden yaml headers", () => {
  it.each([
    "Authorization",
    "Cookie",
    "Set-Cookie",
    "Proxy-Authorization",
    "X-Api-Token",
    "access_token",
  ])("rejects name %s", (name) => {
    expect(isForbiddenHeaderName(name)).toBe(true);
    expect(() => assertSafeYamlHeaders({ [name]: "x" })).toThrow(
      /forbidden header/,
    );
  });

  it.each(["Bearer abc", "token abc", "Basic YWJj", "bearer abc"])(
    "rejects value %s",
    (value) => {
      expect(isForbiddenHeaderValue(value)).toBe(true);
      expect(() => assertSafeYamlHeaders({ Accept: value })).toThrow(
        /forbidden header/,
      );
    },
  );

  it("allows Accept application/json", () => {
    expect(() =>
      assertSafeYamlHeaders({ Accept: "application/json" }),
    ).not.toThrow();
  });
});
