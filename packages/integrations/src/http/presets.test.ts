import { describe, expect, it } from "vitest";
import {
  ChipsExpandError,
  type ExpandChipsRequestInput,
  expandChipsRequest,
} from "./presets.js";

type ChipType = ExpandChipsRequestInput["type"];

const SHIELDCN_PATHS: ReadonlyArray<readonly [ChipType, string]> = [
  ["npm", "https://shieldcn.dev/npm/react.json"],
  ["stars", "https://shieldcn.dev/github/stars/vercel/next.js.json"],
  ["forks", "https://shieldcn.dev/github/forks/vercel/next.js.json"],
  ["license", "https://shieldcn.dev/github/license/vercel/next.js.json"],
  ["release", "https://shieldcn.dev/github/release/vercel/next.js.json"],
  ["issues", "https://shieldcn.dev/github/issues/vercel/next.js.json"],
  ["prs", "https://shieldcn.dev/github/prs/vercel/next.js.json"],
  ["ci", "https://shieldcn.dev/github/ci/vercel/next.js.json"],
];

const SHIELDS_PATHS: ReadonlyArray<{
  type: ChipType;
  href: string;
  workflow?: string | null;
}> = [
  { type: "npm", href: "https://img.shields.io/npm/v/react.json" },
  {
    type: "stars",
    href: "https://img.shields.io/github/stars/vercel/next.js.json",
  },
  {
    type: "forks",
    href: "https://img.shields.io/github/forks/vercel/next.js.json",
  },
  {
    type: "license",
    href: "https://img.shields.io/github/license/vercel/next.js.json",
  },
  {
    type: "release",
    href: "https://img.shields.io/github/v/release/vercel/next.js.json",
  },
  {
    type: "issues",
    href: "https://img.shields.io/github/issues/vercel/next.js.json",
  },
  {
    type: "prs",
    href: "https://img.shields.io/github/issues-pr/vercel/next.js.json",
  },
  {
    type: "ci",
    href: "https://img.shields.io/github/actions/workflow/status/vercel/next.js/ci.yml.json",
  },
  {
    type: "ci",
    workflow: "",
    href: "https://img.shields.io/github/actions/workflow/status/vercel/next.js/ci.yml.json",
  },
  {
    type: "ci",
    workflow: "release.yml",
    href: "https://img.shields.io/github/actions/workflow/status/vercel/next.js/release.yml.json",
  },
];

const ALLOWED_HOSTNAMES = new Set(["shieldcn.dev", "img.shields.io"]);
const FORBIDDEN_PATH_MARKERS = [
  "/badge/dynamic/json",
  "/https/",
  "/memo",
  "discord",
  "reddit",
  "nba",
  "views",
] as const;

function expand(
  input: ExpandChipsRequestInput,
): ReturnType<typeof expandChipsRequest> {
  return expandChipsRequest(input);
}

function thrownCode(input: ExpandChipsRequestInput): string {
  try {
    expandChipsRequest(input);
  } catch (error: unknown) {
    if (error instanceof ChipsExpandError) {
      return error.code;
    }
    throw error;
  }
  throw new Error("expected ChipsExpandError");
}

describe("expandChipsRequest", () => {
  it.each(SHIELDCN_PATHS)("shieldcn %s expands to %s", (type, href) => {
    const result = expand({
      preset: "shieldcn",
      type,
      packageName: "react",
      repo: "vercel/next.js",
    });
    expect(result.url).toBeInstanceOf(URL);
    expect(result.url.href).toBe(href);
  });

  it.each(SHIELDS_PATHS)(
    "shields $type workflow=$workflow expands to $href",
    ({ type, href, workflow }) => {
      const result = expand({
        preset: "shields",
        type,
        packageName: "react",
        repo: "vercel/next.js",
        workflow,
      });
      expect(result.url).toBeInstanceOf(URL);
      expect(result.url.href).toBe(href);
    },
  );

  it("uses user as owner when repo has no slash", () => {
    const result = expand({
      preset: "shieldcn",
      type: "stars",
      user: "octocat",
      repo: "hello-world",
    });
    expect(result.url.href).toBe(
      "https://shieldcn.dev/github/stars/octocat/hello-world.json",
    );
  });

  it.each([
    { preset: "shieldcn" as const, type: "npm" as const },
    { preset: "shields" as const, type: "npm" as const, packageName: null },
    { preset: "shieldcn" as const, type: "npm" as const, packageName: "" },
    { preset: "shields" as const, type: "npm" as const, packageName: "  " },
  ])("throws missing_package for %j", (input) => {
    expect(thrownCode(input)).toBe("missing_package");
  });

  it.each([
    { preset: "shieldcn" as const, type: "stars" as const, repo: "next.js" },
    { preset: "shields" as const, type: "forks" as const },
    {
      preset: "shieldcn" as const,
      type: "license" as const,
      user: "",
      repo: "hello-world",
    },
    {
      preset: "shields" as const,
      type: "issues" as const,
      repo: "/next.js",
    },
  ])("throws missing_owner for %j", (input) => {
    expect(thrownCode(input)).toBe("missing_owner");
  });

  it("throws missing_repo when owner is present without a repo name", () => {
    expect(
      thrownCode({
        preset: "shields",
        type: "stars",
        user: "octocat",
        repo: "",
      }),
    ).toBe("missing_repo");
    expect(
      thrownCode({
        preset: "shieldcn",
        type: "prs",
        repo: "octocat/",
      }),
    ).toBe("missing_repo");
  });

  it("keeps the slash in scoped npm package names", () => {
    expect(
      expand({
        preset: "shieldcn",
        type: "npm",
        packageName: "@scope/name",
      }).url.href,
    ).toBe("https://shieldcn.dev/npm/@scope/name.json");
    expect(
      expand({
        preset: "shields",
        type: "npm",
        packageName: "@scope/name",
      }).url.href,
    ).toBe("https://img.shields.io/npm/v/@scope/name.json");
  });

  it("ignores workflow on shieldcn ci", () => {
    const result = expand({
      preset: "shieldcn",
      type: "ci",
      repo: "vercel/next.js",
      workflow: "release.yml",
    });
    expect(result.url.href).toBe(
      "https://shieldcn.dev/github/ci/vercel/next.js.json",
    );
  });

  it("throws unknown_preset and unknown_type at runtime", () => {
    expect(
      thrownCode({
        preset: "nope" as ExpandChipsRequestInput["preset"],
        type: "npm",
        packageName: "react",
      }),
    ).toBe("unknown_preset");
    expect(
      thrownCode({
        preset: "shields",
        type: "dynamic" as ExpandChipsRequestInput["type"],
        repo: "vercel/next.js",
      }),
    ).toBe("unknown_type");
  });

  it("emits https URLs whose hostname is only shieldcn.dev or img.shields.io", () => {
    const urls = [
      ...SHIELDCN_PATHS.map(
        ([type]) =>
          expand({
            preset: "shieldcn",
            type,
            packageName: "react",
            repo: "vercel/next.js",
          }).url,
      ),
      ...SHIELDS_PATHS.map(
        ({ type, workflow }) =>
          expand({
            preset: "shields",
            type,
            packageName: "react",
            repo: "vercel/next.js",
            workflow,
          }).url,
      ),
      expand({
        preset: "shieldcn",
        type: "stars",
        user: "octocat",
        repo: "hello-world",
      }).url,
    ];

    for (const url of urls) {
      expect(url.protocol).toBe("https:");
      expect(url.href.startsWith("https://")).toBe(true);
      expect(url.href.startsWith("http://")).toBe(false);
      expect(ALLOWED_HOSTNAMES.has(url.hostname)).toBe(true);
      expect(url.hostname).not.toBe("www.shieldcn.dev");
      expect(url.hostname).not.toBe("shields.io");
      expect(url.hostname).not.toBe("www.img.shields.io");
      for (const marker of FORBIDDEN_PATH_MARKERS) {
        expect(url.pathname.toLowerCase()).not.toContain(marker);
      }
    }
  });
});
