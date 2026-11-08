import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_GENERATE_REQUEST } from "@/src/generate/constants";
import {
  isPreviewHttpWidgetId,
  PREVIEW_HTTP_WIDGET_IDS,
  type PreviewHttpWidgetId,
  type PreviewPluginId,
  type PreviewRequest,
} from "@/src/preview/types";

export const dynamicParams = false;

export const HTTP_PLUGIN_ID = "http" as const satisfies PreviewPluginId;

type GenerateHttpWidgetPageProps = {
  params: Promise<{ widget: string }>;
};

export function generateStaticParams(): { widget: PreviewHttpWidgetId }[] {
  return PREVIEW_HTTP_WIDGET_IDS.map((widget) => ({ widget }));
}

export function httpWidgetRequest(widget: PreviewHttpWidgetId): PreviewRequest {
  return {
    ...DEFAULT_GENERATE_REQUEST,
    scope: "widget",
    plugin: HTTP_PLUGIN_ID,
    widget,
  };
}

export async function generateMetadata({
  params,
}: GenerateHttpWidgetPageProps): Promise<Metadata> {
  const { widget } = await params;
  if (!isPreviewHttpWidgetId(widget)) {
    return { title: "Generate" };
  }
  return {
    title: `Generate · ${HTTP_PLUGIN_ID} · ${widget}`,
    description: `Visual generator for the ${HTTP_PLUGIN_ID} ${widget} widget. Download or share a 480×160 card.`,
  };
}

/** `/generate/http/[widget]` — json and chips. Visual generator, not codegen. */
export default async function GenerateHttpWidgetPage({
  params,
}: GenerateHttpWidgetPageProps) {
  const { widget } = await params;
  if (!isPreviewHttpWidgetId(widget)) {
    notFound();
  }

  return (
    <section
      data-slot="generate-widget"
      data-plugin={HTTP_PLUGIN_ID}
      data-widget={widget}
    >
      <h2>{widget}</h2>
      <p>
        Visual generator for the <code>{HTTP_PLUGIN_ID}</code>{" "}
        <code>{widget}</code> widget. Card size is 480×160.
      </p>
    </section>
  );
}
