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
  "/badge",
  "/endpoint",
  "/https/",
  "/memo",
  "/discord",
  "/reddit",
  "/nba",
  "/views",
  "/watchers",
] as const;

const FORBIDDEN_SEGMENT_CASES: ReadonlyArray<{
  name: string;
  input: ExpandChipsRequestInput;
}> = [
  {
    name: "npm empty segment",
    input: { preset: "shieldcn", type: "npm", packageName: "foo/" },
  },
  {
    name: "npm double slash",
    input: { preset: "shieldcn", type: "npm", packageName: "foo//bar" },
  },
  {
    name: "unscoped two-segment package",
    input: { preset: "shields", type: "npm", packageName: "foo/bar" },
  },
  {
    name: "npm leading slash",
    input: { preset: "shields", type: "npm", packageName: "/react" },
  },
  {
    name: "npm . segment",
    input: { preset: "shieldcn", type: "npm", packageName: "." },
  },
  {
    name: "npm .. segment",
    input: { preset: "shields", type: "npm", packageName: ".." },
  },
  {
    name: "owner .",
    input: {
      preset: "shieldcn",
      type: "stars",
      user: ".",
      repo: "hello-world",
    },
  },
  {
    name: "owner ..",
    input: {
      preset: "shields",
      type: "forks",
      user: "..",
      repo: "hello-world",
    },
  },
  {
    name: "repo name .",
    input: {
      preset: "shieldcn",
      type: "license",
      user: "octocat",
      repo: ".",
    },
  },
  {
    name: "repo name ..",
    input: {
      preset: "shields",
      type: "ci",
      user: "octocat",
      repo: "..",
    },
  },
  {
    name: "workflow .",
    input: {
      preset: "shields",
      type: "ci",
      repo: "vercel/next.js",
      workflow: ".",
    },
  },
  {
    name: "workflow ..",
    input: {
      preset: "shields",
      type: "ci",
      repo: "vercel/next.js",
      workflow: "..",
    },
  },
];

const ADVERSARIAL_CASES: ReadonlyArray<{
  name: string;
  input: ExpandChipsRequestInput;
}> = [
  {
    name: "../badge/dynamic/json",
    input: {
      preset: "shieldcn",
      type: "npm",
      packageName: "../badge/dynamic/json",
    },
  },
  {
    name: "../../badge/dynamic/json",
    input: {
      preset: "shields",
      type: "npm",
      packageName: "../../badge/dynamic/json",
    },
  },
  {
    name: "foo/../bar",
    input: { preset: "shieldcn", type: "npm", packageName: "foo/../bar" },
  },
  {
    name: "@scope/../../badge/dynamic/json",
    input: {
      preset: "shields",
      type: "npm",
      packageName: "@scope/../../badge/dynamic/json",
    },
  },
  {
    name: "repo ../hello",
    input: { preset: "shieldcn", type: "stars", repo: "../hello" },
  },
  {
    name: "owner ..",
    input: {
      preset: "shieldcn",
      type: "issues",
      user: "..",
      repo: "hello-world",
    },
  },
  {
    name: "shields ci repo ..",
    input: {
      preset: "shields",
      type: "ci",
      user: "octocat",
      repo: "..",
      workflow: "ci.yml",
    },
  },
];

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
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
      expect(ALLOWED_HOSTNAMES.has(url.hostname)).toBe(true);
      expect(
        url.hostname === "shieldcn.dev" || url.hostname === "img.shields.io",
      ).toBe(true);
      expect(url.hostname).not.toBe("www.shieldcn.dev");
      expect(url.hostname).not.toBe("shields.io");
      expect(url.hostname).not.toBe("www.img.shields.io");
      for (const marker of FORBIDDEN_PATH_MARKERS) {
        expect(url.pathname.toLowerCase()).not.toContain(marker);
      }
    }
  });

  it("keeps next.js, ci.yml, and scoped @scope/name", () => {
    expect(
      expand({
        preset: "shieldcn",
        type: "npm",
        packageName: "next.js",
      }).url.href,
    ).toBe("https://shieldcn.dev/npm/next.js.json");
    expect(
      expand({
        preset: "shields",
        type: "ci",
        repo: "vercel/next.js",
        workflow: "ci.yml",
      }).url.href,
    ).toBe(
      "https://img.shields.io/github/actions/workflow/status/vercel/next.js/ci.yml.json",
    );
    expect(
      expand({
        preset: "shieldcn",
        type: "npm",
        packageName: "@scope/name",
      }).url.href,
    ).toBe("https://shieldcn.dev/npm/@scope/name.json");
  });

  it.each(FORBIDDEN_SEGMENT_CASES)(
    "throws forbidden_path for $name",
    ({ input }) => {
      expect(thrownCode(input)).toBe("forbidden_path");
    },
  );

  it.each(ADVERSARIAL_CASES)(
    "throws forbidden_path for adversarial $name",
    ({ input }) => {
      expect(thrownCode(input)).toBe("forbidden_path");
    },
  );

  it("rejects github .. traversal that would still start with /github", () => {
    const collapsed = new URL(
      "/github/stars/../watchers.json",
      "https://shieldcn.dev",
    );
    expect(collapsed.pathname).toBe("/github/watchers.json");
    expect(collapsed.pathname.startsWith("/github")).toBe(true);
    expect(
      thrownCode({
        preset: "shieldcn",
        type: "stars",
        repo: "../watchers",
      }),
    ).toBe("forbidden_path");
  });

  it("does not let foo/../bar collapse to /npm/bar.json", () => {
    const collapsed = new URL("/npm/foo/../bar.json", "https://shieldcn.dev");
    expect(collapsed.pathname).toBe("/npm/bar.json");
    expect(collapsed.pathname.startsWith("/badge")).toBe(false);
    for (const prefix of FORBIDDEN_PATH_MARKERS) {
      expect(collapsed.pathname.toLowerCase().startsWith(prefix)).toBe(false);
    }
    expect(
      thrownCode({
        preset: "shieldcn",
        type: "npm",
        packageName: "foo/../bar",
      }),
    ).toBe("forbidden_path");
    expect(
      thrownCode({
        preset: "shields",
        type: "npm",
        packageName: "foo/../bar",
      }),
    ).toBe("forbidden_path");
  });

  it("keeps %2e%2e encoded and does not resolve to /badge", () => {
    const shieldcn = expand({
      preset: "shieldcn",
      type: "npm",
      packageName: "%2e%2e",
    });
    expect(shieldcn.url.pathname).toBe("/npm/%252e%252e.json");
    expect(shieldcn.url.pathname).not.toContain("/badge");
    expect(shieldcn.url.href).toBe("https://shieldcn.dev/npm/%252e%252e.json");
    expect(shieldcn.url.search).toBe("");
    expect(shieldcn.url.hash).toBe("");

    const shields = expand({
      preset: "shields",
      type: "npm",
      packageName: "%2e%2e",
    });
    expect(shields.url.pathname).toBe("/npm/v/%252e%252e.json");
    expect(shields.url.pathname).not.toContain("/badge");
    expect(shields.url.href).toBe(
      "https://img.shields.io/npm/v/%252e%252e.json",
    );
  });
});
