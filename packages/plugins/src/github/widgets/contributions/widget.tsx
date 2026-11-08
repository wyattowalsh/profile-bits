import {
  Chip,
  Frame,
  Heatmap,
  Muted,
  Row,
  Stack,
  Stat,
  Text,
  Theme,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";

export const NO_CONTRIBUTION_DATA = "No contribution data";
export const CONTRIBUTIONS_CELL_SIZE = 6;
export const CONTRIBUTIONS_CELL_GAP = 2;

export type ContributionsChip = {
  label: string;
  value: string;
};

export type ContributionsHeatmapDay = {
  date?: string;
  count: number;
  weekday?: number;
};

export type ContributionsHeatmapWeek = {
  days: readonly ContributionsHeatmapDay[];
};

export function ContributionsWidget({
  login,
  chips,
  weeks,
  empty = false,
  theme = "dark",
}: {
  login: string;
  chips: readonly ContributionsChip[];
  weeks: readonly ContributionsHeatmapWeek[];
  empty?: boolean;
  theme?: WidgetTheme;
}) {
  return (
    <Theme theme={theme}>
      <Frame>
        {empty ? (
          <Stack gap={8}>
            <Muted>{NO_CONTRIBUTION_DATA}</Muted>
          </Stack>
        ) : (
          <Stack gap={8}>
            <Text size={16}>{login}</Text>
            <Row gap={12}>
              {chips.map((chip) => (
                <Chip key={chip.label}>
                  <Stat label={chip.label} value={chip.value} />
                </Chip>
              ))}
            </Row>
            <Heatmap
              weeks={weeks}
              cellSize={CONTRIBUTIONS_CELL_SIZE}
              gap={CONTRIBUTIONS_CELL_GAP}
            />
          </Stack>
        )}
      </Frame>
    </Theme>
  );
}
