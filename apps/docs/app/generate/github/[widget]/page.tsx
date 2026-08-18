import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DEFAULT_GENERATE_REQUEST,
  GENERATE_PLUGIN_ID,
} from "@/src/generate/constants";
import {
  isPreviewWidgetId,
  PREVIEW_WIDGET_IDS,
  type PreviewRequest,
  type PreviewWidgetId,
} from "@/src/preview/types";

export const dynamicParams = false;

type GenerateGithubWidgetPageProps = {
  params: Promise<{ widget: string }>;
};

export function generateStaticParams(): { widget: PreviewWidgetId }[] {
  return PREVIEW_WIDGET_IDS.map((widget) => ({ widget }));
}

export function githubWidgetRequest(widget: PreviewWidgetId): PreviewRequest {
  return {
    ...DEFAULT_GENERATE_REQUEST,
    scope: "widget",
    plugin: GENERATE_PLUGIN_ID,
    widget,
  };
}

export async function generateMetadata({
  params,
}: GenerateGithubWidgetPageProps): Promise<Metadata> {
  const { widget } = await params;
  if (!isPreviewWidgetId(widget)) {
    return { title: "Generate" };
  }
  return {
    title: `Generate · ${GENERATE_PLUGIN_ID} · ${widget}`,
    description: `Visual generator for the ${GENERATE_PLUGIN_ID} ${widget} widget. Download or share a 480×160 card.`,
  };
}

/** `/generate/github/[widget]` — v0 github widgets only. Visual generator, not codegen. */
export default async function GenerateGithubWidgetPage({
  params,
}: GenerateGithubWidgetPageProps) {
  const { widget } = await params;
  if (!isPreviewWidgetId(widget)) {
    notFound();
  }

  return (
    <section
      data-slot="generate-widget"
      data-plugin={GENERATE_PLUGIN_ID}
      data-widget={widget}
    >
      <h2>{widget}</h2>
      <p>
        Visual generator for the <code>{GENERATE_PLUGIN_ID}</code>{" "}
        <code>{widget}</code> widget. Card size is 480×160.
      </p>
    </section>
  );
}
