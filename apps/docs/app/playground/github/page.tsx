import type { Metadata } from "next";
import { PLAYGROUND_PLUGIN } from "@/src/codegen/constants";
import { PlaygroundShell } from "@/src/codegen/shell";
import { PREVIEW_WIDGET_IDS } from "@/src/preview/types";

/** Canonical codegen playground for the v0 github pack. */
export const GITHUB_PLAYGROUND_HREF = `/playground/${PLAYGROUND_PLUGIN}`;

/** PlaygroundShell is mounted by `app/playground/layout.tsx` (Suspense). */
export const GITHUB_PLAYGROUND_SHELL = PlaygroundShell;

export const GITHUB_WIDGET_IDS = PREVIEW_WIDGET_IDS;

export const PRIMARY_CTA = "Copy";

export const metadata: Metadata = {
  title: "Playground · github",
  description:
    "Codegen playground for the github pack (demo, stats, languages). Primary action is Copy.",
};

/**
 * Canonical `/playground/github` pack route.
 * Chrome is PlaygroundShell from the playground layout. v0 widgets only.
 */
export default function GitHubPlaygroundPage() {
  return (
    <section
      data-slot="playground-github-page"
      data-plugin={PLAYGROUND_PLUGIN}
      data-href={GITHUB_PLAYGROUND_HREF}
      data-primary-cta={PRIMARY_CTA}
    >
      <p>
        Canonical {GITHUB_PLAYGROUND_HREF} codegen playground for the{" "}
        <code>{PLAYGROUND_PLUGIN}</code> pack. Widgets{" "}
        {GITHUB_WIDGET_IDS.map((id) => (
          <code key={id}>{id}</code>
        ))}
        . Primary CTA is {PRIMARY_CTA}.
      </p>
    </section>
  );
}
