import {
  Frame,
  Muted,
  Relative,
  Row,
  Stack,
  Text,
  Theme,
  Time,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import { type LatestItem, latestRelativeNow } from "./view-model.js";

export const NO_LATEST_ITEM = "No latest item";

export function LatestWidget({
  items,
  now,
  theme = "dark",
  timezone,
}: {
  items: readonly LatestItem[];
  /** Real clock. Omitted or null skips Relative. Never the newest item. */
  now?: string | null;
  theme?: WidgetTheme;
  timezone?: string;
}) {
  const clock = now === undefined ? null : now;
  return (
    <Theme theme={theme}>
      <Frame>
        <LatestBody
          items={items}
          now={clock}
          {...(timezone !== undefined ? { timezone } : {})}
        />
      </Frame>
    </Theme>
  );
}

function LatestBody({
  items,
  now,
  timezone,
}: {
  items: readonly LatestItem[];
  now: string | null;
  timezone?: string;
}) {
  if (items.length === 0) {
    return (
      <div
        tw="w-full h-full flex"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Muted>{NO_LATEST_ITEM}</Muted>
      </div>
    );
  }
  return (
    <div
      tw="w-full h-full flex"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        padding: 12,
      }}
    >
      <Stack gap={8}>
        {items.map((item, index) => {
          const clock = latestRelativeNow(item.at, now);
          return (
            <Row gap={8} key={`${item.url}:${item.title}:${String(index)}`}>
              <Text size={14} weight={600}>
                {item.title}
              </Text>
              {item.at !== null ? (
                <Time
                  value={item.at}
                  {...(timezone !== undefined ? { timezone } : {})}
                />
              ) : null}
              {item.at !== null && clock !== null ? (
                <Relative value={item.at} now={clock} />
              ) : null}
            </Row>
          );
        })}
      </Stack>
    </div>
  );
}
