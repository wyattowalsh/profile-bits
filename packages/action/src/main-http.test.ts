import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ACTION_CONFIG_PATH_DEFAULT } from "@profile-bits/core";
import type { HttpFetch, HttpLookup } from "@profile-bits/integrations";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AllGithubWidgetsSkippedError, EngineError } from "./engine.ts";
import { type ConfigFs, MissingGithubTokenError } from "./load-config.ts";
import { runMain } from "./main.ts";

const TOKEN = "ghs_test_token";
const SECRET = "super-secret-http-token-xyz";
const PUBLIC_V4 = "93.184.216.34";
const CWD = "/repo";
const DEFAULT_CONFIG_PATH = `${CWD}/${ACTION_CONFIG_PATH_DEFAULT}`;
const HTTP_TOKEN_ENV = "HTTP_JSON_TOKEN";

const HTTP_JSON_YAML = `version: 1
format: svg
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
        headers:
          X-Profile-Bits: test
`;

function createMemoryFs(files: Readonly<Record<string, string>>): ConfigFs {
  return {
    existsSync(path) {
      return Object.hasOwn(files, path);
    },
    readFileSync(path) {
      if (!Object.hasOwn(files, path)) {
        const error = new Error(`ENOENT: ${path}`) as Error & { code: string };
        error.code = "ENOENT";
        throw error;
      }
      return files[path] ?? "";
    },
  };
}

function publicLookup(): HttpLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function errorText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current != null && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      parts.push(current.name, current.message, current.stack ?? "");
      current = current.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join("\n");
}

describe("runMain http json", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  async function writableCwd(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "profile-bits-http-"));
    tempDirs.push(dir);
    return dir;
  }

  it("writes json.svg for http-only yaml with injected fetch and lookup", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.method).toBe("GET");
      expect(init?.headers?.["X-Profile-Bits"]).toBe("test");
      expect(init?.headers?.Authorization).toBeUndefined();
      return jsonResponse({ name: "octocat", count: 3 });
    });
    const lookup = vi.fn(publicLookup());
    const cwd = await writableCwd();

    const result = await runMain({
      inputs: {
        github_token: TOKEN,
        output_action: "none",
      },
      env: {},
      cwd,
      fs: createMemoryFs({
        [`${cwd}/${ACTION_CONFIG_PATH_DEFAULT}`]: HTTP_JSON_YAML,
      }),
      httpFetch: fetch,
      httpLookup: lookup,
    });

    expect(result.files).toContain("profile-bits/json.svg");
    expect(result.did_commit).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("looks up http_token_env from raw env, not INPUT_*", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<HttpFetch>(async (_url, init) => {
      expect(init?.headers?.Authorization).toBe(`Bearer ${SECRET}`);
      return jsonResponse({ ok: true });
    });

    const cwd = await writableCwd();
    const result = await runMain({
      env: {
        INPUT_GITHUB_TOKEN: TOKEN,
        INPUT_OUTPUT_ACTION: "none",
        INPUT_HTTP_TOKEN_ENV: HTTP_TOKEN_ENV,
        [`INPUT_${HTTP_TOKEN_ENV}`]: "should-not-use",
        [HTTP_TOKEN_ENV]: SECRET,
      },
      cwd,
      fs: createMemoryFs({
        [`${cwd}/${ACTION_CONFIG_PATH_DEFAULT}`]: HTTP_JSON_YAML,
      }),
      httpFetch: fetch,
      httpLookup: publicLookup(),
    });

    expect(result.files).toContain("profile-bits/json.svg");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails the job when the named http token env is empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse({ ok: true }));

    await expect(
      runMain({
        inputs: {
          github_token: TOKEN,
          output_action: "none",
          http_token_env: HTTP_TOKEN_ENV,
        },
        env: { [HTTP_TOKEN_ENV]: "" },
        cwd: CWD,
        fs: createMemoryFs({ [DEFAULT_CONFIG_PATH]: HTTP_JSON_YAML }),
        httpFetch: fetch,
        httpLookup: publicLookup(),
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof EngineError &&
        !(error instanceof AllGithubWidgetsSkippedError) &&
        error.decision === "fail_job",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails the job when the named http token env is unset", async () => {
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse({ ok: true }));

    await expect(
      runMain({
        inputs: {
          github_token: TOKEN,
          output_action: "none",
          http_token_env: HTTP_TOKEN_ENV,
        },
        env: {},
        cwd: CWD,
        fs: createMemoryFs({ [DEFAULT_CONFIG_PATH]: HTTP_JSON_YAML }),
        httpFetch: fetch,
        httpLookup: publicLookup(),
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof EngineError &&
        !(error instanceof AllGithubWidgetsSkippedError) &&
        error.decision === "fail_job",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps secrets out of thrown messages", async () => {
    const fetch = vi.fn<HttpFetch>(async () => {
      throw new Error(`Authorization: Bearer ${SECRET} boom`);
    });

    await expect(
      runMain({
        inputs: {
          github_token: TOKEN,
          output_action: "none",
          http_token_env: HTTP_TOKEN_ENV,
        },
        env: { [HTTP_TOKEN_ENV]: SECRET },
        cwd: CWD,
        fs: createMemoryFs({ [DEFAULT_CONFIG_PATH]: HTTP_JSON_YAML }),
        httpFetch: fetch,
        httpLookup: publicLookup(),
      }),
    ).rejects.toSatisfy((error: unknown) => {
      const text = errorText(error);
      return (
        error instanceof EngineError &&
        error.decision === "fail_job" &&
        !text.includes(SECRET)
      );
    });
  });

  it("still requires github_token for http-only yaml", async () => {
    const fetch = vi.fn<HttpFetch>(async () => jsonResponse({ ok: true }));

    await expect(
      runMain({
        inputs: { output_action: "none" },
        cwd: CWD,
        fs: createMemoryFs({ [DEFAULT_CONFIG_PATH]: HTTP_JSON_YAML }),
        httpFetch: fetch,
        httpLookup: publicLookup(),
      }),
    ).rejects.toBeInstanceOf(MissingGithubTokenError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
