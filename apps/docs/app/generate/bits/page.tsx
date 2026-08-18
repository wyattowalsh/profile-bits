import type { Metadata } from "next";
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

/** Theme through Divider. Names and hrefs only while samples are absent. */
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
    "v0 bit primitives: Theme, Frame, Stack, Row, Text, Muted, Stat, Bar, Chip, Avatar, Divider.",
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
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
[data-slot="generate-bits-link"] {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-fd-border);
  border-radius: 999px;
  background: var(--color-fd-muted);
  color: var(--color-fd-foreground);
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-decoration: none;
}
[data-slot="generate-bits-link"]:hover,
[data-slot="generate-bits-link"]:focus-visible {
  background: var(--color-fd-accent);
  color: var(--color-fd-accent-foreground);
}
[data-slot="generate-bits-link"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
`;

/** `/generate/bits` — v0 bit index. No extra plugins. */
export default function GenerateBitsPage() {
  const entries = bitEntries();

  return (
    <nav
      data-slot="generate-bits"
      data-href={BITS_HREF}
      aria-labelledby="generate-bits-heading"
    >
      <style href="profile-bits-generate-bits" precedence="default">
        {BITS_INDEX_CSS}
      </style>
      <h2 data-slot="generate-bits-heading" id="generate-bits-heading">
        Bits
      </h2>
      <p data-slot="generate-bits-lede">
        v0 primitives for the <code>github</code> pack. Card size is 480×160.
      </p>
      <ul data-slot="generate-bits-list">
        {entries.map((entry) => (
          <li key={entry.id} data-bit={entry.id}>
            <a data-slot="generate-bits-link" href={entry.href}>
              {entry.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
