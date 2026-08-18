/**
 * Docs playground preview renderer (POST body → files).
 * Missing App token → T110 fixtures, zero outbound GitHub.
 * Live GitHub uses one server-side client per request (never visitor tokens).
 */

import { createHash } from "node:crypto";
import { githubPreviewNode } from "@profile-bits/plugins";
import {
  assertTakumiTree,
  fromJsx,
  isStillFormat,
  render,
  renderAnimation,
  renderSvg,
} from "@profile-bits/renderer";
import {
  classifyGithubHttp,
  decideIncludePrivate,
  isMissingToken,
} from "../../../../../packages/core/src/auth-policy";
import { bitSampleElement } from "../../generate/bit-samples";
import type {
  PreviewBitName,
  PreviewFile,
  PreviewOptions,
  PreviewOutputFormat,
  PreviewProvenance,
  PreviewRequest,
  PreviewResponse,
  PreviewTheme,
  PreviewWidgetId,
} from "../types";
import { loadPreviewFixtures } from "./fixtures";

export const GITHUB_PREVIEW_CACHE_TTL_MS = 60_000;

/** Docs live preview: GitHub App installation tokens only. Never GITHUB_TOKEN. */
const APP_TOKEN_ENV_KEYS = ["GITHUB_APP", "GITHUB_APP_TOKEN"] as const;

const STILL_MIME: Record<
  Exclude<PreviewOutputFormat, "gif" | "apng">,
  string
> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  ico: "image/x-icon",
};

type LoginCacheEntry = {
  payload: unknown;
  expiresAt: number;
};

const loginCache = new Map<string, LoginCacheEntry>();

export type PreviewGithubCapabilities = {
  canPrivate: boolean;
};

export type PreviewGithubPayloadInput = {
  user: string;
  widget: PreviewWidgetId;
  includePrivate: boolean;
  includeForks: boolean;
  includeArchived: boolean;
};

export type PreviewGithubClient = {
  capabilities: PreviewGithubCapabilities;
  loadPayload: (input: PreviewGithubPayloadInput) => Promise<unknown>;
};

export type PreviewRenderInput = {
  id: string;
  widget?: PreviewWidgetId;
  bit?: PreviewBitName;
  format: PreviewOutputFormat;
  theme: PreviewTheme;
  motion: boolean;
  payload: unknown;
  options: PreviewOptions;
  user: string;
};

export type RenderPreviewHost = {
  now?: () => Date;
  readToken?: () => string | undefined | null;
  loadFixtures?: () => unknown | Promise<unknown>;
  createGithubClient?: (
    token: string,
    configuredUser: string,
  ) => PreviewGithubClient | Promise<PreviewGithubClient | null> | null;
  renderStill?: (
    input: PreviewRenderInput,
  ) => Uint8Array | Promise<Uint8Array | null> | null;
  renderMotion?: (
    input: PreviewRenderInput,
  ) => Uint8Array | Promise<Uint8Array | null> | null;
};

export function clearPreviewGithubCache(): void {
  loginCache.clear();
}

export async function renderPreview(
  body: PreviewRequest,
  host: RenderPreviewHost = {},
): Promise<PreviewResponse> {
  const generatedAt = isoNow(host);
  const token = host.readToken?.() ?? readAppToken();

  if (isMissingToken(token)) {
    return fixtureResponse(body, host, generatedAt, "fixture");
  }

  const widgets = requestedWidgets(body);
  const needsGithub = widgets.some(usesGithubIntegration);

  let client: PreviewGithubClient | null = null;
  if (needsGithub) {
    client = await resolveGithubClient(token, body.user, host);
    if (client == null) {
      return fixtureResponse(body, host, generatedAt, "fixture");
    }
  }

  try {
    const files = await renderWidgets(body, widgets, client, host, token);
    return { files, provenance: "live", generatedAt };
  } catch (error) {
    if (isRateLimitedFailure(error)) {
      return fixtureResponse(body, host, generatedAt, "rate_limited");
    }
    return fixtureResponse(body, host, generatedAt, "fixture");
  }
}

function isoNow(host: RenderPreviewHost): string {
  return (host.now?.() ?? new Date()).toISOString();
}

function readAppToken(): string | undefined {
  for (const key of APP_TOKEN_ENV_KEYS) {
    const value = process.env[key];
    if (!isMissingToken(value)) {
      return value;
    }
  }
  return undefined;
}

async function fixtureResponse(
  body: PreviewRequest,
  host: RenderPreviewHost,
  generatedAt: string,
  provenance: Extract<PreviewProvenance, "fixture" | "rate_limited">,
): Promise<PreviewResponse> {
  const payload = await loadFixturePayload(host);
  const files = await renderFromPayload(body, payload, host);
  return { files, provenance, generatedAt };
}

async function loadFixturePayload(host: RenderPreviewHost): Promise<unknown> {
  try {
    if (host.loadFixtures != null) {
      return await host.loadFixtures();
    }
    return await loadPreviewFixtures();
  } catch {
    return null;
  }
}

async function resolveGithubClient(
  token: string,
  configuredUser: string,
  host: RenderPreviewHost,
): Promise<PreviewGithubClient | null> {
  if (isMissingToken(token)) {
    return null;
  }
  if (host.createGithubClient != null) {
    return (await host.createGithubClient(token, configuredUser)) ?? null;
  }
  return defaultCreateGithubClient(token, configuredUser);
}

type GithubClientFactory = (input: {
  token: string;
  configuredUser: string;
}) => unknown;

async function defaultCreateGithubClient(
  token: string,
  configuredUser: string,
): Promise<PreviewGithubClient | null> {
  const specifiers = [
    "@profile-bits/integrations/github",
    "@profile-bits/integrations",
  ];
  for (const specifier of specifiers) {
    const factory = await loadGithubClientFactory(specifier);
    if (factory == null) {
      continue;
    }
    try {
      const created = await factory({ token, configuredUser });
      const adapted = adaptGithubClient(created);
      if (adapted != null) {
        return adapted;
      }
    } catch {}
  }
  return null;
}

async function loadGithubClientFactory(
  specifier: string,
): Promise<GithubClientFactory | null> {
  try {
    const imported: unknown = await import(/* @vite-ignore */ specifier);
    if (imported == null || typeof imported !== "object") {
      return null;
    }
    const rec = imported as Record<string, unknown>;
    const factory = rec.createGithubClient ?? rec.createClient ?? rec.default;
    return typeof factory === "function"
      ? (factory as GithubClientFactory)
      : null;
  } catch {
    return null;
  }
}

function adaptGithubClient(raw: unknown): PreviewGithubClient | null {
  if (raw == null || typeof raw !== "object") {
    return null;
  }
  const rec = raw as Record<string, unknown>;
  const loadPayload =
    rec.loadPayload ?? rec.fetchPayload ?? rec.load ?? rec.fetch;
  const capabilitiesOfRaw = (): PreviewGithubCapabilities =>
    capabilitiesOf(rec.capabilities ?? rec);
  if (typeof loadPayload !== "function") {
    return {
      get capabilities() {
        return capabilitiesOfRaw();
      },
      loadPayload: async () => rec.payload ?? rec,
    };
  }
  return {
    get capabilities() {
      return capabilitiesOfRaw();
    },
    loadPayload: (input) =>
      Promise.resolve(
        (loadPayload as (input: PreviewGithubPayloadInput) => unknown)(input),
      ),
  };
}

function capabilitiesOf(raw: unknown): PreviewGithubCapabilities {
  if (raw != null && typeof raw === "object" && "canPrivate" in raw) {
    return {
      canPrivate: (raw as PreviewGithubCapabilities).canPrivate === true,
    };
  }
  return { canPrivate: false };
}

async function renderWidgets(
  body: PreviewRequest,
  widgets: readonly PreviewWidgetId[],
  client: PreviewGithubClient | null,
  host: RenderPreviewHost,
  token: string,
): Promise<PreviewFile[]> {
  const files: PreviewFile[] = [];

  if (body.scope === "bit") {
    const payload = await loadFixturePayload(host);
    files.push(
      ...(await filesForTarget(body, { bit: body.bit }, payload, host)),
    );
    return files;
  }

  const fixturePayload = widgets.some(
    (widget) => !usesGithubIntegration(widget),
  )
    ? await loadFixturePayload(host)
    : null;

  for (const widget of widgets) {
    try {
      if (usesGithubIntegration(widget)) {
        if (client == null) {
          continue;
        }
        const includePrivate = includePrivateFor(widget, body.options);
        const payload = await loadGithubPayload(body, widget, client, token);
        if (
          decideIncludePrivate({
            includePrivate,
            canPrivate: client.capabilities.canPrivate,
          }) === "fail_widget"
        ) {
          continue;
        }
        files.push(...(await filesForTarget(body, { widget }, payload, host)));
        continue;
      }
      files.push(
        ...(await filesForTarget(body, { widget }, fixturePayload, host)),
      );
    } catch (error) {
      if (isRateLimitedFailure(error)) {
        throw error;
      }
      if (isFailWidgetFailure(error)) {
        continue;
      }
      throw error;
    }
  }
  return files;
}

function tokenCacheIdentity(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function loadGithubPayload(
  body: PreviewRequest,
  widget: PreviewWidgetId,
  client: PreviewGithubClient,
  token: string,
): Promise<unknown> {
  const includePrivate = includePrivateFor(widget, body.options);
  const includeForks = includeForksFor(widget, body.options);
  const includeArchived = includeArchivedFor(widget, body.options);
  const user = body.user;
  const cacheKey = [
    tokenCacheIdentity(token),
    user.trim().toLowerCase(),
    includePrivate,
    includeForks,
    includeArchived,
  ].join("|");
  const now = Date.now();
  const hit = loginCache.get(cacheKey);
  if (hit != null && hit.expiresAt > now) {
    return hit.payload;
  }
  const payload = await client.loadPayload({
    user,
    widget,
    includePrivate,
    includeForks,
    includeArchived,
  });
  loginCache.set(cacheKey, {
    payload,
    expiresAt: now + GITHUB_PREVIEW_CACHE_TTL_MS,
  });
  return payload;
}

async function renderFromPayload(
  body: PreviewRequest,
  payload: unknown,
  host: RenderPreviewHost,
): Promise<PreviewFile[]> {
  const direct = asPreviewFiles(payload);
  if (direct != null) {
    return direct;
  }
  if (body.scope === "bit") {
    return filesForTarget(body, { bit: body.bit }, payload, host);
  }
  const files: PreviewFile[] = [];
  for (const widget of requestedWidgets(body)) {
    files.push(...(await filesForTarget(body, { widget }, payload, host)));
  }
  return files;
}

async function filesForTarget(
  body: PreviewRequest,
  target: { widget?: PreviewWidgetId; bit?: PreviewBitName },
  payload: unknown,
  host: RenderPreviewHost,
): Promise<PreviewFile[]> {
  const files: PreviewFile[] = [];
  for (const theme of themesFor(body)) {
    const motion = isMotion(body.format, body.options, target.widget);
    const id = fileId(target, theme, body.output_pair);
    const filename = fileName(body, target, theme);
    const mime = mimeFor(body.format);
    const input: PreviewRenderInput = {
      id,
      format: body.format,
      theme,
      motion,
      payload,
      options: body.options,
      user: body.user,
    };
    if (target.widget !== undefined) {
      input.widget = target.widget;
    }
    if (target.bit !== undefined) {
      input.bit = target.bit;
    }
    const bytes = motion
      ? await renderMotionBytes(input, host)
      : await renderStillBytes(input, host);
    if (bytes == null) {
      continue;
    }
    files.push({
      id,
      mime,
      bytesBase64: toBase64(bytes),
      filename,
    });
  }
  return files;
}

async function renderStillBytes(
  input: PreviewRenderInput,
  host: RenderPreviewHost,
): Promise<Uint8Array | null> {
  if (host.renderStill != null) {
    return toUint8(await host.renderStill(input));
  }
  return defaultRenderStill(input);
}

async function renderMotionBytes(
  input: PreviewRenderInput,
  host: RenderPreviewHost,
): Promise<Uint8Array | null> {
  if (host.renderMotion != null) {
    return toUint8(await host.renderMotion(input));
  }
  return defaultRenderMotion(input);
}

async function defaultRenderStill(
  input: PreviewRenderInput,
): Promise<Uint8Array | null> {
  try {
    const node = await previewNode(input);
    if (input.format === "svg") {
      return toUint8(await renderSvg(node));
    }
    if (isStillFormat(input.format)) {
      return toUint8(await render(node, input.format));
    }
    return null;
  } catch {
    return null;
  }
}

async function defaultRenderMotion(
  input: PreviewRenderInput,
): Promise<Uint8Array | null> {
  try {
    const node = await previewNode(input);
    return toUint8(
      await renderAnimation(node, motionRendererFormat(input.format)),
    );
  } catch {
    return null;
  }
}

async function previewNode(input: PreviewRenderInput) {
  if (input.bit !== undefined) {
    const node = await fromJsx(bitSampleElement(input.bit, input.theme));
    assertTakumiTree(node);
    return node;
  }
  const node = await githubPreviewNode({
    widget: input.widget,
    theme: input.theme,
    payload: input.payload,
    options: input.options,
  });
  assertTakumiTree(node);
  return node;
}

function motionRendererFormat(
  format: PreviewOutputFormat,
): "gif" | "apng" | "webp" {
  if (format === "gif" || format === "apng") {
    return format;
  }
  return "webp";
}

function requestedWidgets(body: PreviewRequest): PreviewWidgetId[] {
  if (body.scope === "bit") {
    return [];
  }
  if (body.widget !== undefined) {
    return [body.widget];
  }
  return ["demo", "stats", "languages"];
}

function usesGithubIntegration(widget: PreviewWidgetId): boolean {
  return widget === "stats" || widget === "languages";
}

function includePrivateFor(
  widget: PreviewWidgetId,
  options: PreviewOptions,
): boolean {
  if (widget === "stats") {
    return options.stats?.include_private === true;
  }
  if (widget === "languages") {
    return options.languages?.include_private === true;
  }
  return false;
}

function includeForksFor(
  widget: PreviewWidgetId,
  options: PreviewOptions,
): boolean {
  if (widget === "stats") {
    return options.stats?.include_forks === true;
  }
  if (widget === "languages") {
    return options.languages?.include_forks === true;
  }
  return false;
}

function includeArchivedFor(
  widget: PreviewWidgetId,
  options: PreviewOptions,
): boolean {
  if (widget === "stats") {
    return options.stats?.include_archived === true;
  }
  if (widget === "languages") {
    return options.languages?.include_archived === true;
  }
  return false;
}

function themesFor(body: PreviewRequest): PreviewTheme[] {
  return body.output_pair ? ["dark", "light"] : [body.theme];
}

function isMotion(
  format: PreviewOutputFormat,
  options: PreviewOptions,
  widget: PreviewWidgetId | undefined,
): boolean {
  if (format === "gif" || format === "apng") {
    return true;
  }
  if (format === "webp") {
    return animateFor(widget, options);
  }
  return false;
}

function animateFor(
  widget: PreviewWidgetId | undefined,
  options: PreviewOptions,
): boolean {
  if (widget === "demo") {
    return options.demo?.animate ?? true;
  }
  if (widget === "stats") {
    return options.stats?.animate === true;
  }
  if (widget === "languages") {
    return options.languages?.animate === true;
  }
  return false;
}

function fileId(
  target: { widget?: PreviewWidgetId; bit?: PreviewBitName },
  theme: PreviewTheme,
  outputPair: boolean,
): string {
  const base =
    target.widget ??
    (target.bit !== undefined ? String(target.bit) : "preview");
  return outputPair ? `${base}-${theme}` : base;
}

function fileName(
  body: PreviewRequest,
  target: { widget?: PreviewWidgetId; bit?: PreviewBitName },
  theme: PreviewTheme,
): string {
  const stem = filenameStem(body, target);
  const name = body.output_pair ? `${stem}-${theme}` : stem;
  return `${name}${extensionFor(body.format)}`;
}

function filenameStem(
  body: PreviewRequest,
  target: { widget?: PreviewWidgetId; bit?: PreviewBitName },
): string {
  if (target.widget === "stats") {
    return body.options.stats?.filename ?? "stats";
  }
  if (target.widget === "languages") {
    return body.options.languages?.filename ?? "languages";
  }
  if (target.widget === "demo") {
    return "demo";
  }
  if (target.bit !== undefined) {
    return String(target.bit);
  }
  return "preview";
}

function extensionFor(format: PreviewOutputFormat): string {
  if (format === "apng") {
    return ".png";
  }
  if (format === "jpeg") {
    return ".jpeg";
  }
  return `.${format}`;
}

function mimeFor(format: PreviewOutputFormat): string {
  if (format === "gif") {
    return "image/gif";
  }
  if (format === "apng") {
    return "image/png";
  }
  return STILL_MIME[format];
}

function asPreviewFiles(value: unknown): PreviewFile[] | null {
  if (Array.isArray(value) && value.every(isPreviewFile)) {
    return value;
  }
  if (value != null && typeof value === "object" && "files" in value) {
    const files = (value as { files: unknown }).files;
    if (Array.isArray(files) && files.every(isPreviewFile)) {
      return files;
    }
  }
  return null;
}

function isPreviewFile(value: unknown): value is PreviewFile {
  if (value == null || typeof value !== "object") {
    return false;
  }
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    typeof rec.mime === "string" &&
    typeof rec.bytesBase64 === "string" &&
    typeof rec.filename === "string"
  );
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function toUint8(value: unknown): Uint8Array | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return new TextEncoder().encode(value);
  }
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return new Uint8Array(value);
  }
  return null;
}

function isRateLimitedFailure(error: unknown): boolean {
  const declared = readOutcome(error);
  if (declared === "fail_after_backoff") {
    return true;
  }
  if (declared != null) {
    return false;
  }
  const status = readStatus(error);
  if (status == null) {
    return false;
  }
  const outcome = classifyGithubHttp({
    status,
    body: readField(error, "body"),
    headers: readHeaders(error),
    remaining: readRemaining(error),
    graphql: readField(error, "graphql") === true,
    graphqlErrors: readGraphqlErrors(error),
  });
  return outcome === "fail_after_backoff" || status === 403 || status === 429;
}

function isFailWidgetFailure(error: unknown): boolean {
  const declared = readOutcome(error);
  if (declared === "fail_widget") {
    return true;
  }
  if (declared != null) {
    return false;
  }
  const status = readStatus(error);
  if (status == null) {
    return false;
  }
  return (
    classifyGithubHttp({
      status,
      body: readField(error, "body"),
    }) === "fail_widget"
  );
}

function readOutcome(error: unknown): string | undefined {
  const outcome = readField(error, "outcome");
  return typeof outcome === "string" ? outcome : undefined;
}

function readStatus(error: unknown): number | undefined {
  if (error == null || typeof error !== "object") {
    return undefined;
  }
  const rec = error as Record<string, unknown>;
  if (typeof rec.status === "number") {
    return rec.status;
  }
  const response = rec.response;
  if (response != null && typeof response === "object") {
    const status = (response as Record<string, unknown>).status;
    if (typeof status === "number") {
      return status;
    }
  }
  return undefined;
}

function readField(error: unknown, key: string): unknown {
  if (error == null || typeof error !== "object") {
    return undefined;
  }
  return (error as Record<string, unknown>)[key];
}

function readHeaders(
  error: unknown,
): Readonly<Record<string, string>> | undefined {
  const headers = readField(error, "headers");
  if (
    headers == null ||
    typeof headers !== "object" ||
    Array.isArray(headers)
  ) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(
    headers as Record<string, unknown>,
  )) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

function readRemaining(error: unknown): number | null | undefined {
  const remaining = readField(error, "remaining");
  return typeof remaining === "number" ? remaining : undefined;
}

function readGraphqlErrors(error: unknown): readonly unknown[] | null {
  const errors = readField(error, "graphqlErrors");
  return Array.isArray(errors) ? errors : null;
}
