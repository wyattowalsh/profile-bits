import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SourceDrop } from "./source-drop";

describe("SourceDrop", () => {
  it("is playground-only chrome that calls discoverSource", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./source-drop.tsx", import.meta.url), "utf8"),
    );
    expect(source).toContain("discoverSource");
    expect(source).toContain("@profile-bits/core");
    expect(source).toContain('data-slot="source-drop"');
    const html = renderToStaticMarkup(createElement(SourceDrop));
    expect(html).toContain('data-slot="source-drop"');
  });
});
