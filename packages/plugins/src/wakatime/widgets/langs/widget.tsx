import type { WidgetTheme } from "@profile-bits/renderer";
import {
  SLICE_EMPTY_TEXT,
  SLICE_TITLE,
  type SliceViewRow,
} from "../../slice.js";
import { SliceWidget } from "../../slice-widget.js";

export function LangsWidget({
  rows,
  empty,
  theme = "dark",
}: {
  rows: readonly SliceViewRow[];
  empty: boolean;
  theme?: WidgetTheme;
}) {
  return (
    <SliceWidget
      title={SLICE_TITLE.langs}
      empty={empty}
      emptyText={SLICE_EMPTY_TEXT.langs}
      rows={rows}
      theme={theme}
    />
  );
}
