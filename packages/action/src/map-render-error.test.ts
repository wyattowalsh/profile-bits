import {
  GithubClientError,
  UnsafeApiDomainError,
  WakatimeClientError,
} from "@profile-bits/integrations";
import { TakumiRenderError, TakumiTreeError } from "@profile-bits/renderer";
import { describe, expect, it } from "vitest";
import { mapRenderError } from "./map-render-error.ts";
import { UnhandledGithubWidgetError } from "./render-github.ts";

describe("mapRenderError", () => {
  it("maps Takumi and fail_widget client errors", () => {
    expect(mapRenderError(new TakumiRenderError("empty Takumi tree"))).toEqual({
      outcome: "fail_widget",
    });
    expect(mapRenderError(new TakumiTreeError("empty Takumi tree"))).toEqual({
      outcome: "fail_widget",
    });
    expect(
      mapRenderError(
        new GithubClientError(
          "fail_widget",
          "include_private requires canPrivate",
        ),
      ),
    ).toEqual({ outcome: "fail_widget" });
    expect(mapRenderError(new Error("document is not defined"))).toEqual({
      outcome: "fail_widget",
    });
    expect(mapRenderError(new Error("document is not available"))).toEqual({
      outcome: "fail_widget",
    });
  });

  it("rethrows fail_run, fail_after_backoff, fail_job, Unhandled*, and unsafe domain", () => {
    const failRun = new GithubClientError("fail_run", "bad credentials");
    expect(() => mapRenderError(failRun)).toThrow(failRun);

    const wakaFailRun = new WakatimeClientError(
      "fail_run",
      "bad credentials",
      401,
    );
    expect(() => mapRenderError(wakaFailRun)).toThrow(wakaFailRun);

    const backoff = new GithubClientError("fail_after_backoff", "secondary");
    expect(() => mapRenderError(backoff)).toThrow(backoff);

    const failJob = new GithubClientError("fail_job", "missing token");
    expect(() => mapRenderError(failJob)).toThrow(failJob);

    const unhandled = new UnhandledGithubWidgetError("coding");
    expect(() => mapRenderError(unhandled)).toThrow(unhandled);

    const unsafe = new UnsafeApiDomainError("localhost");
    expect(() => mapRenderError(unsafe)).toThrow(unsafe);
  });

  it("does not remap unknown errors to fail_widget", () => {
    const boom = new Error("disk full");
    expect(() => mapRenderError(boom)).toThrow(boom);
  });

  it("does not remap unknown non-Error throws to fail_widget", () => {
    const boom = { reason: "disk full" };
    try {
      mapRenderError(boom);
      expect.unreachable();
    } catch (error: unknown) {
      expect(error).toBe(boom);
    }
  });
});
