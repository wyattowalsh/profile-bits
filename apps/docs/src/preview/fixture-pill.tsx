import { Badge } from "@/components/ui/badge";
import type { PreviewProvenance } from "./types";

export const VISIBLE_FIXTURE_PROVENANCES = ["fixture", "rate_limited"] as const;
export type VisibleFixtureProvenance =
  (typeof VISIBLE_FIXTURE_PROVENANCES)[number];

export const FIXTURE_PILL_LABEL = {
  fixture: "Using fixtures",
  rate_limited: "Rate limited — fixtures",
} as const satisfies Record<VisibleFixtureProvenance, string>;

const FIXTURE_PILL_CSS = `
[data-slot="fixture-pill"] {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.25rem;
  background: var(--color-fd-muted);
  color: var(--color-fd-muted-foreground);
  border: 1px solid var(--color-fd-border);
}
[data-slot="fixture-pill"][data-provenance="rate_limited"] {
  background: var(--color-fd-secondary);
  color: var(--color-fd-secondary-foreground);
}
`;

export function isVisibleFixtureProvenance(
  provenance: PreviewProvenance,
): provenance is VisibleFixtureProvenance {
  return provenance === "fixture" || provenance === "rate_limited";
}

export function fixturePillLabel(provenance: VisibleFixtureProvenance): string {
  return FIXTURE_PILL_LABEL[provenance];
}

export type FixturePillProps = {
  provenance: PreviewProvenance;
};

/**
 * Visible provenance Badge for fixture / rate-limited preview.
 * Live provenance renders nothing. Status text stays in the document.
 */
export function FixturePill({ provenance }: FixturePillProps) {
  if (!isVisibleFixtureProvenance(provenance)) {
    return null;
  }

  const label = fixturePillLabel(provenance);

  return (
    <>
      <style href="profile-bits-fixture-pill" precedence="default">
        {FIXTURE_PILL_CSS}
      </style>
      <Badge
        data-slot="fixture-pill"
        data-provenance={provenance}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {label}
      </Badge>
    </>
  );
}
