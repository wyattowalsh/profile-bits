import {
  type ActionInputSpec,
  flattenedGeneratedInputNames,
} from "./action-yml.ts";
import { assertNoFlattenedActionInputs } from "./flatten.ts";

export type ActionYmlCheckResult =
  | { ok: true }
  | { ok: false; errors: string[] };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * --check: fail on flattened names in generated or current YAML, a would-be
 * generated flattened input, or a stale/missing action.yml.
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

  if (currentText === null) {
    errors.push("action.yml is missing; run `pnpm generate-action`.");
  } else {
    try {
      assertNoFlattenedActionInputs(currentText);
    } catch (err) {
      errors.push(`Current action.yml: ${errorMessage(err)}`);
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
