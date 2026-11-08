import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPECS = join(ROOT, "openspec/specs");
const CHANGES = join(ROOT, "openspec/changes");
const ARCHIVE = join(CHANGES, "archive");

function spec(id: string): string {
  return readFileSync(join(SPECS, id, "spec.md"), "utf8");
}

function archivedRepoWidgetDirs(): string[] {
  return readdirSync(ARCHIVE).filter((name: string) =>
    name.endsWith("-add-github-repo-widget"),
  );
}

describe("archived add-github-repo-widget contract", () => {
  it("moves the change into openspec/changes/archive/", () => {
    expect(existsSync(join(CHANGES, "add-github-repo-widget"))).toBe(false);
    const dirs = archivedRepoWidgetDirs();
    expect(dirs.length).toBeGreaterThanOrEqual(1);
    expect(
      existsSync(join(ARCHIVE, dirs[0] ?? "", "tasks.md")),
      "archived tasks.md",
    ).toBe(true);
  });

  it("adds repo widget requirements to main specs", () => {
    const plugin = spec("plugin-contract");
    const widget = spec("widget-contract");
    const integration = spec("integration-contract");

    expect(plugin).toContain(
      "### Requirement: Github pack widget repo is yaml opt-in",
    );
    expect(plugin).toContain("Widget `repo` MUST be opt-in like `demo`");
    expect(plugin).toContain(
      "widgets `demo`, `stats`, `languages`, and `repo`",
    );
    expect(plugin).toContain("`plugin_github_repo_include`");
    expect(plugin).toContain("MUST NOT contain `plugin_github_repo`");
    expect(plugin).toContain('`enabledWidgets` MUST include `{ id: "repo" }`');

    expect(widget).toContain("### Requirement: Frozen repo widget options");
    expect(widget).toContain("### Requirement: repo empty card and fetch none");
    expect(widget).toContain("“No repo data”");
    expect(widget).toContain("MUST NOT call REST `/languages`");

    expect(integration).toContain(
      "### Requirement: Single-repo authenticated GET for widget repo",
    );
    expect(integration).toContain(
      "authenticated REST `GET /repos/{owner}/{repo}`",
    );
    expect(integration).toContain(
      "Widgets `demo` and `repo` MUST skip that user crawl",
    );
  });

  it("does not overwrite rss, http, or wakatime catalogs", () => {
    const plugin = spec("plugin-contract");
    const widget = spec("widget-contract");
    const integration = spec("integration-contract");

    expect(plugin).toContain("### Requirement: First-party rss plugin pack");
    expect(plugin).toContain(
      "### Requirement: First-party wakatime plugin pack",
    );
    expect(plugin).toContain(
      "### Requirement: Http pack widgets are json and chips",
    );
    expect(plugin).toContain(
      "first-party plugin ids MUST be `github`, `wakatime`, `rss`, and `http`",
    );

    expect(widget).toContain("### Requirement: Frozen feed widget options");
    expect(widget).toContain("### Requirement: Frozen json widget options");
    expect(widget).toContain("### Requirement: Frozen chips widget options");
    expect(widget).toContain("### Requirement: Frozen coding widget options");

    expect(integration).toContain(
      "### Requirement: rss integration needs no auth",
    );
    expect(integration).toContain(
      "### Requirement: http integration auth is optional",
    );
    expect(integration).toContain(
      "### Requirement: wakatime integration requires auth",
    );
  });

  it("keeps github fetch locks for repo", () => {
    const integration = spec("integration-contract");
    expect(integration).toContain(
      "The system MUST NEVER call REST `/languages`",
    );
    expect(integration).toContain(
      "The system MUST NOT send that request unauthenticated",
    );
    expect(integration).toContain("HTTP 401 on that GET MUST `fail_run`");
    expect(integration).toContain("HTTP 404 MUST `fail_widget`");
    expect(integration).toContain(
      "Widget `repo` language MUST NOT use GraphQL `nodes(ids:)` sizes",
    );
  });
});
