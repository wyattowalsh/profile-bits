import {
  Board,
  Frame,
  Muted,
  Row,
  Stack,
  Text,
  Theme,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import type { GameViewModel } from "./view-model.js";

export function GameWidget({
  empty,
  title,
  fen,
  theme = "dark",
}: GameViewModel & { theme?: WidgetTheme }) {
  return (
    <Theme theme={theme}>
      <Frame>
        {empty || fen === undefined ? (
          <Text size={16}>{title}</Text>
        ) : (
          <Row gap={10}>
            <Board fen={fen} size={120} showLabels={false} />
            {title !== "" ? (
              <Stack gap={4}>
                <Muted size={12}>{title}</Muted>
              </Stack>
            ) : null}
          </Row>
        )}
      </Frame>
    </Theme>
  );
}
