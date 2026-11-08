import { notFound } from "next/navigation";
import {
  isPreviewWakatimeWidgetId,
  PREVIEW_WAKATIME_WIDGET_IDS,
  type PreviewWakatimeWidgetId,
} from "@/src/preview/types";

export const dynamicParams = false;

type WakatimeWidgetParams = {
  widget: string;
};

type WakatimeWidgetPageProps = {
  params: Promise<WakatimeWidgetParams>;
};

export const PRIMARY_CTA = "Copy";

/** Wakatime widgets only. Do not dump the eight-id POST union onto this route. */
export function generateStaticParams(): Array<{
  widget: PreviewWakatimeWidgetId;
}> {
  return PREVIEW_WAKATIME_WIDGET_IDS.map((widget) => ({ widget }));
}

/**
 * Widget-scoped `/playground/wakatime/:widget` route.
 * PlaygroundShell is mounted by `app/playground/layout.tsx` (Suspense).
 */
export default async function WakatimeWidgetPlaygroundPage({
  params,
}: WakatimeWidgetPageProps) {
  const { widget } = await params;
  if (!isPreviewWakatimeWidgetId(widget)) {
    notFound();
  }

  return (
    <section
      data-slot="playground-wakatime-widget"
      data-plugin="wakatime"
      data-widget={widget}
      data-href={`/playground/wakatime/${widget}`}
      data-primary-cta={PRIMARY_CTA}
    >
      <h2>{widget}</h2>
      <p>
        Canonical playground for the <code>wakatime</code> <code>{widget}</code>{" "}
        widget. Primary CTA is {PRIMARY_CTA}.
      </p>
    </section>
  );
}
