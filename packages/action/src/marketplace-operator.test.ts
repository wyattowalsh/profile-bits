import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTION_YML_BRANDING_COLOR,
  ACTION_YML_BRANDING_ICON,
  ACTION_YML_DESCRIPTION,
  ACTION_YML_NAME,
  BANNED_FLATTENED_INPUT_NAMES,
  findFlattenedActionInputs,
} from "@profile-bits/core";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const CHECKLIST = join(ROOT, "goals/e2e-refine/plans/marketplace-operator.md");
const ACTION_YML = join(ROOT, "action.yml");
const ACTION_README = join(ROOT, "action/README.md");
const RELEASE_YML = join(ROOT, ".github/workflows/release.yml");
const GITIGNORE = join(ROOT, ".gitignore");
const PUBLISH_SH = join(ROOT, "scripts/publish-action-tree.sh");
const OPENSPEC_TASKS = join(
  ROOT,
  "openspec/changes/marketplace-release/tasks.md",
);
const CLI_PROGRAM = join(ROOT, "packages/cli/src/program.ts");
const ASSETS = join(ROOT, ".github/assets");

const LISTING_STILLS = [
  "hero.png",
  "github-stats.png",
  "http-chips.png",
  "architecture.png",
] as const;

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("W1-M-01 marketplace operator checklist", () => {
  const checklist = read(CHECKLIST);

  it("covers leftover OpenSpec 4.2, 5.1, and 5.2 without claiming them done", () => {
    expect(checklist).toContain("OpenSpec 4.2");
    expect(checklist).toContain("OpenSpec 5.1");
    expect(checklist).toContain("OpenSpec 5.2");
    expect(checklist).toContain("MUST NOT tick OpenSpec 4.2/5.1/5.2");
    expect(checklist).toMatch(/4\.2 \/ 5\.1 \/ 5\.2 stay `\[ \]`/);
  });

  it("tells the operator to attach listing stills from .github/assets", () => {
    for (const file of LISTING_STILLS) {
      expect(checklist).toContain(`.github/assets/${file}`);
    }
    expect(checklist).toContain("listing UI");
    expect(checklist).toContain("MUST NOT claim Camo");
    expect(checklist).toContain("POST /api/preview");
    expect(checklist).toContain("Do **not** use `docs/assets/readme/`.");
  });

  it("requires workflow_dispatch of release.yml on main and forbids tagging v1 at main", () => {
    expect(checklist).toContain("workflow_dispatch");
    expect(checklist).toContain(".github/workflows/release.yml");
    expect(checklist).toContain("Run workflow");
    expect(checklist).toContain("branch **`main`**");
    expect(checklist).toContain("MUST NOT `git tag v1` at `main`");
    expect(checklist).toContain("MUST NOT `git checkout release/v1`");
    expect(checklist).toContain("Agents MUST NOT run `release.yml`");
    expect(checklist).toContain("Choose an existing tag:");
    expect(checklist).toContain("`v1`");
  });

  it("requires live pin @v1 and Marketplace output_action commit, not CLI none", () => {
    expect(checklist).toContain("uses: wyattowalsh/profile-bits@v1");
    expect(checklist).toContain("MUST NOT use `@main`");
    expect(checklist).toContain("`output_action` is **`commit`**");
    expect(checklist).toContain("CLI default `none`");
    expect(checklist).toContain("is **not** shown as the Marketplace default");
  });

  it("keeps four first-party packs and forbids flatten / extra packs / embed API", () => {
    expect(checklist).toContain("`github`");
    expect(checklist).toContain("`wakatime`");
    expect(checklist).toContain("`rss`");
    expect(checklist).toContain("`http`");
    expect(checklist).toContain("plugin_<plugin>_<widget>_<option>");
    expect(checklist).toContain("plugin_wakatime");
    expect(checklist).toContain("public embed API");
    expect(checklist).toContain("Never run `npx skills add`");
  });
});

describe("W1-M-01 git preconditions for the listing", () => {
  it("keeps generated action.yml listing identity and commit default", () => {
    const yml = read(ACTION_YML);
    expect(yml).toContain(`name: ${ACTION_YML_NAME}`);
    expect(yml).toContain(`description: "${ACTION_YML_DESCRIPTION}"`);
    expect(yml).toContain(`icon: ${ACTION_YML_BRANDING_ICON}`);
    expect(yml).toContain(`color: ${ACTION_YML_BRANDING_COLOR}`);
    expect(yml).toMatch(/output_action:[\s\S]*?default: commit/);
    expect(findFlattenedActionInputs(yml)).toEqual([]);
    for (const name of BANNED_FLATTENED_INPUT_NAMES) {
      expect(yml).not.toContain(`${name}:`);
    }
    expect(yml).not.toContain("plugin_wakatime:");
    expect(yml).not.toContain("plugin_rss:");
    expect(yml).not.toContain("plugin_http:");
  });

  it("keeps Marketplace README pin at orphan @v1", () => {
    const body = read(ACTION_README);
    expect(body).toMatch(/uses:\s+wyattowalsh\/profile-bits@v1/);
    expect(body).not.toMatch(/uses:\s+\S+@main\b/);
    expect(body).not.toContain("profile-bits@main");
    expect(body).toContain("does **not** patch consumer `README.md`");
    expect(body).toContain("Default `commit`");
  });

  it("keeps listing stills on disk", () => {
    for (const file of LISTING_STILLS) {
      expect(existsSync(join(ASSETS, file)), file).toBe(true);
    }
  });

  it("keeps release.yml as the only v1 publisher and refuses main SHA", () => {
    const yml = read(RELEASE_YML);
    expect(yml).toMatch(/^on:\n {2}workflow_dispatch:\s*$/m);
    expect(yml).not.toMatch(/^on:\n {2}push:/m);
    expect(yml).toContain("refs/heads/main");
    expect(yml).toContain("refusing to tag v1 at main SHA");
    expect(yml).toMatch(/git tag --force v1 "\$\{orphan_sha\}"/);
    expect(yml).toContain("Never tag v1 at main");
    expect(yml).toContain("never checkout release/v1");
    const uncommented = yml
      .split("\n")
      .filter((line) => !/^\s*#/.test(line))
      .join("\n");
    expect(uncommented).not.toMatch(/git checkout release\/v1/);
    expect(uncommented).not.toMatch(/git tag v1 "\$GITHUB_SHA"/);
  });

  it("keeps dist gitignored on main and the orphan publisher README copy", () => {
    const ignore = read(GITIGNORE);
    expect(ignore).toContain(
      "# dist/ is gitignored on main; committed only on orphan release/v1",
    );
    expect(ignore).toMatch(/^dist$/m);
    const publish = read(PUBLISH_SH);
    expect(publish).toContain(
      'cp "$ROOT/action/README.md" "$WORKDIR/README.md"',
    );
    expect(publish).toContain("Never tag");
    expect(publish).toContain("Never push");
  });

  it("keeps CLI output_action default none off the listing", () => {
    expect(read(CLI_PROGRAM)).toContain(
      'export const CLI_OUTPUT_ACTION_DEFAULT = "none" as const;',
    );
  });

  it("leaves OpenSpec marketplace-release 4.2/5.1/5.2 as operator checkboxes", () => {
    const tasks = read(OPENSPEC_TASKS);
    expect(tasks).toContain(
      "- [ ] 4.2 Operator attaches those stills in the GitHub Marketplace listing UI",
    );
    expect(tasks).toContain(
      "- [ ] 5.1 Publish or update the GitHub Marketplace listing from the orphan `@v1` tree after a `workflow_dispatch` of `release.yml`.",
    );
    expect(tasks).toContain(
      "- [ ] 5.2 Confirm the live listing usage snippet is `uses: wyattowalsh/profile-bits@v1`",
    );
  });
});
