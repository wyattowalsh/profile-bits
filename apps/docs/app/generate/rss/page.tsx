import { RSS_BITS_USED } from "@profile-bits/plugins";
import type { Metadata } from "next";
import {
  DEFAULT_GENERATE_REQUEST,
  DOWNLOAD_LABEL,
  SHARE_LABEL,
} from "@/src/generate/constants";
import { GENERATE_PATH_PREFIX } from "@/src/preview/permalink";
import {
  PREVIEW_RSS_WIDGET_IDS,
  type PreviewPluginId,
  type PreviewRequest,
  type PreviewRssWidgetId,
} from "@/src/preview/types";

export const RSS_PLUGIN_ID = "rss" as const satisfies PreviewPluginId;

export const RSS_GENERATE_HREF = `${GENERATE_PATH_PREFIX}/${RSS_PLUGIN_ID}`;

export const RSS_GENERATE_BITS_USED = RSS_BITS_USED;

export const RSS_GENERATE_WIDGET_IDS = PREVIEW_RSS_WIDGET_IDS;

export const metadata: Metadata = {
  title: "Generate · rss",
  description:
    "Visual generator for the rss pack (feed). Download or share a 480×160 card.",
};

/** Canonical `/generate/rss` pack request. */
export function rssPackRequest(): PreviewRequest {
  return {
    ...DEFAULT_GENERATE_REQUEST,
    scope: "plugin",
    plugin: RSS_PLUGIN_ID,
  };
}

export function rssWidgetHref(widget: PreviewRssWidgetId): string {
  return `${RSS_GENERATE_HREF}/${widget}`;
}

const PACK_CSS = `
[data-slot="generate-rss"] {
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

/** Canonical `/generate/rss` visual generator. Pack bitsUsed from rssPlugin. */
export default function GenerateRssPage() {
  return (
    <section
      data-slot="generate-rss"
      data-plugin={RSS_PLUGIN_ID}
      data-href={RSS_GENERATE_HREF}
      data-bits-used={RSS_GENERATE_BITS_USED.join(" ")}
    >
      <style href="profile-bits-generate-rss" precedence="default">
        {PACK_CSS}
      </style>
      <h2>{RSS_PLUGIN_ID}</h2>
      <p>
        Visual generator for the <code>{RSS_PLUGIN_ID}</code> pack. Widgets{" "}
        {RSS_GENERATE_WIDGET_IDS.map((id) => (
          <code key={id}>{id}</code>
        ))}
        . Card size is 480×160. Primary actions are {DOWNLOAD_LABEL} and{" "}
        {SHARE_LABEL}. Pack <code>bitsUsed</code>:
      </p>
      <ul data-slot="generate-pack-bits" aria-label="rss bitsUsed">
        {RSS_GENERATE_BITS_USED.map((bit) => (
          <li key={bit} data-slot="generate-pack-bit">
            {bit}
          </li>
        ))}
      </ul>
      <ul data-slot="generate-pack-widgets" aria-label="rss widgets">
        {RSS_GENERATE_WIDGET_IDS.map((id) => (
          <li key={id}>
            <a data-slot="generate-pack-widget-link" href={rssWidgetHref(id)}>
              {id}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
