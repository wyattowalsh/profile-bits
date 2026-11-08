import type { WidgetTheme } from "@profile-bits/renderer";
import {
  SLICE_EMPTY_TEXT,
  SLICE_TITLE,
  type SliceViewRow,
} from "../../slice.js";
import { SliceWidget } from "../../slice-widget.js";

export function ProjectsWidget({
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
      title={SLICE_TITLE.projects}
      empty={empty}
      emptyText={SLICE_EMPTY_TEXT.projects}
      rows={rows}
      theme={theme}
    />
  );
}
