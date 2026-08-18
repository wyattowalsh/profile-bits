import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BitIsolator, bitIsolatorRequest } from "@/src/generate/bit-isolator";
import { BIT_SAMPLE_IDS } from "@/src/generate/bit-samples";
import { CARD_HEIGHT, CARD_WIDTH } from "@/src/generate/constants";
import { GENERATE_PATH_PREFIX } from "@/src/preview/permalink";
import { isPreviewBitName } from "@/src/preview/types";

type V0BitName = (typeof BIT_SAMPLE_IDS)[number];

type BitPageParams = {
  bit: string;
};

type BitPageProps = {
  params: Promise<BitPageParams>;
};

export const dynamicParams = false;

export { bitIsolatorRequest };

const BIT_ISOLATOR_CSS = `
[data-slot="bit-isolator"] {
  display: grid;
  gap: 0.75rem;
}
[data-slot="bit-isolator"] h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
}
[data-slot="bit-isolator-lede"] {
  margin: 0;
  color: var(--color-fd-muted-foreground);
  font-size: 0.875rem;
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

/** `/generate/bits/[bit]` — v0 bit names from T315s samples. */
export function generateStaticParams(): { bit: V0BitName }[] {
  return BIT_SAMPLE_IDS.map((bit) => ({ bit }));
}

export async function generateMetadata({
  params,
}: BitPageProps): Promise<Metadata> {
  const { bit } = await params;
  return {
    title: bit,
    description: `${bit} bit isolator. Card size is ${CARD_WIDTH}×${CARD_HEIGHT}.`,
  };
}

/**
 * Staged primitive for one v0 bit. Samples come from T315s; the island POSTs
 * `/api/preview` with `scope: "bit"` so the Theme+Frame card can render.
 */
export default async function GenerateBitPage({ params }: BitPageProps) {
  const { bit } = await params;
  if (!isPreviewBitName(bit)) {
    notFound();
  }

  const request = bitIsolatorRequest(bit);

  return (
    <section
      data-slot="bit-isolator"
      data-bit={bit}
      data-card-width={CARD_WIDTH}
      data-card-height={CARD_HEIGHT}
    >
      <style href="profile-bits-bit-isolator" precedence="default">
        {BIT_ISOLATOR_CSS}
      </style>
      <h2>{bit}</h2>
      <p data-slot="bit-isolator-lede">
        Staged primitive for <code>{bit}</code>. Card size is {CARD_WIDTH}×
        {CARD_HEIGHT}. <a href={`${GENERATE_PATH_PREFIX}/bits`}>All bits</a>.
      </p>
      <BitIsolator bit={bit} request={request} />
    </section>
  );
}
