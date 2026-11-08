import { parse } from "yaml";
import { ActionInputsSchema } from "../types.ts";
import {
  type ActionInputSpec,
  flattenedGeneratedInputNames,
  THIN_ACTION_INPUT_NAMES,
} from "./action-yml.ts";
import { assertNoFlattenedActionInputs } from "./flatten.ts";

export type ActionYmlCheckResult =
  | { ok: true }
  | { ok: false; errors: string[] };

const INPUTS_HEADER = /^inputs:[ \t]*$/;
const TOP_LEVEL_KEY = /^[A-Za-z_]/;
const INDENTED_INPUT_KEY = /^ {2}([A-Za-z_][A-Za-z0-9_]*):(?:[ \t]|$)/;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Sorted `ActionInputsSchema` keys. Must equal thin `action.yml` input names. */
export function schemaActionInputNames(): string[] {
  return Object.keys(ActionInputsSchema.shape).sort();
}

function actionYmlInputNamesFromIndent(yamlText: string): string[] {
  const names: string[] = [];
  let inInputs = false;
  for (const line of yamlText.split(/\r?\n/)) {
    if (!inInputs) {
      if (INPUTS_HEADER.test(line)) {
        inInputs = true;
      }
      continue;
    }
    if (TOP_LEVEL_KEY.test(line)) {
      break;
    }
    const match = INDENTED_INPUT_KEY.exec(line);
    if (match?.[1] !== undefined) {
      names.push(match[1]);
    }
  }
  return names;
}

function actionYmlInputNamesFromParse(yamlText: string): string[] {
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

/** Marketplace input names declared under `inputs:` in an action.yml body. */
export function actionYmlInputNames(yamlText: string): string[] {
  const parsed = actionYmlInputNamesFromParse(yamlText);
  if (parsed.length > 0) {
    return parsed;
  }
  return actionYmlInputNamesFromIndent(yamlText);
}

function sortedNamesEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((name, index) => name === b[index]);
}

function schemaKeysMismatch(
  label: string,
  yamlNames: readonly string[],
): string | undefined {
  const schema = schemaActionInputNames();
  const yml = [...yamlNames].sort();
  if (sortedNamesEqual(schema, yml)) {
    return undefined;
  }
  const schemaSet = new Set(schema);
  const ymlSet = new Set(yml);
  const missing = schema.filter((name) => !ymlSet.has(name));
  const extra = yml.filter((name) => !schemaSet.has(name));
  const details = [
    missing.length > 0 ? `missing ${missing.join(", ")}` : undefined,
    extra.length > 0 ? `extra ${extra.join(", ")}` : undefined,
  ]
    .filter((part): part is string => part !== undefined)
    .join("; ");
  return `ActionInputsSchema keys !== ${label} (${details}).`;
}

/**
 * --check: fail on flattened names in generated or current YAML, a would-be
 * generated flattened input, schema keys that do not equal action.yml input
 * names, or a stale/missing action.yml.
 */
export function checkActionYml(
  currentText: string | null,
  generatedText: string,
  generatedInputs?: readonly ActionInputSpec[],
): ActionYmlCheckResult {
  const errors: string[] = [];

  const wouldBeFlattened = flattenedGeneratedInputNames(generatedInputs);
  if (wouldBeFlattened.length > 0) {
    errors.push(
      `Would-be generated input(s) match plugin_<plugin>_<widget>_<option>: ${wouldBeFlattened.join(", ")}.`,
    );
  }

  try {
    assertNoFlattenedActionInputs(generatedText);
  } catch (err) {
    errors.push(`Generated action.yml: ${errorMessage(err)}`);
  }

  const schemaVsThin = schemaKeysMismatch(
    "thin input names",
    THIN_ACTION_INPUT_NAMES,
  );
  if (schemaVsThin !== undefined) {
    errors.push(schemaVsThin);
  }
  const schemaVsGenerated = schemaKeysMismatch(
    "generated action.yml inputs",
    actionYmlInputNames(generatedText),
  );
  if (schemaVsGenerated !== undefined) {
    errors.push(schemaVsGenerated);
  }

  if (currentText === null) {
    errors.push("action.yml is missing; run `pnpm generate-action`.");
  } else {
    try {
      assertNoFlattenedActionInputs(currentText);
    } catch (err) {
      errors.push(`Current action.yml: ${errorMessage(err)}`);
    }
    const schemaVsCurrent = schemaKeysMismatch(
      "current action.yml inputs",
      actionYmlInputNames(currentText),
    );
    if (schemaVsCurrent !== undefined) {
      errors.push(schemaVsCurrent);
    }
    if (currentText !== generatedText) {
      errors.push("action.yml is stale; run `pnpm generate-action`.");
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}
