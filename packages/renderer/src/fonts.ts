import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Renderer } from "@takumi-rs/core";

export const CARD_WIDTH = 480;
export const CARD_HEIGHT = 160;

const FONTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../fonts");

const GEIST_FACES = [
  { file: "Geist-Light.woff2", weight: 300 },
  { file: "Geist-Regular.woff2", weight: 400 },
  { file: "Geist-Medium.woff2", weight: 500 },
  { file: "Geist-SemiBold.woff2", weight: 600 },
  { file: "Geist-Bold.woff2", weight: 700 },
  { file: "Geist-ExtraBold.woff2", weight: 800 },
] as const;

let rendererPromise: Promise<Renderer> | undefined;

async function createRenderer(): Promise<Renderer> {
  const renderer = new Renderer();

  for (const face of GEIST_FACES) {
    const data = await readFile(join(FONTS_DIR, face.file));
    await renderer.registerFont({
      name: "Geist",
      data,
      weight: face.weight,
      style: "normal",
      generic: "sans-serif",
    });
  }

  return renderer;
}

/** Shared native Renderer with vendored Geist last-resort faces registered once. */
export function getRenderer(): Promise<Renderer> {
  rendererPromise ??= createRenderer().catch((error: unknown) => {
    rendererPromise = undefined;
    throw error;
  });
  return rendererPromise;
}
