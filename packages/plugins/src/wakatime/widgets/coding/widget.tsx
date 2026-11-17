import {
  Duration,
  Frame,
  Muted,
  Row,
  Sparkline,
  Stack,
  Text,
  Theme,
} from "@profile-bits/bits";
import { resolveWidgetTheme, type WidgetTheme } from "@profile-bits/renderer";
import { sparklineValues } from "../../read-dump.js";
import { SecondsStats } from "../../seconds-stats.js";
import { type CodingViewModel, NO_CODING_DATA } from "./view-model.js";

const centerStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
} as const;

export function CodingWidget({
  model,
  theme,
}: {
  model: CodingViewModel;
  theme?: WidgetTheme;
}) {
  const palette = resolveWidgetTheme(theme);
  return (
    <Theme theme={{ ...palette, bg: palette.card }}>
      <Frame>
        <CodingBody model={model} />
      </Frame>
    </Theme>
  );
}

function CodingBody({ model }: { model: CodingViewModel }) {
  if (model.empty) {
    return (
      <div style={centerStyle}>
        <Text size={16}>{NO_CODING_DATA}</Text>
      </div>
    );
  }
  return (
    <div style={centerStyle}>
      <Stack gap={1}>
        <Row gap={8}>
          <Text size={16}>{model.totalText}</Text>
          <SecondsStats stats={model.totals} />
          {model.series !== undefined ? (
            <Sparkline
              values={sparklineValues(model.series)}
              height={14}
              barWidth={4}
              gap={2}
            />
          ) : null}
        </Row>
        {model.slices.map((slice) => (
          <Stack gap={1} key={slice.key}>
            <Muted>{slice.key}</Muted>
            {slice.rows.map((row, index) => (
              <Row gap={8} key={`${slice.key}:${row.name}:${String(index)}`}>
                <Text size={12}>{row.name}</Text>
                <Duration seconds={row.totalSeconds} />
              </Row>
            ))}
          </Stack>
        ))}
      </Stack>
    </div>
  );
}
