import { classifyGithubHttp } from "@profile-bits/core";
import { describe, expect, it, vi } from "vitest";
import {
  classifyGithubRateLimit,
  classifyGraphqlResponse,
  createGithubRateLimit,
  logGraphqlRateLimitCost,
  type RateLimitLogger,
  readGraphqlRateLimitCost,
} from "./rate-limit.js";

const OCTOCAT = "octocat";

function recordingLogger(): {
  logger: RateLimitLogger;
  messages: {
    message: string;
    fields?: { cost: number; operation?: string };
  }[];
} {
  const messages: {
    message: string;
    fields?: { cost: number; operation?: string };
  }[] = [];
  return {
    messages,
    logger: {
      info(message, fields) {
        messages.push({ message, fields });
      },
    },
  };
}

describe("classifyGithubRateLimit", () => {
  it("wraps core classifyGithubHttp (does not fork a second matrix)", () => {
    expect(classifyGithubRateLimit).not.toBe(classifyGithubHttp);
    const input = { status: 401 };
    expect(classifyGithubRateLimit(input)).toBe(classifyGithubHttp(input));
  });

  it("fails the run on 401", () => {
    expect(classifyGithubRateLimit({ status: 401 })).toBe("fail_run");
  });

  it("fails after backoff on 403 secondary rate limit for octocat (not skip_widget)", () => {
    const outcome = classifyGithubRateLimit({
      status: 403,
      body: {
        message: "You have exceeded a secondary rate limit. Please wait.",
        documentation_url:
          "https://docs.github.com/rest/overview/rate-limits-for-the-rest-api",
        login: OCTOCAT,
      },
    });
    expect(outcome).toBe("fail_after_backoff");
    expect(outcome).not.toBe("skip_widget");
  });

  it("fails after backoff on 403 abuse detection", () => {
    expect(
      classifyGithubRateLimit({
        status: 403,
        body: "abuse detection mechanism triggered for octocat",
      }),
    ).toBe("fail_after_backoff");
  });

  it("fails after backoff on 403 with Retry-After (secondary family)", () => {
    expect(
      classifyGithubRateLimit({
        status: 403,
        headers: { "retry-after": "30" },
        body: { message: "API rate limit exceeded for user octocat" },
      }),
    ).toBe("fail_after_backoff");
  });

  it("fails the run on a non-secondary 403 (does not contradict core)", () => {
    expect(
      classifyGithubRateLimit({
        status: 403,
        body: { message: "Resource not accessible by integration" },
      }),
    ).toBe("fail_run");
  });

  it("fails after backoff on 429", () => {
    expect(classifyGithubRateLimit({ status: 429 })).toBe("fail_after_backoff");
  });

  it("fails the widget on 404 user", () => {
    expect(
      classifyGithubRateLimit({
        status: 404,
        body: { message: "Not Found", login: OCTOCAT },
      }),
    ).toBe("fail_widget");
  });
});

describe("classifyGraphqlResponse", () => {
  it("fails after backoff on HTTP 200 with errors[] (not skip_widget)", () => {
    const outcome = classifyGraphqlResponse({
      status: 200,
      body: {
        data: { user: { login: OCTOCAT } },
        errors: [{ type: "RATE_LIMITED", message: "API rate limit exceeded" }],
      },
    });
    expect(outcome).toBe("fail_after_backoff");
    expect(outcome).not.toBe("skip_widget");
    expect(outcome).not.toBe("render");
  });

  it("fails after backoff on HTTP 200 with remaining 0 (not skip_widget)", () => {
    const outcome = classifyGraphqlResponse({
      status: 200,
      body: {
        data: {
          user: { login: OCTOCAT },
          rateLimit: { cost: 5, remaining: 0, limit: 1000 },
        },
      },
    });
    expect(outcome).toBe("fail_after_backoff");
    expect(outcome).not.toBe("skip_widget");
  });

  it("fails after backoff when remaining is passed as 0 without errors", () => {
    expect(
      classifyGraphqlResponse({
        status: 200,
        remaining: 0,
        body: { data: { user: { login: OCTOCAT } } },
      }),
    ).toBe("fail_after_backoff");
  });

  it("fails after backoff when errors[] and remaining 0 both apply", () => {
    expect(
      classifyGraphqlResponse({
        status: 200,
        body: {
          errors: [{ message: "something went wrong" }],
          data: {
            rateLimit: { cost: 1, remaining: 0 },
          },
        },
      }),
    ).toBe("fail_after_backoff");
  });

  it("renders GraphQL HTTP 200 with remaining > 0 and no errors", () => {
    expect(
      classifyGraphqlResponse({
        status: 200,
        body: {
          data: {
            user: { login: OCTOCAT },
            rateLimit: { cost: 1, remaining: 4999, limit: 5000 },
          },
        },
      }),
    ).toBe("render");
  });

  it("logs rateLimit.cost through the injectable logger (no secrets)", () => {
    const { logger, messages } = recordingLogger();
    const token = "ghs_this_must_never_be_logged";
    const outcome = classifyGraphqlResponse({
      status: 200,
      logger,
      operation: "nodes",
      body: {
        data: {
          user: { login: OCTOCAT },
          rateLimit: { cost: 5, remaining: 990, limit: 1000 },
        },
        extensions: { authorization: token },
      },
    });
    expect(outcome).toBe("render");
    expect(messages).toEqual([
      {
        message: "github.graphql.rateLimit.cost",
        fields: { cost: 5, operation: "nodes" },
      },
    ]);
    expect(JSON.stringify(messages)).not.toContain(token);
    expect(JSON.stringify(messages)).not.toContain("ghs_");
  });
});

describe("logGraphqlRateLimitCost", () => {
  it("logs cost from data.rateLimit for a nodes batch", () => {
    const { logger, messages } = recordingLogger();
    logGraphqlRateLimitCost(
      logger,
      {
        data: {
          nodes: [{ id: "R_octocat" }],
          rateLimit: { cost: 5, remaining: 995 },
        },
      },
      "nodes",
    );
    expect(messages).toEqual([
      {
        message: "github.graphql.rateLimit.cost",
        fields: { cost: 5, operation: "nodes" },
      },
    ]);
  });

  it("logs cost for contributionsCollection from a top-level rateLimit", () => {
    const { logger, messages } = recordingLogger();
    logGraphqlRateLimitCost(
      logger,
      {
        data: { user: { login: OCTOCAT, contributionsCollection: {} } },
        rateLimit: { cost: 1, remaining: 999 },
      },
      "contributionsCollection",
    );
    expect(messages[0]?.fields).toEqual({
      cost: 1,
      operation: "contributionsCollection",
    });
  });

  it("does not log when rateLimit.cost is absent", () => {
    const { logger, messages } = recordingLogger();
    logGraphqlRateLimitCost(logger, { data: { user: { login: OCTOCAT } } });
    expect(messages).toEqual([]);
  });

  it("never forwards secret-shaped fields to the logger", () => {
    const info = vi.fn();
    logGraphqlRateLimitCost(
      { info },
      {
        data: { rateLimit: { cost: 2, remaining: 10 } },
        token: "github_pat_secret",
      },
      "nodes",
    );
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith("github.graphql.rateLimit.cost", {
      cost: 2,
      operation: "nodes",
    });
    expect(info.mock.calls[0]?.[1]).not.toHaveProperty("token");
  });
});

describe("readGraphqlRateLimitCost", () => {
  it("reads nested and top-level rateLimit.cost", () => {
    expect(readGraphqlRateLimitCost({ data: { rateLimit: { cost: 5 } } })).toBe(
      5,
    );
    expect(readGraphqlRateLimitCost({ rateLimit: { cost: 0 } })).toBe(0);
    expect(
      readGraphqlRateLimitCost({ data: { user: { login: OCTOCAT } } }),
    ).toBe(undefined);
  });
});

describe("createGithubRateLimit", () => {
  it("binds the injectable logger for classifyGraphql and logCost", () => {
    const { logger, messages } = recordingLogger();
    const rateLimit = createGithubRateLimit(logger);
    expect(rateLimit.classify({ status: 429 })).toBe("fail_after_backoff");
    expect(rateLimit.classify({ status: 401 })).toBe("fail_run");
    const outcome = rateLimit.classifyGraphql({
      status: 200,
      body: {
        errors: [{ message: "RATE_LIMITED" }],
        data: {
          user: { login: OCTOCAT },
          rateLimit: { cost: 1, remaining: 0 },
        },
      },
      operation: "nodes",
    });
    expect(outcome).toBe("fail_after_backoff");
    rateLimit.logCost(
      { data: { rateLimit: { cost: 1, remaining: 50 } } },
      "contributionsCollection",
    );
    expect(messages).toEqual([
      {
        message: "github.graphql.rateLimit.cost",
        fields: { cost: 1, operation: "nodes" },
      },
      {
        message: "github.graphql.rateLimit.cost",
        fields: { cost: 1, operation: "contributionsCollection" },
      },
    ]);
  });
});
