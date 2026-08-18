import { container } from "@takumi-rs/helpers";
import { describe, expect, it } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH, getRenderer } from "./fonts.js";
import {
  ANIMATION_DURATION_MS_DEFAULT,
  ANIMATION_FORMATS,
  ANIMATION_FPS_DEFAULT,
  type AnimationFormat,
  animationContentType,
  animationExtension,
  isAnimationFormat,
  renderAnimation,
} from "./render-animation.js";

const KEYFRAMES_CSS = `@keyframes pb-pulse {
  from { opacity: 0.4; }
  to   { opacity: 1; }
}`;

const SMOKE_NODE = container({
  style: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  children: [
    container({
      style: {
        width: 32,
        height: 32,
        backgroundColor: "#38bdf8",
        animation: "pb-pulse 400ms ease-in-out infinite alternate",
      },
    }),
  ],
});

const SMOKE_OPTIONS = {
  fps: ANIMATION_FPS_DEFAULT,
  durationMs: ANIMATION_DURATION_MS_DEFAULT,
  stylesheets: [KEYFRAMES_CSS],
} as const;

async function wasmCanRender(): Promise<boolean> {
  try {
    const { Renderer } = await import("@takumi-rs/wasm");
    const renderer = new Renderer();
    await renderer.render(SMOKE_NODE, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      format: "png",
    });
    return true;
  } catch {
    return false;
  }
}

async function probeNativeRenderer(): Promise<{
  skip: boolean;
  message?: string;
}> {
  try {
    await getRenderer();
    return { skip: false };
  } catch (error) {
    const nativeMessage =
      error instanceof Error ? error.message : String(error);
    if (await wasmCanRender()) {
      return {
        skip: true,
        message: `native Takumi failed (${nativeMessage}); wasm works — skipping animation smoke`,
      };
    }
    throw error;
  }
}

const nativeProbe = await probeNativeRenderer();

if (nativeProbe.skip && nativeProbe.message) {
  console.warn(nativeProbe.message);
}

function startsWith(bytes: Uint8Array, magic: readonly number[]): boolean {
  return magic.every((value, index) => bytes[index] === value);
}

function containsAscii(bytes: Uint8Array, ascii: string): boolean {
  return Buffer.from(bytes).includes(ascii);
}

function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function isGif87aOrGif89a(bytes: Uint8Array): boolean {
  const header = Buffer.from(bytes.subarray(0, 6)).toString("ascii");
  return header === "GIF87a" || header === "GIF89a";
}

function assertMagic(format: AnimationFormat, bytes: Uint8Array): void {
  expect(bytes.byteLength).toBeGreaterThan(32);

  if (format === "gif") {
    expect(isGif87aOrGif89a(bytes)).toBe(true);
    return;
  }

  if (format === "apng") {
    expect(
      startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ).toBe(true);
    expect(pngSize(bytes)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
    expect(containsAscii(bytes, "acTL")).toBe(true);
    return;
  }

  expect(Buffer.from(bytes.subarray(0, 4)).toString("ascii")).toBe("RIFF");
  expect(Buffer.from(bytes.subarray(8, 12)).toString("ascii")).toBe("WEBP");
  expect(containsAscii(bytes, "ANIM")).toBe(true);
}

describe("animation naming", () => {
  it("serves and names APNG as PNG", () => {
    expect(animationExtension("apng")).toBe("png");
    expect(animationContentType("apng")).toBe("image/png");
    expect(animationExtension("gif")).toBe("gif");
    expect(animationContentType("gif")).toBe("image/gif");
    expect(animationExtension("webp")).toBe("webp");
    expect(animationContentType("webp")).toBe("image/webp");
  });

  it("accepts only gif, apng, and animated webp", () => {
    expect(ANIMATION_FORMATS).toEqual(["gif", "apng", "webp"]);
    expect(isAnimationFormat("gif")).toBe(true);
    expect(isAnimationFormat("png")).toBe(false);
  });
});

describe.skipIf(nativeProbe.skip)("animation format smoke", () => {
  it.each(ANIMATION_FORMATS)(
    "renders deterministic %s from CSS @keyframes",
    async (format) => {
      const first = await renderAnimation(SMOKE_NODE, format, SMOKE_OPTIONS);
      const second = await renderAnimation(SMOKE_NODE, format, SMOKE_OPTIONS);

      assertMagic(format, first);
      expect(Buffer.from(first)).toEqual(Buffer.from(second));
    },
  );

  it("rejects still formats", async () => {
    await expect(
      renderAnimation(SMOKE_NODE, "png" as AnimationFormat, SMOKE_OPTIONS),
    ).rejects.toThrow(/unsupported animation format: png/);
  });
});
