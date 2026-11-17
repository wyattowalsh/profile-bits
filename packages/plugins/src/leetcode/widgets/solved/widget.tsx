import {
  Frame,
  Meter,
  Row,
  Stack,
  StackBar,
  Stat,
  Text,
  Theme,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import type { SolvedViewModel } from "./view-model.js";

function SolvedStats({ rows }: { rows: SolvedViewModel["rows"] }) {
  return (
    <Row gap={12}>
      {rows.map((row) => (
        <Stat key={row.label} label={row.label} value={row.value} />
      ))}
    </Row>
  );
}

export function SolvedWidget({
  empty,
  title,
  rows,
  meters,
  split,
  theme = "dark",
}: SolvedViewModel & { theme?: WidgetTheme }) {
  const ratio = meters.length > 0 || split.length > 0;
  return (
    <Theme theme={theme}>
      <Frame>
        {empty ? (
          <Text size={16}>{title}</Text>
        ) : ratio ? (
          <Stack gap={8}>
            <SolvedStats rows={rows} />
            {split.length > 0 ? <StackBar segments={split} /> : null}
            {meters.map((meter, index) => (
              <Meter
                key={`${meter.label}:${String(index)}`}
                label={meter.label}
                value={meter.value}
                max={meter.max}
              />
            ))}
          </Stack>
        ) : (
          <SolvedStats rows={rows} />
        )}
      </Frame>
    </Theme>
  );
}
