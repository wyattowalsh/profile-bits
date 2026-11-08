import { notFound } from "next/navigation";
import {
  isPreviewHttpWidgetId,
  PREVIEW_HTTP_WIDGET_IDS,
  type PreviewHttpWidgetId,
} from "@/src/preview/types";

export const dynamicParams = false;

const HTTP_PLAYGROUND_PLUGIN = "http" as const;

type HttpWidgetParams = {
  widget: string;
};

type HttpWidgetPageProps = {
  params: Promise<HttpWidgetParams>;
};

export const PRIMARY_CTA = "Copy";

/** Http widgets only. Do not dump the eight-id POST union onto this route. */
export function generateStaticParams(): Array<{
  widget: PreviewHttpWidgetId;
}> {
  return PREVIEW_HTTP_WIDGET_IDS.map((widget) => ({ widget }));
}

/**
 * Widget-scoped `/playground/http/:widget` route.
 * PlaygroundShell is mounted by `app/playground/layout.tsx` (Suspense).
 */
export default async function HttpWidgetPlaygroundPage({
  params,
}: HttpWidgetPageProps) {
  const { widget } = await params;
  if (!isPreviewHttpWidgetId(widget)) {
    notFound();
  }

  return (
    <section
      data-slot="playground-http-widget"
      data-plugin={HTTP_PLAYGROUND_PLUGIN}
      data-widget={widget}
      data-href={`/playground/${HTTP_PLAYGROUND_PLUGIN}/${widget}`}
      data-primary-cta={PRIMARY_CTA}
    >
      <h2>{widget}</h2>
      <p>
        Canonical playground for the <code>{HTTP_PLAYGROUND_PLUGIN}</code>{" "}
        <code>{widget}</code> widget. Primary CTA is {PRIMARY_CTA}.
      </p>
    </section>
  );
}
