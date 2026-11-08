import {
  Frame,
  Image,
  Row,
  Stack,
  Stat,
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
                <Stat
                  label={game.name}
                  value={
                    game.hours === undefined ? game.name : `${game.hours} h`
                  }
                />
              </Row>
            ))}
          </Stack>
        )}
      </Frame>
    </Theme>
  );
}
