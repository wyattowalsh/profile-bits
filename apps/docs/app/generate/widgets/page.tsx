import { githubWidgetRegistry } from "@profile-bits/plugins";
import type { Metadata } from "next";
import { GENERATE_PATH_PREFIX } from "@/src/preview/permalink";
import {
  PREVIEW_PLUGIN_IDS,
  PREVIEW_WIDGET_IDS,
  type PreviewPluginId,
  type PreviewWidgetId,
} from "@/src/preview/types";

/** v0 github pack. `bitsUsed` comes from T210 `githubWidgetRegistry`. */
export const WIDGETS_PLUGIN_ID: PreviewPluginId = PREVIEW_PLUGIN_IDS[0];

export const WIDGETS_HREF = `${GENERATE_PATH_PREFIX}/widgets`;

export type WidgetCatalogRow = {
  id: PreviewWidgetId;
  href: string;
  bitsUsed: readonly string[];
};

/**
 * Widget index for `/generate/widgets`.
 * `bitsUsed` is the per-widget export-name list from T210.
 */
export function widgetCatalogRows(): WidgetCatalogRow[] {
  return PREVIEW_WIDGET_IDS.map((id) => ({
    id,
    href: `${GENERATE_PATH_PREFIX}/${WIDGETS_PLUGIN_ID}/${id}`,
    bitsUsed: githubWidgetRegistry[id].bitsUsed,
  }));
}

export const metadata: Metadata = {
  title: "Widgets",
  description:
    "v0 github widgets (demo, stats, languages) and the bits they compose.",
};

const WIDGETS_CSS = `
[data-slot="generate-widgets"] {
  display: grid;
  gap: 0.75rem;
}
[data-slot="generate-widgets-heading"] {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
}
[data-slot="generate-widgets-lede"] {
  margin: 0;
  color: var(--color-fd-muted-foreground);
  font-size: 0.875rem;
}
[data-slot="generate-widgets-list"] {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
[data-slot="generate-widgets-link"] {
  font-weight: 600;
  color: var(--color-fd-foreground);
}
[data-slot="generate-widgets-bits"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0.375rem 0 0;
  padding: 0;
  list-style: none;
}
[data-slot="generate-widgets-bit"] {
  border: 1px solid var(--color-fd-border);
  border-radius: 999px;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
}
`;

/** `/generate/widgets` — v0 github widgets plus bitsUsed names. */
export default function GenerateWidgetsPage() {
  const rows = widgetCatalogRows();

  return (
    <nav
      data-slot="generate-widgets"
      data-plugin={WIDGETS_PLUGIN_ID}
      data-href={WIDGETS_HREF}
      aria-labelledby="generate-widgets-heading"
    >
      <style href="profile-bits-generate-widgets" precedence="default">
        {WIDGETS_CSS}
      </style>
      <h2 data-slot="generate-widgets-heading" id="generate-widgets-heading">
        Widgets
      </h2>
      <p data-slot="generate-widgets-lede">
        v0 <code>{WIDGETS_PLUGIN_ID}</code> widgets. Card size is 480×160.{" "}
        <code>bitsUsed</code> names are the v0 bits exports.
      </p>
      <ul data-slot="generate-widgets-list">
        {rows.map((row) => (
          <li key={row.id} data-widget={row.id}>
            <a data-slot="generate-widgets-link" href={row.href}>
              {row.id}
            </a>
            <ul data-slot="generate-widgets-bits" aria-label={`${row.id} bits`}>
              {row.bitsUsed.map((bit) => (
                <li key={bit} data-slot="generate-widgets-bit">
                  {bit}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
