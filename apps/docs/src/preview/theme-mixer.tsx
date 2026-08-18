"use client";

import {
  COLOR_ROLES,
  type ColorRole,
  contrastRatio,
  listFamilies,
  resolveColorRef,
  THEME_REGISTRY,
} from "@profile-bits/themes";
import type { PreviewCustomRoles, PreviewTheme } from "./types";

export const THEME_MIXER_LABEL = "Customize theme";
export const CONTRAST_WARNING = "Contrast below 4.5:1";

export type ThemeMixerProps = {
  value: PreviewTheme;
  onChange?: (theme: PreviewTheme) => void;
};

const SWATCH_OPTIONS = listFamilies(THEME_REGISTRY).flatMap((family) =>
  family.flavors.flatMap((flavor) =>
    Object.keys(flavor.swatches).map((swatch) => `${flavor.id}.${swatch}`),
  ),
);

function rolesOf(theme: PreviewTheme): PreviewCustomRoles {
  if (typeof theme !== "string") {
    return theme.custom;
  }
  return {
    bg: `${theme}.bg`,
    card: `${theme}.card`,
    text: `${theme}.text`,
    muted: `${theme}.muted`,
    accent: `${theme}.accent`,
    border: `${theme}.border`,
    pair: THEME_REGISTRY[theme]?.pair,
  };
}

function contrastFor(
  roles: PreviewCustomRoles,
  role: "text" | "muted",
): number | null {
  try {
    return contrastRatio(
      resolveColorRef(roles[role], THEME_REGISTRY),
      resolveColorRef(roles.bg, THEME_REGISTRY),
    );
  } catch {
    return null;
  }
}

export function ThemeMixer({ value, onChange }: ThemeMixerProps) {
  const roles = rolesOf(value);
  const textContrast = contrastFor(roles, "text");
  const mutedContrast = contrastFor(roles, "muted");
  const warn =
    (textContrast != null && textContrast < 4.5) ||
    (mutedContrast != null && mutedContrast < 4.5);

  function patch(role: ColorRole, next: string) {
    onChange?.({
      custom: {
        ...roles,
        [role]: next,
      },
    });
  }

  return (
    <fieldset data-slot="theme-mixer" aria-label={THEME_MIXER_LABEL}>
      {COLOR_ROLES.map((role) => (
        <label key={role} data-role={role}>
          <span>{role}</span>
          <input
            name={`c${role}`}
            list={`theme-swatches-${role}`}
            value={roles[role]}
            onChange={(event) => {
              patch(role, event.target.value);
            }}
          />
          <datalist id={`theme-swatches-${role}`}>
            {SWATCH_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>
      ))}
      {warn ? (
        <p data-slot="theme-contrast-warning" role="status">
          {CONTRAST_WARNING}
        </p>
      ) : null}
    </fieldset>
  );
}
