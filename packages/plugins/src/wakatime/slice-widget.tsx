import {
  Frame,
  List,
  Muted,
  Stack,
  StackBar,
  Text,
  Theme,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import type { SliceViewRow } from "./slice.js";

function listItem(row: SliceViewRow): { title: string; meta: string } {
  return {
    title: row.name,
    meta:
      row.text !== undefined && row.text !== "" ? row.text : `${row.percent}%`,
  };
}

export function SliceWidget({
  title,
  empty,
  emptyText,
  rows,
  theme = "dark",
}: {
  title: string;
  empty: boolean;
  emptyText: string;
  rows: readonly SliceViewRow[];
  theme?: WidgetTheme;
}) {
  return (
    <Theme theme={theme}>
      <Frame>
        <Stack gap={4}>
          <Text size={14}>{title}</Text>
          {empty ? (
            <Muted>{emptyText}</Muted>
          ) : (
            <>
              <StackBar
                height={6}
                segments={rows.map((row) => ({
                  value: row.totalSeconds,
                  label: row.name,
                }))}
              />
              <List items={rows.map(listItem)} />
            </>
          )}
        </Stack>
      </Frame>
    </Theme>
  );
}
