import { describe, expect, it } from "vitest";
import {
  ACTION_FORBIDDEN_MD_NPM,
  ACTION_MD_PIPELINE,
  ActionMdPolicyError,
  assertActionMdPackage,
  isActionForbiddenMdPackage,
  isActionMdPipelineId,
} from "./md-action-policy.js";

describe("md-action-policy", () => {
  it("allows the GFM Action pipeline ids", () => {
    expect(ACTION_MD_PIPELINE).toEqual([
      "remark-parse",
      "remark-gfm",
      "remark-rehype",
      "rehype-sanitize",
      "rehype-stringify",
    ]);
    for (const id of ACTION_MD_PIPELINE) {
      expect(isActionMdPipelineId(id)).toBe(true);
      expect(isActionForbiddenMdPackage(id)).toBe(false);
    }
  });

  it("rejects mermaid, shiki, katex, and MDX packages", () => {
    expect(ACTION_FORBIDDEN_MD_NPM).toContain("mermaid");
    expect(ACTION_FORBIDDEN_MD_NPM).toContain("shiki");
    expect(ACTION_FORBIDDEN_MD_NPM).toContain("katex");
    expect(ACTION_FORBIDDEN_MD_NPM).toContain("@mdx-js/mdx");
    expect(() => assertActionMdPackage("rehype-mermaid")).toThrow(
      ActionMdPolicyError,
    );
    expect(() => assertActionMdPackage("remark-gfm")).not.toThrow();
  });
});
