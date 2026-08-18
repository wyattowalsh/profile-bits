import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FIXTURE_PILL_LABEL,
  FixturePill,
  fixturePillLabel,
  isVisibleFixtureProvenance,
  VISIBLE_FIXTURE_PROVENANCES,
  type VisibleFixtureProvenance,
} from "./fixture-pill";
import { PREVIEW_PROVENANCES, type PreviewProvenance } from "./types";

function renderPill(provenance: PreviewProvenance): string {
  return renderToStaticMarkup(createElement(FixturePill, { provenance }));
}

describe("isVisibleFixtureProvenance", () => {
  it("is true only for fixture and rate_limited", () => {
    expect(isVisibleFixtureProvenance("fixture")).toBe(true);
    expect(isVisibleFixtureProvenance("rate_limited")).toBe(true);
    expect(isVisibleFixtureProvenance("live")).toBe(false);
    expect(VISIBLE_FIXTURE_PROVENANCES).toEqual(["fixture", "rate_limited"]);
  });
});

describe("fixturePillLabel", () => {
  it("returns accessible status copy for each visible provenance", () => {
    expect(fixturePillLabel("fixture")).toBe("Using fixtures");
    expect(fixturePillLabel("rate_limited")).toBe("Rate limited — fixtures");
    expect(FIXTURE_PILL_LABEL.fixture).toBe("Using fixtures");
    expect(FIXTURE_PILL_LABEL.rate_limited).toBe("Rate limited — fixtures");
  });
});

describe("FixturePill", () => {
  it("renders a visible Badge for fixture provenance", () => {
    const html = renderPill("fixture");

    expect(html).toContain('data-slot="fixture-pill"');
    expect(html).toContain('data-provenance="fixture"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain("Using fixtures");
    expect(html).not.toContain("toast");
    expect(html).not.toContain("Rate limited — fixtures");
  });

  it("renders a visible Badge with a distinct label for rate_limited", () => {
    const html = renderPill("rate_limited");

    expect(html).toContain('data-slot="fixture-pill"');
    expect(html).toContain('data-provenance="rate_limited"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Rate limited — fixtures");
    expect(html).not.toContain("toast");
    expect(html).not.toContain("Using fixtures");
  });

  it("renders nothing for live provenance", () => {
    const html = renderPill("live");

    expect(html).toBe("");
    expect(html).not.toContain("Using fixtures");
    expect(html).not.toContain("Rate limited — fixtures");
    expect(html).not.toContain("toast");
    expect(html).not.toContain('data-slot="fixture-pill"');
  });

  it("covers every PreviewProvenance without a toast-only path", () => {
    const visible = new Set<string>(VISIBLE_FIXTURE_PROVENANCES);

    for (const provenance of PREVIEW_PROVENANCES) {
      const html = renderPill(provenance);
      if (visible.has(provenance)) {
        expect(html).toContain('data-slot="fixture-pill"');
        expect(html).toContain('role="status"');
        expect(html).toContain(
          FIXTURE_PILL_LABEL[provenance as VisibleFixtureProvenance],
        );
        expect(html.length).toBeGreaterThan(0);
      } else {
        expect(html).toBe("");
      }
    }
  });

  it("uses Badge from components/ui/badge and never toast", async () => {
    const source = await readFile(
      new URL("./fixture-pill.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('from "@/components/ui/badge"');
    expect(source).toContain("<Badge");
    expect(source).toContain('data-slot="fixture-pill"');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source.toLowerCase()).not.toContain("toast");
  });
});
