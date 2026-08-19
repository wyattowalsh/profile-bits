import { describe, expect, it } from "vitest";
import {
  assertSafeYamlHeaders,
  buildHttpRequestHeaders,
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

describe("buildHttpRequestHeaders", () => {
  it("forwards allowed extras such as X-Ok", () => {
    expect(buildHttpRequestHeaders(undefined, { "X-Ok": "yes" })).toEqual({
      "X-Ok": "yes",
      Accept: "application/json",
      "User-Agent": "profile-bits-http/0",
    });
  });

  it("keeps required Accept and User-Agent when extras try to overwrite them", () => {
    const headers = buildHttpRequestHeaders(undefined, {
      Accept: "text/plain",
      "user-agent": "evil",
    });
    expect(headers.Accept).toBe("application/json");
    expect(headers["User-Agent"]).toBe("profile-bits-http/0");
    expect(headers["user-agent"]).toBeUndefined();
  });

  it("drops extra Authorization and Cookie", () => {
    const headers = buildHttpRequestHeaders(undefined, {
      Authorization: "Bearer evil",
      Cookie: "sid=1",
      "X-Ok": "yes",
    });
    expect(headers).toEqual({
      "X-Ok": "yes",
      Accept: "application/json",
      "User-Agent": "profile-bits-http/0",
    });
    expect(headers.Authorization).toBeUndefined();
    expect(headers.Cookie).toBeUndefined();
  });

  it("sets runtime Authorization after extras so yaml Authorization cannot win", () => {
    const headers = buildHttpRequestHeaders("Bearer real", {
      Authorization: "Bearer evil",
      Cookie: "sid=1",
    });
    expect(headers.Authorization).toBe("Bearer real");
    expect(headers.Cookie).toBeUndefined();
  });

  it("skips extras with forbidden names or credential-shaped values", () => {
    const headers = buildHttpRequestHeaders(undefined, {
      "X-Api-Token": "secret",
      "X-Ok": "Bearer abc",
      "X-Trace": "ok",
    });
    expect(headers["X-Api-Token"]).toBeUndefined();
    expect(headers["X-Ok"]).toBeUndefined();
    expect(headers["X-Trace"]).toBe("ok");
  });

  it("uses caller-supplied required Accept and User-Agent", () => {
    expect(
      buildHttpRequestHeaders(undefined, undefined, {
        accept: "application/vnd.example+json",
        userAgent: "example-agent/1",
      }),
    ).toEqual({
      Accept: "application/vnd.example+json",
      "User-Agent": "example-agent/1",
    });
  });
});
