import type { Metadata } from "next";
import { BitIsolator } from "@/src/generate/bit-isolator";
import { CARD_HEIGHT, CARD_WIDTH } from "@/src/generate/constants";
import { GENERATE_PATH_PREFIX } from "@/src/preview/permalink";
import { PREVIEW_BIT_IDS, type PreviewBitName } from "@/src/preview/types";

/** v0 bit export names from T309. No bit-package import. */
export const BIT_IDS = PREVIEW_BIT_IDS;

export const BITS_HREF = `${GENERATE_PATH_PREFIX}/bits`;

export type BitEntry = {
  id: (typeof PREVIEW_BIT_IDS)[number];
  href: string;
  name: PreviewBitName;
};

export function bitHref(bit: (typeof PREVIEW_BIT_IDS)[number]): string {
  return `${BITS_HREF}/${bit}`;
}

/** Theme through Time. Each entry is a 480×160 sample, not a name-only pill. */
export function bitEntries(): BitEntry[] {
  return BIT_IDS.map((bit) => ({
    id: bit,
    href: bitHref(bit),
    name: bit,
  }));
}

export const metadata: Metadata = {
  title: "Bits",
  description:
    "Bit primitives with 480×160 samples: Theme, Frame, Stack, Row, Text, Muted, Stat, Bar, Chip, Avatar, Divider, Image, Heatmap, Board, Icon, Grid, List, Time.",
};

const BITS_INDEX_CSS = `
[data-slot="generate-bits"] {
  display: grid;
  gap: 0.75rem;
}
[data-slot="generate-bits-heading"] {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
}
[data-slot="generate-bits-lede"] {
  margin: 0;
  color: var(--color-fd-muted-foreground);
  font-size: 0.875rem;
}
[data-slot="generate-bits-list"] {
  display: grid;
  gap: 1.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
[data-slot="generate-bits-item"] {
  display: grid;
  gap: 0.5rem;
}
[data-slot="generate-bits-link"] {
  font-weight: 600;
  color: var(--color-fd-foreground);
  text-decoration: none;
}
[data-slot="generate-bits-link"]:hover,
[data-slot="generate-bits-link"]:focus-visible {
  text-decoration: underline;
}
[data-slot="generate-bits-link"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
[data-slot="generate-bits-sample"] {
  display: grid;
}
[data-slot="bit-stage"] {
  box-sizing: border-box;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  margin: 0;
  display: grid;
  place-items: center;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-muted);
  overflow: hidden;
  position: relative;
}
[data-slot="bit-stage"] img,
[data-slot="bit-stage"] [data-slot="skeleton"] {
  display: block;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  max-width: none;
  animation: none;
}
[data-slot="bit-stage"] figcaption {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
@media (prefers-reduced-motion: reduce) {
  [data-slot="bit-stage"] img {
    animation: none;
  }
}
`;

/** `/generate/bits` — Frozen 11 plus README-card samples. No extra plugins. */
export default function GenerateBitsPage() {
  const entries = bitEntries();

  return (
    <nav
      data-slot="generate-bits"
      data-href={BITS_HREF}
      data-samples="true"
      aria-labelledby="generate-bits-heading"
    >
      <style href="profile-bits-generate-bits" precedence="default">
        {BITS_INDEX_CSS}
      </style>
      <h2 data-slot="generate-bits-heading" id="generate-bits-heading">
        Bits
      </h2>
      <p data-slot="generate-bits-lede">
        v0 primitives for the <code>github</code> pack plus README-card bits
        Image, Heatmap, Board, Icon, Grid, List, and Time. Each bit is a{" "}
        {CARD_WIDTH}×{CARD_HEIGHT} sample, not a names-only index.
      </p>
      <ul data-slot="generate-bits-list">
        {entries.map((entry) => (
          <li key={entry.id} data-bit={entry.id} data-slot="generate-bits-item">
            <a data-slot="generate-bits-link" href={entry.href}>
              {entry.name}
            </a>
            <div data-slot="generate-bits-sample">
              <BitIsolator bit={entry.id} />
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}
