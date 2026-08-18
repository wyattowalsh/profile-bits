import type { PreviewFile } from "../preview/types";

/** Camo has no `image/apng`; APNG bytes download as PNG. */
export const APNG_DOWNLOAD_MIME = "image/png";

const ZIP_EXPORT_ERROR =
  "Zip archives are not supported. Download a single file.";

const ZIP_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip",
  "application/x-zip-compressed",
  "application/zip-compressed",
  "multipart/x-zip",
]);

export type ExportImage = {
  readonly blob: Blob;
  readonly filename: string;
  readonly mime: string;
};

function mediaType(mime: string): string {
  return mime.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isZipMime(mime: string): boolean {
  const type = mediaType(mime);
  return ZIP_MIME_TYPES.has(type) || type.endsWith("+zip") || /zip/i.test(type);
}

function isZipFilename(filename: string): boolean {
  return /\.zip$/i.test(filename);
}

function isApng(file: PreviewFile): boolean {
  return (
    mediaType(file.mime) === "image/apng" || /\.apng$/i.test(file.filename)
  );
}

function withPngExtension(filename: string): string {
  if (/\.apng$/i.test(filename)) {
    return filename.replace(/\.apng$/i, ".png");
  }
  if (/\.png$/i.test(filename)) {
    return filename.replace(/\.png$/i, ".png");
  }
  return `${filename}.png`;
}

function decodeBase64(bytesBase64: string): Uint8Array {
  if (bytesBase64.length === 0) {
    return new Uint8Array(0);
  }
  const binary = globalThis.atob(bytesBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function assertExportableFile(file: PreviewFile): void {
  if (isZipMime(file.mime) || isZipFilename(file.filename)) {
    throw new Error(ZIP_EXPORT_ERROR);
  }
}

/**
 * Convert one PreviewFile to a downloadable Blob.
 * APNG is named `.png` with mime `image/png`. Never a zip.
 */
export function toExportImage(file: PreviewFile): ExportImage {
  assertExportableFile(file);
  const mime = isApng(file) ? APNG_DOWNLOAD_MIME : mediaType(file.mime);
  const filename = isApng(file)
    ? withPngExtension(file.filename)
    : file.filename;
  const bytes = decodeBase64(file.bytesBase64);
  const blob = new Blob([bytes], { type: mime });
  return { blob, filename, mime };
}

/** PreviewFile bytes → Blob (APNG rewritten to `image/png`). */
export function previewFileToBlob(file: PreviewFile): Blob {
  return toExportImage(file).blob;
}

/**
 * Trigger a single-file download via `<a download>`.
 * jsdom-safe: tests mock `document.createElement`.
 * Never bundles files into an archive.
 */
export function downloadExportImage(file: PreviewFile): void {
  const exported = toExportImage(file);
  const documentRef = globalThis.document;
  if (documentRef == null) {
    throw new Error("document is required to download a file");
  }
  const objectUrl = URL.createObjectURL(exported.blob);
  const anchor = documentRef.createElement("a");
  anchor.href = objectUrl;
  anchor.download = exported.filename;
  anchor.rel = "noopener";
  documentRef.body?.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Refuse multi-file archives. Exactly one PreviewFile may download.
 */
export function toExportImages(files: readonly PreviewFile[]): ExportImage {
  if (files.length !== 1) {
    throw new Error(ZIP_EXPORT_ERROR);
  }
  const file = files[0];
  if (file == null) {
    throw new Error(ZIP_EXPORT_ERROR);
  }
  return toExportImage(file);
}
