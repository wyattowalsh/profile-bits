"use client";

import { listFamilies, THEME_REGISTRY } from "@profile-bits/themes";
import {
  isPreviewNamedTheme,
  type PreviewTheme,
  previewThemeParam,
} from "./types";

export const THEME_PICKER_LABEL = "Named theme";
export const THEME_CUSTOM_VALUE = "custom";

export type ThemePickerProps = {
  id?: string;
  value: PreviewTheme;
  onChange?: (theme: PreviewTheme) => void;
};

const FAMILIES = listFamilies(THEME_REGISTRY);

export function ThemePicker({ id, value, onChange }: ThemePickerProps) {
  const selected = previewThemeParam(value);
  return (
    <select
      id={id}
      name="theme"
      data-slot="theme-picker"
      aria-label={THEME_PICKER_LABEL}
      value={selected}
      onChange={(event) => {
        const next = event.target.value;
        if (next === THEME_CUSTOM_VALUE) {
          onChange?.({
            custom: {
              bg: "dark.bg",
              card: "dark.card",
              text: "dark.text",
              muted: "dark.muted",
              accent: "dark.accent",
              border: "dark.border",
            },
          });
          return;
        }
        if (isPreviewNamedTheme(next)) {
          onChange?.(next);
        }
      }}
    >
      {FAMILIES.map((family) => (
        <optgroup key={family.id} label={family.id} data-family={family.id}>
          {family.flavors.map((flavor) => (
            <option
              key={flavor.id}
              value={flavor.id}
              data-value={flavor.id}
              data-family={family.id}
            >
              {flavor.label}
            </option>
          ))}
        </optgroup>
      ))}
      <option value={THEME_CUSTOM_VALUE} data-value={THEME_CUSTOM_VALUE}>
        Customize
      </option>
    </select>
  );
}
