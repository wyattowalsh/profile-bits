import { describe, expect, it } from "vitest";
import {
  assertTakumiSvg,
  TakumiRenderError,
  withTakumi,
} from "./takumi-wrap.js";

describe("withTakumi", () => {
  it("returns the callback result", () => {
    expect(withTakumi(() => 7)).toBe(7);
  });

  it("wraps thrown errors as TakumiRenderError", () => {
    expect(() =>
      withTakumi(() => {
        throw new Error("native boom");
      }),
    ).toThrow(TakumiRenderError);
    try {
      withTakumi(() => {
        throw new Error("native boom");
      });
    } catch (error) {
      expect(error).toMatchObject({
        name: "TakumiRenderError",
        message: "native boom",
      });
      expect(error).toHaveProperty("cause");
    }
  });

  it("does not wrap TakumiRenderError twice", () => {
    const original = new TakumiRenderError("already wrapped");
    expect(() =>
      withTakumi(() => {
        throw original;
      }),
    ).toThrow(original);
  });

  it("wraps rejected promises", async () => {
    await expect(
      withTakumi(async () => {
        throw new Error("async boom");
      }),
    ).rejects.toBeInstanceOf(TakumiRenderError);
  });
});

describe("assertTakumiSvg", () => {
  it("accepts baked SVG without foreignObject", () => {
    expect(() =>
      assertTakumiSvg('<svg width="480" height="160"></svg>'),
    ).not.toThrow();
  });

  it("fails SVG that contains foreignObject", () => {
    expect(() =>
      assertTakumiSvg("<svg><foreignObject></foreignObject></svg>"),
    ).toThrow(TakumiRenderError);
    expect(() =>
      assertTakumiSvg("<svg><foreignobject x='0'></foreignobject></svg>"),
    ).toThrow(/foreignObject/);
  });
});
