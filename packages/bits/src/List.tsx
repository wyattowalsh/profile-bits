import { useBitTheme } from "./Theme.js";

export type ListItem = {
  readonly title: string;
  readonly meta?: string;
};

export type ListProps = {
  readonly items: readonly ListItem[];
  readonly gap?: number;
};

export function List({ items, gap = 6 }: ListProps) {
  const theme = useBitTheme();
  return (
    <div
      tw="flex flex-col"
      style={{ display: "flex", flexDirection: "column", gap, width: "100%" }}
    >
      {items.map((item, index) => (
        <div
          key={`${item.title}:${item.meta ?? ""}:${String(index)}`}
          tw="flex flex-row items-center"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            width: "100%",
          }}
        >
          <span
            tw="flex"
            style={{
              color: theme.text,
              fontFamily: theme.font,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {item.title}
          </span>
          {item.meta !== undefined && item.meta !== "" ? (
            <span
              tw="flex"
              style={{
                color: theme.muted,
                fontFamily: theme.font,
                fontSize: 12,
                fontWeight: 400,
              }}
            >
              {item.meta}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
