"use client";

import {
  listFamilies,
  THEME_REGISTRY,
  type ThemeFlavor,
} from "@profile-bits/themes";
import { useId, useMemo, useState } from "react";
import type { PreviewCustomRoles, PreviewTheme } from "./types";
import { isPreviewNamedTheme, previewThemeParam } from "./types";

export const THEME_PICKER_LABEL = "Named theme";
export const THEME_PICKER_SEARCH_LABEL = "Search themes";
export const THEME_CUSTOM_VALUE = "custom";
export const THEME_CUSTOM_LABEL = "Customize";
export const THEME_SWATCH_ROLES = ["bg", "card", "accent"] as const;

export type ThemePickerProps = {
  id?: string;
  value: PreviewTheme;
  onChange?: (theme: PreviewTheme) => void;
};

const FAMILIES = listFamilies(THEME_REGISTRY);

const THEME_PICKER_CSS = `
[data-slot="theme-picker"] {
  position: relative;
  min-inline-size: 14rem;
}
[data-slot="theme-picker"] [data-slot="theme-combobox"] {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  min-inline-size: 14rem;
  width: 100%;
}
[data-slot="theme-picker"] [data-slot="theme-combobox"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
[data-slot="theme-listbox"] {
  position: absolute;
  z-index: 20;
  inset-inline: 0;
  margin: 0.25rem 0 0;
  max-block-size: 18rem;
  overflow: auto;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-background);
  padding: 0.25rem;
  box-shadow: 0 0.5rem 1.25rem color-mix(in srgb, #000 18%, transparent);
}
[data-slot="theme-family"] {
  border: 0;
  margin: 0;
  padding: 0.25rem 0;
  min-inline-size: 0;
}
[data-slot="theme-family-label"] {
  display: block;
  float: none;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-fd-muted-foreground);
}
[data-slot="theme-option"] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
  font: inherit;
  text-align: start;
  cursor: pointer;
}
[data-slot="theme-option"][aria-selected="true"],
[data-slot="theme-option"]:hover,
[data-slot="theme-option"]:focus-visible {
  background: var(--color-fd-muted);
  outline: none;
}
[data-slot="theme-swatches"] {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
[data-slot="theme-swatch"] {
  display: inline-block;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
  border: 1px solid var(--color-fd-border);
}
`;

export function customRolesFromNamed(id: string): PreviewCustomRoles {
  const flavor = THEME_REGISTRY[id];
  const roles: PreviewCustomRoles = {
    bg: `${id}.bg`,
    card: `${id}.card`,
    text: `${id}.text`,
    muted: `${id}.muted`,
    accent: `${id}.accent`,
    border: `${id}.border`,
  };
  if (flavor?.pair !== undefined) {
    roles.pair = flavor.pair;
  }
  return roles;
}

function roleHex(flavor: ThemeFlavor, role: "bg" | "card" | "accent"): string {
  const swatchId = flavor.roles[role];
  return flavor.swatches[swatchId] ?? "transparent";
}

function flavorMatches(
  flavor: ThemeFlavor,
  familyId: string,
  query: string,
): boolean {
  if (query === "") {
    return true;
  }
  const needle = query.toLowerCase();
  return (
    familyId.toLowerCase().includes(needle) ||
    flavor.id.toLowerCase().includes(needle) ||
    flavor.label.toLowerCase().includes(needle)
  );
}

function selectedLabel(value: PreviewTheme): string {
  if (typeof value !== "string") {
    return THEME_CUSTOM_LABEL;
  }
  return THEME_REGISTRY[value]?.label ?? value;
}

export function ThemePicker({ id, value, onChange }: ThemePickerProps) {
  const listboxId = useId();
  const selected = previewThemeParam(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      FAMILIES.map((family) => ({
        ...family,
        flavors: family.flavors.filter((flavor) =>
          flavorMatches(flavor, family.id, query),
        ),
      })).filter((family) => family.flavors.length > 0),
    [query],
  );
  const customVisible =
    query === "" ||
    THEME_CUSTOM_LABEL.toLowerCase().includes(query.toLowerCase()) ||
    THEME_CUSTOM_VALUE.includes(query.toLowerCase());

  function selectNamed(next: string) {
    if (isPreviewNamedTheme(next)) {
      onChange?.(next);
      setOpen(false);
      setQuery("");
    }
  }

  function selectCustom() {
    const seed =
      typeof value === "string" ? customRolesFromNamed(value) : value.custom;
    onChange?.({ custom: seed });
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <style href="profile-bits-theme-picker" precedence="default">
        {THEME_PICKER_CSS}
      </style>
      <div
        data-slot="theme-picker"
        data-value={selected}
        data-open={open ? "true" : "false"}
      >
        <input
          id={id}
          name="theme"
          role="combobox"
          aria-label={THEME_PICKER_SEARCH_LABEL}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          data-slot="theme-combobox"
          value={open ? query : selectedLabel(value)}
          placeholder={THEME_PICKER_LABEL}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
        />
        <div
          id={listboxId}
          role="listbox"
          data-slot="theme-listbox"
          aria-label={THEME_PICKER_LABEL}
          hidden={!open}
        >
          {filtered.map((family) => (
            <fieldset
              key={family.id}
              data-slot="theme-family"
              data-family={family.id}
            >
              <legend data-slot="theme-family-label">{family.id}</legend>
              {family.flavors.map((flavor) => (
                <button
                  key={flavor.id}
                  type="button"
                  role="option"
                  data-slot="theme-option"
                  data-value={flavor.id}
                  data-family={family.id}
                  aria-selected={selected === flavor.id}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectNamed(flavor.id);
                  }}
                >
                  <span>{flavor.label}</span>
                  <span data-slot="theme-swatches">
                    {THEME_SWATCH_ROLES.map((role) => (
                      <span
                        key={role}
                        data-slot="theme-swatch"
                        data-swatch={role}
                        data-theme={flavor.id}
                        style={{ backgroundColor: roleHex(flavor, role) }}
                        title={`${role} ${roleHex(flavor, role)}`}
                      />
                    ))}
                  </span>
                </button>
              ))}
            </fieldset>
          ))}
          {customVisible ? (
            <button
              type="button"
              role="option"
              data-slot="theme-option"
              data-value={THEME_CUSTOM_VALUE}
              aria-selected={selected === THEME_CUSTOM_VALUE}
              onMouseDown={(event) => {
                event.preventDefault();
                selectCustom();
              }}
            >
              {THEME_CUSTOM_LABEL}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
