"use client";

import {
  COLOR_ROLES,
  type ColorRole,
  contrastRatio,
  listFamilies,
  resolveColorRef,
  THEME_REGISTRY,
} from "@profile-bits/themes";
import { useId } from "react";
import { customRolesFromNamed } from "./theme-picker";
import type { PreviewCustomRoles, PreviewTheme } from "./types";
import { isPreviewNamedTheme } from "./types";

export const THEME_MIXER_LABEL = "Customize theme";
export const THEME_PAIR_LABEL = "Pair";
export const CONTRAST_WARNING = "Contrast below 4.5:1";

export type ThemeMixerProps = {
  value: PreviewTheme;
  onChange?: (theme: PreviewTheme) => void;
};

const FAMILIES = listFamilies(THEME_REGISTRY);

const SWATCH_OPTIONS = FAMILIES.flatMap((family) =>
  family.flavors.flatMap((flavor) =>
    Object.keys(flavor.swatches).map((swatch) => `${flavor.id}.${swatch}`),
  ),
);

function rolesOf(theme: PreviewTheme): PreviewCustomRoles {
  if (typeof theme !== "string") {
    return theme.custom;
  }
  return customRolesFromNamed(theme);
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
  const baseId = useId();
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

  function patchPair(next: string) {
    if (next === "" || !isPreviewNamedTheme(next)) {
      onChange?.({
        custom: {
          bg: roles.bg,
          card: roles.card,
          text: roles.text,
          muted: roles.muted,
          accent: roles.accent,
          border: roles.border,
        },
      });
      return;
    }
    onChange?.({
      custom: {
        ...roles,
        pair: next,
      },
    });
  }

  return (
    <fieldset data-slot="theme-mixer">
      <legend>{THEME_MIXER_LABEL}</legend>
      {COLOR_ROLES.map((role) => {
        const inputId = `${baseId}-${role}`;
        const listId = `${baseId}-swatches-${role}`;
        return (
          <div key={role} data-role={role}>
            <label htmlFor={inputId}>{role}</label>
            <input
              id={inputId}
              name={`c${role}`}
              list={listId}
              value={roles[role]}
              onChange={(event) => {
                patch(role, event.target.value);
              }}
            />
            <datalist id={listId}>
              {SWATCH_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
        );
      })}
      <div data-role="pair">
        <label htmlFor={`${baseId}-pair`}>{THEME_PAIR_LABEL}</label>
        <select
          id={`${baseId}-pair`}
          name="cpair"
          data-slot="theme-pair"
          value={roles.pair ?? ""}
          onChange={(event) => {
            patchPair(event.target.value);
          }}
        >
          <option value="">Keep seeded pair</option>
          {FAMILIES.map((family) => (
            <optgroup key={family.id} label={family.id}>
              {family.flavors.map((flavor) => (
                <option key={flavor.id} value={flavor.id}>
                  {flavor.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {warn ? (
        <p data-slot="theme-contrast-warning" role="status">
          {CONTRAST_WARNING}
        </p>
      ) : null}
    </fieldset>
  );
}
