import { parse } from "yaml";

/**
 * Flattened Marketplace input: `plugin_<plugin>_<widget>_<option>` and cousins
 * (`plugin_github_widgets`, `plugin_github_filename_*`). `plugin_github` (pack
 * bool) is allowed and does not match.
 */
export const FLATTENED_ACTION_INPUT_NAME =
  /^plugin_[A-Za-z0-9]+_[A-Za-z0-9_]+$/;

/** Must fail --check even if a fixture/template adds this key. */
export const BANNED_FLATTENED_INPUT_NAMES = [
  "plugin_github_stats_include",
] as const;

const FLATTENED_YAML_KEY =
  /(?:^|[\r\n,{[])[ \t]*(plugin_[A-Za-z0-9]+_[A-Za-z0-9_]+)[ \t]*:/gi;

const BANNED_FLATTENED_INPUT_NAME_SET: ReadonlySet<string> = new Set(
  BANNED_FLATTENED_INPUT_NAMES,
);

export function isFlattenedActionInputName(name: string): boolean {
  if (BANNED_FLATTENED_INPUT_NAME_SET.has(name)) {
    return true;
  }
  return FLATTENED_ACTION_INPUT_NAME.test(name);
}

function inputNamesFromParsedYaml(yamlText: string): string[] {
  try {
    const doc = parse(yamlText) as unknown;
    if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
      return [];
    }
    const inputs = (doc as { inputs?: unknown }).inputs;
    if (
      inputs === null ||
      typeof inputs !== "object" ||
      Array.isArray(inputs)
    ) {
      return [];
    }
    return Object.keys(inputs);
  } catch {
    return [];
  }
}

function inputNamesFromYamlKeys(yamlText: string): string[] {
  const names: string[] = [];
  FLATTENED_YAML_KEY.lastIndex = 0;
  for (const match of yamlText.matchAll(FLATTENED_YAML_KEY)) {
    const name = match[1];
    if (name !== undefined) {
      names.push(name);
    }
  }
  return names;
}

export function findFlattenedActionInputs(yamlText: string): string[] {
  const found = new Set<string>();
  for (const name of inputNamesFromParsedYaml(yamlText)) {
    if (isFlattenedActionInputName(name)) {
      found.add(name);
    }
  }
  for (const name of inputNamesFromYamlKeys(yamlText)) {
    if (isFlattenedActionInputName(name)) {
      found.add(name);
    }
  }
  for (const banned of BANNED_FLATTENED_INPUT_NAMES) {
    const key = new RegExp(`(?:^|[\\r\\n,{[])[ \\t]*${banned}[ \\t]*:`, "i");
    if (key.test(yamlText)) {
      found.add(banned);
    }
  }
  return [...found].sort();
}

export function assertNoFlattenedActionInputs(yamlText: string): void {
  const found = findFlattenedActionInputs(yamlText);
  if (found.length === 0) {
    return;
  }
  throw new Error(
    `Forbidden flattened Action input(s): ${found.join(", ")}. ` +
      "Widget options belong in .github/profile-bits.yml, not " +
      "plugin_<plugin>_<widget>_<option> Marketplace inputs.",
  );
}
