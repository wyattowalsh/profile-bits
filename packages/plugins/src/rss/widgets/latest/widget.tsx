import {
  Frame,
  Muted,
  Row,
  Stack,
  Text,
  Theme,
  Time,
} from "@profile-bits/bits";
import type { WidgetTheme } from "@profile-bits/renderer";
import type { LatestItem } from "./view-model.js";

export const NO_LATEST_ITEM = "No latest item";

export function LatestWidget({
  items,
  theme = "dark",
  timezone,
}: {
  items: readonly LatestItem[];
  theme?: WidgetTheme;
  timezone?: string;
}) {
  return (
    <Theme theme={theme}>
      <Frame>
        <LatestBody
          items={items}
          {...(timezone !== undefined ? { timezone } : {})}
        />
      </Frame>
    </Theme>
  );
}

function LatestBody({
  items,
  timezone,
}: {
  items: readonly LatestItem[];
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
        {items.map((item, index) => (
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
          </Row>
        ))}
      </Stack>
    </div>
  );
}
