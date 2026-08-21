import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeWorkflowCommand, logWorkflowWarning } from "./workflow-log.ts";

const MESSAGE = "100%\r\n";
const GROUP = "http json\n";
const ESCAPED_MESSAGE = "100%25%0D%0A";
const ESCAPED_GROUP = "http json%0A";
const TOKEN = "ghs_test_token";
const HTTP_TOKEN = "fixture-http-token-xyz";
const PUBLIC_LINE =
  "http json fail_widget code=http_status status=401 host=example.com attempt=1";
const PUBLIC_GROUP = "http json";

function capturedWrites(spy: {
  mock: { calls: readonly unknown[][] };
}): string {
  return spy.mock.calls.map((args) => String(args[0] ?? "")).join("");
}

function stdio(): { stdout: string; stderr: string; haystack: string } {
  const stdout = capturedWrites(vi.mocked(process.stdout.write));
  const stderr = capturedWrites(vi.mocked(process.stderr.write));
  return { stdout, stderr, haystack: `${stdout}${stderr}` };
}

function expectNoSecrets(haystack: string): void {
  expect(haystack).not.toContain(TOKEN);
  expect(haystack).not.toContain(HTTP_TOKEN);
  expect(haystack).not.toContain("Bearer");
  expect(haystack).not.toContain("Authorization");
  expect(haystack).not.toContain("https://");
  expect(haystack).not.toContain("?");
  expect(haystack).not.toContain("#");
}

describe("workflow-log", () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("encodes % before CR/LF so percent-encoded sequences stay intact", () => {
    expect(escapeWorkflowCommand(MESSAGE)).toBe(ESCAPED_MESSAGE);
  });

  it("emits escaped ::warning:: and ::group:: lines when GITHUB_ACTIONS is true", () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    logWorkflowWarning({ message: MESSAGE, group: GROUP });

    const { stdout, stderr, haystack } = stdio();

    expect(stdout).toBe(
      `::warning::${ESCAPED_MESSAGE}\n::group::${ESCAPED_GROUP}\n${MESSAGE}\n::endgroup::\n`,
    );
    expect(stdout).toContain("::warning::");
    expect(stdout).toContain("::group::");
    expect(stdout).not.toContain("::error::");
    expect(stdout).not.toContain("::notice::");
    expect(stderr).toBe(`${MESSAGE}\n`);
    expectNoSecrets(haystack);
  });

  it("writes stderr only when GITHUB_ACTIONS is unset", () => {
    vi.stubEnv("GITHUB_ACTIONS", undefined);
    logWorkflowWarning({ message: MESSAGE, group: GROUP });

    const { stdout, stderr, haystack } = stdio();

    expect(process.env.GITHUB_ACTIONS).toBeUndefined();
    expect(stdout).toBe("");
    expect(stdout).not.toContain("::");
    expect(stderr).toBe(`${MESSAGE}\n`);
    expectNoSecrets(haystack);
  });

  it.each(["", "false"] as const)(
    "writes stderr only when GITHUB_ACTIONS is %j",
    (value) => {
      vi.stubEnv("GITHUB_ACTIONS", value);
      logWorkflowWarning({ message: MESSAGE, group: GROUP });

      const { stdout, stderr, haystack } = stdio();

      expect(stdout).toBe("");
      expect(stdout).not.toContain("::warning::");
      expect(stdout).not.toContain("::group::");
      expect(stderr).toBe(`${MESSAGE}\n`);
      expectNoSecrets(haystack);
    },
  );

  it("stays silent when unused even if GITHUB_ACTIONS is true", () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");

    const { stdout, stderr, haystack } = stdio();

    expect(stdout).toBe("");
    expect(stderr).toBe("");
    expect(stdout).not.toContain("::warning::");
    expect(stdout).not.toContain("::group::");
    expect(stdout).not.toContain("::notice::");
    expectNoSecrets(haystack);
  });

  it("does not emit tokens, Bearer, or URLs from a public fail_widget line", () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    logWorkflowWarning({ message: PUBLIC_LINE, group: PUBLIC_GROUP });

    const { stdout, stderr, haystack } = stdio();

    expect(stderr).toBe(`${PUBLIC_LINE}\n`);
    expect(stdout).toContain(`::warning::${PUBLIC_LINE}\n`);
    expect(stdout).toContain(`::group::${PUBLIC_GROUP}\n`);
    expect(stdout).toContain(`${PUBLIC_LINE}\n`);
    expect(stdout).toContain("::endgroup::\n");
    expectNoSecrets(haystack);
  });
});
