import {
  Duration,
  Frame,
  Image,
  Row,
  Stack,
  Text,
  Theme,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import type { RecentViewModel } from "./view-model.js";

export function RecentWidget({
  empty,
  title,
  games,
  theme = "dark",
}: RecentViewModel & { theme?: WidgetTheme }) {
  return (
    <Theme theme={theme}>
      <Frame>
        {empty ? (
          <Text size={16}>{title}</Text>
        ) : (
          <Stack gap={4}>
            {games.map((game) => (
              <Row gap={8} key={game.name}>
                {game.iconUrl !== "" ? (
                  <Image
                    src={game.iconUrl}
                    alt={game.name}
                    width={32}
                    height={32}
                  />
                ) : null}
                <Stack gap={0}>
                  <Text size={14}>{game.name}</Text>
                  {game.hours !== undefined ? (
                    <Duration seconds={Math.round(game.hours * 3600)} />
                  ) : null}
                </Stack>
              </Row>
            ))}
          </Stack>
        )}
      </Frame>
    </Theme>
  );
}
