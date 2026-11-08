import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGE = join(ROOT, "openspec/changes/archive/2026-11-08-widen-wakatime");

function readChange(relativePath: string): string {
  const absolutePath = join(CHANGE, relativePath);
  expect(existsSync(absolutePath), relativePath).toBe(true);
  return readFileSync(absolutePath, "utf8").replace(/\s+/g, " ");
}

describe("OpenSpec change widen-wakatime", () => {
  it("archives widen-wakatime under 2026-11-08 and does not mint a docs id", () => {
    expect(existsSync(join(CHANGE, ".openspec.yaml"))).toBe(true);
    expect(existsSync(join(ROOT, "openspec/changes/widen-wakatime"))).toBe(
      false,
    );
    expect(
      existsSync(
        join(
          ROOT,
          "openspec/changes/archive/2026-11-08-docs-full-catalog-playground",
        ),
      ),
    ).toBe(true);
    expect(existsSync(join(ROOT, "openspec/specs/widen-wakatime"))).toBe(false);
  });

  it("removes leftover totals-plus-slices and caches the full stats dump", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");

    expect(proposal).toContain("totals plus requested include slices");
    expect(integration).toContain("## REMOVED Requirements");
    expect(integration).toContain(
      "### Requirement: wakatime payload is totals plus requested include slices",
    );
    expect(integration).toContain("**Reason**:");
    expect(integration).toContain("**Migration**:");
    expect(integration).toContain(
      "### Requirement: wakatime cache is the full stats data dump",
    );
    expect(integration).toContain("`percent`");
    expect(integration).toContain("`best_day`");
    expect(integration).toContain("`categories`");
    expect(integration).toContain("`machines`");
    expect(integration).toContain("`dependencies`");
    expect(integration).toContain(
      "Fetch MUST NOT apply yaml `include` or `limit`",
    );
    expect(integration).toContain(
      "the cached dump MUST still contain `editors`, `projects`, and",
    );
  });

  it("puts include/limit on the coding widget reader", () => {
    const proposal = readChange("proposal.md");
    const widget = readChange("specs/widget-contract/spec.md");

    expect(proposal).toContain("coding widget");
    expect(widget).toContain(
      "### Requirement: Coding include/limit is the widget reader",
    );
    expect(widget).toContain("`include` is `[languages]`");
    expect(widget).toContain("MUST omit editors in render");
    expect(widget).toContain("MUST NOT drop `editors` from the cache");
    expect(widget).toContain("MUST stay HTTP-free");
    expect(widget).toContain("MUST NOT perform HTTP");
    expect(widget).toContain("operating_systems");
    expect(widget).toContain("MUST NOT become `stats`");
  });

  it("names extra authenticated endpoints and skips heartbeats", () => {
    const integration = readChange("specs/integration-contract/spec.md");

    expect(integration).toContain(
      "### Requirement: wakatime extra authenticated endpoints",
    );
    expect(integration).toContain("`all_time_since_today`");
    expect(integration).toContain("bounded `summaries`");
    expect(integration).toContain("`statusbar/today`");
    expect(integration).toContain("`goals`");
    expect(integration).toContain("omit on HTTP 402 or 403");
    expect(integration).toContain("MUST NOT request heartbeats or durations");
    expect(integration).toContain("MUST NOT `fail_job`");
    expect(integration).toContain("Wakapi");
  });

  it("locks RFC Basic, forbids query keys, and keeps email out of the model", () => {
    const integration = readChange("specs/integration-contract/spec.md");

    expect(integration).toContain(
      "### Requirement: wakatime Authorization is RFC Basic",
    );
    expect(integration).toContain("`Authorization: Basic`");
    expect(integration).toContain('`base64(api_key + ":")`');
    expect(integration).toContain("MUST NOT send Bearer for the API key");
    expect(integration).toContain("MUST NOT send `?api_key=` or `?key=`");
    expect(integration).toContain("MUST NOT be an email");
    expect(integration).toContain("the job MUST fail");
    expect(integration).toContain(
      "MUST NOT treat `POST /api/preview` as a public embed API",
    );
    expect(integration).toContain(
      "### Requirement: wakatime dump never includes email or API keys",
    );
  });

  it("forbids flattened Action inputs and author-integration add", () => {
    const proposal = readChange("proposal.md");
    const integration = readChange("specs/integration-contract/spec.md");
    const widget = readChange("specs/widget-contract/spec.md");
    const design = readChange("design.md");

    for (const source of [proposal, integration, widget]) {
      expect(source).toContain("plugin_<plugin>_<widget>_<option>");
    }
    expect(widget).toContain("plugin_wakatime_coding_range");
    expect(proposal).toContain("author-integration add");
    expect(integration).toContain(
      "MUST NOT run `author-integration add` for `github`, `wakatime`,",
    );
    expect(design).toContain("W2-WK-02");
    expect(design).toContain("docs-full-catalog-playground");
    expect(design).toContain("Do not edit live `client.ts` here");
  });
});
