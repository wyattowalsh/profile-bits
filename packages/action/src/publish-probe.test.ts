import { afterEach, describe, expect, it, vi } from "vitest";
import { publishProbeFromGithubToken } from "./publish-probe.ts";

const PAT_CLASSIC = "ghp_probe_secret_do_not_log";
const PAT_FINE_GRAINED = "github_pat_probe_secret_do_not_log";
const PAT_OAUTH = "gho_probe_secret_do_not_log";
const INSTALLATION = "ghs_probe_secret_do_not_log";
const APP_USER = "ghu_probe_secret_do_not_log";
const APP_REFRESH = "ghy_probe_secret_do_not_log";

const PUBLIC_FALSE = {
  canPrivate: false,
  canContributions: false,
} as const;

const consoleSpies = [
  vi.spyOn(console, "log").mockImplementation(() => {}),
  vi.spyOn(console, "info").mockImplementation(() => {}),
  vi.spyOn(console, "warn").mockImplementation(() => {}),
  vi.spyOn(console, "error").mockImplementation(() => {}),
  vi.spyOn(console, "debug").mockImplementation(() => {}),
];

afterEach(() => {
  vi.clearAllMocks();
});

function serializedSpyArgs(): string {
  return consoleSpies
    .flatMap((spy) => spy.mock.calls.flat())
    .map((value) => String(value))
    .join("\n");
}

describe("publishProbeFromGithubToken", () => {
  it.each([
    { token: PAT_CLASSIC, label: "ghp_" },
    { token: PAT_FINE_GRAINED, label: "github_pat_" },
    { token: PAT_OAUTH, label: "gho_" },
  ])("maps $label to user_pat with canGist", ({ token }) => {
    expect(publishProbeFromGithubToken(token)).toEqual({
      tokenClass: "user_pat",
      capabilities: { ...PUBLIC_FALSE, canGist: true },
    });
  });

  it("maps ghs_ to actions_installation without canGist", () => {
    expect(publishProbeFromGithubToken(INSTALLATION)).toEqual({
      tokenClass: "actions_installation",
      capabilities: { ...PUBLIC_FALSE, canGist: false },
    });
  });

  it.each([
    { token: APP_USER, label: "ghu_" },
    { token: APP_REFRESH, label: "ghy_" },
  ])("maps $label to github_app_install without canGist", ({ token }) => {
    expect(publishProbeFromGithubToken(token)).toEqual({
      tokenClass: "github_app_install",
      capabilities: { ...PUBLIC_FALSE, canGist: false },
    });
  });

  it("never logs the PAT", () => {
    publishProbeFromGithubToken(PAT_CLASSIC);
    publishProbeFromGithubToken(PAT_FINE_GRAINED);
    publishProbeFromGithubToken(PAT_OAUTH);
    const logged = serializedSpyArgs();
    expect(logged).not.toContain(PAT_CLASSIC);
    expect(logged).not.toContain(PAT_FINE_GRAINED);
    expect(logged).not.toContain(PAT_OAUTH);
    expect(logged).not.toContain("ghp_");
    expect(logged).not.toContain("github_pat_");
    expect(logged).not.toContain("gho_");
  });
});
