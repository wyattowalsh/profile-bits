import { DARK_THEME, LIGHT_THEME, type ThemePalette } from "./themes.js";

/** Built-in Tailwind subset on a Takumi node / JSX props bag (no Preflight). */
export type TwProps = {
  tw?: string;
};

/** Compiled CSS matched via `className` / `id` on Takumi render options. */
export type StylesheetsInput = {
  stylesheets: string[];
};

export const STYLESHEET_IDS = [
  "theme",
  "katex",
  "pretty-code",
  "callouts",
] as const;

export type StylesheetId = (typeof STYLESHEET_IDS)[number];

export const THEME_CLASS = "pb-theme";
export const THEME_DARK_CLASS = "pb-theme-dark";
export const THEME_LIGHT_CLASS = "pb-theme-light";
export const FRAME_CLASS = "pb-frame";

function themeDeclarations(palette: ThemePalette): string {
  return [
    `--pb-bg: ${palette.bg}`,
    `--pb-card: ${palette.card}`,
    `--pb-text: ${palette.text}`,
    `--pb-muted: ${palette.muted}`,
    `--pb-accent: ${palette.accent}`,
    `--pb-border: ${palette.border}`,
    `--pb-font: ${palette.font}`,
    "background-color: var(--pb-bg)",
    "color: var(--pb-text)",
    "font-family: var(--pb-font)",
  ].join("; ");
}

/** Compiled Theme token CSS for a selector. Bits match via `className`. */
export function themeTokenStylesheet(
  palette: ThemePalette,
  selector = `.${THEME_CLASS}`,
): string {
  return `${selector} { ${themeDeclarations(palette)}; }`;
}

/**
 * Compiled Theme tokens + `.pb-frame`. Not a Tailwind compiler output —
 * extra plugin CSS (KaTeX, pretty-code, callouts) lands in {@link STYLESHEETS}.
 */
export const THEME_STYLESHEET = [
  themeTokenStylesheet(DARK_THEME, `.${THEME_CLASS}, .${THEME_DARK_CLASS}`),
  themeTokenStylesheet(LIGHT_THEME, `.${THEME_LIGHT_CLASS}`),
  `.${FRAME_CLASS} { width: 100%; height: 100%; }`,
].join("\n");

/** Named compiled CSS slots. Empty strings are omitted from the render array. */
export const STYLESHEETS: Record<StylesheetId, string> = {
  theme: THEME_STYLESHEET,
  katex: "",
  "pretty-code": "",
  callouts: "",
};

function nonemptySheets(sheets: readonly string[]): string[] {
  return sheets.filter((sheet) => sheet.length > 0);
}

/** Default compiled stylesheets, plus optional extras (full Tailwind, plugin CSS). */
export function compiledStylesheets(extra: readonly string[] = []): string[] {
  return nonemptySheets([
    STYLESHEETS.theme,
    STYLESHEETS.katex,
    STYLESHEETS["pretty-code"],
    STYLESHEETS.callouts,
    ...extra,
  ]);
}

/** Attach Takumi `tw` (built-in Tailwind subset, no Preflight) onto a node or props bag. */
export function withTw<T extends object>(
  target: T,
  tw: string,
): T & { tw: string } {
  return { ...target, tw };
}

/** Attach `className` so compiled {@link STYLESHEETS} selectors can match. */
export function withClassName<T extends object>(
  target: T,
  className: string,
): T & { className: string } {
  return { ...target, className };
}

/** Attach compiled CSS `stylesheets[]` onto a Takumi render options bag. */
export function withStylesheets<T extends object>(
  target: T,
  stylesheets: readonly string[] = compiledStylesheets(),
): T & StylesheetsInput {
  return { ...target, stylesheets: nonemptySheets(stylesheets) };
}
