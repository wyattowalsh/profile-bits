import { describe, expect, it } from "vitest";
import {
  CONTRIBUTIONS_SKIP_ID,
  capabilitiesFromProbe,
  classifyGithubHttp,
  classifyHttp,
  decideActionToken,
  decideAllGithubWidgetsSkipped,
  decideContributionsField,
  decideGistOutput,
  decideHttpOnlyRunFailed,
  decideHttpTokenEnv,
  decideIncludePrivate,
  decideWakatimeToken,
  isMissingToken,
  restrictCapabilitiesForUser,
  usesGithubIntegration,
  usesHttpIntegration,
  widgetOutputFlags,
} from "./auth-policy.js";

describe("isMissingToken", () => {
  it("treats undefined as missing", () => {
    expect(isMissingToken(undefined)).toBe(true);
  });

  it("treats null as missing", () => {
    expect(isMissingToken(null)).toBe(true);
  });

  it("treats empty string as missing", () => {
    expect(isMissingToken("")).toBe(true);
  });

  it("treats whitespace as missing", () => {
    expect(isMissingToken("   ")).toBe(true);
    expect(isMissingToken("\t\n")).toBe(true);
  });

  it("treats a non-empty token as present", () => {
    expect(isMissingToken("github_pat_example")).toBe(false);
  });
});

describe("decideActionToken", () => {
  it("fails the job on an empty Action token (never unauthenticated)", () => {
    expect(decideActionToken("")).toBe("fail_job");
    expect(decideActionToken(undefined)).toBe("fail_job");
  });

  it("fails the job on a whitespace Action token", () => {
    expect(decideActionToken("  \n")).toBe("fail_job");
  });

  it("allows the run to proceed when a token is present", () => {
    expect(decideActionToken("ghs_example")).toBe("render");
  });
});

describe("decideWakatimeToken", () => {
  it("fails the job when the pack is on and the token is missing", () => {
    expect(decideWakatimeToken({ token: undefined, packEnabled: true })).toBe(
      "fail_job",
    );
    expect(decideWakatimeToken({ token: "", packEnabled: true })).toBe(
      "fail_job",
    );
    expect(decideWakatimeToken({ token: "  \n", packEnabled: true })).toBe(
      "fail_job",
    );
  });

  it("does not require a token when the pack is absent", () => {
    expect(decideWakatimeToken({ token: undefined, packEnabled: false })).toBe(
      "render",
    );
    expect(decideWakatimeToken({ token: "", packEnabled: false })).toBe(
      "render",
    );
  });

  it("allows the run when the pack is on and a token is present", () => {
    expect(
      decideWakatimeToken({ token: "waka_example", packEnabled: true }),
    ).toBe("render");
  });
});

describe("capabilitiesFromProbe", () => {
  it("disables canPrivate and canContributions when probe login ≠ user", () => {
    const capabilities = capabilitiesFromProbe({
      probeLogin: "octocat",
      configuredUser: "hubot",
      tokenClass: "user_pat",
    });
    expect(capabilities.canPrivate).toBe(false);
    expect(capabilities.canContributions).toBe(false);
    expect(capabilities.canGist).toBe(true);
  });

  it("enables private and contributions for a matching user PAT", () => {
    const capabilities = capabilitiesFromProbe({
      probeLogin: "Octocat",
      configuredUser: "octocat",
      tokenClass: "user_pat",
    });
    expect(capabilities).toEqual({
      canPrivate: true,
      canContributions: true,
      canGist: true,
    });
  });

  it("never grants gist or private on an actions installation token", () => {
    const capabilities = capabilitiesFromProbe({
      probeLogin: "octocat",
      configuredUser: "octocat",
      tokenClass: "actions_installation",
    });
    expect(capabilities).toEqual({
      canPrivate: false,
      canContributions: false,
      canGist: false,
    });
  });
});

describe("restrictCapabilitiesForUser", () => {
  it("does not invent zeros: mismatch clears private and contributions only", () => {
    const restricted = restrictCapabilitiesForUser(
      { canPrivate: true, canContributions: true, canGist: true },
      "octocat",
      "someone-else",
    );
    expect(restricted.canPrivate).toBe(false);
    expect(restricted.canContributions).toBe(false);
    expect(restricted.canGist).toBe(true);
  });
});

describe("decideIncludePrivate", () => {
  it("fails the widget when include_private is true without canPrivate", () => {
    expect(
      decideIncludePrivate({ includePrivate: true, canPrivate: false }),
    ).toBe("fail_widget");
  });

  it("renders when include_private is true and canPrivate is true", () => {
    expect(
      decideIncludePrivate({ includePrivate: true, canPrivate: true }),
    ).toBe("render");
  });

  it("renders public widgets when include_private is false", () => {
    expect(
      decideIncludePrivate({ includePrivate: false, canPrivate: false }),
    ).toBe("render");
  });
});

describe("decideContributionsField", () => {
  it("skips contributions without rendering 0 when capability is missing", () => {
    const decision = decideContributionsField({
      requested: true,
      canContributions: false,
    });
    expect(decision.include).toBe(false);
    expect(decision.renderZero).toBe(false);
    expect(decision.skipped).toEqual([CONTRIBUTIONS_SKIP_ID]);
    expect(CONTRIBUTIONS_SKIP_ID).toBe("github/stats:contributions");
  });

  it("includes contributions when requested and capable", () => {
    expect(
      decideContributionsField({ requested: true, canContributions: true }),
    ).toEqual({ include: true, skipped: [], renderZero: false });
  });
});

describe("decideGistOutput", () => {
  it("fails the run when output_action is gist without canGist", () => {
    expect(
      decideGistOutput({ outputAction: "gist", format: "svg", canGist: false }),
    ).toBe("fail_run");
  });

  it("fails the run when gist format is not svg", () => {
    expect(
      decideGistOutput({ outputAction: "gist", format: "png", canGist: true }),
    ).toBe("fail_run");
  });

  it("renders gist when canGist and format is svg", () => {
    expect(
      decideGistOutput({ outputAction: "gist", format: "svg", canGist: true }),
    ).toBe("render");
  });

  it("does not apply gist rules to commit output", () => {
    expect(
      decideGistOutput({
        outputAction: "commit",
        format: "png",
        canGist: false,
      }),
    ).toBe("render");
  });
});

describe("decideAllGithubWidgetsSkipped", () => {
  it("fails the job when every github widget is skipped and allow_skipped is false", () => {
    expect(
      decideAllGithubWidgetsSkipped({
        widgets: [
          { id: "stats", outcome: "skip_widget" },
          { id: "languages", outcome: "skip_widget" },
        ],
        allowSkipped: false,
      }),
    ).toBe("fail_job");
  });

  it("allows the job to complete when allow_skipped is true", () => {
    expect(
      decideAllGithubWidgetsSkipped({
        widgets: [
          { id: "stats", outcome: "skip_widget" },
          { id: "languages", outcome: "skip_widget" },
        ],
        allowSkipped: true,
      }),
    ).toBe("render");
  });

  it("does not fail a demo-only run with no github widgets", () => {
    expect(
      decideAllGithubWidgetsSkipped({
        widgets: [{ id: "demo", outcome: "skip_widget" }],
        allowSkipped: false,
      }),
    ).toBe("render");
  });

  it("does not treat a failed feed widget as a github skip", () => {
    expect(
      decideAllGithubWidgetsSkipped({
        widgets: [
          { id: "stats", outcome: "render" },
          { id: "feed", outcome: "fail_widget" },
        ],
        allowSkipped: false,
      }),
    ).toBe("render");
  });

  it("does not treat a failed coding widget as a github skip", () => {
    expect(
      decideAllGithubWidgetsSkipped({
        widgets: [
          { id: "stats", outcome: "render" },
          { id: "coding", outcome: "fail_widget" },
        ],
        allowSkipped: false,
      }),
    ).toBe("render");
  });
});

describe("widgetOutputFlags", () => {
  it("does not write files or count data-changed for a skipped widget", () => {
    expect(widgetOutputFlags("skip_widget")).toEqual({
      write: false,
      dataChanged: false,
    });
  });

  it("allows writes only for render outcomes", () => {
    expect(widgetOutputFlags("render")).toEqual({
      write: true,
      dataChanged: true,
    });
    expect(widgetOutputFlags("fail_widget").write).toBe(false);
  });
});

describe("classifyGithubHttp", () => {
  it("fails the run on 401", () => {
    expect(classifyGithubHttp({ status: 401 })).toBe("fail_run");
  });

  it("fails after backoff on 403 secondary rate limit", () => {
    expect(
      classifyGithubHttp({
        status: 403,
        body: { message: "You have exceeded a secondary rate limit" },
      }),
    ).toBe("fail_after_backoff");
  });

  it("fails after backoff on 403 abuse detection", () => {
    expect(
      classifyGithubHttp({
        status: 403,
        body: "abuse detection mechanism",
      }),
    ).toBe("fail_after_backoff");
  });

  it("fails after backoff on GraphQL HTTP 200 with errors[] (not skip_widget)", () => {
    expect(
      classifyGithubHttp({
        status: 200,
        body: { errors: [{ message: "RATE_LIMITED" }] },
      }),
    ).toBe("fail_after_backoff");
  });

  it("fails after backoff on GraphQL HTTP 200 with remaining 0 (not skip_widget)", () => {
    expect(
      classifyGithubHttp({
        status: 200,
        graphql: true,
        remaining: 0,
      }),
    ).toBe("fail_after_backoff");
  });

  it("fails the widget on 404 user", () => {
    expect(classifyGithubHttp({ status: 404 })).toBe("fail_widget");
  });

  it("fails after backoff on 429", () => {
    expect(classifyGithubHttp({ status: 429 })).toBe("fail_after_backoff");
  });

  it("renders HTTP 200 zeros for capable public fields (not skip)", () => {
    expect(
      classifyGithubHttp({
        status: 200,
        body: { followers: 0, public_repos: 0 },
      }),
    ).toBe("render");
  });
});

describe("usesGithubIntegration", () => {
  it("is false for coding and feed and true for stats/languages", () => {
    expect(usesGithubIntegration("coding")).toBe(false);
    expect(usesGithubIntegration("feed")).toBe(false);
    expect(usesGithubIntegration("stats")).toBe(true);
    expect(usesGithubIntegration("languages")).toBe(true);
    expect(usesGithubIntegration("demo")).toBe(false);
    expect(usesGithubIntegration("json")).toBe(false);
  });
});

describe("usesHttpIntegration", () => {
  it("is true for json and chips", () => {
    expect(usesHttpIntegration("json")).toBe(true);
    expect(usesHttpIntegration("chips")).toBe(true);
    expect(usesHttpIntegration("stats")).toBe(false);
    expect(usesHttpIntegration("feed")).toBe(false);
    expect(usesHttpIntegration("coding")).toBe(false);
  });
});

describe("classifyHttp", () => {
  it("fails 401 and 404 without retry", () => {
    expect(classifyHttp({ status: 401 })).toBe("fail_widget");
    expect(classifyHttp({ status: 404 })).toBe("fail_widget");
  });

  it("retries 403 429 and 5xx then fail_widget via fail_after_backoff", () => {
    expect(classifyHttp({ status: 403 })).toBe("fail_after_backoff");
    expect(classifyHttp({ status: 429 })).toBe("fail_after_backoff");
    expect(classifyHttp({ status: 500 })).toBe("fail_after_backoff");
    expect(classifyHttp({ status: 503 })).toBe("fail_after_backoff");
  });

  it("treats 2xx as render (JSON parse is separate)", () => {
    expect(classifyHttp({ status: 200 })).toBe("render");
  });
});

describe("decideHttpTokenEnv", () => {
  it("sends no Authorization when the env name is unset", () => {
    expect(
      decideHttpTokenEnv({ envName: undefined, envValue: "secret" }),
    ).toEqual({ outcome: "render", authorization: undefined });
    expect(decideHttpTokenEnv({ envName: "  ", envValue: "secret" })).toEqual({
      outcome: "render",
      authorization: undefined,
    });
  });

  it("fails the widget when the named env is empty", () => {
    expect(decideHttpTokenEnv({ envName: "HTTP_TOKEN", envValue: "" })).toEqual(
      { outcome: "fail_widget" },
    );
    expect(
      decideHttpTokenEnv({ envName: "HTTP_TOKEN", envValue: "  \n" }),
    ).toEqual({ outcome: "fail_widget" });
  });

  it("prefixes Bearer unless a scheme is already present", () => {
    expect(
      decideHttpTokenEnv({ envName: "HTTP_TOKEN", envValue: "secret" }),
    ).toEqual({ outcome: "render", authorization: "Bearer secret" });
    expect(
      decideHttpTokenEnv({ envName: "HTTP_TOKEN", envValue: "Basic abc" }),
    ).toEqual({ outcome: "render", authorization: "Basic abc" });
  });
});

describe("decideHttpOnlyRunFailed", () => {
  it("fails the job when json is the only widget and it did not render", () => {
    expect(
      decideHttpOnlyRunFailed({
        widgets: [{ id: "json", outcome: "fail_widget" }],
      }),
    ).toBe("fail_job");
  });

  it("does not fail github widgets because json failed", () => {
    expect(
      decideHttpOnlyRunFailed({
        widgets: [
          { id: "stats", outcome: "render" },
          { id: "json", outcome: "fail_widget" },
        ],
      }),
    ).toBe("render");
  });

  it("allows skipped when allow_skipped is true", () => {
    expect(
      decideHttpOnlyRunFailed({
        widgets: [{ id: "json", outcome: "fail_widget" }],
        allowSkipped: true,
      }),
    ).toBe("render");
  });

  it("fails the job when chips is the only widget and it did not render", () => {
    expect(
      decideHttpOnlyRunFailed({
        widgets: [{ id: "chips", outcome: "fail_widget" }],
      }),
    ).toBe("fail_job");
  });

  it("does not fail github widgets because chips failed", () => {
    expect(
      decideHttpOnlyRunFailed({
        widgets: [
          { id: "stats", outcome: "render" },
          { id: "chips", outcome: "fail_widget" },
        ],
      }),
    ).toBe("render");
  });

  it("fails the job when json and chips both fail (all http, none rendered)", () => {
    expect(
      decideHttpOnlyRunFailed({
        widgets: [
          { id: "json", outcome: "fail_widget" },
          { id: "chips", outcome: "fail_widget" },
        ],
      }),
    ).toBe("fail_job");
  });

  it("renders when json rendered even if chips failed", () => {
    expect(
      decideHttpOnlyRunFailed({
        widgets: [
          { id: "json", outcome: "render" },
          { id: "chips", outcome: "fail_widget" },
        ],
      }),
    ).toBe("render");
  });

  it("allows skipped chips when allow_skipped is true", () => {
    expect(
      decideHttpOnlyRunFailed({
        widgets: [{ id: "chips", outcome: "fail_widget" }],
        allowSkipped: true,
      }),
    ).toBe("render");
  });
});
