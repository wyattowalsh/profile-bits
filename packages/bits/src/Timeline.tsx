import { Dot } from "./Dot.js";
import { Muted } from "./Muted.js";
import { Stack } from "./Stack.js";
import { Text } from "./Text.js";

export type TimelineItem = {
  readonly title: string;
  readonly meta?: string;
};

export type TimelineProps = {
  readonly items: readonly TimelineItem[];
  readonly gap?: number;
};

export function Timeline({ items, gap = 6 }: TimelineProps) {
  return (
    <div
      tw="flex flex-col"
      style={{ display: "flex", flexDirection: "column", gap, width: "100%" }}
    >
      {items.map((item, index) => (
        <div
          key={`${item.title}:${item.meta ?? ""}:${String(index)}`}
          tw="flex flex-row"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            width: "100%",
          }}
        >
          <Dot />
          <Stack gap={0}>
            <Text size={14}>{item.title}</Text>
            {item.meta !== undefined && item.meta !== "" ? (
              <Muted size={12}>{item.meta}</Muted>
            ) : null}
          </Stack>
        </div>
      ))}
    </div>
  );
}
