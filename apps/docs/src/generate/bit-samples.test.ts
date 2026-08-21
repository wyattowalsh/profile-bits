import { Chip, Frame, Theme } from "@profile-bits/bits";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { PREVIEW_BIT_IDS } from "../preview/types";
import { BIT_SAMPLE_IDS, bitSampleElement } from "./bit-samples";

function onlyChild(element: ReactElement): ReactElement {
  const children = (element.props as { children?: ReactNode }).children;
  if (!isValidElement(children)) {
    throw new Error("expected a single React element child");
  }
  return children;
}

describe("bit-samples", () => {
  it("covers every v0 bit export name", () => {
    expect(BIT_SAMPLE_IDS).toEqual(PREVIEW_BIT_IDS);
    for (const bit of PREVIEW_BIT_IDS) {
      const element = bitSampleElement(bit, "dark");
      expect(element.type).toBeTruthy();
    }
  });

  it("uses split Chip chrome with label and message", () => {
    const theme = bitSampleElement("Chip", "dark");
    expect(theme.type).toBe(Theme);

    const frame = onlyChild(theme);
    expect(frame.type).toBe(Frame);

    const chip = onlyChild(frame);
    expect(chip.type).toBe(Chip);
    expect(chip.props).toEqual({
      label: "npm",
      message: "1.2.3",
    });
  });
});
