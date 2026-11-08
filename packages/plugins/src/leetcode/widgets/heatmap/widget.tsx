import { Frame, Heatmap, Text, Theme } from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import type { HeatmapViewModel } from "./view-model.js";

export function HeatmapWidget({
  empty,
  title,
  weeks,
  theme = "dark",
}: HeatmapViewModel & { theme?: WidgetTheme }) {
  return (
    <Theme theme={theme}>
      <Frame>
        {empty ? (
          <Text size={16}>{title}</Text>
        ) : (
          <Heatmap weeks={weeks} cellSize={8} gap={2} />
        )}
      </Frame>
    </Theme>
  );
}
