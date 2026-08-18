import {
  assertStaticActionToken,
  STATIC_AUTH,
  STATIC_ID,
  staticAuthorizationHeader,
  staticRequiresAuthorization,
} from "./auth.js";
import {
  getStaticFixtures,
  STATIC_FIXED_NOW,
  STATIC_FIXTURE_USER,
  type StaticDemoFixture,
  type StaticFixtures,
  type StaticLanguageFixture,
  type StaticRepoFixture,
  type StaticStatsFixture,
  type StaticUserFixture,
} from "./fixtures.js";
import type { StaticInputs } from "./inputs.js";
import { STATIC_SCOPES } from "./scopes.js";

export type StaticClock = {
  now: () => Date;
};

export type StaticRunContext = {
  inputs?: StaticInputs;
  clock?: StaticClock;
};

const clients = new WeakMap<object, StaticClient>();

/**
 * One static client per Action / playground / generate run.
 * Shared by every widget that declares integration `static`.
 */
export function getSharedStaticClient(
  run: object,
  context: StaticRunContext = {},
): StaticClient {
  const existing = clients.get(run);
  if (existing !== undefined) {
    return existing;
  }
  const created = new StaticClient(context);
  clients.set(run, created);
  return created;
}

export class StaticClient {
  readonly id = STATIC_ID;
  readonly auth = STATIC_AUTH;
  readonly scopes = STATIC_SCOPES;
  readonly user = STATIC_FIXTURE_USER;

  private readonly clock: StaticClock | undefined;

  constructor(context: StaticRunContext = {}) {
    this.clock = context.clock;
    assertStaticActionToken();
    if (staticRequiresAuthorization()) {
      throw new Error("static: auth none must not require Authorization");
    }
  }

  fixtures(): StaticFixtures {
    return getStaticFixtures();
  }

  demo(): StaticDemoFixture {
    return getStaticFixtures().demo;
  }

  userRecord(): StaticUserFixture {
    return getStaticFixtures().user;
  }

  stats(): StaticStatsFixture {
    return getStaticFixtures().stats;
  }

  repos(): readonly StaticRepoFixture[] {
    return getStaticFixtures().repos;
  }

  languages(): readonly StaticLanguageFixture[] {
    return getStaticFixtures().languages;
  }

  generatedAt(): string {
    return STATIC_FIXED_NOW;
  }

  /** Fixture clock unless a test injects `clock.now`. Never live `Date.now()`. */
  now(): Date {
    return this.clock?.now() ?? new Date(STATIC_FIXED_NOW);
  }

  authorizationHeader(): Readonly<Record<string, string>> {
    return staticAuthorizationHeader();
  }
}
