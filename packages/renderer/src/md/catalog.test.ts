import { describe, expect, it } from "vitest";
import { ACTION_MD_PIPELINE } from "../../../core/src/md-action-policy.js";
import { ACTION_MD_PLUGINS } from "./catalog.js";

describe("ACTION_MD_PLUGINS", () => {
  it("npm fields equal ACTION_MD_PIPELINE in order", () => {
    expect(ACTION_MD_PLUGINS).toHaveLength(5);
    expect(ACTION_MD_PLUGINS.map((plugin) => plugin.npm)).toEqual([
      ...ACTION_MD_PIPELINE,
    ]);
  });

  it("serialized catalog omits mermaid, shiki, katex, and @mdx-js", () => {
    const serialized = JSON.stringify(
      ACTION_MD_PLUGINS.map(({ name, npm }) => ({ name, npm })),
    );
    expect(serialized).not.toContain("mermaid");
    expect(serialized).not.toContain("shiki");
    expect(serialized).not.toContain("katex");
    expect(serialized).not.toContain("@mdx-js");
  });
});
