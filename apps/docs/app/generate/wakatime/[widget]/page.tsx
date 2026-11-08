import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_GENERATE_REQUEST } from "@/src/generate/constants";
import {
  isPreviewWakatimeWidgetId,
  PREVIEW_WAKATIME_WIDGET_IDS,
  type PreviewPluginId,
  type PreviewRequest,
  type PreviewWakatimeWidgetId,
} from "@/src/preview/types";

export const dynamicParams = false;

export const WAKATIME_PLUGIN_ID = "wakatime" as const satisfies PreviewPluginId;

type GenerateWakatimeWidgetPageProps = {
  params: Promise<{ widget: string }>;
};

export function generateStaticParams(): { widget: PreviewWakatimeWidgetId }[] {
  return PREVIEW_WAKATIME_WIDGET_IDS.map((widget) => ({ widget }));
}

export function wakatimeWidgetRequest(
  widget: PreviewWakatimeWidgetId,
): PreviewRequest {
  return {
    ...DEFAULT_GENERATE_REQUEST,
    scope: "widget",
    plugin: WAKATIME_PLUGIN_ID,
    widget,
  };
}

export async function generateMetadata({
  params,
}: GenerateWakatimeWidgetPageProps): Promise<Metadata> {
  const { widget } = await params;
  if (!isPreviewWakatimeWidgetId(widget)) {
    return { title: "Generate" };
  }
  return {
    title: `Generate · ${WAKATIME_PLUGIN_ID} · ${widget}`,
    description: `Visual generator for the ${WAKATIME_PLUGIN_ID} ${widget} widget. Download or share a 480×160 card.`,
  };
}

/** `/generate/wakatime/[widget]` — coding only. Visual generator, not codegen. */
export default async function GenerateWakatimeWidgetPage({
  params,
}: GenerateWakatimeWidgetPageProps) {
  const { widget } = await params;
  if (!isPreviewWakatimeWidgetId(widget)) {
    notFound();
  }

  return (
    <section
      data-slot="generate-widget"
      data-plugin={WAKATIME_PLUGIN_ID}
      data-widget={widget}
    >
      <h2>{widget}</h2>
      <p>
        Visual generator for the <code>{WAKATIME_PLUGIN_ID}</code>{" "}
        <code>{widget}</code> widget. Card size is 480×160.
      </p>
    </section>
  );
}
