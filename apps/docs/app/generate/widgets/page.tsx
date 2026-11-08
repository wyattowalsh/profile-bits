import {
  bitsUsedForWidget,
  HTTP_BITS_USED,
  RSS_BITS_USED,
  WAKATIME_BITS_USED,
} from "@profile-bits/plugins";
import type { Metadata } from "next";
import { GENERATE_PATH_PREFIX } from "@/src/preview/permalink";
import {
  isPreviewGithubWidgetId,
  PREVIEW_PLUGIN_IDS,
  PREVIEW_WIDGETS_BY_PLUGIN,
  type PreviewPluginId,
  type PreviewWidgetId,
} from "@/src/preview/types";

/** First-party packs listed on `/generate/widgets`. */
export const WIDGETS_PLUGIN_IDS = PREVIEW_PLUGIN_IDS;

export const WIDGETS_HREF = `${GENERATE_PATH_PREFIX}/widgets`;

export type WidgetCatalogRow = {
  id: PreviewWidgetId;
  plugin: PreviewPluginId;
  href: string;
  bitsUsed: readonly string[];
};

function bitsUsedForCatalogWidget(
  plugin: PreviewPluginId,
  id: PreviewWidgetId,
): readonly string[] {
  switch (plugin) {
    case "github":
      return isPreviewGithubWidgetId(id) ? bitsUsedForWidget(id) : [];
    case "wakatime":
      return WAKATIME_BITS_USED;
    case "rss":
      return RSS_BITS_USED;
    case "http":
      return HTTP_BITS_USED;
  }
}

/**
 * Widget index for `/generate/widgets`.
 * Github rows use `bitsUsedForWidget` (githubWidgetRegistry). Other packs use
 * pack-level `bitsUsed` — never index githubWidgetRegistry for coding/feed/json/chips.
 */
export function widgetCatalogRows(): WidgetCatalogRow[] {
  return WIDGETS_PLUGIN_IDS.flatMap((plugin) =>
    PREVIEW_WIDGETS_BY_PLUGIN[plugin].map((id) => ({
      id,
      plugin,
      href: `${GENERATE_PATH_PREFIX}/${plugin}/${id}`,
      bitsUsed: bitsUsedForCatalogWidget(plugin, id),
    })),
  );
}

export const metadata: Metadata = {
  title: "Widgets",
  description:
    "First-party widgets (demo, stats, languages, repo, coding, feed, json, chips) and the bits they compose.",
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

/** `/generate/widgets` — eight first-party widgets plus pack bitsUsed names. */
export default function GenerateWidgetsPage() {
  const rows = widgetCatalogRows();

  return (
    <nav
      data-slot="generate-widgets"
      data-plugins={WIDGETS_PLUGIN_IDS.join(" ")}
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
        First-party widgets across{" "}
        {WIDGETS_PLUGIN_IDS.map((id) => (
          <code key={id}>{id}</code>
        ))}
        . Card size is 480×160. <code>bitsUsed</code> names come from each pack.
      </p>
      <ul data-slot="generate-widgets-list">
        {rows.map((row) => (
          <li
            key={`${row.plugin}-${row.id}`}
            data-widget={row.id}
            data-plugin={row.plugin}
          >
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
