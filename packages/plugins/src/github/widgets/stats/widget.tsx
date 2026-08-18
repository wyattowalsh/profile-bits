import {
  Avatar,
  Chip,
  Divider,
  Frame,
  Row,
  Stack,
  Stat,
  Text,
  Theme,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";

export type StatsChip = {
  label: string;
  value: string;
};

export function StatsWidget({
  login,
  avatarUrl,
  chips,
  theme = "dark",
}: {
  login: string;
  avatarUrl?: string;
  chips: readonly StatsChip[];
  theme?: WidgetTheme;
}) {
  return (
    <Theme theme={theme}>
      <Frame>
        <Stack gap={8}>
          <Row gap={10}>
            {avatarUrl !== undefined && avatarUrl !== "" ? (
              <Avatar src={avatarUrl} size={36} />
            ) : null}
            <Text size={16}>{login}</Text>
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
      </Frame>
    </Theme>
  );
}
