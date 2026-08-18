import { toExportImage } from "@/src/generate/export-image";
import { GENERATE_PATH_PREFIX, serialize } from "@/src/preview/permalink";
import {
  isTokenQueryKey,
  type PreviewFile,
  type PreviewRequest,
} from "@/src/preview/types";

export const TWITTER_INTENT_BASE = "https://twitter.com/intent/tweet";

export const SHARE_REASONS = [
  "shared",
  "unsupported",
  "files_unsupported",
  "aborted",
  "failed",
] as const;

export type ShareReason = (typeof SHARE_REASONS)[number];

/** UI must branch on `reason` (copy permalink / tweet / ignore abort) — not toast-only. */
export type ShareResult =
  | { ok: true; reason: "shared" }
  | {
      ok: false;
      reason: Exclude<ShareReason, "shared">;
    };

/** APNG is shared/named as PNG (`image/png`, `.png`) — Camo has no `image/apng`. */
export function shareFilename(preview: PreviewFile): string {
  return toExportImage(preview).filename;
}

export function shareMime(preview: PreviewFile): string {
  return toExportImage(preview).mime;
}

/** Image File from PreviewFile blob. Never zip. */
export function previewFileToShareFile(preview: PreviewFile): File {
  const exported = toExportImage(preview);
  return new File([exported.blob], exported.filename, { type: exported.mime });
}

function navigatorShare(): Navigator | undefined {
  if (typeof globalThis.navigator === "undefined") {
    return undefined;
  }
  return globalThis.navigator;
}

export function canShareFiles(file: File): boolean {
  const nav = navigatorShare();
  if (nav == null || typeof nav.share !== "function") {
    return false;
  }
  if (typeof nav.canShare !== "function") {
    return false;
  }
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error != null &&
    "name" in error &&
    (error as { name: string }).name === "AbortError"
  );
}

/**
 * Share the rendered image File via Web Share Level 2.
 * `navigator.share({ files: [file] })` only — no zip, no hosted image URL.
 */
export async function sharePreviewFile(
  preview: PreviewFile,
): Promise<ShareResult> {
  const nav = navigatorShare();
  if (nav == null || typeof nav.share !== "function") {
    return { ok: false, reason: "unsupported" };
  }

  let file: File;
  try {
    file = previewFileToShareFile(preview);
  } catch {
    return { ok: false, reason: "failed" };
  }

  if (typeof nav.canShare === "function") {
    let filesOk = false;
    try {
      filesOk = nav.canShare({ files: [file] });
    } catch {
      filesOk = false;
    }
    if (!filesOk) {
      return { ok: false, reason: "files_unsupported" };
    }
  }

  try {
    await nav.share({ files: [file] });
    return { ok: true, reason: "shared" };
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, reason: "aborted" };
    }
    return { ok: false, reason: "failed" };
  }
}

function generatePermalinkPath(request: PreviewRequest): string {
  if (request.scope === "bit") {
    const bit = request.bit ?? "Theme";
    return `${GENERATE_PATH_PREFIX}/bits/${bit}`;
  }
  const plugin = request.plugin ?? "github";
  if (request.scope === "widget") {
    const widget = request.widget ?? "demo";
    return `${GENERATE_PATH_PREFIX}/${plugin}/${widget}`;
  }
  return `${GENERATE_PATH_PREFIX}/${plugin}`;
}

function normalizeOrigin(origin: string): string {
  return new URL(origin).origin;
}

function stripForbiddenParams(params: URLSearchParams): void {
  for (const key of [...params.keys()]) {
    if (isTokenQueryKey(key) || key.toLowerCase() === "zip") {
      params.delete(key);
    }
  }
}

/** T309 permalink href on `/generate`. Query from `serialize`; never tokens, zip, or embed URLs. */
export function permalinkHref(request: PreviewRequest, origin: string): string {
  const url = new URL(
    generatePermalinkPath(request),
    `${normalizeOrigin(origin)}/`,
  );
  const params = serialize(request);
  stripForbiddenParams(params);
  url.search = params.toString();
  return url.toString();
}

/**
 * Tweet Web Intent. `url` is the T309 permalink (not a CDN / GET image).
 * Tokens and zip never appear in the intent or nested permalink.
 */
export function tweetIntentUrl(
  request: PreviewRequest,
  origin: string,
): string {
  const permalink = permalinkHref(request, origin);
  const intent = new URL(TWITTER_INTENT_BASE);
  intent.searchParams.set("url", permalink);
  stripForbiddenParams(intent.searchParams);
  return intent.toString();
}
