import type { OutputFormat } from "@profile-bits/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMMIT_STUB_MESSAGE,
  createGistOutputPorts,
  GIST_REQUIRES_CAN_GIST,
  GIST_SVG_ONLY,
  type GistFetch,
  GistOutputError,
  gistWidgets,
} from "./gist.ts";
import type { GistWidgetsInput } from "./output.ts";

const TOKEN = "ghp_test_pat_not_a_secret";
const COMMITTER_TOKEN = "ghp_committer_pat_not_a_secret";
const SVG = "<svg />";
const GIST_ID = "abc123def456";
const STATS_PATH = "profile-bits/stats.svg";
const LANGUAGES_PATH = "profile-bits/languages.svg";
const PNG_MAGIC = Uint8Array.of(
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  0x00,
  0x00,
);

const RASTER_FORMATS = [
  "png",
  "jpeg",
  "webp",
  "ico",
] as const satisfies readonly OutputFormat[];
const ANIMATED_FORMATS = [
  "gif",
  "apng",
] as const satisfies readonly OutputFormat[];

afterEach(() => {
  vi.restoreAllMocks();
});

function gistInput(
  overrides: Partial<GistWidgetsInput> = {},
): GistWidgetsInput {
  return {
    files: [{ path: STATS_PATH, contents: SVG }],
    format: "svg",
    canGist: true,
    dryRun: false,
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function gistCreated(id = GIST_ID, files: readonly string[] = ["stats.svg"]) {
  return {
    id,
    files: Object.fromEntries(files.map((name) => [name, { filename: name }])),
  };
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

function createHarness(fetchImpl?: GistFetch, env: NodeJS.ProcessEnv = {}) {
  const fetch = vi.fn<GistFetch>(
    fetchImpl ?? (async () => jsonResponse(201, gistCreated())),
  );
  const ports = createGistOutputPorts({
    fetch,
    env: {
      GITHUB_TOKEN: TOKEN,
      GITHUB_API_URL: "https://api.github.com",
      ...env,
    },
  });
  return { ports, fetch };
}

describe("gistWidgets svg", () => {
  it("publishes svg files to a gist with Authorization and no token in the URL", async () => {
    const { ports, fetch } = createHarness(async () =>
      jsonResponse(201, gistCreated(GIST_ID, ["stats.svg", "languages.svg"])),
    );

    const result = await ports.gistWidgets(
      gistInput({
        files: [
          { path: STATS_PATH, contents: SVG },
          { path: LANGUAGES_PATH, contents: "<svg id='lang' />" },
        ],
      }),
    );

    expect(result.gistId).toBe(GIST_ID);
    expect(result.files).toEqual([STATS_PATH, LANGUAGES_PATH]);
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.github.com/gists");
    expect(String(url)).not.toContain(TOKEN);
    expect(String(url)).not.toMatch(/[?&](access_token|token)=/i);
    expect(init?.method).toBe("POST");
    expect(authorization(init)).toBe(`Bearer ${TOKEN}`);
    const body = JSON.parse(String(init?.body)) as {
      files: Record<string, { content: string }>;
      public: boolean;
    };
    expect(body.public).toBe(true);
    expect(body.files["stats.svg"]?.content).toBe(SVG);
    expect(body.files["languages.svg"]?.content).toBe("<svg id='lang' />");
    expect(body.files["README.md"]).toBeUndefined();
  });

  it("updates an existing gist id with PATCH and keeps the token out of the URL", async () => {
    const { ports, fetch } = createHarness(async () =>
      jsonResponse(200, gistCreated()),
    );

    const result = await ports.gistWidgets(gistInput({ gistId: GIST_ID }));

    expect(result.gistId).toBe(GIST_ID);
    expect(result.files).toEqual([STATS_PATH]);
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toBe(`https://api.github.com/gists/${GIST_ID}`);
    expect(String(url)).not.toContain(TOKEN);
    expect(init?.method).toBe("PATCH");
    expect(authorization(init)).toBe(`Bearer ${TOKEN}`);
  });

  it("does not call GitHub on dryRun and returns the original file paths", async () => {
    const { ports, fetch } = createHarness();

    const result = await ports.gistWidgets(
      gistInput({ dryRun: true, gistId: GIST_ID }),
    );

    expect(result.files).toEqual([STATS_PATH]);
    expect(result.gistId).toBe(GIST_ID);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("prefers INPUT_COMMITTER_TOKEN and GITHUB_API_URL without leaking either into the URL", async () => {
    const { ports, fetch } = createHarness(undefined, {
      INPUT_COMMITTER_TOKEN: COMMITTER_TOKEN,
      GITHUB_TOKEN: TOKEN,
      GITHUB_API_URL: "https://github.example.com/api/v3",
    });

    await ports.gistWidgets(gistInput());

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://github.example.com/api/v3/gists");
    expect(String(url)).not.toContain(COMMITTER_TOKEN);
    expect(String(url)).not.toContain(TOKEN);
    expect(authorization(init)).toBe(`Bearer ${COMMITTER_TOKEN}`);
  });
});

describe("gistWidgets raster and animated rejected", () => {
  it.each(RASTER_FORMATS)(
    "rejects raster format %s without fetching",
    async (format) => {
      const { ports, fetch } = createHarness();

      await expect(ports.gistWidgets(gistInput({ format }))).rejects.toSatisfy(
        (error: unknown) => {
          expect(error).toBeInstanceOf(GistOutputError);
          expect(String(error)).toMatch(/svg/i);
          expect(String(error)).toMatch(/binary-friendly/i);
          expect(String(error)).toMatch(/raster/i);
          return true;
        },
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each(ANIMATED_FORMATS)(
    "rejects animated format %s without fetching",
    async (format) => {
      const { ports, fetch } = createHarness();

      await expect(ports.gistWidgets(gistInput({ format }))).rejects.toSatisfy(
        (error: unknown) => {
          expect(error).toBeInstanceOf(GistOutputError);
          expect(String(error)).toMatch(/svg/i);
          expect(String(error)).toMatch(/binary-friendly/i);
          expect(String(error)).toMatch(/animated/i);
          return true;
        },
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects a png file even when format is svg", async () => {
    const { ports, fetch } = createHarness();

    await expect(
      ports.gistWidgets(
        gistInput({
          files: [{ path: "profile-bits/stats.png", contents: SVG }],
        }),
      ),
    ).rejects.toThrow(/raster/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects png magic bytes even when the filename is .svg", async () => {
    const { ports, fetch } = createHarness();

    await expect(
      ports.gistWidgets(
        gistInput({
          files: [{ path: STATS_PATH, contents: PNG_MAGIC }],
        }),
      ),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(GistOutputError);
      expect(String(error)).toContain(GIST_SVG_ONLY);
      expect(String(error)).toMatch(/binary/i);
      return true;
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an animated file even when format is svg", async () => {
    const { ports, fetch } = createHarness();

    await expect(
      ports.gistWidgets(
        gistInput({
          files: [{ path: "profile-bits/stats.gif", contents: SVG }],
        }),
      ),
    ).rejects.toThrow(/animated/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects apng named as png", async () => {
    const { ports, fetch } = createHarness();

    await expect(
      ports.gistWidgets(
        gistInput({
          format: "apng",
          files: [{ path: "profile-bits/stats.png", contents: SVG }],
        }),
      ),
    ).rejects.toBeInstanceOf(GistOutputError);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("gistWidgets canGist", () => {
  it("fails the run when canGist is false and never fetches", async () => {
    const { ports, fetch } = createHarness();

    await expect(
      ports.gistWidgets(gistInput({ canGist: false })),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(GistOutputError);
      expect((error as GistOutputError).message).toBe(GIST_REQUIRES_CAN_GIST);
      expect(String(error)).toMatch(/canGist/);
      expect(String(error)).toMatch(/user PAT/);
      return true;
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("gistWidgets never unauthenticated and never patches README", () => {
  it("fails without a token and never fetches", async () => {
    const fetch = vi.fn<GistFetch>();
    const ports = createGistOutputPorts({
      fetch,
      env: { GITHUB_TOKEN: "  ", INPUT_COMMITTER_TOKEN: "" },
    });

    await expect(ports.gistWidgets(gistInput())).rejects.toThrow(
      /unauthenticated GitHub gist/,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never writes README.md into a gist", async () => {
    const { ports, fetch } = createHarness();

    await expect(
      ports.gistWidgets(
        gistInput({
          files: [{ path: "README.md", contents: "# patched" }],
        }),
      ),
    ).rejects.toThrow(/README\.md/);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("createGistOutputPorts", () => {
  it("exposes gistWidgets on OutputPorts", async () => {
    const result = await gistWidgets(gistInput({ files: [], dryRun: true }));
    expect(result.files).toEqual([]);
  });

  it("stubs commitWidgets for T300", async () => {
    const { ports, fetch } = createHarness();

    await expect(
      ports.commitWidgets({
        mode: "commit",
        files: [{ path: STATS_PATH, contents: SVG }],
        outputDir: "profile-bits",
        dryRun: false,
        tokenClass: "user_pat",
        message: "chore: update profile-bits widgets",
        dataChanged: true,
      }),
    ).rejects.toThrow(COMMIT_STUB_MESSAGE);
    expect(fetch).not.toHaveBeenCalled();
  });
});
