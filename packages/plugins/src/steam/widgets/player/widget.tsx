import {
  Frame,
  Image,
  Row,
  Stack,
  Stat,
  Status,
  Text,
  Theme,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import type { PlayerViewModel } from "./view-model.js";

export function PlayerWidget({
  empty,
  title,
  avatarUrl,
  status,
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
            <Stack gap={4}>
              <Stat label="Player" value={title} />
              {status !== undefined && status !== "" ? (
                <Status
                  label={status}
                  tone={
                    status === "Offline" ||
                    status === "Away" ||
                    status === "Snooze"
                      ? "muted"
                      : "accent"
                  }
                />
              ) : null}
            </Stack>
          </Row>
        )}
      </Frame>
    </Theme>
  );
}
