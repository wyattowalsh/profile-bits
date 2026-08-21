"use client";

import {
  COLOR_ROLES,
  type ColorRole,
  isHexColor,
  listFamilies,
  normalizeHex,
  paletteContrastReport,
  polarityFromHex,
  resolveColorRef,
  resolveTheme,
  THEME_REGISTRY,
  type ThemePolarity,
} from "@profile-bits/themes";
import { useId, useMemo, useState } from "react";
import { customRolesFromNamed } from "./theme-picker";
import type { PreviewCustomRoles, PreviewTheme } from "./types";
import { isPreviewNamedTheme } from "./types";

export const THEME_MIXER_LABEL = "Customize theme";
export const THEME_PAIR_LABEL = "Pair";
export const THEME_MIX_POLARITY_LABEL = "Mix polarity";
export const THEME_PAIR_POLARITY_LABEL = "Pair polarity";
export const CONTRAST_WARNING = "Contrast below 4.5:1";
export const SAME_POLARITY_NOTE = "Same polarity";
export const THEME_MIXER_SEARCH_LABEL = "Search color refs";

export type ThemeMixerProps = {
  value: PreviewTheme;
  onChange?: (theme: PreviewTheme) => void;
};

type MixerRefOption = {
  ref: string;
  hex: string;
  flavorId: string;
};

type MixerFamilyRefs = {
  id: string;
  options: readonly MixerRefOption[];
};

const FAMILIES = listFamilies(THEME_REGISTRY);
const COLOR_ROLE_SET = new Set<string>(COLOR_ROLES);

const FAMILY_REFS: readonly MixerFamilyRefs[] = FAMILIES.map((family) => ({
  id: family.id,
  options: family.flavors.flatMap((flavor) => {
    const roleRefs = COLOR_ROLES.map((role) => ({
      ref: `${flavor.id}.${role}`,
      hex: flavor.swatches[flavor.roles[role]] ?? "",
      flavorId: flavor.id,
    }));
    const swatchRefs = Object.entries(flavor.swatches)
      .filter(([swatch]) => !COLOR_ROLE_SET.has(swatch))
      .map(([swatch, hex]) => ({
        ref: `${flavor.id}.${swatch}`,
        hex,
        flavorId: flavor.id,
      }));
    return [...roleRefs, ...swatchRefs];
  }),
}));

const THEME_MIXER_CSS = `
[data-slot="theme-mixer"] {
  display: grid;
  gap: 0.75rem;
  min-inline-size: 14rem;
}
[data-slot="theme-mixer"] [data-slot="theme-role"] {
  display: grid;
  gap: 0.25rem;
}
[data-slot="theme-mixer-picker"] {
  position: relative;
  min-inline-size: 14rem;
}
[data-slot="theme-mixer-combobox"] {
  display: flex;
  align-items: center;
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
[data-slot="theme-mixer-combobox"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
[data-slot="theme-mixer-listbox"] {
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
[data-slot="theme-mixer-family"] {
  border: 0;
  margin: 0;
  padding: 0.25rem 0;
  min-inline-size: 0;
}
[data-slot="theme-mixer-family-label"] {
  display: block;
  float: none;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-fd-muted-foreground);
}
[data-slot="theme-mixer-option"] {
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
[data-slot="theme-mixer-option"][aria-selected="true"],
[data-slot="theme-mixer-option"]:hover,
[data-slot="theme-mixer-option"]:focus-visible {
  background: var(--color-fd-muted);
  outline: none;
}
[data-slot="theme-mixer-swatch"] {
  display: inline-block;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
  border: 1px solid var(--color-fd-border);
  flex-shrink: 0;
}
[data-slot="theme-mixer"] [data-role="pair"] {
  display: grid;
  gap: 0.25rem;
}
[data-slot="theme-pair"] {
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  min-inline-size: 14rem;
}
[data-slot="theme-pair"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
[data-slot="theme-polarity"],
[data-slot="theme-contrast-warning"] {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.25rem;
}
`;

function rolesOf(theme: PreviewTheme): PreviewCustomRoles {
  if (typeof theme !== "string") {
    return theme.custom;
  }
  return customRolesFromNamed(theme);
}

/** Empty / invalid pair is a no-op so seeded `pair` stays for yaml `output_pair`. */
export function applyMixerPair(
  roles: PreviewCustomRoles,
  next: string,
): PreviewCustomRoles {
  if (next === "" || !isPreviewNamedTheme(next)) {
    return roles;
  }
  return {
    ...roles,
    pair: next,
  };
}

function hexKey(value: string): string | null {
  return isHexColor(value) ? normalizeHex(value) : null;
}

function contrastWarn(roles: PreviewCustomRoles): boolean {
  try {
    const palette = resolveTheme(
      {
        bg: roles.bg,
        card: roles.card,
        text: roles.text,
        muted: roles.muted,
        accent: roles.accent,
        border: roles.border,
      },
      THEME_REGISTRY,
    );
    return paletteContrastReport(palette).some(
      (row) =>
        !row.aa &&
        (row.fg === palette.text || row.fg === palette.muted) &&
        (row.bg === palette.bg || row.bg === palette.card),
    );
  } catch {
    return false;
  }
}

function previewPolarity(ref: string | undefined): ThemePolarity | null {
  if (ref === undefined || ref.trim() === "") {
    return null;
  }
  try {
    return polarityFromHex(resolveColorRef(ref, THEME_REGISTRY));
  } catch {
    return null;
  }
}

export function familyRefsFor(
  query: string,
  selected: string,
): readonly MixerFamilyRefs[] {
  const trimmed = query.trim();
  const needle = trimmed.toLowerCase();
  const browsing = needle === "" || query === selected;
  const queryHex = hexKey(trimmed);
  return FAMILY_REFS.map((family) => ({
    id: family.id,
    options: browsing
      ? family.options
      : family.options.filter((option) => {
          if (
            family.id.toLowerCase().includes(needle) ||
            option.flavorId.toLowerCase().includes(needle) ||
            option.ref.toLowerCase().includes(needle)
          ) {
            return true;
          }
          const optionHex = hexKey(option.hex);
          return (
            queryHex !== null && optionHex !== null && optionHex === queryHex
          );
        }),
  })).filter((family) => family.options.length > 0);
}

function ColorRefField({
  role,
  value,
  open,
  query,
  inputId,
  listId,
  onOpen,
  onQuery,
  onSelect,
  onClose,
}: {
  role: ColorRole;
  value: string;
  open: boolean;
  query: string;
  inputId: string;
  listId: string;
  onOpen: () => void;
  onQuery: (next: string) => void;
  onSelect: (next: string) => void;
  onClose: () => void;
}) {
  const filtered = useMemo(
    () => (open ? familyRefsFor(query, value) : []),
    [open, query, value],
  );

  return (
    <div data-slot="theme-role" data-role={role}>
      <label htmlFor={inputId}>{role}</label>
      <div data-slot="theme-mixer-picker" data-open={open ? "true" : "false"}>
        <input
          id={inputId}
          name={`c${role}`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          data-slot="theme-mixer-combobox"
          value={open ? query : value}
          placeholder={THEME_MIXER_SEARCH_LABEL}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onFocus={() => {
            onOpen();
          }}
          onChange={(event) => {
            onQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
            if (event.key === "ArrowDown" && !open) {
              event.preventDefault();
              onOpen();
            }
          }}
        />
        <div
          id={listId}
          role="listbox"
          data-slot="theme-mixer-listbox"
          aria-label={`${role} color refs`}
          hidden={!open}
        >
          {filtered.map((family) => (
            <fieldset
              key={family.id}
              data-slot="theme-mixer-family"
              data-family={family.id}
            >
              <legend data-slot="theme-mixer-family-label">{family.id}</legend>
              {family.options.map((option) => (
                <button
                  key={option.ref}
                  type="button"
                  role="option"
                  data-slot="theme-mixer-option"
                  data-value={option.ref}
                  data-family={family.id}
                  aria-selected={value === option.ref}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(option.ref);
                  }}
                >
                  <span>{option.ref}</span>
                  <span
                    data-slot="theme-mixer-swatch"
                    style={{ backgroundColor: option.hex || "transparent" }}
                    title={option.hex}
                  />
                </button>
              ))}
            </fieldset>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ThemeMixer({ value, onChange }: ThemeMixerProps) {
  const baseId = useId();
  const roles = rolesOf(value);
  const [openRole, setOpenRole] = useState<ColorRole | null>(null);
  const [query, setQuery] = useState("");
  const warn = contrastWarn(roles);
  const mixPolarity = previewPolarity(roles.bg);
  const pairPolarity =
    roles.pair === undefined ? null : previewPolarity(`${roles.pair}.bg`);
  const samePolarity =
    mixPolarity != null && pairPolarity != null && mixPolarity === pairPolarity;

  function patch(role: ColorRole, next: string) {
    onChange?.({
      custom: {
        ...roles,
        [role]: next,
      },
    });
  }

  function patchPair(next: string) {
    const nextRoles = applyMixerPair(roles, next);
    if (nextRoles === roles) {
      return;
    }
    onChange?.({
      custom: nextRoles,
    });
  }

  function closeMixer() {
    setOpenRole(null);
    setQuery("");
  }

  return (
    <>
      <style href="profile-bits-theme-mixer" precedence="default">
        {THEME_MIXER_CSS}
      </style>
      <fieldset data-slot="theme-mixer">
        <legend>{THEME_MIXER_LABEL}</legend>
        {COLOR_ROLES.map((role) => {
          const inputId = `${baseId}-${role}`;
          const listId = `${baseId}-refs-${role}`;
          const open = openRole === role;
          return (
            <ColorRefField
              key={role}
              role={role}
              value={roles[role]}
              open={open}
              query={open ? query : ""}
              inputId={inputId}
              listId={listId}
              onOpen={() => {
                setOpenRole(role);
                setQuery(roles[role]);
              }}
              onQuery={(next) => {
                setOpenRole(role);
                setQuery(next);
                patch(role, next);
              }}
              onSelect={(next) => {
                patch(role, next);
                closeMixer();
              }}
              onClose={closeMixer}
            />
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
        <p data-slot="theme-polarity" role="status">
          <span>
            {THEME_MIX_POLARITY_LABEL}{" "}
            <span
              data-slot="theme-mix-polarity"
              data-polarity={mixPolarity ?? ""}
            >
              {mixPolarity ?? ""}
            </span>
          </span>
          {pairPolarity != null ? (
            <span>
              {" · "}
              {THEME_PAIR_POLARITY_LABEL}{" "}
              <span
                data-slot="theme-pair-polarity"
                data-polarity={pairPolarity}
              >
                {pairPolarity}
              </span>
            </span>
          ) : null}
          {samePolarity ? (
            <span data-slot="theme-polarity-same"> {SAME_POLARITY_NOTE}</span>
          ) : null}
        </p>
        {warn ? (
          <p data-slot="theme-contrast-warning" role="status">
            {CONTRAST_WARNING}
          </p>
        ) : null}
      </fieldset>
    </>
  );
}
