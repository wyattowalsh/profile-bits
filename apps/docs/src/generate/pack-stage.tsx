"use client";

import {
  type MouseEvent,
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { downloadExportImage } from "@/src/generate/export-image";
import {
  permalinkHref,
  type ShareReason,
  type ShareResult,
  sharePreviewFile,
  tweetIntentUrl,
} from "@/src/generate/share-result";
import { CopyButton } from "@/src/preview/copy-button";
import type {
  PreviewFile,
  PreviewOutputFormat,
  PreviewRequest,
} from "@/src/preview/types";

export const CARD_WIDTH = 480;
export const CARD_HEIGHT = 160;

export const DOWNLOAD_LABEL = "Download";
export const SHARE_LABEL = "Share";
export const COPY_LINK_LABEL = "Copy generator link";
export const TWEET_LABEL = "Tweet generator link";

export const REDUCED_MOTION_NOTICE =
  "Motion paused (prefers-reduced-motion). Showing a still preview — not a CSS animation of a PNG.";

const MOTION_FORMATS = new Set<PreviewOutputFormat>(["gif", "apng"]);

const ARCHIVE_MIME =
  /(?:application|multipart)\/(?:x-)?zip(?:-compressed)?|\+zip$/i;
const ARCHIVE_NAME = /\.zip$/i;

const PACK_STAGE_CSS = `
[data-slot="pack-stage"] {
  display: grid;
  gap: 0.75rem;
}
[data-slot="pack-pair"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
[data-slot="pack-card"],
[data-slot="pack-skeleton"] {
  box-sizing: border-box;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  margin: 0;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-muted);
  overflow: hidden;
  position: relative;
}
[data-slot="pack-card"] img {
  display: block;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  max-width: none;
  animation: none;
}
[data-slot="pack-card"] figcaption,
[data-slot="pack-skeleton"] figcaption {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
[data-slot="pack-actions"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
[data-slot="pack-download"],
[data-slot="pack-share"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
  cursor: pointer;
  background: var(--color-fd-primary);
  color: var(--color-fd-primary-foreground);
}
[data-slot="pack-download"]:disabled,
[data-slot="pack-share"]:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
[data-slot="pack-download"]:focus-visible,
[data-slot="pack-share"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
[data-slot="share-fallback"],
[data-slot="pack-status"],
[data-slot="reduced-motion-notice"] {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-fd-muted-foreground);
}
[data-slot="tweet-intent"] {
  font-weight: 600;
  color: var(--color-fd-foreground);
}
@media (prefers-reduced-motion: reduce) {
  [data-slot="pack-card"] img {
    animation: none;
  }
}
`;

export const SHARE_STATUS: Record<ShareReason, string> = {
  shared: "Shared",
  unsupported:
    "Sharing files is not supported here (unsupported). Copy the generator link or tweet it.",
  files_unsupported:
    "This browser cannot share image files (files_unsupported). Copy the generator link or tweet it.",
  aborted: "",
  failed: "Share failed (failed). Copy the generator link or tweet it.",
};

export type ShareFallbackReason = Exclude<ShareReason, "shared" | "aborted">;

export function isMotionFormat(
  format: PreviewOutputFormat,
  motion = false,
): boolean {
  return MOTION_FORMATS.has(format) || (format === "webp" && motion);
}

export function fileIsMotion(
  file: PreviewFile,
  format: PreviewOutputFormat,
  motion = false,
): boolean {
  if (isMotionFormat(format, motion)) {
    return true;
  }
  const mime = file.mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime === "image/gif" || mime === "image/apng") {
    return true;
  }
  return /\.(gif|apng)$/i.test(file.filename);
}

export function prefersReducedMotion(
  media: { matchMedia?: (query: string) => MediaQueryList } = globalThis,
): boolean {
  return (
    media.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

export function isZipPreviewFile(file: PreviewFile): boolean {
  const mime = file.mime.split(";")[0]?.trim() ?? "";
  return ARCHIVE_MIME.test(mime) || ARCHIVE_NAME.test(file.filename);
}

export function visiblePackFiles(files: readonly PreviewFile[]): PreviewFile[] {
  return files.filter((file) => !isZipPreviewFile(file));
}

/** T309 permalink. Tokens never appear in the href. */
export function generatorPermalink(
  request: PreviewRequest,
  origin: string,
): string {
  return permalinkHref(request, origin);
}

/** Single-file download via export-image. */
export function downloadPackFile(file: PreviewFile): void {
  downloadExportImage(file);
}

/** Web Share Level 2 file share. UI must branch on `reason`. */
export async function sharePackFile(file: PreviewFile): Promise<ShareResult> {
  return sharePreviewFile(file);
}

export function shouldShowShareFallback(
  reason: ShareReason,
): reason is ShareFallbackReason {
  return (
    reason === "unsupported" ||
    reason === "files_unsupported" ||
    reason === "failed"
  );
}

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  if (typeof globalThis.matchMedia !== "function") {
    return () => {};
  }
  const query = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onStoreChange);
  return () => {
    query.removeEventListener("change", onStoreChange);
  };
}

function reducedMotionSnapshot(): boolean {
  return prefersReducedMotion();
}

function reducedMotionServerSnapshot(): boolean {
  return false;
}

function cardSlots(
  files: readonly PreviewFile[],
  pair: boolean,
): Array<PreviewFile | undefined> {
  const count = pair ? 2 : 1;
  return Array.from({ length: count }, (_, index) => files[index]);
}

function stillSlots(
  files: readonly PreviewFile[],
  pair: boolean,
  format: PreviewOutputFormat,
  motion: boolean,
  reduced: boolean,
): Array<PreviewFile | undefined> {
  return cardSlots(files, pair).map((file) => {
    if (!file) {
      return undefined;
    }
    if (reduced && fileIsMotion(file, format, motion)) {
      return undefined;
    }
    return file;
  });
}

function PackSkeleton({ label }: { label: string }) {
  return (
    <figure
      data-slot="pack-skeleton"
      data-card-width={CARD_WIDTH}
      data-card-height={CARD_HEIGHT}
      role="status"
      aria-label={label}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      <Skeleton style={{ width: CARD_WIDTH, height: CARD_HEIGHT }} />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function PackCard({ file }: { file: PreviewFile | undefined }) {
  const caption = file
    ? `${file.filename} (${CARD_WIDTH}×${CARD_HEIGHT})`
    : `Widget card ${CARD_WIDTH}×${CARD_HEIGHT}`;
  return (
    <figure
      data-slot="pack-card"
      data-card-width={CARD_WIDTH}
      data-card-height={CARD_HEIGHT}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {file ? (
        <img
          alt={file.filename}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          src={`data:${file.mime};base64,${file.bytesBase64}`}
        />
      ) : null}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export type ShareFallbackProps = {
  request: PreviewRequest;
  origin: string;
  reason: ShareFallbackReason;
};

/** Copy permalink / tweet — visible text from ShareResult.reason, not toast-only. */
export function ShareFallback({ request, origin, reason }: ShareFallbackProps) {
  const tweet = tweetIntentUrl(request, origin);
  return (
    <aside data-slot="share-fallback" data-share-reason={reason} role="status">
      <p data-slot="pack-status">{SHARE_STATUS[reason]}</p>
      <a
        data-slot="tweet-intent"
        href={tweet}
        rel="noopener noreferrer"
        target="_blank"
      >
        {TWEET_LABEL}
      </a>
    </aside>
  );
}

export type PackStageProps = {
  files: readonly PreviewFile[];
  request: PreviewRequest;
  origin: string;
  loading?: boolean;
  output_pair?: boolean;
  format?: PreviewOutputFormat;
  /** Animated WebP (gif/apng are always motion). */
  motion?: boolean;
  /** Override `prefers-reduced-motion` (tests / SSR). */
  reducedMotion?: boolean;
  className?: string;
};

/** Generate-surface hero: 480×160 card plus Download, Share, Copy generator link. */
export function PackStage({
  files = [],
  request,
  origin = "",
  loading = false,
  output_pair = false,
  format = "svg",
  motion = false,
  reducedMotion: reducedMotionProp,
  className,
}: PackStageProps) {
  const permalink = generatorPermalink(request, origin);
  const visible = visiblePackFiles(files);
  const primary = visible[0];
  const canExport = primary != null && !loading;
  const empty = !loading && visible.length === 0;

  const reducedFromMedia = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  );
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const reduced = reducedMotionProp ?? reducedFromMedia;
  const motionOn = isMotionFormat(format, motion);
  const showStill =
    reduced &&
    (motionOn || visible.some((file) => fileIsMotion(file, format, motion)));
  const slots = stillSlots(visible, output_pair, format, motion, showStill);
  const showSkeleton = loading || empty;

  const onDownload = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (primary == null) {
        return;
      }
      setDownloadError(null);
      try {
        downloadPackFile(primary);
      } catch (error) {
        setDownloadError(
          error instanceof Error ? error.message : "Download failed",
        );
      }
    },
    [primary],
  );

  const onShare = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (primary == null) {
        return;
      }
      const result = await sharePackFile(primary);
      if (result.reason === "aborted") {
        return;
      }
      setShareResult(result);
    },
    [primary],
  );

  return (
    <>
      <style href="profile-bits-pack-stage" precedence="default">
        {PACK_STAGE_CSS}
      </style>
      <section
        data-slot="pack-stage"
        data-loading={loading ? "true" : "false"}
        data-empty={empty ? "true" : "false"}
        data-output-pair={output_pair ? "true" : "false"}
        data-reduced-motion={reduced ? "true" : "false"}
        data-card-width={CARD_WIDTH}
        data-card-height={CARD_HEIGHT}
        aria-busy={loading}
        className={cn(className)}
      >
        <div
          data-slot="pack-pair"
          data-output-pair={output_pair ? "true" : "false"}
        >
          {showSkeleton
            ? (output_pair ? ["dark", "light"] : ["hero"]).map((slot) => (
                <PackSkeleton
                  key={`pack-skel-${slot}`}
                  label={
                    loading
                      ? "Loading generator preview"
                      : `Widget card ${CARD_WIDTH}×${CARD_HEIGHT}`
                  }
                />
              ))
            : slots.map((file, index) => {
                const slot = output_pair
                  ? (["dark", "light"] as const)[index]
                  : "hero";
                return (
                  <PackCard
                    key={file?.id ?? `pack-empty-${slot}`}
                    file={file}
                  />
                );
              })}
        </div>
        <div data-slot="pack-actions">
          <button
            type="button"
            data-slot="pack-download"
            data-primary-cta="download"
            aria-label={DOWNLOAD_LABEL}
            disabled={!canExport}
            onClick={onDownload}
          >
            {DOWNLOAD_LABEL}
          </button>
          <button
            type="button"
            data-slot="pack-share"
            data-primary-cta="share"
            aria-label={SHARE_LABEL}
            disabled={!canExport}
            onClick={(event) => {
              void onShare(event);
            }}
          >
            {SHARE_LABEL}
          </button>
          <div
            data-slot="pack-copy-link"
            data-primary-cta="copy-link"
            data-permalink={permalink}
          >
            <CopyButton value={permalink} label={COPY_LINK_LABEL} />
          </div>
        </div>
        {reduced ? (
          <p data-slot="reduced-motion-notice" role="status">
            {REDUCED_MOTION_NOTICE}
          </p>
        ) : null}
        {downloadError != null ? (
          <p data-slot="pack-status" role="status">
            {downloadError}
          </p>
        ) : null}
        {shareResult?.ok === true ? (
          <p
            data-slot="pack-status"
            data-share-reason={shareResult.reason}
            role="status"
          >
            {SHARE_STATUS.shared}
          </p>
        ) : null}
        {shareResult != null &&
        !shareResult.ok &&
        shouldShowShareFallback(shareResult.reason) ? (
          <ShareFallback
            request={request}
            origin={origin}
            reason={shareResult.reason}
          />
        ) : null}
      </section>
    </>
  );
}
