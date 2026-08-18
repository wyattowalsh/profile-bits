"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  COPY_GENERATOR_LINK_LABEL,
  DEFAULT_GENERATE_REQUEST,
  DOWNLOAD_LABEL,
  GENERATE_BUTTON_LABEL,
  GENERATE_PLUGIN_ID,
  GLOBAL_BAR_MODULE,
  PACK_STAGE_MODULE,
  SHARE_LABEL,
} from "@/src/generate/constants";
import { downloadExportImage } from "@/src/generate/export-image";
import { PackStage as DefaultPackStage } from "@/src/generate/pack-stage";
import {
  permalinkHref,
  type ShareReason,
  sharePreviewFile,
  tweetIntentUrl,
} from "@/src/generate/share-result";
import { CopyButton } from "@/src/preview/copy-button";
import { CrossLink } from "@/src/preview/cross-link";
import { FixturePill } from "@/src/preview/fixture-pill";
import { GlobalBar as DefaultGlobalBar } from "@/src/preview/global-bar";
import {
  GENERATE_PATH_PREFIX,
  parse,
  pickOptions,
} from "@/src/preview/permalink";
import {
  isPreviewBitName,
  isPreviewWidgetId,
  type PreviewFile,
  type PreviewOutputFormat,
  type PreviewProvenance,
  type PreviewRequest,
  type PreviewTheme,
} from "@/src/preview/types";
import { isAutoPreviewScope, usePreview } from "@/src/preview/use-preview";

export {
  CARD_HEIGHT,
  CARD_WIDTH,
  COPY_GENERATOR_LINK_LABEL,
  DEFAULT_GENERATE_REQUEST,
  DOWNLOAD_LABEL,
  GENERATE_BUTTON_LABEL,
  GENERATE_PLUGIN_ID,
  GLOBAL_BAR_MODULE,
  PACK_STAGE_MODULE,
  SHARE_LABEL,
};

const CARD_SIZE_STYLE: CSSProperties = {
  width: CARD_WIDTH,
  height: CARD_HEIGHT,
};

const GENERATE_SHELL_CSS = `
[data-slot="generate-shell"] {
  display: grid;
  gap: 1rem;
  width: min(64rem, 100%);
  margin-inline: auto;
  padding: 1.5rem 1rem 3rem;
}
[data-slot="generate-header"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
[data-slot="generate-title"] {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}
[data-slot="generate-lede"] {
  margin: 0;
  color: var(--color-fd-muted-foreground);
  font-size: 0.875rem;
}
[data-slot="generate-hero"],
[data-slot="generate-hero-fallback"] {
  width: 480px;
  height: 160px;
  margin: 0;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid var(--color-fd-border);
  background: var(--color-fd-muted);
}
[data-slot="generate-hero-fallback"] img {
  display: block;
  width: 480px;
  height: 160px;
  max-width: 480px;
  max-height: 160px;
  animation: none;
}
[data-slot="generate-actions"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
[data-slot="generate-download"],
[data-slot="generate-share"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  cursor: pointer;
}
[data-slot="generate-download"] {
  background: var(--color-fd-primary);
  color: var(--color-fd-primary-foreground);
  font-weight: 600;
}
[data-slot="generate-share"] {
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  font-weight: 500;
}
[data-slot="generate-download"]:disabled,
[data-slot="generate-share"]:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
[data-slot="generate-preview"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  cursor: pointer;
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  font-weight: 600;
}
[data-slot="generate-preview"]:focus-visible,
[data-slot="generate-download"]:focus-visible,
[data-slot="generate-share"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
[data-slot="generate-actions"] [data-slot="copy-button"] {
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  font-weight: 500;
}
[data-slot="generate-share-status"] {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-fd-muted-foreground);
}
[data-slot="generate-tweet"] {
  color: var(--color-fd-primary);
  text-decoration: underline;
}
[data-slot="generate-main"] {
  min-width: 0;
}
@media (prefers-reduced-motion: reduce) {
  [data-slot="generate-hero-fallback"] img {
    animation: none;
  }
}
`;

export type PackStageProps = {
  files?: PreviewFile[];
  request?: PreviewRequest;
  loading?: boolean;
  origin?: string;
};

export type GlobalBarValue = {
  format: PreviewOutputFormat;
  theme: PreviewTheme;
  output_pair: boolean;
  user: string;
};

export type GlobalBarProps = {
  value?: GlobalBarValue;
  onChange?: (value: GlobalBarValue) => void;
};

export type PackStageComponent = ComponentType<PackStageProps>;
export type GlobalBarComponent = ComponentType<GlobalBarProps>;

export type GenerateShellProps = {
  children?: ReactNode;
  files?: PreviewFile[];
  request?: PreviewRequest;
  provenance?: PreviewProvenance;
  loading?: boolean;
  origin?: string;
  className?: string;
  /** Inject T315p; omit to load `PACK_STAGE_MODULE` when importable. */
  PackStage?: PackStageComponent | null;
  /** Inject T311n; omit to load `GLOBAL_BAR_MODULE` when importable. */
  GlobalBar?: GlobalBarComponent | null;
  onRequestChange?: (request: PreviewRequest) => void;
};

function pickComponent<T>(
  mod: Record<string, unknown>,
  names: readonly string[],
): T | null {
  for (const name of names) {
    const value = mod[name];
    if (typeof value === "function") {
      return value as T;
    }
  }
  return null;
}

/**
 * Optional T315p import. Specifier is a `string` so tsc does not require
 * `pack-stage.tsx` to exist while that task is still in flight.
 */
export async function importPackStage(): Promise<PackStageComponent | null> {
  const specifier: string = PACK_STAGE_MODULE;
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Record<
      string,
      unknown
    >;
    return pickComponent<PackStageComponent>(mod, ["PackStage", "default"]);
  } catch {
    return null;
  }
}

/**
 * Optional T311n import. Specifier is a `string` so tsc does not require
 * `global-bar.tsx` to exist while that task is still in flight.
 */
export async function importGlobalBar(): Promise<GlobalBarComponent | null> {
  const specifier: string = GLOBAL_BAR_MODULE;
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Record<
      string,
      unknown
    >;
    return pickComponent<GlobalBarComponent>(mod, ["GlobalBar", "default"]);
  } catch {
    return null;
  }
}

export function generatePath(request: PreviewRequest): string {
  if (request.scope === "bit") {
    return `${GENERATE_PATH_PREFIX}/bits/${request.bit ?? "Theme"}`;
  }
  const plugin = request.plugin ?? GENERATE_PLUGIN_ID;
  if (request.scope === "widget") {
    return `${GENERATE_PATH_PREFIX}/${plugin}/${request.widget ?? "demo"}`;
  }
  return `${GENERATE_PATH_PREFIX}/${plugin}`;
}

function permalinkGlobals(
  search: string | URLSearchParams,
): Pick<
  PreviewRequest,
  "options" | "format" | "theme" | "output_pair" | "user"
> {
  const parsed = parse(search);
  return {
    options: pickOptions(parsed.options),
    format: parsed.format,
    theme: parsed.theme,
    output_pair: parsed.output_pair,
    user: parsed.user || DEFAULT_GENERATE_REQUEST.user,
  };
}

/**
 * Map `/generate/*` plus permalink query onto a PreviewRequest.
 * Path owns scope; `parse` + `pickOptions` fill the query. Tokens are dropped.
 */
export function requestFromPathname(
  pathname: string,
  search: string | URLSearchParams = "",
): PreviewRequest {
  const globals = permalinkGlobals(search);
  const parts = pathname.split("/").filter(Boolean);
  const root = parts[0];
  const second = parts[1];
  const third = parts[2];

  if (root === "generate" && second === GENERATE_PLUGIN_ID) {
    if (third !== undefined && isPreviewWidgetId(third)) {
      return {
        ...globals,
        scope: "widget",
        plugin: GENERATE_PLUGIN_ID,
        widget: third,
      };
    }
    return {
      ...globals,
      scope: "plugin",
      plugin: GENERATE_PLUGIN_ID,
    };
  }

  if (
    root === "generate" &&
    second === "bits" &&
    third !== undefined &&
    isPreviewBitName(third)
  ) {
    return {
      ...globals,
      scope: "bit",
      plugin: GENERATE_PLUGIN_ID,
      bit: third,
    };
  }

  return {
    ...DEFAULT_GENERATE_REQUEST,
    ...globals,
  };
}

export function resolveOrigin(origin?: string): string {
  if (origin !== undefined && origin.length > 0) {
    return origin;
  }
  if (
    typeof globalThis.location === "object" &&
    globalThis.location !== null &&
    typeof globalThis.location.origin === "string" &&
    globalThis.location.origin.length > 0
  ) {
    return globalThis.location.origin;
  }
  return "http://localhost:3000";
}

function shareStatusCopy(reason: ShareReason): string | null {
  if (reason === "shared" || reason === "aborted") {
    return null;
  }
  if (reason === "unsupported" || reason === "files_unsupported") {
    return "Sharing files is not supported here. Copy the generator link or tweet it.";
  }
  return "Share failed. Copy the generator link or tweet it.";
}

function HeroFallback({
  file,
  loading,
}: {
  file: PreviewFile | undefined;
  loading: boolean;
}) {
  return (
    <figure
      data-slot="generate-hero-fallback"
      data-card-width={CARD_WIDTH}
      data-card-height={CARD_HEIGHT}
      data-loading={loading ? "true" : "false"}
      style={CARD_SIZE_STYLE}
      aria-label="Widget preview 480 by 160"
      aria-busy={loading}
    >
      {file !== undefined ? (
        <img
          alt={file.filename}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          src={`data:${file.mime};base64,${file.bytesBase64}`}
        />
      ) : null}
      <figcaption>{file?.filename ?? "github pack"}</figcaption>
    </figure>
  );
}

/** Visual generator chrome for `/generate/*`. No yaml rail. No source-drop. */
export function GenerateShell({
  children,
  files: filesProp,
  request: requestProp,
  provenance: provenanceProp,
  loading: loadingProp,
  origin,
  className,
  PackStage: PackStageProp,
  GlobalBar: GlobalBarProp,
  onRequestChange,
}: GenerateShellProps) {
  const pathname = usePathname() ?? "/generate/github";
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() ?? "";
  const preview = usePreview(
    requestProp ?? requestFromPathname(pathname, searchKey),
  );
  const [shareReason, setShareReason] = useState<ShareReason | undefined>(
    undefined,
  );

  useEffect(() => {
    if (requestProp !== undefined) {
      preview.setRequest(requestProp);
      return;
    }
    preview.setRequest(requestFromPathname(pathname, searchKey));
  }, [pathname, preview.setRequest, requestProp, searchKey]);

  const PackStage =
    PackStageProp === undefined ? DefaultPackStage : PackStageProp;
  const GlobalBar =
    GlobalBarProp === undefined ? DefaultGlobalBar : GlobalBarProp;

  const request = preview.request;
  const files = filesProp ?? preview.files;
  const loading = loadingProp ?? preview.loading;
  const provenance = provenanceProp ?? preview.provenance;
  const autoPreview = isAutoPreviewScope(request);

  const resolvedOrigin = resolveOrigin(origin);
  const plugin = request.plugin ?? GENERATE_PLUGIN_ID;
  const file = files[0];
  const hasFile = file !== undefined;
  const generatorHref = useMemo(
    () => permalinkHref(request, resolvedOrigin),
    [request, resolvedOrigin],
  );
  const crossHref = useMemo(
    () => permalinkHref(request, resolvedOrigin),
    [request, resolvedOrigin],
  );
  const tweetHref = useMemo(
    () => tweetIntentUrl(request, resolvedOrigin),
    [request, resolvedOrigin],
  );

  const handleRequestChange = useCallback(
    (next: PreviewRequest) => {
      preview.setRequest(next);
      onRequestChange?.(next);
    },
    [onRequestChange, preview.setRequest],
  );

  const handleDownload = useCallback(() => {
    if (file === undefined) {
      return;
    }
    downloadExportImage(file);
  }, [file]);

  const handleShare = useCallback(async () => {
    if (file === undefined) {
      return;
    }
    const result = await sharePreviewFile(file);
    setShareReason(result.reason);
  }, [file]);

  const shareCopy =
    shareReason === undefined ? null : shareStatusCopy(shareReason);
  const showTweet =
    shareReason === "unsupported" ||
    shareReason === "files_unsupported" ||
    shareReason === "failed";

  return (
    <div
      data-slot="generate-shell"
      data-plugin={plugin}
      data-card-width={CARD_WIDTH}
      data-card-height={CARD_HEIGHT}
      data-canonical-path={generatePath(request)}
      className={cn(className)}
    >
      <style href="profile-bits-generate-shell" precedence="default">
        {GENERATE_SHELL_CSS}
      </style>
      <header data-slot="generate-header">
        <h1 data-slot="generate-title">Generate</h1>
        {provenance !== undefined ? (
          <FixturePill provenance={provenance} />
        ) : null}
        <CrossLink href={crossHref} />
      </header>
      <p data-slot="generate-lede">
        Visual generator for the <code>{GENERATE_PLUGIN_ID}</code> pack (
        <code>demo</code>, <code>stats</code>, <code>languages</code>). Card
        size is {CARD_WIDTH}×{CARD_HEIGHT}. Download, share, or copy a generator
        link — not Action YAML.
      </p>
      {GlobalBar !== null && GlobalBar !== undefined ? (
        <GlobalBar
          value={{
            format: request.format,
            theme: request.theme,
            output_pair: request.output_pair,
            user: request.user,
          }}
          onChange={(value) => {
            handleRequestChange({
              ...request,
              format: value.format,
              theme: value.theme,
              output_pair: value.output_pair,
              user: value.user,
              options: pickOptions({
                ...request.options,
                format: value.format,
                theme: value.theme,
                output_pair: value.output_pair,
              }),
            });
          }}
        />
      ) : null}
      {autoPreview ? null : (
        <button
          type="button"
          data-slot="generate-preview"
          onClick={() => {
            preview.generate();
          }}
        >
          {GENERATE_BUTTON_LABEL}
        </button>
      )}
      <div data-slot="generate-hero" style={CARD_SIZE_STYLE}>
        {PackStage !== null && PackStage !== undefined ? (
          <PackStage
            files={files}
            request={request}
            loading={loading}
            origin={resolvedOrigin}
          />
        ) : (
          <HeroFallback file={file} loading={loading} />
        )}
      </div>
      <div data-slot="generate-actions">
        <button
          type="button"
          data-slot="generate-download"
          data-primary="true"
          aria-label={DOWNLOAD_LABEL}
          disabled={!hasFile}
          onClick={handleDownload}
        >
          {DOWNLOAD_LABEL}
        </button>
        <button
          type="button"
          data-slot="generate-share"
          aria-label={SHARE_LABEL}
          disabled={!hasFile}
          onClick={() => {
            void handleShare();
          }}
        >
          {SHARE_LABEL}
        </button>
        <CopyButton
          value={generatorHref}
          label={COPY_GENERATOR_LINK_LABEL}
          aria-label={COPY_GENERATOR_LINK_LABEL}
        />
      </div>
      {shareCopy !== null ? (
        <p data-slot="generate-share-status" role="status">
          {shareCopy}{" "}
          {showTweet ? (
            <a
              data-slot="generate-tweet"
              href={tweetHref}
              rel="noopener noreferrer"
            >
              Tweet
            </a>
          ) : null}
        </p>
      ) : null}
      <div data-slot="generate-main">{children}</div>
    </div>
  );
}
