import { describe, expect, it } from "vitest";
import { httpPlugin } from "./plugin.js";

describe("httpPlugin", () => {
  it("registers json and chips on the http pack", () => {
    expect(httpPlugin.id).toBe("http");
    expect(httpPlugin.widgets).toEqual(["json", "chips"]);
    expect(httpPlugin.integrations).toEqual(["http"]);
    expect(httpPlugin.defaults.widgets).toEqual(["json"]);
    expect(httpPlugin.docsPath).toBe("/playground/http");
    expect(httpPlugin.bitsUsed).toEqual([
      "Theme",
      "Frame",
      "Stack",
      "Row",
      "Text",
      "Muted",
      "Chip",
    ]);
  });
});
