import type { Metadata } from "next";
import { PlaygroundShell } from "@/src/codegen/shell";
import { PREVIEW_WAKATIME_WIDGET_IDS } from "@/src/preview/types";

/** Canonical codegen playground for the wakatime pack. */
export const WAKATIME_PLAYGROUND_PLUGIN = "wakatime" as const;

export const WAKATIME_PLAYGROUND_HREF = `/playground/${WAKATIME_PLAYGROUND_PLUGIN}`;

/** PlaygroundShell is mounted by `app/playground/layout.tsx` (Suspense). */
export const WAKATIME_PLAYGROUND_SHELL = PlaygroundShell;

export const WAKATIME_WIDGET_IDS = PREVIEW_WAKATIME_WIDGET_IDS;

export const PRIMARY_CTA = "Copy";

export const metadata: Metadata = {
  title: "Playground · wakatime",
  description:
    "Codegen playground for the wakatime pack (coding). Primary action is Copy.",
};

/**
 * Canonical `/playground/wakatime` pack route.
 * Chrome is PlaygroundShell from the playground layout. coding only.
 */
export default function WakatimePlaygroundPage() {
  return (
    <section
      data-slot="playground-wakatime-page"
      data-plugin={WAKATIME_PLAYGROUND_PLUGIN}
      data-href={WAKATIME_PLAYGROUND_HREF}
      data-primary-cta={PRIMARY_CTA}
    >
      <p>
        Canonical {WAKATIME_PLAYGROUND_HREF} codegen playground for the{" "}
        <code>{WAKATIME_PLAYGROUND_PLUGIN}</code> pack. Widgets{" "}
        {WAKATIME_WIDGET_IDS.map((id) => (
          <code key={id}>{id}</code>
        ))}
        . Primary CTA is {PRIMARY_CTA}.
      </p>
    </section>
  );
}
