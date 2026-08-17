export {
  ACTION_USER_YAML_DEFAULT,
  ACTION_YML_BRANDING_COLOR,
  ACTION_YML_BRANDING_ICON,
  ACTION_YML_DESCRIPTION,
  ACTION_YML_FILENAME,
  ACTION_YML_MAIN,
  ACTION_YML_NAME,
  ACTION_YML_RUNS_USING,
  type ActionInputSpec,
  flattenedGeneratedInputNames,
  generateActionYml,
  renderActionYml,
  THIN_ACTION_INPUT_NAMES,
  THIN_ACTION_INPUTS,
} from "./action-yml.ts";
export {
  type ActionYmlCheckResult,
  checkActionYml,
} from "./check.ts";
export { main as generateActionCli } from "./cli.ts";
export {
  assertNoFlattenedActionInputs,
  BANNED_FLATTENED_INPUT_NAMES,
  FLATTENED_ACTION_INPUT_NAME,
  findFlattenedActionInputs,
  isFlattenedActionInputName,
} from "./flatten.ts";
