import { notFound } from "next/navigation";
import { PLAYGROUND_PLUGIN } from "@/src/codegen/constants";
import {
  isPreviewGithubWidgetId,
  PREVIEW_GITHUB_WIDGET_IDS,
  type PreviewGithubWidgetId,
} from "@/src/preview/types";

export const dynamicParams = false;

type GithubWidgetParams = {
  widget: string;
};

type GithubWidgetPageProps = {
  params: Promise<GithubWidgetParams>;
};

export const PRIMARY_CTA = "Copy";

/** Github widgets only. Do not dump the eight-id POST union onto this route. */
export function generateStaticParams(): Array<{
  widget: PreviewGithubWidgetId;
}> {
  return PREVIEW_GITHUB_WIDGET_IDS.map((widget) => ({ widget }));
}

/**
 * Widget-scoped `/playground/github/:widget` route.
 * PlaygroundShell is mounted by `app/playground/layout.tsx` (Suspense).
 */
export default async function GithubWidgetPlaygroundPage({
  params,
}: GithubWidgetPageProps) {
  const { widget } = await params;
  if (!isPreviewGithubWidgetId(widget)) {
    notFound();
  }

  return (
    <section
      data-slot="playground-github-widget"
      data-plugin={PLAYGROUND_PLUGIN}
      data-widget={widget}
      data-href={`/playground/${PLAYGROUND_PLUGIN}/${widget}`}
      data-primary-cta={PRIMARY_CTA}
    >
      <h2>{widget}</h2>
      <p>
        Canonical playground for the <code>{PLAYGROUND_PLUGIN}</code>{" "}
        <code>{widget}</code> widget. Primary CTA is {PRIMARY_CTA}.
      </p>
    </section>
  );
}
