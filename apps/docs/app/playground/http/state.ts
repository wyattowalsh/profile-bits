import {
  CHIPS_FILENAME_DEFAULT,
  CHIPS_WORKFLOW_DEFAULT,
  HTTP_CHIP_PRESETS,
  HTTP_CHIP_TYPES,
  type HttpChipPreset,
  type HttpChipType,
} from "@profile-bits/core";

export const HTTP_PLAYGROUND_PLUGIN = "http" as const;
export const HTTP_PLAYGROUND_WIDGET = "chips" as const;
export const HTTP_PLAYGROUND_WIDGET_IDS = ["json", "chips"] as const;
export const HTTP_PLAYGROUND_HREF = "/playground/http";
export const HTTP_PLAYGROUND_README = "![](./profile-bits/chips.svg)";
export const HTTP_PLAYGROUND_CARD_WIDTH = 480;
export const HTTP_PLAYGROUND_CARD_HEIGHT = 160;
export const HTTP_PLAYGROUND_THEMES = ["light", "dark"] as const;
export type HttpPlaygroundTheme = (typeof HTTP_PLAYGROUND_THEMES)[number];
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

function isHttpPlaygroundTheme(value: string): value is HttpPlaygroundTheme {
  return (HTTP_PLAYGROUND_THEMES as readonly string[]).includes(value);
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
  const themeRaw = first(search?.theme)?.trim() ?? "";

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
    theme: isHttpPlaygroundTheme(themeRaw)
      ? themeRaw
      : HTTP_PLAYGROUND_DEFAULTS.theme,
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
