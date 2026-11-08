import {
  Bar,
  Frame,
  List,
  Muted,
  Stack,
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
        <Stack gap={6}>
          <Text size={14}>{title}</Text>
          {empty ? (
            <Muted>{emptyText}</Muted>
          ) : (
            <>
              <List items={rows.map(listItem)} />
              {rows.map((row, index) => (
                <Bar key={`${row.name}:${String(index)}`} pct={row.percent} />
              ))}
            </>
          )}
        </Stack>
      </Frame>
    </Theme>
  );
}
