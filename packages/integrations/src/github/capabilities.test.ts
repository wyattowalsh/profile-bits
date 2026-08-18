import type { TokenClass } from "@profile-bits/core";
import {
  capabilitiesFromProbe,
  decideContributionsField,
  decideIncludePrivate,
  TOKEN_CLASSES,
} from "@profile-bits/core";
import { describe, expect, it } from "vitest";
import { isProbeUserMismatch, mapGithubCapabilities } from "./capabilities.js";

const OCTOCAT = "octocat";
const HUBOT = "hubot";

describe("mapGithubCapabilities", () => {
  it("disables private and contributions when probe login ≠ user (no invented 0)", () => {
    const capabilities = mapGithubCapabilities({
      probe: { login: OCTOCAT },
      configuredUser: HUBOT,
      tokenClass: "user_pat",
    });

    expect(isProbeUserMismatch({ login: OCTOCAT }, HUBOT)).toBe(true);
    expect(capabilities.canPrivate).toBe(false);
    expect(capabilities.canContributions).toBe(false);
    expect(
      decideIncludePrivate({
        includePrivate: true,
        canPrivate: capabilities.canPrivate,
      }),
    ).toBe("fail_widget");
    expect(
      decideContributionsField({
        requested: true,
        canContributions: capabilities.canContributions,
      }),
    ).toEqual({
      include: false,
      skipped: ["github/stats:contributions"],
      renderZero: false,
    });
  });

  it("lets a matching user PAT set canGist, canPrivate, and canContributions", () => {
    expect(
      mapGithubCapabilities({
        probe: { login: OCTOCAT },
        configuredUser: OCTOCAT,
        tokenClass: "user_pat",
      }),
    ).toEqual({
      canPrivate: true,
      canContributions: true,
      canGist: true,
    });
  });

  it("does not grant canGist on an actions installation token", () => {
    expect(
      mapGithubCapabilities({
        probe: { login: OCTOCAT },
        configuredUser: OCTOCAT,
        tokenClass: "actions_installation",
      }),
    ).toEqual({
      canPrivate: false,
      canContributions: false,
      canGist: false,
    });
  });

  it("keeps canGist for a PAT even when the probe user mismatches", () => {
    expect(
      mapGithubCapabilities({
        probe: { login: OCTOCAT },
        configuredUser: HUBOT,
        tokenClass: "user_pat",
      }).canGist,
    ).toBe(true);
  });

  it("matches core auth-policy for every token class (no second matrix)", () => {
    const cases: readonly {
      probeLogin: string;
      configuredUser: string;
      tokenClass: TokenClass;
    }[] = TOKEN_CLASSES.flatMap((tokenClass) => [
      {
        probeLogin: OCTOCAT,
        configuredUser: OCTOCAT,
        tokenClass,
      },
      {
        probeLogin: OCTOCAT,
        configuredUser: HUBOT,
        tokenClass,
      },
      {
        probeLogin: "Octocat",
        configuredUser: OCTOCAT,
        tokenClass,
      },
    ]);

    for (const input of cases) {
      expect(
        mapGithubCapabilities({
          probe: { login: input.probeLogin },
          configuredUser: input.configuredUser,
          tokenClass: input.tokenClass,
        }),
      ).toEqual(capabilitiesFromProbe(input));
    }
  });
});
