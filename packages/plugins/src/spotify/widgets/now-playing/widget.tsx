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
import type { NowPlayingViewModel } from "./view-model.js";

export function NowPlayingWidget({
  empty,
  title,
  artists,
  album,
  coverUrl,
  theme = "dark",
}: NowPlayingViewModel & { theme?: WidgetTheme }) {
  return (
    <Theme theme={theme}>
      <Frame>
        {empty ? (
          <Text size={16}>{title}</Text>
        ) : (
          <Row gap={10}>
            {typeof coverUrl === "string" && coverUrl.length > 0 ? (
              <Image src={coverUrl} alt={album} width={64} height={64} />
            ) : null}
            <Stack gap={4}>
              <Text size={16}>{title}</Text>
              {artists !== "" ? <Muted size={12}>{artists}</Muted> : null}
              {album !== "" ? <Muted size={12}>{album}</Muted> : null}
            </Stack>
          </Row>
        )}
      </Frame>
    </Theme>
  );
}
