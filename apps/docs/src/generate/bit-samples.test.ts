import { describe, expect, it } from "vitest";
import { PREVIEW_BIT_IDS } from "../preview/types";
import { BIT_SAMPLE_IDS, bitSampleElement } from "./bit-samples";

describe("bit-samples", () => {
  it("covers every v0 bit export name", () => {
    expect(BIT_SAMPLE_IDS).toEqual(PREVIEW_BIT_IDS);
    for (const bit of PREVIEW_BIT_IDS) {
      const element = bitSampleElement(bit, "dark");
      expect(element.type).toBeTruthy();
    }
  });
});
