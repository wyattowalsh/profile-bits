import { describe, expect, it, vi } from "vitest";
import {
  createGitOutputPorts,
  type GitHost,
  GitOutputError,
  PULL_REQUEST_PERMISSION_ERROR,
  PullRequestPermissionError,
} from "./git.ts";
import {
  type CommitWidgetsInput,
  INSTALLATION_COMMIT_MESSAGE,
  USER_PAT_COMMIT_MESSAGE,
  widgetCommitMessage,
} from "./output.ts";

const CWD = "/repo";
const OUTPUT_DIR = "profile-bits";
const STATS_RELATIVE = `${OUTPUT_DIR}/stats.svg`;
const LANGUAGES_RELATIVE = `${OUTPUT_DIR}/languages.svg`;
const STATS_ABSOLUTE = `${CWD}/${STATS_RELATIVE}`;
const LANGUAGES_ABSOLUTE = `${CWD}/${LANGUAGES_RELATIVE}`;
const README_ABSOLUTE = `${CWD}/README.md`;
const TOKEN = "ghs_test_token";
const SVG = "<svg />";

function bytes(contents: string): Uint8Array {
  return new TextEncoder().encode(contents);
}

function enoent(path: string): Error {
  const error = new Error(`ENOENT: ${path}`) as Error & { code: string };
  error.code = "ENOENT";
  return error;
}

function commitInput(
  overrides: Partial<CommitWidgetsInput> = {},
): CommitWidgetsInput {
  const tokenClass = overrides.tokenClass ?? "actions_installation";
  return {
    mode: "commit",
    files: [{ path: STATS_RELATIVE, contents: SVG }],
    outputDir: OUTPUT_DIR,
    dryRun: false,
    dataChanged: true,
    ...overrides,
    tokenClass,
    message: overrides.message ?? widgetCommitMessage(tokenClass),
  };
}

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createHarness(
  existing: Readonly<Record<string, string | Uint8Array>> = {},
  env: NodeJS.ProcessEnv = {},
) {
  const written = new Map<string, Uint8Array>();
  const disk = new Map<string, Uint8Array>(
    Object.entries(existing).map(([path, contents]) => [
      path,
      typeof contents === "string" ? bytes(contents) : contents,
    ]),
  );
  const writeFile = vi.fn(async (path: string, contents: Uint8Array) => {
    written.set(path, contents);
    disk.set(path, contents);
  });
  const mkdir = vi.fn(async () => {});
  const run = vi.fn<GitHost["run"]>(async () => ({
    code: 0,
    stdout: "",
    stderr: "",
  }));
  const fetch = vi.fn<GitHost["fetch"]>(async () => jsonResponse(201));
  const host: GitHost = {
    cwd: CWD,
    env: {
      GITHUB_REPOSITORY: "owner/profile",
      GITHUB_TOKEN: TOKEN,
      GITHUB_REF_NAME: "main",
      ...env,
    },
    async readFile(path) {
      const value = disk.get(path);
      if (value === undefined) {
        throw enoent(path);
      }
      return value;
    },
    writeFile,
    mkdir,
    run,
    fetch,
  };
  const ports = createGitOutputPorts(host);
  return { ports, run, writeFile, mkdir, fetch, written };
}

function gitArgLists(run: ReturnType<typeof vi.fn>): string[][] {
  return run.mock.calls.map((call) => [...call[0]]);
}

function commitMessages(run: ReturnType<typeof vi.fn>): string[] {
  return gitArgLists(run)
    .filter((args) => args.includes("commit"))
    .map((args) => {
      const flag = args.indexOf("-m");
      return flag === -1 ? "" : (args[flag + 1] ?? "");
    });
}

function fetchUrl(fetch: ReturnType<typeof vi.fn>, index = 0): string {
  return String(fetch.mock.calls[index]?.[0] ?? "");
}

function fetchInit(
  fetch: ReturnType<typeof vi.fn>,
  index = 0,
): RequestInit | undefined {
  return fetch.mock.calls[index]?.[1];
}

function authorization(init?: RequestInit): string | undefined {
  const headers = init?.headers;
  if (headers == null || Array.isArray(headers) || headers instanceof Headers) {
    if (headers instanceof Headers) {
      return headers.get("Authorization") ?? undefined;
    }
    return undefined;
  }
  return headers.Authorization ?? headers.authorization;
}

describe("commitWidgets dryRun", () => {
  it("returns didCommit false with no git and no writes", async () => {
    const { ports, run, writeFile, mkdir, fetch } = createHarness();

    const result = await ports.commitWidgets(commitInput({ dryRun: true }));

    expect(result.didCommit).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("commitWidgets skip identical blobs", () => {
  it("does not write or commit when the blob already matches disk", async () => {
    const { ports, run, writeFile } = createHarness({
      [STATS_ABSOLUTE]: SVG,
    });

    const result = await ports.commitWidgets(commitInput());

    expect(result.didCommit).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("skips identical Uint8Array blobs via byte-compare", async () => {
    const { ports, run, writeFile } = createHarness({
      [STATS_ABSOLUTE]: bytes(SVG),
    });

    const result = await ports.commitWidgets(
      commitInput({
        files: [{ path: STATS_RELATIVE, contents: bytes(SVG) }],
      }),
    );

    expect(result.didCommit).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("writes and commits only blobs that differ", async () => {
    const { ports, run, writeFile } = createHarness({
      [STATS_ABSOLUTE]: SVG,
    });

    const result = await ports.commitWidgets(
      commitInput({
        files: [
          { path: STATS_RELATIVE, contents: SVG },
          { path: LANGUAGES_RELATIVE, contents: "<svg id='new' />" },
        ],
      }),
    );

    expect(result.didCommit).toBe(true);
    expect(writeFile).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledWith(
      LANGUAGES_ABSOLUTE,
      bytes("<svg id='new' />"),
    );
    expect(writeFile.mock.calls.some(([path]) => path === STATS_ABSOLUTE)).toBe(
      false,
    );
    expect(gitArgLists(run).find((args) => args[0] === "add")).toEqual([
      "add",
      "--",
      LANGUAGES_RELATIVE,
    ]);
    expect(gitArgLists(run).some((args) => args[0] === "push")).toBe(true);
  });

  it("does not commit when the files list is empty", async () => {
    const { ports, run, writeFile } = createHarness();

    const result = await ports.commitWidgets(commitInput({ files: [] }));

    expect(result.didCommit).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
});

describe("commitWidgets data-changed skip", () => {
  it("does not write or commit when outputCondition is data-changed and data did not change", async () => {
    const { ports, run, writeFile, fetch } = createHarness();

    const result = await ports.commitWidgets(
      commitInput({
        outputCondition: "data-changed",
        dataChanged: false,
      }),
    );

    expect(result.didCommit).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("still commits when outputCondition is always even if dataChanged is false", async () => {
    const { ports, run } = createHarness();

    const result = await ports.commitWidgets(
      commitInput({
        outputCondition: "always",
        dataChanged: false,
      }),
    );

    expect(result.didCommit).toBe(true);
    expect(run).toHaveBeenCalled();
  });
});

describe("commitWidgets README rejection", () => {
  it("never writes README.md and fails when a blob targets it", async () => {
    const { ports, run, writeFile } = createHarness();

    await expect(
      ports.commitWidgets(
        commitInput({
          files: [{ path: "README.md", contents: "# patched" }],
        }),
      ),
    ).rejects.toThrow(/README\.md/);

    expect(writeFile).not.toHaveBeenCalled();
    expect(
      writeFile.mock.calls.some(([path]) => path === README_ABSOLUTE),
    ).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects README.md under output_dir without writing", async () => {
    const { ports, writeFile, run } = createHarness();

    await expect(
      ports.commitWidgets(
        commitInput({
          files: [{ path: `${OUTPUT_DIR}/README.md`, contents: "# no" }],
        }),
      ),
    ).rejects.toBeInstanceOf(GitOutputError);

    expect(writeFile).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects path escape outside output_dir", async () => {
    const { ports, writeFile, run } = createHarness();

    await expect(
      ports.commitWidgets(
        commitInput({
          files: [{ path: "../secrets.svg", contents: SVG }],
        }),
      ),
    ).rejects.toThrow(/escapes output_dir/);

    expect(writeFile).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("writes widget files under output_dir only", async () => {
    const { ports, writeFile } = createHarness();

    await ports.commitWidgets(
      commitInput({
        files: [{ path: "stats.svg", contents: SVG }],
      }),
    );

    expect(writeFile).toHaveBeenCalledWith(STATS_ABSOLUTE, bytes(SVG));
    expect(
      writeFile.mock.calls.every(([path]) =>
        String(path).startsWith(`${CWD}/${OUTPUT_DIR}/`),
      ),
    ).toBe(true);
  });
});

describe("commitWidgets [skip ci] message passed through", () => {
  it("passes the installation message including [skip ci] to git commit -m", async () => {
    const { ports, run } = createHarness();
    const message = INSTALLATION_COMMIT_MESSAGE;

    const result = await ports.commitWidgets(
      commitInput({ tokenClass: "actions_installation", message }),
    );

    expect(result.didCommit).toBe(true);
    expect(message).toContain("[skip ci]");
    expect(commitMessages(run)).toEqual([INSTALLATION_COMMIT_MESSAGE]);
  });

  it("passes a user_pat message through without rewriting [skip ci]", async () => {
    const { ports, run } = createHarness();
    const message = USER_PAT_COMMIT_MESSAGE;

    const result = await ports.commitWidgets(
      commitInput({ tokenClass: "user_pat", message }),
    );

    expect(result.didCommit).toBe(true);
    expect(message).not.toContain("[skip ci]");
    expect(commitMessages(run)).toEqual([USER_PAT_COMMIT_MESSAGE]);
  });

  it("uses the provided message even when it does not match tokenClass", async () => {
    const { ports, run } = createHarness();
    const message = "custom commit message [skip ci]";

    await ports.commitWidgets(commitInput({ tokenClass: "user_pat", message }));

    expect(commitMessages(run)).toEqual([message]);
  });
});

describe("commitWidgets pull-request fetch", () => {
  it("POSTs /repos/{owner}/{repo}/pulls without putting the token in the URL", async () => {
    const { ports, fetch } = createHarness();

    const result = await ports.commitWidgets(
      commitInput({
        mode: "pull-request",
        branch: "profile-bits/widgets",
        message: INSTALLATION_COMMIT_MESSAGE,
      }),
    );

    expect(result.didCommit).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    const url = fetchUrl(fetch);
    expect(url).toBe("https://api.github.com/repos/owner/profile/pulls");
    expect(url).toContain("/pulls");
    expect(url).not.toContain(TOKEN);
    expect(url.toLowerCase()).not.toContain("ghs_");
    const init = fetchInit(fetch);
    expect(init?.method).toBe("POST");
    expect(authorization(init)).toBe(`Bearer ${TOKEN}`);
    const headers = init?.headers as Record<string, string>;
    expect(headers.Accept).toBe("application/vnd.github+json");
    const body = JSON.parse(String(init?.body)) as {
      title: string;
      body: string;
      head: string;
      base: string;
    };
    expect(body.title).toBe(INSTALLATION_COMMIT_MESSAGE);
    expect(body.body).toBe(INSTALLATION_COMMIT_MESSAGE);
    expect(body.head).toBe("profile-bits/widgets");
    expect(body.base).toBe("main");
  });

  it("prefers INPUT_COMMITTER_TOKEN and GITHUB_API_URL without leaking either into the URL", async () => {
    const committer = "ghs_committer_token";
    const { ports, fetch } = createHarness(
      {},
      {
        INPUT_COMMITTER_TOKEN: committer,
        GITHUB_TOKEN: TOKEN,
        GITHUB_API_URL: "https://github.example.com/api/v3",
      },
    );

    await ports.commitWidgets(commitInput({ mode: "pull-request" }));

    const url = fetchUrl(fetch);
    expect(url).toBe(
      "https://github.example.com/api/v3/repos/owner/profile/pulls",
    );
    expect(url).not.toContain(committer);
    expect(url).not.toContain(TOKEN);
    expect(authorization(fetchInit(fetch))).toBe(`Bearer ${committer}`);
  });

  it("maps HTTP 403 to a pull-requests: write error", async () => {
    const { ports, fetch } = createHarness();
    fetch.mockResolvedValueOnce(
      new Response("Resource not accessible by integration", { status: 403 }),
    );

    await expect(
      ports.commitWidgets(commitInput({ mode: "pull-request" })),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(PullRequestPermissionError);
      expect(String(error)).toContain("pull-requests: write");
      expect(String(error)).toContain(PULL_REQUEST_PERMISSION_ERROR);
      return true;
    });
  });

  it("does not fetch when identical blobs skip the commit", async () => {
    const { ports, fetch, run } = createHarness({
      [STATS_ABSOLUTE]: SVG,
    });

    const result = await ports.commitWidgets(
      commitInput({ mode: "pull-request" }),
    );

    expect(result.didCommit).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("createGitOutputPorts", () => {
  it("stubs gistWidgets for T301", async () => {
    const { ports, fetch, run } = createHarness();

    await expect(
      ports.gistWidgets({
        files: [{ path: STATS_RELATIVE, contents: SVG }],
        format: "svg",
        canGist: true,
        dryRun: false,
      }),
    ).rejects.toThrow(/use T301 gist\.ts/);
    expect(fetch).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
});
