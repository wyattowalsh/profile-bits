import type { Metadata } from "next";
import { PlaygroundShell } from "@/src/codegen/shell";
import { PREVIEW_RSS_WIDGET_IDS } from "@/src/preview/types";

/** Canonical codegen playground for the rss pack. */
export const RSS_PLAYGROUND_PLUGIN = "rss" as const;

export const RSS_PLAYGROUND_HREF = `/playground/${RSS_PLAYGROUND_PLUGIN}`;

/** PlaygroundShell is mounted by `app/playground/layout.tsx` (Suspense). */
export const RSS_PLAYGROUND_SHELL = PlaygroundShell;

export const RSS_WIDGET_IDS = PREVIEW_RSS_WIDGET_IDS;

export const PRIMARY_CTA = "Copy";

export const metadata: Metadata = {
  title: "Playground · rss",
  description:
    "Codegen playground for the rss pack (feed). Primary action is Copy.",
};

/**
 * Canonical `/playground/rss` pack route.
 * Chrome is PlaygroundShell from the playground layout. feed only.
 */
export default function RssPlaygroundPage() {
  return (
    <section
      data-slot="playground-rss-page"
      data-plugin={RSS_PLAYGROUND_PLUGIN}
      data-href={RSS_PLAYGROUND_HREF}
      data-primary-cta={PRIMARY_CTA}
    >
      <p>
        Canonical {RSS_PLAYGROUND_HREF} codegen playground for the{" "}
        <code>{RSS_PLAYGROUND_PLUGIN}</code> pack. Widgets{" "}
        {RSS_WIDGET_IDS.map((id) => (
          <code key={id}>{id}</code>
        ))}
        . Primary CTA is {PRIMARY_CTA}.
      </p>
    </section>
  );
}
