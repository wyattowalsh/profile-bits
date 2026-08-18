import { describe, expect, it } from "vitest";
import { isGithubOwnedHost, normalizeHostname } from "./hosts.js";

describe("isGithubOwnedHost", () => {
  it("blocks github.com", () => {
    expect(isGithubOwnedHost("github.com")).toBe(true);
  });

  it("blocks api.github.com. after stripping a trailing dot", () => {
    expect(isGithubOwnedHost("api.github.com.")).toBe(true);
    expect(normalizeHostname("api.github.com.")).toBe("api.github.com");
  });

  it("blocks gist.github.com", () => {
    expect(isGithubOwnedHost("gist.github.com")).toBe(true);
  });

  it("blocks raw.githubusercontent.com", () => {
    expect(isGithubOwnedHost("raw.githubusercontent.com")).toBe(true);
  });

  it("allows gitlab.com", () => {
    expect(isGithubOwnedHost("gitlab.com")).toBe(false);
  });

  it("case-folds GitHub hostnames", () => {
    expect(isGithubOwnedHost("GitHub.COM")).toBe(true);
    expect(isGithubOwnedHost("API.GITHUB.COM")).toBe(true);
    expect(isGithubOwnedHost("RAW.GitHubusercontent.COM")).toBe(true);
    expect(isGithubOwnedHost("GitLab.COM")).toBe(false);
  });
});
