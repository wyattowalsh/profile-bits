/**
 * Closed chips preset expander. Maps (preset, type, user, repo, package,
 * workflow) to an allowlisted https JSON URL. Does not fetch.
 * MUST NOT import octokit. MUST NOT construct an HTTP client.
 */

import {
  CHIPS_WORKFLOW_DEFAULT,
  HTTP_CHIP_PRESETS,
  HTTP_CHIP_TYPES,
  type HttpChipPreset,
  type HttpChipType,
} from "@profile-bits/core";

export type ExpandChipsRequestInput = {
  preset: HttpChipPreset;
  type: HttpChipType;
  user?: string | null;
  repo?: string | null;
  packageName?: string | null;
  workflow?: string | null;
};

export type ExpandChipsRequestResult = { url: URL };

export type ChipsExpandErrorCode =
  | "missing_package"
  | "missing_owner"
  | "missing_repo"
  | "unknown_preset"
  | "unknown_type"
  | "forbidden_origin"
  | "forbidden_path";

const SHIELDCN_ORIGIN = "https://shieldcn.dev";
const SHIELDS_ORIGIN = "https://img.shields.io";
const ALLOWED_HOSTNAMES = new Set(["shieldcn.dev", "img.shields.io"]);

/** Belt-only. Path identity and whole-segment checks are the real lock. */
const DENY_PATH_PREFIXES = [
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

const SCOPED_NPM_PREFIX = /^@[^/]+$/;

type GithubChipType = Exclude<HttpChipType, "npm">;

export class ChipsExpandError extends Error {
  override readonly name = "ChipsExpandError";
  readonly code: ChipsExpandErrorCode;

  constructor(code: ChipsExpandErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export function expandChipsRequest(
  input: ExpandChipsRequestInput,
): ExpandChipsRequestResult {
  if (!isChipPreset(input.preset)) {
    throw new ChipsExpandError(
      "unknown_preset",
      `unknown chips preset: ${String(input.preset)}`,
    );
  }
  if (!isChipType(input.type)) {
    throw new ChipsExpandError(
      "unknown_type",
      `unknown chips type: ${String(input.type)}`,
    );
  }

  const origin = input.preset === "shieldcn" ? SHIELDCN_ORIGIN : SHIELDS_ORIGIN;
  const pathname =
    input.type === "npm"
      ? npmPathname(input.preset, requirePackage(input.packageName))
      : githubPathname(
          input.preset,
          input.type,
          parseOwnerRepo(input.user, input.repo),
          resolveWorkflow(input.workflow),
        );

  const url = new URL(pathname, origin);
  assertExactPathname(url, pathname);
  assertAllowedOrigin(url);
  assertDeniedPrefix(url.pathname);
  return { url };
}

function isChipPreset(value: string): value is HttpChipPreset {
  return (HTTP_CHIP_PRESETS as readonly string[]).includes(value);
}

function isChipType(value: string): value is HttpChipType {
  return (HTTP_CHIP_TYPES as readonly string[]).includes(value);
}

function requirePackage(packageName?: string | null): string {
  const raw = packageName?.trim() ?? "";
  if (raw === "") {
    throw new ChipsExpandError(
      "missing_package",
      "chips npm type requires package",
    );
  }
  const segments = raw.split("/");
  assertSafePathSegments(segments);
  if (segments.length !== 1 && !isScopedNpmPackage(segments)) {
    throw new ChipsExpandError(
      "forbidden_path",
      "chips npm package must be one name or a scoped @scope/name",
    );
  }
  return segments.map(encodePackageSegment).join("/");
}

function isScopedNpmPackage(segments: readonly string[]): boolean {
  return segments.length === 2 && SCOPED_NPM_PREFIX.test(segments[0] ?? "");
}

function encodePackageSegment(segment: string): string {
  return encodeURIComponent(segment).replaceAll("%40", "@");
}

function parseOwnerRepo(
  user?: string | null,
  repo?: string | null,
): { owner: string; name: string } {
  const repoRaw = repo?.trim() ?? "";
  const userRaw = user?.trim() ?? "";
  if (repoRaw.includes("/")) {
    const slash = repoRaw.indexOf("/");
    const owner = repoRaw.slice(0, slash).trim();
    const name = repoRaw.slice(slash + 1).trim();
    if (owner === "") {
      throw new ChipsExpandError(
        "missing_owner",
        "chips github type requires owner",
      );
    }
    if (name === "") {
      throw new ChipsExpandError(
        "missing_repo",
        "chips github type requires repo",
      );
    }
    assertSafePathSegment(owner);
    assertSafePathSegment(name);
    return { owner, name };
  }
  if (userRaw === "") {
    throw new ChipsExpandError(
      "missing_owner",
      "chips github type requires owner",
    );
  }
  if (repoRaw === "") {
    throw new ChipsExpandError(
      "missing_repo",
      "chips github type requires repo",
    );
  }
  assertSafePathSegment(userRaw);
  assertSafePathSegment(repoRaw);
  return { owner: userRaw, name: repoRaw };
}

function resolveWorkflow(workflow?: string | null): string {
  const raw = workflow?.trim() ?? "";
  if (raw === "." || raw === "..") {
    throw new ChipsExpandError(
      "forbidden_path",
      "chips workflow is a forbidden path segment",
    );
  }
  return raw === "" ? CHIPS_WORKFLOW_DEFAULT : raw;
}

function npmPathname(preset: HttpChipPreset, packagePath: string): string {
  return preset === "shieldcn"
    ? `/npm/${packagePath}.json`
    : `/npm/v/${packagePath}.json`;
}

function githubPathname(
  preset: HttpChipPreset,
  type: GithubChipType,
  ownerRepo: { owner: string; name: string },
  workflow: string,
): string {
  const owner = encodeURIComponent(ownerRepo.owner);
  const repo = encodeURIComponent(ownerRepo.name);
  if (preset === "shieldcn") {
    const paths = {
      stars: `/github/stars/${owner}/${repo}.json`,
      forks: `/github/forks/${owner}/${repo}.json`,
      license: `/github/license/${owner}/${repo}.json`,
      release: `/github/release/${owner}/${repo}.json`,
      issues: `/github/issues/${owner}/${repo}.json`,
      prs: `/github/prs/${owner}/${repo}.json`,
      ci: `/github/ci/${owner}/${repo}.json`,
    } as const;
    return paths[type];
  }
  const paths = {
    stars: `/github/stars/${owner}/${repo}.json`,
    forks: `/github/forks/${owner}/${repo}.json`,
    license: `/github/license/${owner}/${repo}.json`,
    release: `/github/v/release/${owner}/${repo}.json`,
    issues: `/github/issues/${owner}/${repo}.json`,
    prs: `/github/issues-pr/${owner}/${repo}.json`,
    ci: `/github/actions/workflow/status/${owner}/${repo}/${encodeURIComponent(workflow)}.json`,
  } as const;
  return paths[type];
}

function assertSafePathSegments(segments: readonly string[]): void {
  for (const segment of segments) {
    assertSafePathSegment(segment);
  }
}

function assertSafePathSegment(segment: string): void {
  if (segment === "" || segment === "." || segment === "..") {
    throw new ChipsExpandError(
      "forbidden_path",
      "chips preset path contains a forbidden segment",
    );
  }
}

function assertExactPathname(url: URL, pathname: string): void {
  if (url.pathname !== pathname || url.search !== "" || url.hash !== "") {
    throw new ChipsExpandError(
      "forbidden_path",
      "chips preset path must equal the constructed pathname",
    );
  }
}

function assertAllowedOrigin(url: URL): void {
  const allowed =
    url.protocol === "https:" &&
    ALLOWED_HOSTNAMES.has(url.hostname) &&
    url.username === "" &&
    url.password === "" &&
    (url.port === "" || url.port === "443");
  if (!allowed) {
    throw new ChipsExpandError(
      "forbidden_origin",
      `chips origin is not allowlisted: ${url.origin}`,
    );
  }
}

function assertDeniedPrefix(pathname: string): void {
  const lower = pathname.toLowerCase();
  for (const prefix of DENY_PATH_PREFIXES) {
    const hit = prefix.endsWith("/")
      ? lower.startsWith(prefix)
      : lower === prefix || lower.startsWith(`${prefix}/`);
    if (hit) {
      throw new ChipsExpandError(
        "forbidden_path",
        "chips preset path is forbidden",
      );
    }
  }
}
