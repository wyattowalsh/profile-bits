import { notFound } from "next/navigation";
import {
  isPreviewRssWidgetId,
  PREVIEW_RSS_WIDGET_IDS,
  type PreviewRssWidgetId,
} from "@/src/preview/types";

export const dynamicParams = false;

type RssWidgetParams = {
  widget: string;
};

type RssWidgetPageProps = {
  params: Promise<RssWidgetParams>;
};

export const PRIMARY_CTA = "Copy";

/** Rss widgets only. Do not dump the eight-id POST union onto this route. */
export function generateStaticParams(): Array<{
  widget: PreviewRssWidgetId;
}> {
  return PREVIEW_RSS_WIDGET_IDS.map((widget) => ({ widget }));
}

/**
 * Widget-scoped `/playground/rss/:widget` route.
 * PlaygroundShell is mounted by `app/playground/layout.tsx` (Suspense).
 */
export default async function RssWidgetPlaygroundPage({
  params,
}: RssWidgetPageProps) {
  const { widget } = await params;
  if (!isPreviewRssWidgetId(widget)) {
    notFound();
  }

  return (
    <section
      data-slot="playground-rss-widget"
      data-plugin="rss"
      data-widget={widget}
      data-href={`/playground/rss/${widget}`}
      data-primary-cta={PRIMARY_CTA}
    >
      <h2>{widget}</h2>
      <p>
        Canonical playground for the <code>rss</code> <code>{widget}</code>{" "}
        widget. Primary CTA is {PRIMARY_CTA}.
      </p>
    </section>
  );
}
