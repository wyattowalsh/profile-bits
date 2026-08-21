import {
  CHIPS_FILENAME_DEFAULT,
  CHIPS_WORKFLOW_DEFAULT,
  HTTP_CHIP_PRESETS,
  HTTP_CHIP_TYPES,
  type HttpChipPreset,
  type HttpChipType,
  type ThemeConfig,
  themeMembersFor,
} from "@profile-bits/core";
import type { ThemePalette } from "@profile-bits/themes";
import { parse } from "@/src/preview/permalink";
import {
  isPreviewCustomTheme,
  isPreviewNamedTheme,
  type PreviewNamedTheme,
  type PreviewTheme,
  previewThemeParam,
} from "@/src/preview/types";

export const HTTP_PLAYGROUND_PLUGIN = "http" as const;
export const HTTP_PLAYGROUND_WIDGET = "chips" as const;
export const HTTP_PLAYGROUND_WIDGET_IDS = ["json", "chips"] as const;
export const HTTP_PLAYGROUND_HREF = "/playground/http";
export const HTTP_PLAYGROUND_README = "![](./profile-bits/chips.svg)";
export const HTTP_PLAYGROUND_CARD_WIDTH = 480;
export const HTTP_PLAYGROUND_CARD_HEIGHT = 160;
export type HttpPlaygroundTheme = PreviewTheme;
export const PRIMARY_CTA = "Copy";

export const HTTP_CHIP_PRESET_IDS = HTTP_CHIP_PRESETS;
export const HTTP_CHIP_TYPE_IDS = HTTP_CHIP_TYPES;

const PRESET_SET = new Set<string>(HTTP_CHIP_PRESETS);
const TYPE_SET = new Set<string>(HTTP_CHIP_TYPES);

export type HttpPlaygroundSearchParams = {
  preset?: string | string[];
  types?: string | string[];
  package?: string | string[];
  repo?: string | string[];
  workflow?: string | string[];
  theme?: string | string[];
  cbg?: string | string[];
  ccard?: string | string[];
  ctext?: string | string[];
  cmuted?: string | string[];
  caccent?: string | string[];
  cborder?: string | string[];
  cpair?: string | string[];
};

export type HttpPlaygroundState = {
  preset: HttpChipPreset;
  types: HttpChipType[];
  packageName: string;
  repo: string;
  workflow: string;
  theme: HttpPlaygroundTheme;
};

export const HTTP_PLAYGROUND_DEFAULTS: HttpPlaygroundState = {
  preset: "shieldcn",
  types: ["npm"],
  packageName: "react",
  repo: "vercel/next.js",
  workflow: CHIPS_WORKFLOW_DEFAULT,
  theme: "dark",
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    const item = value[0];
    return typeof item === "string" ? item : undefined;
  }
  return value;
}

function many(value: string | string[] | undefined): string[] {
  if (value == null) {
    return [];
  }
  const items = Array.isArray(value) ? value : [value];
  const tokens: string[] = [];
  for (const item of items) {
    for (const token of item.split(",")) {
      const trimmed = token.trim();
      if (trimmed !== "") {
        tokens.push(trimmed);
      }
    }
  }
  return tokens;
}

function isChipPreset(value: string): value is HttpChipPreset {
  return PRESET_SET.has(value);
}

function isChipType(value: string): value is HttpChipType {
  return TYPE_SET.has(value);
}

function searchParamsFromPlayground(
  search: HttpPlaygroundSearchParams | undefined,
): URLSearchParams {
  const params = new URLSearchParams();
  if (search == null) {
    return params;
  }
  for (const [key, value] of Object.entries(search)) {
    if (value == null) {
      continue;
    }
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (typeof item === "string") {
        params.append(key, item);
      }
    }
  }
  return params;
}

/** GlobalBar permalink theme: named catalog id, or `theme=custom` + c* roles. */
export function parseHttpPlaygroundTheme(
  search: HttpPlaygroundSearchParams | undefined,
): PreviewTheme {
  return parse(searchParamsFromPlayground(search)).theme;
}

/**
 * Resolve permalink theme for chips SVG. Named catalog ids pass through;
 * custom roles become a palette. Unknown dump ids stay unmapped (not dark).
 */
export function chipsThemeForPlayground(
  theme: PreviewTheme,
): PreviewNamedTheme | ThemePalette | null {
  if (typeof theme === "string") {
    return isPreviewNamedTheme(theme) ? theme : null;
  }
  if (!isPreviewCustomTheme(theme)) {
    return null;
  }
  const custom: ThemeConfig = {
    custom: {
      bg: theme.custom.bg,
      card: theme.custom.card,
      text: theme.custom.text,
      muted: theme.custom.muted,
      accent: theme.custom.accent,
      border: theme.custom.border,
    },
  };
  try {
    const member = themeMembersFor({
      theme: custom,
      output_pair: false,
    })[0];
    return member?.theme ?? null;
  } catch {
    return null;
  }
}

export function httpPlaygroundThemeQueryFields(
  theme: PreviewTheme,
): Array<{ name: string; value: string }> {
  if (typeof theme === "string") {
    return [{ name: "theme", value: theme }];
  }
  const fields = [
    { name: "theme", value: previewThemeParam(theme) },
    { name: "cbg", value: theme.custom.bg },
    { name: "ccard", value: theme.custom.card },
    { name: "ctext", value: theme.custom.text },
    { name: "cmuted", value: theme.custom.muted },
    { name: "caccent", value: theme.custom.accent },
    { name: "cborder", value: theme.custom.border },
  ];
  if (theme.custom.pair !== undefined) {
    fields.push({ name: "cpair", value: theme.custom.pair });
  }
  return fields;
}

export function parseHttpPlaygroundSearch(
  search: HttpPlaygroundSearchParams | undefined,
): HttpPlaygroundState {
  const presetRaw = first(search?.preset)?.trim() ?? "";
  const preset = isChipPreset(presetRaw)
    ? presetRaw
    : HTTP_PLAYGROUND_DEFAULTS.preset;

  const types: HttpChipType[] = [];
  const seen = new Set<HttpChipType>();
  for (const token of many(search?.types)) {
    if (!isChipType(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    types.push(token);
  }

  const packageRaw = first(search?.package);
  const repoRaw = first(search?.repo);
  const workflowRaw = first(search?.workflow);

  return {
    preset,
    types: types.length > 0 ? types : [...HTTP_PLAYGROUND_DEFAULTS.types],
    packageName:
      packageRaw !== undefined
        ? packageRaw.trim()
        : HTTP_PLAYGROUND_DEFAULTS.packageName,
    repo:
      repoRaw !== undefined ? repoRaw.trim() : HTTP_PLAYGROUND_DEFAULTS.repo,
    workflow:
      workflowRaw !== undefined && workflowRaw.trim() !== ""
        ? workflowRaw.trim()
        : HTTP_PLAYGROUND_DEFAULTS.workflow,
    theme: parseHttpPlaygroundTheme(search),
  };
}

function yamlScalar(value: string): string {
  if (value === "" || /[:#]|^\s|\s$|["']/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

export function emitChipsConfigYaml(state: HttpPlaygroundState): string {
  const types = state.types.join(", ");
  return `plugins:
  http:
    widgets:
      chips:
        filename: ${CHIPS_FILENAME_DEFAULT}
        preset: ${state.preset}
        types: [${types}]
        package: ${yamlScalar(state.packageName)}
        repo: ${yamlScalar(state.repo)}
        workflow: ${yamlScalar(state.workflow)}
`;
}

export function emitChipsReadmeMarkdown(): string {
  return HTTP_PLAYGROUND_README;
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
