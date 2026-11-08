import { Frame, Row, Stat, Text, Theme } from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import type { RatingsViewModel } from "./view-model.js";

export function RatingsWidget({
  empty,
  title,
  chips,
  theme = "dark",
}: RatingsViewModel & { theme?: WidgetTheme }) {
  return (
    <Theme theme={theme}>
      <Frame>
        {empty ? (
          <Text size={16}>{title}</Text>
        ) : (
          <Row gap={12}>
            {chips.map((chip) => (
              <Stat key={chip.label} label={chip.label} value={chip.value} />
            ))}
          </Row>
        )}
      </Frame>
    </Theme>
  );
}
