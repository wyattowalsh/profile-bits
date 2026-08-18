import type {
  DiscoverSourceInput,
  DiscoverSourceResult,
  SourceKind,
} from "./types.js";

export class DiscoverSourceError extends Error {
  override readonly name = "DiscoverSourceError";

  constructor(message: string) {
    super(message);
  }
}

const REACT_EXTENSIONS = new Set([
  ".tsx",
  ".jsx",
  ".ts",
  ".js",
  ".mts",
  ".cts",
]);
const MD_EXTENSIONS = new Set([".md", ".markdown", ".mdown"]);
const HTML_EXTENSIONS = new Set([".html", ".htm"]);

const REACT_MIME = new Set([
  "text/jsx",
  "text/tsx",
  "application/javascript",
  "text/javascript",
]);

const CANONICAL_REACT = /\bwidget\.(tsx|jsx)\b/i;
const CANONICAL_MDX = /\bwidget\.mdx\b/i;
const CANONICAL_MD = /\bwidget\.md\b/i;
const CANONICAL_HTML = /\bwidget\.html\b/i;

/**
 * Infer widget source kind from path/filename, then MIME, then bytes.
 * Optional `declared` must match the discovered kind (md→mdx promotion is
 * not a match for an explicit `source: md`).
 */
export function discoverSource(
  input: DiscoverSourceInput,
  declared?: SourceKind,
): DiscoverSourceResult {
  const blob = `${input.path ?? ""}\n${input.filename ?? ""}`;
  if (isAmbiguousCanonical(blob)) {
    throw new DiscoverSourceError(
      "ambiguous widget entries: widget.md and widget.tsx",
    );
  }

  const discovered = discoverKind(input);
  if (declared !== undefined && declared !== discovered.kind) {
    throw new DiscoverSourceError(
      `source mismatch: declared ${declared}, discovered ${discovered.kind}`,
    );
  }
  return discovered;
}

function discoverKind(input: DiscoverSourceInput): DiscoverSourceResult {
  const fromPath = kindFromPath(input.path, input.filename);
  if (fromPath !== undefined) {
    if (fromPath.kind === "md") {
      const sniffed = sniffContent(input.body);
      if (sniffed === "mdx") {
        return { kind: "mdx", promotedFrom: "md" };
      }
    }
    return fromPath;
  }

  const fromMime = kindFromMime(input.mime);
  if (fromMime !== undefined) {
    if (fromMime.kind === "md") {
      const sniffed = sniffContent(input.body);
      if (sniffed === "mdx") {
        return { kind: "mdx", promotedFrom: "md" };
      }
    }
    return fromMime;
  }

  const sniffed = sniffContent(input.body);
  if (sniffed !== undefined) {
    return { kind: sniffed };
  }

  throw new DiscoverSourceError(
    "could not discover source; use .md, .mdx, .tsx or set source",
  );
}

function kindFromPath(
  path: string | undefined,
  filename: string | undefined,
): DiscoverSourceResult | undefined {
  const name = basename(filename ?? path);
  if (name === undefined) {
    return undefined;
  }
  const ext = extensionOf(name);
  if (REACT_EXTENSIONS.has(ext)) {
    return { kind: "react" };
  }
  if (ext === ".mdx") {
    return { kind: "mdx" };
  }
  if (MD_EXTENSIONS.has(ext)) {
    return { kind: "md" };
  }
  if (HTML_EXTENSIONS.has(ext)) {
    return { kind: "html" };
  }
  return undefined;
}

function kindFromMime(
  mime: string | undefined,
): DiscoverSourceResult | undefined {
  if (mime == null || mime.trim() === "") {
    return undefined;
  }
  const normalized = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (REACT_MIME.has(normalized)) {
    return { kind: "react" };
  }
  if (normalized === "text/mdx") {
    return { kind: "mdx" };
  }
  if (normalized === "text/markdown") {
    return { kind: "md" };
  }
  if (normalized === "text/html") {
    return { kind: "html" };
  }
  return undefined;
}

function sniffContent(body: string | undefined): SourceKind | undefined {
  if (body == null || body.trim() === "") {
    return undefined;
  }
  const trimmed = body.trimStart();
  if (/^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return "html";
  }
  if (looksLikeReact(body)) {
    return "react";
  }
  if (looksLikeMdx(body)) {
    return "mdx";
  }
  if (looksLikeMarkdown(body)) {
    return "md";
  }
  if (/^<[a-z][\s\S]*>/i.test(trimmed) && !looksLikeMarkdown(body)) {
    return "html";
  }
  return undefined;
}

function looksLikeReact(body: string): boolean {
  const hasModule =
    /^\s*(import|export)\b/m.test(body) || /\bfunction\b/.test(body);
  const hasJsx =
    /<[A-Z][A-Za-z0-9.]*/.test(body) ||
    /\btw=/.test(body) ||
    /return\s*\([\s\S]*</.test(body);
  return hasModule && hasJsx;
}

function looksLikeMdx(body: string): boolean {
  const importExport = /^(import|export)\s/m.test(body);
  const jsx = /<[A-Z][A-Za-z0-9.]*/.test(body);
  const expr = /\{(?!#)[^}\n]+\}/.test(body);
  return looksLikeMarkdown(body) && (importExport || jsx || expr);
}

function looksLikeMarkdown(body: string): boolean {
  return (
    /^#{1,6}\s/m.test(body) ||
    /^\s*[-*+]\s/m.test(body) ||
    /\[.+\]\(.+\)/.test(body) ||
    /^```/m.test(body) ||
    /\n\n/.test(body)
  );
}

function isAmbiguousCanonical(blob: string): boolean {
  const kinds = new Set<SourceKind>();
  if (CANONICAL_REACT.test(blob)) {
    kinds.add("react");
  }
  if (CANONICAL_MDX.test(blob)) {
    kinds.add("mdx");
  }
  if (
    CANONICAL_MD.test(blob) &&
    !CANONICAL_MDX.test(blob.replace(/widget\.mdx/gi, ""))
  ) {
    kinds.add("md");
  }
  if (CANONICAL_HTML.test(blob)) {
    kinds.add("html");
  }
  const mdAndTsx = CANONICAL_MD.test(blob) && CANONICAL_REACT.test(blob);
  return mdAndTsx || kinds.size > 1;
}

function basename(value: string | undefined): string | undefined {
  if (value == null || value.trim() === "") {
    return undefined;
  }
  const trimmed = value.trim().replaceAll("\\", "/");
  const last = trimmed.split("/").pop();
  return last === undefined || last === "" ? undefined : last.toLowerCase();
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) {
    return "";
  }
  return name.slice(dot).toLowerCase();
}
