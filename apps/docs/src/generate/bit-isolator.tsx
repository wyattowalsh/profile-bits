"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  DEFAULT_GENERATE_REQUEST,
} from "@/src/generate/constants";
import { parse, pickOptions } from "@/src/preview/permalink";
import type {
  PreviewBitName,
  PreviewFile,
  PreviewRequest,
} from "@/src/preview/types";
import { PREVIEW_ENDPOINT, usePreview } from "@/src/preview/use-preview";

export type BitIsolatorProps = {
  bit: PreviewBitName;
  request?: PreviewRequest;
  files?: PreviewFile[];
  loading?: boolean;
};

/** Canonical POST /api/preview body for one v0 bit isolator. */
export function bitIsolatorRequest(bit: PreviewBitName): PreviewRequest {
  return {
    ...DEFAULT_GENERATE_REQUEST,
    scope: "bit",
    bit,
  };
}

function requestFromSearch(
  bit: PreviewBitName,
  search: string | URLSearchParams,
): PreviewRequest {
  const parsed = parse(search);
  return {
    ...bitIsolatorRequest(bit),
    options: pickOptions(parsed.options),
    format: parsed.format,
    theme: parsed.theme,
    output_pair: parsed.output_pair,
    user: parsed.user || DEFAULT_GENERATE_REQUEST.user,
  };
}

/**
 * 480×160 isolator stage. POSTs `scope: "bit"` via `usePreview`; the preview
 * route renders T315s `bitSampleElement` (Theme+Frame card). No bits import.
 */
export function BitIsolator({
  bit,
  request: requestProp,
  files: filesProp,
  loading: loadingProp,
}: BitIsolatorProps) {
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() ?? "";
  const preview = usePreview(requestProp ?? bitIsolatorRequest(bit));

  useEffect(() => {
    preview.setRequest(requestFromSearch(bit, searchKey));
  }, [bit, preview.setRequest, searchKey]);

  const files = filesProp ?? preview.files;
  const loading = loadingProp ?? preview.loading;
  const file = files[0];
  const label = `${bit} bit stage ${CARD_WIDTH} by ${CARD_HEIGHT}`;
  const caption =
    file !== undefined
      ? `${file.filename} (${CARD_WIDTH}×${CARD_HEIGHT})`
      : `${bit} (${CARD_WIDTH}×${CARD_HEIGHT})`;

  return (
    <figure
      data-slot="bit-stage"
      data-bit={bit}
      data-scope="bit"
      data-preview-endpoint={PREVIEW_ENDPOINT}
      data-loading={loading ? "true" : "false"}
      data-card-width={CARD_WIDTH}
      data-card-height={CARD_HEIGHT}
      aria-label={label}
      aria-busy={loading}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {file !== undefined ? (
        <img
          alt={file.filename}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          src={`data:${file.mime};base64,${file.bytesBase64}`}
        />
      ) : (
        <Skeleton style={{ width: CARD_WIDTH, height: CARD_HEIGHT }} />
      )}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
