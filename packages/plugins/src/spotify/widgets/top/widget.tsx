import {
  Frame,
  Image,
  Muted,
  Row,
  Stack,
  Text,
  Theme,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import type { TopViewModel } from "./view-model.js";

export function TopWidget({
  empty,
  title,
  tracks,
  theme = "dark",
}: TopViewModel & { theme?: WidgetTheme }) {
  return (
    <Theme theme={theme}>
      <Frame>
        {empty ? (
          <Text size={16}>{title}</Text>
        ) : (
          <Stack gap={4}>
            {tracks.map((track) => (
              <Row gap={8} key={`${track.title}:${track.artists}`}>
                {track.coverUrl !== "" ? (
                  <Image
                    src={track.coverUrl}
                    alt={track.album}
                    width={28}
                    height={28}
                  />
                ) : null}
                <Stack gap={2}>
                  <Text size={14}>{track.title}</Text>
                  {track.artists !== "" ? (
                    <Muted size={11}>{track.artists}</Muted>
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
