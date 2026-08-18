import { describe, expect, it } from "vitest";
import { DiscoverSourceError, discoverSource } from "./discover-source.js";

describe("discoverSource path / filename", () => {
  it.each([
    ["widget.tsx", "react"],
    ["widget.jsx", "react"],
    ["index.ts", "react"],
    ["render.js", "react"],
    ["source.mdx", "mdx"],
    ["widget.md", "md"],
    ["README.markdown", "md"],
    ["card.html", "html"],
    ["page.HTM", "html"],
  ] as const)("maps %s → %s", (filename, kind) => {
    expect(discoverSource({ filename })).toEqual({ kind });
  });

  it("is case-insensitive on path extensions", () => {
    expect(discoverSource({ path: "widgets/Demo.TSX" })).toEqual({
      kind: "react",
    });
  });
});

describe("discoverSource MIME", () => {
  it.each([
    ["text/jsx", "react"],
    ["text/tsx", "react"],
    ["application/javascript", "react"],
    ["text/mdx", "mdx"],
    ["text/markdown", "md"],
    ["text/html", "html"],
  ] as const)("maps %s → %s", (mime, kind) => {
    expect(discoverSource({ mime })).toEqual({ kind });
  });
});

describe("discoverSource content sniff", () => {
  it("sniffs react from ESM plus JSX", () => {
    expect(
      discoverSource({
        body: `import { Frame } from "@profile-bits/bits";\nexport function W() {\n  return (<Frame tw="w-full" />);\n}`,
      }),
    ).toEqual({ kind: "react" });
  });

  it("sniffs html from doctype", () => {
    expect(
      discoverSource({ body: "<!doctype html><html><body>hi</body></html>" }),
    ).toEqual({ kind: "html" });
  });

  it("sniffs md from headings", () => {
    expect(discoverSource({ body: "# Hello\n\nA card." })).toEqual({
      kind: "md",
    });
  });

  it("sniffs mdx from markdown plus JSX", () => {
    expect(
      discoverSource({
        body: "# Hello\n\n<Frame>hi</Frame>\n",
      }),
    ).toEqual({ kind: "mdx" });
  });
});

describe("discoverSource .md promotion", () => {
  it("promotes path md to mdx when sniff finds JSX", () => {
    expect(
      discoverSource({
        filename: "widget.md",
        body: '# Title\n\n<Stat label="Stars" value="12" />\n',
      }),
    ).toEqual({ kind: "mdx", promotedFrom: "md" });
  });

  it("promotes text/markdown to mdx", () => {
    expect(
      discoverSource({
        mime: "text/markdown",
        body: "Hello\n\nimport { Frame } from './x'\n",
      }),
    ).toEqual({ kind: "mdx", promotedFrom: "md" });
  });
});

describe("discoverSource conflicts", () => {
  it("fails when widget.md and widget.tsx both appear", () => {
    expect(() => discoverSource({ path: "widget.md widget.tsx" })).toThrow(
      DiscoverSourceError,
    );
    expect(() => discoverSource({ path: "widget.md widget.tsx" })).toThrow(
      /ambiguous widget entries/,
    );
  });

  it("fails when declared source mismatches discovered bytes", () => {
    expect(() =>
      discoverSource({ filename: "notes.md", body: "# hi\n" }, "react"),
    ).toThrow(/source mismatch: declared react, discovered md/);
  });

  it("fails when nothing can be discovered", () => {
    expect(() => discoverSource({})).toThrow(/could not discover source/);
  });
});
