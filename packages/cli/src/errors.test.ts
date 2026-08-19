import { describe, expect, it } from "vitest";
import {
  CliExitError,
  EXIT_USAGE,
  isCliExitError,
  isEpipeError,
} from "./errors.ts";

describe("errors", () => {
  it("treats CliExitError as usage when constructed with exit 2", () => {
    const error = new CliExitError(EXIT_USAGE);
    expect(isCliExitError(error)).toBe(true);
    expect(error.exitCode).toBe(2);
  });

  it("detects EPIPE errors", () => {
    const error = Object.assign(new Error("broken pipe"), { code: "EPIPE" });
    expect(isEpipeError(error)).toBe(true);
    expect(isEpipeError(new Error("nope"))).toBe(false);
  });
});
