import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_GENERATE_REQUEST } from "@/src/generate/constants";
import {
  isPreviewRssWidgetId,
  PREVIEW_RSS_WIDGET_IDS,
  type PreviewPluginId,
  type PreviewRequest,
  type PreviewRssWidgetId,
} from "@/src/preview/types";

export const dynamicParams = false;

export const RSS_PLUGIN_ID = "rss" as const satisfies PreviewPluginId;

type GenerateRssWidgetPageProps = {
  params: Promise<{ widget: string }>;
};

export function generateStaticParams(): { widget: PreviewRssWidgetId }[] {
  return PREVIEW_RSS_WIDGET_IDS.map((widget) => ({ widget }));
}

export function rssWidgetRequest(widget: PreviewRssWidgetId): PreviewRequest {
  return {
    ...DEFAULT_GENERATE_REQUEST,
    scope: "widget",
    plugin: RSS_PLUGIN_ID,
    widget,
  };
}

export async function generateMetadata({
  params,
}: GenerateRssWidgetPageProps): Promise<Metadata> {
  const { widget } = await params;
  if (!isPreviewRssWidgetId(widget)) {
    return { title: "Generate" };
  }
  return {
    title: `Generate · ${RSS_PLUGIN_ID} · ${widget}`,
    description: `Visual generator for the ${RSS_PLUGIN_ID} ${widget} widget. Download or share a 480×160 card.`,
  };
}

/** `/generate/rss/[widget]` — feed only. Visual generator, not codegen. */
export default async function GenerateRssWidgetPage({
  params,
}: GenerateRssWidgetPageProps) {
  const { widget } = await params;
  if (!isPreviewRssWidgetId(widget)) {
    notFound();
  }

  return (
    <section
      data-slot="generate-widget"
      data-plugin={RSS_PLUGIN_ID}
      data-widget={widget}
    >
      <h2>{widget}</h2>
      <p>
        Visual generator for the <code>{RSS_PLUGIN_ID}</code>{" "}
        <code>{widget}</code> widget. Card size is 480×160.
      </p>
    </section>
  );
}
