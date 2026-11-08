import { Frame, Row, Stat, Text, Theme } from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import type { SolvedViewModel } from "./view-model.js";

export function SolvedWidget({
  empty,
  title,
  rows,
  theme = "dark",
}: SolvedViewModel & { theme?: WidgetTheme }) {
  return (
    <Theme theme={theme}>
      <Frame>
        {empty ? (
          <Text size={16}>{title}</Text>
        ) : (
          <Row gap={12}>
            {rows.map((row) => (
              <Stat key={row.label} label={row.label} value={row.value} />
            ))}
          </Row>
        )}
      </Frame>
    </Theme>
  );
}
