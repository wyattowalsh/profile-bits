import { describe, expect, it } from "vitest";
import { authorizationFromToken, authorizationHeaderValue } from "./auth.js";

describe("authorizationFromToken", () => {
  it("sends no Authorization when the token is unset", () => {
    expect(authorizationFromToken(undefined)).toEqual({ kind: "none" });
    expect(authorizationFromToken(null)).toEqual({ kind: "none" });
    expect(authorizationHeaderValue(authorizationFromToken(undefined))).toBe(
      undefined,
    );
  });

  it("marks empty or whitespace tokens as missing", () => {
    expect(authorizationFromToken("")).toEqual({ kind: "missing" });
    expect(authorizationFromToken("  \n")).toEqual({ kind: "missing" });
    expect(authorizationHeaderValue(authorizationFromToken(""))).toBe(
      undefined,
    );
  });

  it("prefixes Bearer when the value has no scheme", () => {
    expect(authorizationFromToken("secret-value")).toEqual({
      kind: "header",
      value: "Bearer secret-value",
    });
  });

  it.each(["Bearer abc", "token abc", "Basic YWJj", "bearer abc"])(
    "sends raw scheme value %s",
    (value) => {
      expect(authorizationFromToken(value)).toEqual({
        kind: "header",
        value,
      });
    },
  );
});
