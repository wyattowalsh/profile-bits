import { WAKATIME_BITS_USED } from "@profile-bits/plugins";
import type { Metadata } from "next";
import {
  DEFAULT_GENERATE_REQUEST,
  DOWNLOAD_LABEL,
  SHARE_LABEL,
} from "@/src/generate/constants";
import { GENERATE_PATH_PREFIX } from "@/src/preview/permalink";
import {
  PREVIEW_WAKATIME_WIDGET_IDS,
  type PreviewPluginId,
  type PreviewRequest,
  type PreviewWakatimeWidgetId,
} from "@/src/preview/types";

export const WAKATIME_PLUGIN_ID = "wakatime" as const satisfies PreviewPluginId;

export const WAKATIME_GENERATE_HREF = `${GENERATE_PATH_PREFIX}/${WAKATIME_PLUGIN_ID}`;

export const WAKATIME_GENERATE_BITS_USED = WAKATIME_BITS_USED;

export const WAKATIME_GENERATE_WIDGET_IDS = PREVIEW_WAKATIME_WIDGET_IDS;

export const metadata: Metadata = {
  title: "Generate · wakatime",
  description:
    "Visual generator for the wakatime pack (coding). Download or share a 480×160 card.",
};

/** Canonical `/generate/wakatime` pack request. */
export function wakatimePackRequest(): PreviewRequest {
  return {
    ...DEFAULT_GENERATE_REQUEST,
    scope: "plugin",
    plugin: WAKATIME_PLUGIN_ID,
  };
}

export function wakatimeWidgetHref(widget: PreviewWakatimeWidgetId): string {
  return `${WAKATIME_GENERATE_HREF}/${widget}`;
}

const PACK_CSS = `
[data-slot="generate-wakatime"] {
  display: grid;
  gap: 0.75rem;
}
[data-slot="generate-pack-bits"],
[data-slot="generate-pack-widgets"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
[data-slot="generate-pack-bit"],
[data-slot="generate-pack-widget-link"] {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-fd-border);
  border-radius: 999px;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1.25rem;
  text-decoration: none;
  color: var(--color-fd-foreground);
}
`;

/** Canonical `/generate/wakatime` visual generator. Pack bitsUsed from wakatimePlugin. */
export default function GenerateWakatimePage() {
  return (
    <section
      data-slot="generate-wakatime"
      data-plugin={WAKATIME_PLUGIN_ID}
      data-href={WAKATIME_GENERATE_HREF}
      data-bits-used={WAKATIME_GENERATE_BITS_USED.join(" ")}
    >
      <style href="profile-bits-generate-wakatime" precedence="default">
        {PACK_CSS}
      </style>
      <h2>{WAKATIME_PLUGIN_ID}</h2>
      <p>
        Visual generator for the <code>{WAKATIME_PLUGIN_ID}</code> pack. Widgets{" "}
        {WAKATIME_GENERATE_WIDGET_IDS.map((id) => (
          <code key={id}>{id}</code>
        ))}
        . Card size is 480×160. Primary actions are {DOWNLOAD_LABEL} and{" "}
        {SHARE_LABEL}. Pack <code>bitsUsed</code>:
      </p>
      <ul data-slot="generate-pack-bits" aria-label="wakatime bitsUsed">
        {WAKATIME_GENERATE_BITS_USED.map((bit) => (
          <li key={bit} data-slot="generate-pack-bit">
            {bit}
          </li>
        ))}
      </ul>
      <ul data-slot="generate-pack-widgets" aria-label="wakatime widgets">
        {WAKATIME_GENERATE_WIDGET_IDS.map((id) => (
          <li key={id}>
            <a
              data-slot="generate-pack-widget-link"
              href={wakatimeWidgetHref(id)}
            >
              {id}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
