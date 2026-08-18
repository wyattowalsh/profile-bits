import type { Keyframes } from "@takumi-rs/core";
import type { Node } from "@takumi-rs/helpers";
import { renderAnimation as encodeAnimation } from "takumi-js";
import { CARD_HEIGHT, CARD_WIDTH, getRenderer } from "./fonts.js";

export const ANIMATION_FORMATS = ["gif", "apng", "webp"] as const;
export type AnimationFormat = (typeof ANIMATION_FORMATS)[number];

/** Small defaults so format smoke stays cheap and deterministic. */
export const ANIMATION_FPS_DEFAULT = 5;
export const ANIMATION_DURATION_MS_DEFAULT = 400;

export type AnimationOptions = {
  fps?: number;
  durationMs?: number;
  stylesheets?: string[];
  keyframes?: Keyframes;
};

const ANIMATION_FORMAT_SET = new Set<string>(ANIMATION_FORMATS);

export function isAnimationFormat(format: string): format is AnimationFormat {
  return ANIMATION_FORMAT_SET.has(format);
}

/** APNG is named `.png` — Camo has no `image/apng`. */
export function animationExtension(
  format: AnimationFormat,
): "gif" | "png" | "webp" {
  return format === "apng" ? "png" : format;
}

/** APNG is served as `image/png`. */
export function animationContentType(
  format: AnimationFormat,
): "image/gif" | "image/png" | "image/webp" {
  if (format === "gif") {
    return "image/gif";
  }
  if (format === "apng") {
    return "image/png";
  }
  return "image/webp";
}

/** Motion raster: gif | apng | animated webp at 480×160. */
export async function renderAnimation(
  node: Node,
  format: AnimationFormat,
  options: AnimationOptions = {},
): Promise<Uint8Array> {
  if (!isAnimationFormat(format)) {
    throw new TypeError(
      `unsupported animation format: ${format} (expected ${ANIMATION_FORMATS.join(" | ")})`,
    );
  }

  const fps = options.fps ?? ANIMATION_FPS_DEFAULT;
  const durationMs = options.durationMs ?? ANIMATION_DURATION_MS_DEFAULT;
  const renderer = await getRenderer();
  const bytes = await encodeAnimation({
    renderer,
    emoji: "from-font",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fps,
    format,
    scenes: [{ node, durationMs }],
    stylesheets: options.stylesheets,
    keyframes: options.keyframes,
  });

  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}
