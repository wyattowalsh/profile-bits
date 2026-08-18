import {
  Bar,
  Chip,
  Frame,
  Muted,
  Stack,
  Text,
  Theme,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";

export const NO_LANGUAGE_DATA = "No language data";

export type LanguageRow = {
  name: string;
  pct: number;
};

export function LanguagesWidget({
  rows,
  theme = "dark",
}: {
  rows: readonly LanguageRow[];
  theme?: WidgetTheme;
}) {
  return (
    <Theme theme={theme}>
      <Frame>
        <Stack gap={6}>
          <Text size={14}>Languages</Text>
          {rows.length === 0 ? (
            <Muted>{NO_LANGUAGE_DATA}</Muted>
          ) : (
            rows.map((row) => (
              <Chip key={row.name}>
                <Bar pct={row.pct} label={`${row.name} ${row.pct}%`} />
              </Chip>
            ))
          )}
        </Stack>
      </Frame>
    </Theme>
  );
}
