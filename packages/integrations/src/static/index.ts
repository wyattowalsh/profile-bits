export {
  assertStaticActionToken,
  STATIC_AUTH,
  STATIC_ID,
  type StaticAuth,
  staticAuthorizationHeader,
  staticRequiresAuthorization,
} from "./auth.js";
export {
  getSharedStaticClient,
  StaticClient,
  type StaticClock,
  type StaticRunContext,
} from "./client.js";
export {
  getStaticFixtures,
  loadPreviewFixtures,
  loadStaticFixtures,
  parseStaticFixtures,
  STATIC_FIXED_NOW,
  STATIC_FIXTURE_FILE,
  STATIC_FIXTURE_USER,
  type StaticDemoFixture,
  StaticFixtureError,
  type StaticFixtures,
  type StaticLanguageFixture,
  type StaticRepoFixture,
  type StaticStatsFixture,
  type StaticUserFixture,
  staticFixturePath,
} from "./fixtures.js";
export { STATIC_INPUT_DEFAULTS, type StaticInputs } from "./inputs.js";
export { STATIC_SCOPES, type StaticScope } from "./scopes.js";

import { STATIC_AUTH, STATIC_ID } from "./auth.js";
import { STATIC_SCOPES } from "./scopes.js";

export const STATIC_INTEGRATION = {
  id: STATIC_ID,
  auth: STATIC_AUTH,
  scopes: STATIC_SCOPES,
} as const;
