import { isMissingToken, type OutputFormat } from "@profile-bits/core";
import type {
  GistWidgetsInput,
  GistWidgetsResult,
  OutputPorts,
  WidgetBlob,
} from "./output.ts";

export const GIST_REQUIRES_CAN_GIST =
  "output_action: gist requires canGist (user PAT); installation tokens cannot create gists";
export const GIST_SVG_ONLY =
  "output_action: gist is SVG only (GitHub gist is not binary-friendly)";
export const COMMIT_STUB_MESSAGE = "use T300 git.ts";
export const GITHUB_API_VERSION = "2022-11-28";
export const GIST_DESCRIPTION = "profile-bits widgets" as const;
export const DEFAULT_API_URL = "https://api.github.com";

const RASTER_FORMATS = new Set<OutputFormat>(["png", "jpeg", "webp", "ico"]);
const ANIMATED_FORMATS = new Set<OutputFormat>(["gif", "apng"]);
const RASTER_EXTENSIONS = new Set(["png", "jpeg", "jpg", "webp", "ico"]);
const ANIMATED_EXTENSIONS = new Set(["gif", "apng"]);

const PNG_MAGIC = Uint8Array.of(0x89, 0x50, 0x4e, 0x47);
const JPEG_MAGIC = Uint8Array.of(0xff, 0xd8, 0xff);
const GIF_MAGIC = Uint8Array.of(0x47, 0x49, 0x46, 0x38);
const ICO_MAGIC = Uint8Array.of(0x00, 0x00, 0x01, 0x00);

export class GistOutputError extends Error {
  override readonly name = "GistOutputError";
}

export type GistFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type GistOutputPortsOptions = {
  env?: NodeJS.ProcessEnv;
  fetch?: GistFetch;
};

type GistFile = {
  filename: string;
  content: string;
};

/**
 * Gist implementation of {@link OutputPorts.gistWidgets}.
 *
 * SVG only. Requires `canGist`. Never patches README.md. Never calls GitHub
 * without a token. Commit publishing is T300 (`git.ts`); this factory stubs
 * `commitWidgets`.
 */
export function createGistOutputPorts(
  options: GistOutputPortsOptions = {},
): OutputPorts {
  return {
    commitWidgets: async () => {
      throw new GistOutputError(COMMIT_STUB_MESSAGE);
    },
    gistWidgets: (input) => gistWidgets(input, options),
  };
}

export async function gistWidgets(
  input: GistWidgetsInput,
  options: GistOutputPortsOptions = {},
): Promise<GistWidgetsResult> {
  assertGistAllowed(input);
  const published = locateGistFiles(input.files);
  const paths = input.files.map((file) => file.path);

  if (input.dryRun) {
    return { files: paths, gistId: input.gistId };
  }
  if (published.length === 0) {
    return { files: paths, gistId: input.gistId };
  }

  const env = options.env ?? process.env;
  const token = firstNonEmpty(env.INPUT_COMMITTER_TOKEN, env.GITHUB_TOKEN);
  if (token === undefined || isMissingToken(token)) {
    throw new GistOutputError(
      "github_token is missing; refusing unauthenticated GitHub gist",
    );
  }

  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const api = (env.GITHUB_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
  const gistId = normalizeGistId(input.gistId);
  const url = gistId === undefined ? `${api}/gists` : `${api}/gists/${gistId}`;
  const method = gistId === undefined ? "POST" : "PATCH";
  const files = Object.fromEntries(
    published.map((file) => [file.filename, { content: file.content }]),
  );
  const body: Record<string, unknown> = { files };
  if (method === "POST") {
    body.description = GIST_DESCRIPTION;
    body.public = true;
  }

  const response = await fetchImpl(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (response.status < 200 || response.status >= 300) {
    throw new GistOutputError(
      `failed to ${method === "PATCH" ? "update" : "create"} gist (HTTP ${response.status}): ${text}`,
    );
  }

  return {
    gistId: parseGistId(text) ?? gistId,
    files: paths,
  };
}

function assertGistAllowed(input: GistWidgetsInput): void {
  if (!input.canGist) {
    throw new GistOutputError(GIST_REQUIRES_CAN_GIST);
  }
  if (input.format !== "svg") {
    throw new GistOutputError(unsupportedFormatError(input.format));
  }
}

function locateGistFiles(files: readonly WidgetBlob[]): GistFile[] {
  const located: GistFile[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const next = locateGistFile(file);
    if (seen.has(next.filename)) {
      throw new GistOutputError(
        `duplicate gist filename ${next.filename}; gist files are flat`,
      );
    }
    seen.add(next.filename);
    located.push(next);
  }
  return located;
}

function locateGistFile(file: WidgetBlob): GistFile {
  const trimmed = file.path.replaceAll("\\", "/").replace(/^\.?\//, "");
  if (isReadmePath(trimmed)) {
    throw new GistOutputError("Action must not patch README.md");
  }
  const segments = trimmed
    .split("/")
    .filter((part) => part !== "" && part !== ".");
  if (segments.includes("..")) {
    throw new GistOutputError("widget file path escapes output_dir");
  }
  if (segments.includes("README.md")) {
    throw new GistOutputError("Action must not patch README.md");
  }
  const filename = segments.at(-1);
  if (filename === undefined || filename === "") {
    throw new GistOutputError("widget file path is empty");
  }
  assertSvgFilename(filename);
  return { filename, content: svgText(filename, file.contents) };
}

function assertSvgFilename(filename: string): void {
  const extension = extensionOf(filename);
  if (extension === "svg") {
    return;
  }
  if (RASTER_EXTENSIONS.has(extension)) {
    throw new GistOutputError(
      `${GIST_SVG_ONLY}; rejected raster file ${filename}`,
    );
  }
  if (ANIMATED_EXTENSIONS.has(extension)) {
    throw new GistOutputError(
      `${GIST_SVG_ONLY}; rejected animated file ${filename}`,
    );
  }
  throw new GistOutputError(`${GIST_SVG_ONLY}; rejected ${filename}`);
}

function unsupportedFormatError(format: OutputFormat): string {
  if (RASTER_FORMATS.has(format)) {
    return `${GIST_SVG_ONLY}; raster format ${format} is not supported`;
  }
  if (ANIMATED_FORMATS.has(format)) {
    return `${GIST_SVG_ONLY}; animated format ${format} is not supported`;
  }
  return `${GIST_SVG_ONLY}; gist requires format: svg (got ${format})`;
}

function normalizeGistId(gistId: string | undefined): string | undefined {
  const trimmed = gistId?.trim();
  if (trimmed === undefined || trimmed === "") {
    return undefined;
  }
  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
    throw new GistOutputError(`unsafe gist id: ${trimmed}`);
  }
  return trimmed;
}

function parseGistId(body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      typeof (parsed as { id: unknown }).id === "string"
    ) {
      return (parsed as { id: string }).id;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function isReadmePath(path: string): boolean {
  return path === "README.md" || path.endsWith("/README.md");
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) {
    return "";
  }
  return filename.slice(dot + 1).toLowerCase();
}

function svgText(filename: string, contents: string | Uint8Array): string {
  const bytes =
    typeof contents === "string"
      ? new TextEncoder().encode(contents)
      : contents;
  if (looksLikeNonSvgBinary(bytes)) {
    throw new GistOutputError(
      `${GIST_SVG_ONLY}; rejected non-svg binary contents in ${filename}`,
    );
  }
  const text =
    typeof contents === "string"
      ? contents
      : new TextDecoder().decode(contents);
  if (!isSvgMarkup(text)) {
    throw new GistOutputError(
      `${GIST_SVG_ONLY}; rejected non-svg contents in ${filename}`,
    );
  }
  return text;
}

function looksLikeNonSvgBinary(bytes: Uint8Array): boolean {
  if (
    startsWith(bytes, PNG_MAGIC) ||
    startsWith(bytes, JPEG_MAGIC) ||
    startsWith(bytes, GIF_MAGIC) ||
    startsWith(bytes, ICO_MAGIC)
  ) {
    return true;
  }
  if (isWebp(bytes)) {
    return true;
  }
  return bytes.includes(0);
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 12) {
    return false;
  }
  return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
}

function startsWith(bytes: Uint8Array, magic: Uint8Array): boolean {
  if (bytes.byteLength < magic.byteLength) {
    return false;
  }
  return magic.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function isSvgMarkup(text: string): boolean {
  return /<svg[\s/>]/i.test(text);
}

function firstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  for (const value of values) {
    if (value !== undefined && value.trim() !== "") {
      return value;
    }
  }
  return undefined;
}
