import { segmentFill } from "./mix.js";
import { useBitTheme } from "./Theme.js";

export type LegendItem = {
  readonly label: string;
};

export type LegendProps = {
  readonly items: readonly LegendItem[];
};

export function Legend({ items }: LegendProps) {
  const theme = useBitTheme();
  return (
    <div
      tw="flex flex-row"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        width: "100%",
      }}
    >
      {items.map((item, index) => (
        <div
          key={`${item.label}:${String(index)}`}
          tw="flex flex-row items-center"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              backgroundColor: segmentFill(
                index,
                items.length,
                theme.accent,
                theme.muted,
              ),
            }}
          />
          <span
            style={{
              color: theme.muted,
              fontFamily: theme.font,
              fontSize: 10,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
