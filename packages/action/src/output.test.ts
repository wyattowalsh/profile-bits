import { describe, expect, it } from "vitest";
import {
  createNoopOutputPorts,
  INSTALLATION_COMMIT_MESSAGE,
  shouldIncludeSkipCi,
  USER_PAT_COMMIT_MESSAGE,
  widgetCommitMessage,
} from "./output.ts";

describe("widgetCommitMessage", () => {
  it("includes [skip ci] for installation-token commits", () => {
    expect(widgetCommitMessage("actions_installation")).toBe(
      INSTALLATION_COMMIT_MESSAGE,
    );
    expect(widgetCommitMessage("github_app_install")).toBe(
      INSTALLATION_COMMIT_MESSAGE,
    );
    expect(shouldIncludeSkipCi("actions_installation")).toBe(true);
    expect(INSTALLATION_COMMIT_MESSAGE).toContain("[skip ci]");
  });

  it("omits [skip ci] when the committer is a user PAT that should retrigger", () => {
    expect(widgetCommitMessage("user_pat")).toBe(USER_PAT_COMMIT_MESSAGE);
    expect(shouldIncludeSkipCi("user_pat")).toBe(false);
    expect(USER_PAT_COMMIT_MESSAGE).not.toContain("[skip ci]");
  });
});

describe("createNoopOutputPorts", () => {
  it("never reports a commit", async () => {
    const ports = createNoopOutputPorts();
    const result = await ports.commitWidgets({
      mode: "commit",
      files: [],
      outputDir: "profile-bits",
      dryRun: false,
      tokenClass: "actions_installation",
      message: INSTALLATION_COMMIT_MESSAGE,
      dataChanged: true,
    });
    expect(result.didCommit).toBe(false);
  });
});
