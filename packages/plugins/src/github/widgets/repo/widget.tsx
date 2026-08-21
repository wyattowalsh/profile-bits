import {
  Avatar,
  Chip,
  Divider,
  Frame,
  Muted,
  Row,
  Stack,
  Stat,
  Text,
  Theme,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";

export const NO_REPO_DATA = "No repo data";

export type RepoChip = {
  label: string;
  value: string;
};

export function RepoWidget({
  fullName,
  avatarUrl,
  chips,
  empty = false,
  theme = "dark",
}: {
  fullName: string;
  avatarUrl?: string;
  chips: readonly RepoChip[];
  empty?: boolean;
  theme?: WidgetTheme;
}) {
  return (
    <Theme theme={theme}>
      <Frame>
        {empty ? (
          <Stack gap={8}>
            <Muted>{NO_REPO_DATA}</Muted>
          </Stack>
        ) : (
          <Stack gap={8}>
            <Row gap={10}>
              {avatarUrl !== undefined && avatarUrl !== "" ? (
                <Avatar src={avatarUrl} size={36} />
              ) : null}
              <Text size={16}>{fullName}</Text>
            </Row>
            <Divider />
            <Row gap={12}>
              {chips.map((chip) => (
                <Chip key={chip.label}>
                  <Stat label={chip.label} value={chip.value} />
                </Chip>
              ))}
            </Row>
          </Stack>
        )}
      </Frame>
    </Theme>
  );
}
