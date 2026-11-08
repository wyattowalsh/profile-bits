import { BIT_EXPORTS } from "@profile-bits/bits";
import {
  LEETCODE_PACK_DEFAULT_WIDGETS,
  WIDGET_INTEGRATIONS,
} from "@profile-bits/core";
import { describe, expect, it } from "vitest";
import {
  deriveIntegrationUnion,
  LEETCODE_BITS_USED,
  leetcodePlugin,
} from "./plugin.js";

describe("leetcodePlugin pack registry", () => {
  it("registers solved and opt-in heatmap", () => {
    expect(leetcodePlugin.id).toBe("leetcode");
    expect(leetcodePlugin.widgets).toEqual(["solved", "heatmap"]);
    expect(leetcodePlugin.integrations).toEqual(["leetcode"]);
    expect(leetcodePlugin.defaults.widgets).toEqual(["solved"]);
    expect(leetcodePlugin.defaults.widgets).toEqual([
      ...LEETCODE_PACK_DEFAULT_WIDGETS,
    ]);
    expect(leetcodePlugin.defaults.widgets).not.toContain("heatmap");
    expect(leetcodePlugin.docsPath).toBe("leetcode");
    expect(leetcodePlugin.bitsUsed).toEqual(LEETCODE_BITS_USED);
    expect(leetcodePlugin.bitsUsed).toContain("Stat");
    expect(leetcodePlugin.bitsUsed).toContain("Heatmap");
    expect(leetcodePlugin.integrations).toEqual(
      deriveIntegrationUnion(WIDGET_INTEGRATIONS, leetcodePlugin.widgets),
    );
    for (const name of leetcodePlugin.bitsUsed) {
      expect(BIT_EXPORTS).toContain(name);
    }
  });
});
