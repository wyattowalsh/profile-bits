import {
  COLOR_ROLES,
  type ColorRole,
  listFamilies,
  NAMED_THEME_IDS,
  THEME_REGISTRY,
  type ThemeFamilyGroup,
  type ThemeFlavor,
} from "@profile-bits/themes";
import type { Metadata } from "next";
import { GENERATE_PATH_PREFIX } from "@/src/preview/permalink";

export const THEMES_HREF = `${GENERATE_PATH_PREFIX}/themes`;

export const THEME_LIBRARY_SWATCH_ROLES = COLOR_ROLES;

export function themeFamilies(): ThemeFamilyGroup[] {
  return listFamilies(THEME_REGISTRY);
}

export function themeFlavorHref(id: string): string {
  return `${THEMES_HREF}?theme=${id}`;
}

export function flavorRoleHex(flavor: ThemeFlavor, role: ColorRole): string {
  const swatchId = flavor.roles[role];
  return flavor.swatches[swatchId] ?? "transparent";
}

export const metadata: Metadata = {
  title: "Themes",
  description:
    "Named theme catalog: 47 official flavor ids grouped by family from NAMED_THEME_IDS and listFamilies.",
};

const THEMES_CSS = `
[data-slot="generate-themes"] {
  display: grid;
  gap: 0.75rem;
}
[data-slot="generate-themes-heading"] {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
}
[data-slot="generate-themes-lede"] {
  margin: 0;
  color: var(--color-fd-muted-foreground);
  font-size: 0.875rem;
}
[data-slot="generate-themes-families"] {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
[data-slot="generate-themes-family-label"] {
  margin: 0 0 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-fd-muted-foreground);
}
[data-slot="generate-themes-list"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
[data-slot="generate-themes-link"] {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--color-fd-border);
  border-radius: 999px;
  background: var(--color-fd-muted);
  color: var(--color-fd-foreground);
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-decoration: none;
}
[data-slot="generate-themes-link"]:hover,
[data-slot="generate-themes-link"]:focus-visible {
  background: var(--color-fd-accent);
  color: var(--color-fd-accent-foreground);
}
[data-slot="generate-themes-link"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
[data-slot="generate-themes-swatches"] {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
[data-slot="generate-themes-swatch"] {
  display: inline-block;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
  border: 1px solid var(--color-fd-border);
}
`;

/** `/generate/themes` — 47 `NAMED_THEME_IDS` grouped by `listFamilies`. */
export default function GenerateThemesPage() {
  const families = themeFamilies();

  return (
    <nav
      data-slot="generate-themes"
      data-href={THEMES_HREF}
      data-theme-count={NAMED_THEME_IDS.length}
      data-family-count={families.length}
      aria-labelledby="generate-themes-heading"
    >
      <style href="profile-bits-generate-themes" precedence="default">
        {THEMES_CSS}
      </style>
      <h2 data-slot="generate-themes-heading" id="generate-themes-heading">
        Themes
      </h2>
      <p data-slot="generate-themes-lede">
        Host-owned named palettes from <code>NAMED_THEME_IDS</code> grouped with{" "}
        <code>listFamilies</code>. {NAMED_THEME_IDS.length} flavors in{" "}
        {families.length} families. Card size is 480×160.
      </p>
      <ul data-slot="generate-themes-families">
        {families.map((family) => (
          <li
            key={family.id}
            data-slot="generate-themes-family"
            data-family={family.id}
          >
            <h3 data-slot="generate-themes-family-label">{family.id}</h3>
            <ul data-slot="generate-themes-list">
              {family.flavors.map((flavor) => (
                <li
                  key={flavor.id}
                  data-theme={flavor.id}
                  data-family={flavor.family}
                  data-polarity={flavor.polarity}
                  data-pair={flavor.pair}
                >
                  <a
                    data-slot="generate-themes-link"
                    href={themeFlavorHref(flavor.id)}
                  >
                    <code>{flavor.id}</code>
                    <span data-slot="generate-themes-swatches">
                      {THEME_LIBRARY_SWATCH_ROLES.map((role) => {
                        const hex = flavorRoleHex(flavor, role);
                        return (
                          <span
                            key={role}
                            data-slot="generate-themes-swatch"
                            data-swatch={role}
                            data-theme={flavor.id}
                            title={`${role} ${hex}`}
                            style={{ backgroundColor: hex }}
                          />
                        );
                      })}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
