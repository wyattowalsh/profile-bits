import type { Metadata } from "next";
import { PlaygroundShell } from "@/src/codegen/shell";
import { PREVIEW_HTTP_WIDGET_IDS } from "@/src/preview/types";

/** Canonical codegen playground for the http pack. */
export const HTTP_PLAYGROUND_PLUGIN = "http" as const;

export const HTTP_PLAYGROUND_HREF = `/playground/${HTTP_PLAYGROUND_PLUGIN}`;

/** PlaygroundShell is mounted by `app/playground/layout.tsx` (Suspense). */
export const HTTP_PLAYGROUND_SHELL = PlaygroundShell;

export const HTTP_PLAYGROUND_WIDGET_IDS = PREVIEW_HTTP_WIDGET_IDS;

export const HTTP_WIDGET_IDS = PREVIEW_HTTP_WIDGET_IDS;

export const PRIMARY_CTA = "Copy";

export const metadata: Metadata = {
  title: "Playground · http",
  description:
    "Codegen playground for the http pack (json, chips). Fixtures default. Primary action is Copy.",
};

/**
 * Canonical `/playground/http` pack route.
 * Chrome is PlaygroundShell from the playground layout (json + chips tuners).
 */
export default function HttpPlaygroundPage() {
  return (
    <section
      data-slot="playground-http-page"
      data-plugin={HTTP_PLAYGROUND_PLUGIN}
      data-href={HTTP_PLAYGROUND_HREF}
      data-primary-cta={PRIMARY_CTA}
    >
      <p>
        Canonical {HTTP_PLAYGROUND_HREF} codegen playground for the{" "}
        <code>{HTTP_PLAYGROUND_PLUGIN}</code> pack. Widgets{" "}
        {HTTP_WIDGET_IDS.map((id) => (
          <code key={id}>{id}</code>
        ))}
        . Primary CTA is {PRIMARY_CTA}.
      </p>
    </section>
  );
}
