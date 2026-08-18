"use client";

import {
  type ComponentType,
  type ReactNode,
  useSyncExternalStore,
} from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ReadmeMode } from "@/src/codegen/readme-mode";
import type {
  PreviewFile,
  PreviewOutputFormat,
  PreviewResponse,
} from "./types";

/** Locked card size. Do not expose a custom size control. */
export const CARD_WIDTH = 480;
export const CARD_HEIGHT = 160;

export const PREVIEW_STAGE_TABS = ["layout", "readme"] as const;
export type PreviewStageTab = (typeof PREVIEW_STAGE_TABS)[number];

/** T312 module. PreviewStage imports `ReadmeMode` from here. */
export const README_MODE_MODULE = "@/src/codegen/readme-mode";

export const REDUCED_MOTION_NOTICE =
  "Motion paused (prefers-reduced-motion). Showing a still preview — not a CSS animation of a PNG.";

export const WASM_PLACEHOLDER_NOTE =
  "Takumi WASM layout preview is unavailable. Empty 480×160 slot until @profile-bits/renderer WASM is wired.";

export const PAIR_CAPTIONS = ["Light", "Dark"] as const;

const MOTION_FORMATS = new Set<PreviewOutputFormat>(["gif", "apng"]);

const ARCHIVE_MIME =
  /(?:application|multipart)\/(?:x-)?zip(?:-compressed)?|\+zip$/i;
const ARCHIVE_NAME = /\.zip$/i;

const PREVIEW_STAGE_CSS = `
[data-slot="preview-stage"] {
  display: grid;
  gap: 0.75rem;
}
[data-slot="preview-pair"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
[data-slot="preview-card"],
[data-slot="preview-wasm"],
[data-slot="preview-skeleton"] {
  box-sizing: border-box;
  margin: 0;
}
[data-slot="preview-card-frame"] {
  box-sizing: border-box;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-muted);
  overflow: hidden;
}
[data-slot="preview-card"] img,
[data-slot="preview-wasm"] [data-slot="preview-card-frame"] {
  display: block;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  max-width: none;
  animation: none;
}
[data-slot="preview-card"] figcaption,
[data-slot="preview-wasm"] figcaption,
[data-slot="preview-skeleton"] figcaption {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--color-fd-muted-foreground);
}
[data-slot="reduced-motion-notice"],
[data-slot="preview-wasm-note"] {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-fd-muted-foreground);
}
@media (prefers-reduced-motion: reduce) {
  [data-slot="preview-card"] img,
  [data-slot="preview-wasm"] [data-slot="preview-card-frame"] {
    animation: none;
  }
}
`;

export type ReadmeModeSlotProps = {
  files: readonly PreviewFile[];
};

export type ReadmeModeComponent = ComponentType<ReadmeModeSlotProps>;

export type PreviewStageProps = {
  files?: PreviewResponse["files"] | readonly PreviewFile[];
  response?: PreviewResponse;
  loading?: boolean;
  output_pair?: boolean;
  format?: PreviewOutputFormat;
  /** Animated WebP (gif/apng are always motion). */
  motion?: boolean;
  /** Override `prefers-reduced-motion` (tests / SSR). */
  reducedMotion?: boolean;
  tab?: PreviewStageTab;
  onTabChange?: (tab: PreviewStageTab) => void;
  /** Override T312 `ReadmeMode` (tests). Default is the codegen import. */
  readmeMode?: ReadmeModeComponent | null;
  className?: string;
};

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

export function isZipPreviewFile(file: PreviewFile): boolean {
  const mime = file.mime.split(";")[0]?.trim() ?? "";
  return ARCHIVE_MIME.test(mime) || ARCHIVE_NAME.test(file.filename);
}

export function prefersReducedMotion(
  media: { matchMedia?: (query: string) => MediaQueryList } = globalThis,
): boolean {
  return (
    media.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
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

export function visiblePreviewFiles(
  files: readonly PreviewFile[],
): PreviewFile[] {
  return files.filter((file) => !isZipPreviewFile(file));
}

function cardSlots(
  files: readonly PreviewFile[],
  pair: boolean,
): Array<PreviewFile | undefined> {
  const visible = visiblePreviewFiles(files);
  const count = pair ? 2 : 1;
  return Array.from({ length: count }, (_, index) => visible[index]);
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

function pairCaption(index: number, pair: boolean): string {
  if (!pair) {
    return "Preview";
  }
  return PAIR_CAPTIONS[index] ?? `Preview ${index + 1}`;
}

function fileCaption(
  file: PreviewFile | undefined,
  index: number,
  pair: boolean,
  still: boolean,
): string {
  if (still && !file) {
    return `${pairCaption(index, pair)} still (${CARD_WIDTH}×${CARD_HEIGHT})`;
  }
  if (file) {
    return file.filename;
  }
  return `${pairCaption(index, pair)} (${CARD_WIDTH}×${CARD_HEIGHT})`;
}

function CardFrame({ children }: { children?: ReactNode }) {
  return (
    <div
      data-slot="preview-card-frame"
      data-card-width={CARD_WIDTH}
      data-card-height={CARD_HEIGHT}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {children}
    </div>
  );
}

function PreviewSkeleton({ caption }: { caption: string }) {
  return (
    <figure
      data-slot="preview-skeleton"
      data-card-width={CARD_WIDTH}
      data-card-height={CARD_HEIGHT}
      role="status"
      aria-label={caption}
    >
      <CardFrame>
        <Skeleton style={{ width: CARD_WIDTH, height: CARD_HEIGHT }} />
      </CardFrame>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function PreviewCard({
  file,
  caption,
}: {
  file: PreviewFile | undefined;
  caption: string;
}) {
  return (
    <figure
      data-slot="preview-card"
      data-card-width={CARD_WIDTH}
      data-card-height={CARD_HEIGHT}
    >
      <CardFrame>
        {file ? (
          <img
            alt={caption}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            src={`data:${file.mime};base64,${file.bytesBase64}`}
          />
        ) : null}
      </CardFrame>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function WasmPlaceholder({ caption }: { caption: string }) {
  return (
    <figure
      data-slot="preview-wasm"
      data-wasm="placeholder"
      data-card-width={CARD_WIDTH}
      data-card-height={CARD_HEIGHT}
    >
      <CardFrame />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function PairRow({ pair, children }: { pair: boolean; children: ReactNode }) {
  return (
    <div data-slot="preview-pair" data-output-pair={pair ? "true" : "false"}>
      {children}
    </div>
  );
}

/**
 * Named slot T312 fills. Delegates to imported `ReadmeMode` when that
 * module is present (this tree).
 */
export function ReadmeModeSlot({ files }: ReadmeModeSlotProps) {
  return <ReadmeMode files={files} />;
}

function slotCaptions(pair: boolean): readonly string[] {
  return pair ? PAIR_CAPTIONS : ["Preview"];
}

function LayoutPane({ loading, pair }: { loading: boolean; pair: boolean }) {
  const captions = slotCaptions(pair);
  return (
    <div data-slot="preview-layout">
      <PairRow pair={pair}>
        {captions.map((caption) =>
          loading ? (
            <PreviewSkeleton
              key={`layout-skel-${caption}`}
              caption={`Loading ${caption.toLowerCase()}`}
            />
          ) : (
            <WasmPlaceholder
              key={`layout-wasm-${caption}`}
              caption={`WASM layout ${caption.toLowerCase()} (${CARD_WIDTH}×${CARD_HEIGHT})`}
            />
          ),
        )}
      </PairRow>
      {loading ? null : (
        <p data-slot="preview-wasm-note">{WASM_PLACEHOLDER_NOTE}</p>
      )}
    </div>
  );
}

function ReadmePane({
  loading,
  pair,
  files,
  slots,
  still,
  ReadmeModeView,
}: {
  loading: boolean;
  pair: boolean;
  files: readonly PreviewFile[];
  slots: Array<PreviewFile | undefined>;
  still: boolean;
  ReadmeModeView: ReadmeModeComponent | null;
}) {
  if (loading) {
    const captions = slotCaptions(pair);
    return (
      <div data-slot="readme-mode" data-readme-mode="loading">
        <PairRow pair={pair}>
          {captions.map((caption) => (
            <PreviewSkeleton
              key={`readme-skel-${caption}`}
              caption={`Loading ${caption.toLowerCase()}`}
            />
          ))}
        </PairRow>
      </div>
    );
  }

  if (ReadmeModeView) {
    return <ReadmeModeView files={files} />;
  }

  return (
    <section data-slot="readme-mode" data-readme-mode="slot">
      <PairRow pair={pair}>
        {slots.map((file, index) => (
          <PreviewCard
            key={file?.id ?? `readme-empty-${pairCaption(index, pair)}`}
            file={file}
            caption={fileCaption(file, index, pair, still)}
          />
        ))}
      </PairRow>
    </section>
  );
}

/** Center playground stage: WASM layout tab + README-mode tab. */
export function PreviewStage({
  files,
  response,
  loading = false,
  output_pair = false,
  format = "svg",
  motion = false,
  reducedMotion: reducedMotionProp,
  tab,
  onTabChange,
  readmeMode,
  className,
}: PreviewStageProps) {
  const resolvedFiles = visiblePreviewFiles(files ?? response?.files ?? []);
  const reducedFromMedia = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  );
  const reduced = reducedMotionProp ?? reducedFromMedia;
  const motionOn = isMotionFormat(format, motion);
  const showStill =
    reduced &&
    (motionOn ||
      resolvedFiles.some((file) => fileIsMotion(file, format, motion)));
  const slotFiles = stillSlots(
    resolvedFiles,
    output_pair,
    format,
    motion,
    showStill,
  );
  const readmeFiles = slotFiles.filter(
    (file): file is PreviewFile => file !== undefined,
  );
  const ReadmeModeView = readmeMode === undefined ? ReadmeMode : readmeMode;

  return (
    <>
      <style href="profile-bits-preview-stage" precedence="default">
        {PREVIEW_STAGE_CSS}
      </style>
      <section
        data-slot="preview-stage"
        data-loading={loading ? "true" : "false"}
        data-output-pair={output_pair ? "true" : "false"}
        data-reduced-motion={reduced ? "true" : "false"}
        data-card-width={CARD_WIDTH}
        data-card-height={CARD_HEIGHT}
        aria-busy={loading}
        className={cn(className)}
      >
        <Tabs
          defaultValue="layout"
          value={tab}
          onValueChange={(value) => {
            if (value === "layout" || value === "readme") {
              onTabChange?.(value);
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="readme">README</TabsTrigger>
          </TabsList>
          <TabsContent value="layout">
            <LayoutPane loading={loading} pair={output_pair} />
          </TabsContent>
          <TabsContent value="readme">
            <ReadmePane
              loading={loading}
              pair={output_pair}
              files={showStill ? readmeFiles : resolvedFiles}
              slots={slotFiles}
              still={showStill}
              ReadmeModeView={ReadmeModeView}
            />
          </TabsContent>
        </Tabs>
        {reduced ? (
          <p data-slot="reduced-motion-notice" role="status">
            {REDUCED_MOTION_NOTICE}
          </p>
        ) : null}
      </section>
    </>
  );
}
