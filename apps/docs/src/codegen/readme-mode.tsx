"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import type { PreviewFile } from "@/src/preview/types";

/** Playground README-mode pane. Bytes come from PreviewFile props. */

export const README_CARD_WIDTH = 480;
export const README_CARD_HEIGHT = 160;
export const README_OUTPUT_DIR = "profile-bits";
export const README_APNG_MIME = "image/png";
export const README_EMBED_EXAMPLE = "![](./profile-bits/…)";

const README_IMAGE_EXT = /\.(?:svg|png|jpe?g|gif|webp|ico)$/i;
const TOKEN_LITERAL =
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+/;
const REMOTE_URL = /https?:\/\//i;

export const README_MODE_CHECKLIST = [
  {
    id: "baked-svg",
    label:
      "Baked still SVG: default renderSvg has no CSS @keyframes, SMIL, or foreignObject. GitHub README does not treat that file as a live CSS document.",
  },
  {
    id: "no-css-keyframes",
    label:
      "GitHub SVG does not run CSS @keyframes or SMIL. CSS @keyframes are authoring input to renderAnimation, not GitHub SVG runtime.",
  },
  {
    id: "apng-as-png",
    label: "APNG is served and named as PNG (image/png, .png).",
  },
  {
    id: "card-size",
    label: `Default card size is ${README_CARD_WIDTH}×${README_CARD_HEIGHT}.`,
  },
  {
    id: "action-commits",
    label: "The Action commits widget files; it does not patch README.md.",
  },
  {
    id: "relative-embed",
    label: `Embed with a relative path: ${README_EMBED_EXAMPLE}. Do not hotlink a CDN or Camo URL.`,
  },
  {
    id: "gist-optional",
    label:
      "Gist is optional publish. Default embed is relative committed files. Do not hotlink gist raw as a CDN.",
  },
  {
    id: "not-camo-oracle",
    label:
      "This playground is a layout and time-axis preview. It is not a Camo, ?sanitize=true, or README HTML-sanitizer oracle. The checklist states baked-output constraints only and does not predict rewriting.",
  },
] as const;

export type ReadmeModeChecklistItem = (typeof README_MODE_CHECKLIST)[number];

const README_MODE_CSS = `
[data-slot="readme-mode"] {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: var(--color-fd-foreground);
}
[data-slot="readme-mode-caption"] {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--color-fd-muted-foreground);
}
[data-slot="readme-mode-files"] {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
}
[data-slot="readme-mode-file"] {
  margin: 0;
}
[data-slot="readme-mode-file"] img {
  display: block;
  width: ${README_CARD_WIDTH}px;
  max-width: 100%;
  height: auto;
  aspect-ratio: ${README_CARD_WIDTH} / ${README_CARD_HEIGHT};
  background: var(--color-fd-muted);
}
[data-slot="readme-mode-file"] figcaption {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--color-fd-muted-foreground);
}
[data-slot="readme-mode-empty"] {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--color-fd-muted-foreground);
}
[data-slot="readme-mode-checklist"] {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4rem;
}
[data-slot="readme-mode-checklist"] h2 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
}
[data-slot="readme-mode-checklist"] ul {
  margin: 0;
  padding-left: 1.25rem;
}
`;

function mediaType(mime: string): string {
  return mime.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isApng(file: PreviewFile): boolean {
  return (
    mediaType(file.mime) === "image/apng" || /\.apng$/i.test(file.filename)
  );
}

function isRemoteOrToken(value: string): boolean {
  return REMOTE_URL.test(value) || TOKEN_LITERAL.test(value);
}

function normalizeFilename(filename: string): string {
  return filename
    .replace(/^\/+/, "")
    .replace(/^\.\//, "")
    .replace(/\.apng$/i, ".png");
}

function fileStem(filename: string): string {
  return normalizeFilename(filename)
    .replace(/^.*\//, "")
    .replace(/\.[^.]+$/, "");
}

function isReadmeDisplayFile(file: PreviewFile): boolean {
  if (isRemoteOrToken(file.filename) || isRemoteOrToken(file.id)) {
    return false;
  }
  const mime = mediaType(file.mime);
  const name = readmeDisplayFilename(file);
  return mime.startsWith("image/") || README_IMAGE_EXT.test(name);
}

/** APNG preview uses image/png. Other PreviewFile mime types pass through. */
export function readmeModeDisplayMime(file: PreviewFile): string {
  if (isApng(file)) {
    return README_APNG_MIME;
  }
  return mediaType(file.mime) || "application/octet-stream";
}

/** README delivery names APNG `.png`. */
export function readmeDisplayFilename(file: PreviewFile): string {
  return file.filename.replace(/\.apng$/i, ".png");
}

/** Data URL from PreviewFile.bytesBase64 (no re-encode, no renderer call). */
export function previewFileToDataUrl(file: PreviewFile): string {
  return `data:${readmeModeDisplayMime(file)};base64,${file.bytesBase64}`;
}

/** Relative README embed path the Action commits under output_dir. */
export function readmeEmbedMarkdown(filename: string, alt?: string): string {
  const name = normalizeFilename(filename);
  const relative = name.startsWith(`${README_OUTPUT_DIR}/`)
    ? name
    : `${README_OUTPUT_DIR}/${name}`;
  const resolvedAlt = alt ?? fileStem(name);
  return `![${resolvedAlt}](./${relative})`;
}

function markdownForWidgetId(id: string): string | undefined {
  const trimmed = id.trim();
  if (trimmed === "" || isRemoteOrToken(trimmed)) {
    return undefined;
  }
  let filename = `${trimmed}.svg`;
  if (README_IMAGE_EXT.test(trimmed)) {
    filename = trimmed;
  } else if (/\.apng$/i.test(trimmed)) {
    filename = trimmed.replace(/\.apng$/i, ".png");
  }
  return readmeEmbedMarkdown(filename, fileStem(filename));
}

function markdownForFile(file: PreviewFile): string | undefined {
  if (!isReadmeDisplayFile(file)) {
    return undefined;
  }
  const filename = readmeDisplayFilename(file);
  const alt = file.id.trim() || fileStem(filename);
  return readmeEmbedMarkdown(filename, alt);
}

/**
 * Paste-ready README markdown. Relative `./profile-bits/…` only.
 * Accepts PreviewFile rows or widget ids. Never remote URLs or tokens.
 */
export function exportReadmeMarkdown(
  filesOrIds: readonly PreviewFile[] | readonly string[],
): string {
  const lines: string[] = [];
  for (const item of filesOrIds) {
    const line =
      typeof item === "string"
        ? markdownForWidgetId(item)
        : markdownForFile(item);
    if (line !== undefined) {
      lines.push(line);
    }
  }
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

export type ReadmeModeProps = Omit<ComponentProps<"section">, "children"> & {
  files?: readonly PreviewFile[];
};

function ReadmeFilePreview({ file }: { file: PreviewFile }) {
  const filename = readmeDisplayFilename(file);
  const embed = exportReadmeMarkdown([file]).trim();

  return (
    <figure
      data-slot="readme-mode-file"
      data-file-id={file.id}
      data-card-width={README_CARD_WIDTH}
      data-card-height={README_CARD_HEIGHT}
    >
      <img
        src={previewFileToDataUrl(file)}
        alt={filename}
        width={README_CARD_WIDTH}
        height={README_CARD_HEIGHT}
        decoding="async"
      />
      <figcaption>
        {filename}
        {" · "}
        {embed}
      </figcaption>
    </figure>
  );
}

/**
 * Playground-only README mode: show actual renderSvg / renderAnimation bytes
 * from PreviewFile props, plus the GitHub README constraint checklist.
 * Missing renderer is fine — bytes come from props, never from a live render call.
 */
export function ReadmeMode({
  files = [],
  className,
  ...props
}: ReadmeModeProps) {
  const visible = files.filter(isReadmeDisplayFile);

  return (
    <section
      {...props}
      data-slot="readme-mode"
      data-readme-mode="pane"
      aria-labelledby="readme-mode-heading"
      className={cn(className)}
    >
      <style href="profile-bits-readme-mode" precedence="default">
        {README_MODE_CSS}
      </style>
      <p data-slot="readme-mode-caption">
        Actual <code>renderSvg</code> / <code>renderAnimation</code> bytes.
        Layout preview only.
      </p>
      {visible.length === 0 ? (
        <p data-slot="readme-mode-empty">
          No <code>renderSvg</code> / <code>renderAnimation</code> bytes yet.
          Constraints below still apply.
        </p>
      ) : (
        <div data-slot="readme-mode-files">
          {visible.map((file) => (
            <ReadmeFilePreview key={file.id} file={file} />
          ))}
        </div>
      )}
      <ReadmeModeChecklist />
    </section>
  );
}

function ReadmeModeChecklist() {
  return (
    <div data-slot="readme-mode-checklist">
      <h2 id="readme-mode-heading">GitHub README constraints</h2>
      <ul>
        {README_MODE_CHECKLIST.map((item) => (
          <li key={item.id} data-checklist-id={item.id}>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ReadmeMode;
