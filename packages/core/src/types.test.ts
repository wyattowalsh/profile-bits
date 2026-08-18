import { describe, expect, it } from "vitest";
import {
  CARD_HEIGHT,
  CARD_SIZE,
  CARD_WIDTH,
  ConfigSchema,
  DemoOptionsSchema,
  DiscoverSourceInputSchema,
  DiscoverSourceResultSchema,
  LanguagesOptionsSchema,
  SOURCE_KINDS,
  SourceKindSchema,
  StatsOptionsSchema,
  WidgetIdentitySchema,
} from "./types.js";

const WIDGET_IDENTITY = {
  id: "stats" as const,
  title: "Stats",
  description: "GitHub stats",
  integrations: ["github"] as const,
  size: CARD_SIZE,
  formats: ["svg"] as const,
};

describe("SourceKindSchema", () => {
  it.each([...SOURCE_KINDS])("parses kind %s", (kind) => {
    expect(SourceKindSchema.parse(kind)).toBe(kind);
  });

  it("rejects unknown kinds", () => {
    for (const kind of ["tsx", "jsx", "markdown", "vue", "", "css"]) {
      const result = SourceKindSchema.safeParse(kind);
      expect(result.success).toBe(false);
    }
  });
});

describe("DiscoverSourceInputSchema", () => {
  it("parses an empty object (all fields optional)", () => {
    expect(DiscoverSourceInputSchema.parse({})).toEqual({});
  });

  it("parses optional string fields", () => {
    expect(
      DiscoverSourceInputSchema.parse({
        path: "packages/plugins/src/github/widgets/stats/widget.tsx",
        filename: "widget.tsx",
        mime: "text/tsx",
        body: "export function Widget() { return null; }",
      }),
    ).toEqual({
      path: "packages/plugins/src/github/widgets/stats/widget.tsx",
      filename: "widget.tsx",
      mime: "text/tsx",
      body: "export function Widget() { return null; }",
    });
  });

  it("rejects extra keys", () => {
    expect(
      DiscoverSourceInputSchema.safeParse({ source: "react" }).success,
    ).toBe(false);
  });

  it("rejects non-string field values", () => {
    expect(DiscoverSourceInputSchema.safeParse({ path: 1 }).success).toBe(
      false,
    );
    expect(
      DiscoverSourceInputSchema.safeParse({ filename: true }).success,
    ).toBe(false);
  });
});

describe("DiscoverSourceResultSchema", () => {
  it.each([...SOURCE_KINDS])("parses kind %s without promotion", (kind) => {
    expect(DiscoverSourceResultSchema.parse({ kind })).toEqual({ kind });
  });

  it("parses mdx promoted from md", () => {
    expect(
      DiscoverSourceResultSchema.parse({
        kind: "mdx",
        promotedFrom: "md",
      }),
    ).toEqual({
      kind: "mdx",
      promotedFrom: "md",
    });
  });

  it("rejects unknown kinds", () => {
    expect(DiscoverSourceResultSchema.safeParse({ kind: "tsx" }).success).toBe(
      false,
    );
  });

  it("rejects promotedFrom values other than md", () => {
    expect(
      DiscoverSourceResultSchema.safeParse({
        kind: "mdx",
        promotedFrom: "mdx",
      }).success,
    ).toBe(false);
    expect(
      DiscoverSourceResultSchema.safeParse({
        kind: "react",
        promotedFrom: "html",
      }).success,
    ).toBe(false);
  });

  it("rejects extra keys", () => {
    expect(
      DiscoverSourceResultSchema.safeParse({
        kind: "md",
        reason: "sniff",
      }).success,
    ).toBe(false);
  });
});

describe("WidgetIdentitySchema source", () => {
  it("omits source when absent", () => {
    expect(WidgetIdentitySchema.parse(WIDGET_IDENTITY)).toEqual({
      ...WIDGET_IDENTITY,
      size: { width: CARD_WIDTH, height: CARD_HEIGHT },
    });
  });

  it.each([...SOURCE_KINDS])("parses optional source %s", (source) => {
    expect(WidgetIdentitySchema.parse({ ...WIDGET_IDENTITY, source })).toEqual({
      ...WIDGET_IDENTITY,
      size: { width: CARD_WIDTH, height: CARD_HEIGHT },
      source,
    });
  });

  it("rejects unknown source kinds", () => {
    expect(
      WidgetIdentitySchema.safeParse({
        ...WIDGET_IDENTITY,
        source: "tsx",
      }).success,
    ).toBe(false);
  });
});

describe("yaml option schemas stay additionalProperties-false", () => {
  it("rejects source on demo/stats/languages options", () => {
    expect(DemoOptionsSchema.safeParse({ source: "md" }).success).toBe(false);
    expect(StatsOptionsSchema.safeParse({ source: "react" }).success).toBe(
      false,
    );
    expect(LanguagesOptionsSchema.safeParse({ source: "html" }).success).toBe(
      false,
    );
  });

  it("rejects source on yaml config", () => {
    expect(
      ConfigSchema.safeParse({
        version: 1,
        plugins: { github: { widgets: { stats: { source: "react" } } } },
      }).success,
    ).toBe(false);
  });
});
