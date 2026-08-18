import { githubWidgetRegistry } from "@profile-bits/plugins";
import { describe, expect, it } from "vitest";
import { PREVIEW_WIDGET_IDS } from "@/src/preview/types";
import { WIDGETS_HREF, WIDGETS_PLUGIN_ID, widgetCatalogRows } from "./page";

describe("generate widgets catalog", () => {
  it("lists v0 github widgets with bitsUsed export names", () => {
    const rows = widgetCatalogRows();

    expect(WIDGETS_PLUGIN_ID).toBe("github");
    expect(WIDGETS_HREF).toBe("/generate/widgets");
    expect(rows.map((row) => row.id)).toEqual([...PREVIEW_WIDGET_IDS]);
    for (const row of rows) {
      expect(row.bitsUsed).toEqual([...githubWidgetRegistry[row.id].bitsUsed]);
      expect(row.href).toBe(`/generate/github/${row.id}`);
    }
  });
});
