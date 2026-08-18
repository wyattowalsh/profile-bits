import { container, text } from "@takumi-rs/helpers";
import { describe, expect, it } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH, getRenderer } from "./fonts.js";
import { render, STILL_FORMATS, type StillFormat } from "./render.js";
import { renderSvg } from "./render-svg.js";

const SMOKE_NODE = container({
  style: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
  },
  children: [
    text({
      text: "profile-bits",
      style: {
        color: "#f8fafc",
        fontFamily: "Geist",
        fontSize: 32,
        fontWeight: 700,
      },
    }),
  ],
});

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
        message: `native Takumi failed (${nativeMessage}); wasm works — skipping still smoke`,
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

function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function assertMagic(format: StillFormat, bytes: Uint8Array): void {
  expect(bytes.byteLength).toBeGreaterThan(32);

  if (format === "png") {
    expect(
      startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ).toBe(true);
    expect(pngSize(bytes)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
    return;
  }

  if (format === "jpeg") {
    expect(startsWith(bytes, [0xff, 0xd8, 0xff])).toBe(true);
    return;
  }

  if (format === "webp") {
    expect(Buffer.from(bytes.subarray(0, 4)).toString("ascii")).toBe("RIFF");
    expect(Buffer.from(bytes.subarray(8, 12)).toString("ascii")).toBe("WEBP");
    return;
  }

  expect(startsWith(bytes, [0x00, 0x00, 0x01, 0x00])).toBe(true);
}

describe.skipIf(nativeProbe.skip)("still format smoke", () => {
  it.each(STILL_FORMATS)("renders deterministic %s", async (format) => {
    const first = await render(SMOKE_NODE, format);
    const second = await render(SMOKE_NODE, format);

    assertMagic(format, first);
    expect(Buffer.from(first)).toEqual(Buffer.from(second));
  });

  it("renders a baked still svg without style, keyframes, SMIL, or foreignObject", async () => {
    const first = await renderSvg(SMOKE_NODE);
    const second = await renderSvg(SMOKE_NODE);

    expect(first).toMatch(/<svg\b[^>]*\bwidth="480"/);
    expect(first).toMatch(/<svg\b[^>]*\bheight="160"/);
    expect(first).toMatch(/viewBox="0 0 480 160"/);
    expect(first).not.toMatch(/<text[\s>]/i);
    expect(first).not.toMatch(/<style[\s>]/i);
    expect(first).not.toMatch(/@keyframes/i);
    expect(first).not.toMatch(/<foreignObject[\s>]/i);
    expect(first).not.toMatch(
      /<(animate|animateTransform|animateMotion|animateColor|set)\b/i,
    );
    expect(first).toBe(second);
  });
});
