import { HTTP_BITS_USED } from "@profile-bits/plugins";
import type { Metadata } from "next";
import {
  DEFAULT_GENERATE_REQUEST,
  DOWNLOAD_LABEL,
  SHARE_LABEL,
} from "@/src/generate/constants";
import { GENERATE_PATH_PREFIX } from "@/src/preview/permalink";
import {
  PREVIEW_HTTP_WIDGET_IDS,
  type PreviewHttpWidgetId,
  type PreviewPluginId,
  type PreviewRequest,
} from "@/src/preview/types";

export const HTTP_PLUGIN_ID = "http" as const satisfies PreviewPluginId;

export const HTTP_GENERATE_HREF = `${GENERATE_PATH_PREFIX}/${HTTP_PLUGIN_ID}`;

export const HTTP_GENERATE_BITS_USED = HTTP_BITS_USED;

export const HTTP_GENERATE_WIDGET_IDS = PREVIEW_HTTP_WIDGET_IDS;

export const metadata: Metadata = {
  title: "Generate · http",
  description:
    "Visual generator for the http pack (json, chips). Download or share a 480×160 card.",
};

/** Canonical `/generate/http` pack request. */
export function httpPackRequest(): PreviewRequest {
  return {
    ...DEFAULT_GENERATE_REQUEST,
    scope: "plugin",
    plugin: HTTP_PLUGIN_ID,
  };
}

export function httpWidgetHref(widget: PreviewHttpWidgetId): string {
  return `${HTTP_GENERATE_HREF}/${widget}`;
}

const PACK_CSS = `
[data-slot="generate-http"] {
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

/** Canonical `/generate/http` visual generator. Pack bitsUsed from httpPlugin. */
export default function GenerateHttpPage() {
  return (
    <section
      data-slot="generate-http"
      data-plugin={HTTP_PLUGIN_ID}
      data-href={HTTP_GENERATE_HREF}
      data-bits-used={HTTP_GENERATE_BITS_USED.join(" ")}
    >
      <style href="profile-bits-generate-http" precedence="default">
        {PACK_CSS}
      </style>
      <h2>{HTTP_PLUGIN_ID}</h2>
      <p>
        Visual generator for the <code>{HTTP_PLUGIN_ID}</code> pack. Widgets{" "}
        {HTTP_GENERATE_WIDGET_IDS.map((id) => (
          <code key={id}>{id}</code>
        ))}
        . Card size is 480×160. Primary actions are {DOWNLOAD_LABEL} and{" "}
        {SHARE_LABEL}. Pack <code>bitsUsed</code>:
      </p>
      <ul data-slot="generate-pack-bits" aria-label="http bitsUsed">
        {HTTP_GENERATE_BITS_USED.map((bit) => (
          <li key={bit} data-slot="generate-pack-bit">
            {bit}
          </li>
        ))}
      </ul>
      <ul data-slot="generate-pack-widgets" aria-label="http widgets">
        {HTTP_GENERATE_WIDGET_IDS.map((id) => (
          <li key={id}>
            <a data-slot="generate-pack-widget-link" href={httpWidgetHref(id)}>
              {id}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
