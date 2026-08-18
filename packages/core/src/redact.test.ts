import { describe, expect, it } from "vitest";
import { redactSecrets } from "./redact.js";

describe("redactSecrets", () => {
  it("strips Authorization header values", () => {
    expect(redactSecrets("Authorization: Bearer super-secret failed")).toBe(
      "Authorization: [redacted] failed",
    );
  });

  it("strips named env secret values", () => {
    expect(
      redactSecrets("leaked super-secret from env", ["super-secret"]),
    ).toBe("leaked [redacted] from env");
  });

  it("strips token scheme values", () => {
    expect(redactSecrets("Authorization: token ghp_secret failed")).toBe(
      "Authorization: [redacted] failed",
    );
  });

  it("leaves unrelated errors unchanged", () => {
    expect(redactSecrets("https only")).toBe("https only");
  });
});
