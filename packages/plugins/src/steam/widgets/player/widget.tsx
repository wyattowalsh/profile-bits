import { Frame, Image, Row, Stat, Text, Theme } from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import type { PlayerViewModel } from "./view-model.js";

export function PlayerWidget({
  empty,
  title,
  avatarUrl,
  theme = "dark",
}: PlayerViewModel & { theme?: WidgetTheme }) {
  return (
    <Theme theme={theme}>
      <Frame>
        {empty ? (
          <Text size={16}>{title}</Text>
        ) : (
          <Row gap={10}>
            {typeof avatarUrl === "string" && avatarUrl !== "" ? (
              <Image src={avatarUrl} alt={title} width={64} height={64} />
            ) : null}
            <Stat label="Player" value={title} />
          </Row>
        )}
      </Frame>
    </Theme>
  );
}
