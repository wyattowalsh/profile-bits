"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { parse, pickOptions, serialize } from "./permalink";
import {
  isTokenQueryKey,
  type PreviewFile,
  type PreviewOptions,
  type PreviewOutputFormat,
  type PreviewProvenance,
  type PreviewRequest,
  type PreviewResponse,
} from "./types";

export const PREVIEW_DEBOUNCE_MS = 200;
export const PREVIEW_ENDPOINT = "/api/preview";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const STILL_FALLBACK_FORMAT: PreviewOutputFormat = "png";
export const MOTION_PREVIEW_FORMATS = ["gif", "apng"] as const;

export const PREVIEW_FETCH_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
} as const;

export type PreviewFetch = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "json">>;

export type PreviewControllerHost = {
  fetch: PreviewFetch;
  reducedMotion: () => boolean;
};

export type PreviewControllerListener = {
  onLoading?: (loading: boolean) => void;
  onResult?: (result: PreviewResponse) => void;
  onError?: (error: Error) => void;
};

export type PreviewController = {
  observe: (request: PreviewRequest) => void;
  generate: (request: PreviewRequest) => Promise<void>;
  dispose: () => void;
};

export type UsePreviewResult = {
  request: PreviewRequest;
  setRequest: Dispatch<SetStateAction<PreviewRequest>>;
  files: PreviewFile[];
  provenance: PreviewProvenance | undefined;
  generatedAt: string | undefined;
  loading: boolean;
  error: Error | undefined;
  generate: () => void;
  reducedMotion: boolean;
};

/** Bit isolator and demo widget auto-POST; stats/languages wait for Generate. */
export function isAutoPreviewScope(request: PreviewRequest): boolean {
  if (request.scope === "bit") {
    return true;
  }
  return request.widget === "demo";
}

export function prefersReducedMotion(
  media:
    | Pick<MediaQueryList, "matches">
    | null
    | undefined = lookupReducedMotion(),
): boolean {
  return media?.matches === true;
}

function lookupReducedMotion(): Pick<MediaQueryList, "matches"> | undefined {
  const host =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window
      : globalThis;
  if (typeof host.matchMedia !== "function") {
    return undefined;
  }
  return host.matchMedia(REDUCED_MOTION_QUERY);
}

function subscribeReducedMotion(onChange: () => void): () => void {
  const matchMedia =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia.bind(window)
      : globalThis.matchMedia?.bind(globalThis);
  if (typeof matchMedia !== "function") {
    return () => {};
  }
  const mq = matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
  };
}

function getReducedMotionSnapshot(): boolean {
  return prefersReducedMotion();
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

export function isMotionPreviewFormat(format: PreviewOutputFormat): boolean {
  return (MOTION_PREVIEW_FORMATS as readonly string[]).includes(format);
}

/** Force still bytes when prefers-reduced-motion. Never POST gif/apng. */
export function resolveClientPreviewFormat(
  format: PreviewOutputFormat,
  reducedMotion: boolean,
): PreviewOutputFormat {
  if (reducedMotion && isMotionPreviewFormat(format)) {
    return STILL_FALLBACK_FORMAT;
  }
  return format;
}

function withStillOptions(
  options: PreviewOptions,
  format: PreviewOutputFormat,
): PreviewOptions {
  const next: PreviewOptions = { ...options, format };
  if (options.demo !== undefined) {
    next.demo = { ...options.demo, animate: false };
  }
  if (options.stats !== undefined) {
    next.stats = { ...options.stats, animate: false };
  }
  if (options.languages !== undefined) {
    next.languages = { ...options.languages, animate: false };
  }
  return next;
}

function stripTokenFields(request: PreviewRequest): PreviewRequest {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(request)) {
    if (isTokenQueryKey(key) || key === "zip") {
      continue;
    }
    out[key] = value;
  }
  if ("options" in out) {
    out.options = pickOptions(out.options);
  }
  return out as PreviewRequest;
}

/**
 * Rebuild a PreviewRequest from permalink fields only.
 * Extra enumerable keys (tokens, zip) never enter the POST body.
 */
export function toPreviewBody(
  request: PreviewRequest,
  reducedMotion = false,
): PreviewRequest {
  const body = stripTokenFields(parse(serialize(request)));
  if (!reducedMotion) {
    return body;
  }
  const format = resolveClientPreviewFormat(body.format, true);
  return stripTokenFields({
    ...body,
    format,
    options: withStillOptions(body.options, format),
  });
}

/** Permalink query for the picker state. Never includes tokens. Not still-coerced. */
export function previewPermalink(request: PreviewRequest): URLSearchParams {
  return serialize(request);
}

export async function postPreview(
  request: PreviewRequest,
  init: {
    fetch?: PreviewFetch;
    reducedMotion?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<PreviewResponse> {
  const fetchFn = init.fetch ?? globalThis.fetch.bind(globalThis);
  const reducedMotion = init.reducedMotion ?? prefersReducedMotion();
  const body = toPreviewBody(request, reducedMotion);
  const response = await fetchFn(PREVIEW_ENDPOINT, {
    method: "POST",
    headers: { ...PREVIEW_FETCH_HEADERS },
    credentials: "same-origin",
    body: JSON.stringify(body),
    signal: init.signal,
  });
  if (!response.ok) {
    throw new Error(`Preview request failed (${response.status})`);
  }
  return (await response.json()) as PreviewResponse;
}

/**
 * Debounce + POST controller. `observe` auto-fetches demo/bit after 200ms;
 * stats/languages require `generate`. Never reads sessionStorage.
 */
export function createPreviewController(
  host: PreviewControllerHost,
  listener: PreviewControllerListener = {},
): PreviewController {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: AbortController | undefined;
  let generation = 0;

  function cancelTimer(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function cancelInFlight(): void {
    abort?.abort();
    abort = undefined;
  }

  function dispose(): void {
    cancelTimer();
    cancelInFlight();
  }

  async function generate(request: PreviewRequest): Promise<void> {
    cancelTimer();
    cancelInFlight();
    generation += 1;
    const id = generation;
    const controller = new AbortController();
    abort = controller;
    listener.onLoading?.(true);
    try {
      const result = await postPreview(request, {
        fetch: host.fetch,
        reducedMotion: host.reducedMotion(),
        signal: controller.signal,
      });
      if (id !== generation || controller.signal.aborted) {
        return;
      }
      listener.onResult?.(result);
      listener.onLoading?.(false);
    } catch (cause) {
      if (
        id !== generation ||
        controller.signal.aborted ||
        isAbortError(cause)
      ) {
        return;
      }
      listener.onError?.(
        cause instanceof Error ? cause : new Error(String(cause)),
      );
      listener.onLoading?.(false);
    }
  }

  function observe(request: PreviewRequest): void {
    cancelTimer();
    cancelInFlight();
    if (!isAutoPreviewScope(request)) {
      return;
    }
    timer = setTimeout(() => {
      timer = undefined;
      void generate(request);
    }, PREVIEW_DEBOUNCE_MS);
  }

  return { observe, generate, dispose };
}

function isAbortError(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause != null &&
    "name" in cause &&
    (cause as { name: string }).name === "AbortError"
  );
}

/**
 * Client preview hook. POSTs `/api/preview` with a PreviewRequest body.
 * Visitor tokens stay in sessionStorage — this hook never reads or sends them.
 */
export function usePreview(initial: PreviewRequest): UsePreviewResult {
  const [request, setRequest] = useState(initial);
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [provenance, setProvenance] = useState<PreviewProvenance | undefined>();
  const [generatedAt, setGeneratedAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const requestRef = useRef(request);
  requestRef.current = request;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const sessionRef = useRef<PreviewController | undefined>(undefined);

  useEffect(() => {
    const session = createPreviewController(
      {
        fetch: globalThis.fetch.bind(globalThis),
        reducedMotion: () => reducedMotionRef.current,
      },
      {
        onLoading: setLoading,
        onResult: (result) => {
          setFiles(result.files);
          setProvenance(result.provenance);
          setGeneratedAt(result.generatedAt);
          setError(undefined);
        },
        onError: setError,
      },
    );
    sessionRef.current = session;
    return () => {
      session.dispose();
      sessionRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    sessionRef.current?.observe(
      reducedMotion ? toPreviewBody(request, true) : request,
    );
  }, [request, reducedMotion]);

  const generate = useCallback(() => {
    void sessionRef.current?.generate(requestRef.current);
  }, []);

  return {
    request,
    setRequest,
    files,
    provenance,
    generatedAt,
    loading,
    error,
    generate,
    reducedMotion,
  };
}
