import type { Metadata } from "next";
import { GENERATE_PATH_PREFIX } from "@/src/preview/permalink";
import {
  PREVIEW_PLUGIN_IDS,
  PREVIEW_WIDGET_IDS,
  type PreviewPluginId,
  type PreviewWidgetId,
} from "@/src/preview/types";

/** v0 visual catalog pack. Do not add plugin ids. */
export const CATALOG_PLUGIN_ID: PreviewPluginId = PREVIEW_PLUGIN_IDS[0];

/** v0 visual catalog widgets. */
export const CATALOG_WIDGET_IDS = PREVIEW_WIDGET_IDS;

export const CATALOG_HREF = `${GENERATE_PATH_PREFIX}/catalog`;
export const GITHUB_HREF = `${GENERATE_PATH_PREFIX}/${CATALOG_PLUGIN_ID}`;
export const WIDGETS_HREF = `${GENERATE_PATH_PREFIX}/widgets`;
export const BITS_HREF = `${GENERATE_PATH_PREFIX}/bits`;

export const CATALOG_INDEX_HREFS = [
  GITHUB_HREF,
  WIDGETS_HREF,
  BITS_HREF,
] as const;

export type CatalogEntryKind = "plugin" | "widget";

export type CatalogEntry = {
  id: PreviewPluginId | PreviewWidgetId;
  kind: CatalogEntryKind;
  href: string;
  label: string;
};

/** github pack plus demo/stats/languages. No extra plugins. */
export function catalogEntries(): CatalogEntry[] {
  return [
    {
      id: CATALOG_PLUGIN_ID,
      kind: "plugin",
      href: GITHUB_HREF,
      label: `${CATALOG_PLUGIN_ID} pack`,
    },
    ...CATALOG_WIDGET_IDS.map(
      (widget): CatalogEntry => ({
        id: widget,
        kind: "widget",
        href: `${GITHUB_HREF}/${widget}`,
        label: widget,
      }),
    ),
  ];
}

export const metadata: Metadata = {
  title: "Catalog",
  description:
    "v0 visual catalog: github pack plus widgets demo, stats, and languages.",
};

const CATALOG_CSS = `
[data-slot="generate-catalog"] {
  display: grid;
  gap: 0.75rem;
}
[data-slot="generate-catalog-heading"] {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
}
[data-slot="generate-catalog-lede"] {
  margin: 0;
  color: var(--color-fd-muted-foreground);
  font-size: 0.875rem;
}
[data-slot="generate-catalog-indexes"],
[data-slot="generate-catalog-list"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
[data-slot="generate-catalog-index"],
[data-slot="generate-catalog-link"] {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-fd-border);
  border-radius: 999px;
  background: var(--color-fd-muted);
  color: var(--color-fd-foreground);
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-decoration: none;
}
[data-slot="generate-catalog-index"]:hover,
[data-slot="generate-catalog-index"]:focus-visible,
[data-slot="generate-catalog-link"]:hover,
[data-slot="generate-catalog-link"]:focus-visible {
  background: var(--color-fd-accent);
  color: var(--color-fd-accent-foreground);
}
[data-slot="generate-catalog-index"]:focus-visible,
[data-slot="generate-catalog-link"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
`;

const INDEX_LABELS: Record<(typeof CATALOG_INDEX_HREFS)[number], string> = {
  [GITHUB_HREF]: "github",
  [WIDGETS_HREF]: "widgets",
  [BITS_HREF]: "bits",
};

/** `/generate/catalog` — v0 visual catalog for the github pack. */
export default function GenerateCatalogPage() {
  const entries = catalogEntries();

  return (
    <nav
      data-slot="generate-catalog"
      data-plugin={CATALOG_PLUGIN_ID}
      data-href={CATALOG_HREF}
      aria-labelledby="generate-catalog-heading"
    >
      <style href="profile-bits-generate-catalog" precedence="default">
        {CATALOG_CSS}
      </style>
      <h2 data-slot="generate-catalog-heading" id="generate-catalog-heading">
        Catalog
      </h2>
      <p data-slot="generate-catalog-lede">
        v0 visual catalog for the <code>{CATALOG_PLUGIN_ID}</code> pack (
        {CATALOG_WIDGET_IDS.map((id) => (
          <code key={id}>{id}</code>
        ))}
        ). Card size is 480×160.
      </p>
      <ul data-slot="generate-catalog-indexes">
        {CATALOG_INDEX_HREFS.map((href) => (
          <li key={href}>
            <a data-slot="generate-catalog-index" href={href}>
              {INDEX_LABELS[href]}
            </a>
          </li>
        ))}
      </ul>
      <ul data-slot="generate-catalog-list">
        {entries.map((entry) => (
          <li
            key={`${entry.kind}-${entry.id}`}
            data-kind={entry.kind}
            data-id={entry.id}
          >
            <a data-slot="generate-catalog-link" href={entry.href}>
              {entry.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
