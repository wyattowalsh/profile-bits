import { useBitTheme } from "./Theme.js";

export type TableProps = {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
};

export function Table({ columns, rows }: TableProps) {
  const theme = useBitTheme();
  return (
    <div
      tw="flex flex-col"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: 4,
      }}
    >
      <div
        tw="flex flex-row"
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          paddingBottom: 2,
        }}
      >
        {columns.map((column, columnIndex) => (
          <span
            key={`${String(columnIndex)}:${column}`}
            style={{
              flexGrow: 1,
              flexBasis: 0,
              color: theme.muted,
              fontFamily: theme.font,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {column}
          </span>
        ))}
      </div>
      {rows.map((row, rowIndex) => (
        <div
          key={String(rowIndex)}
          tw="flex flex-row"
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
          }}
        >
          {columns.map((column, columnIndex) => (
            <span
              key={`${column}:${String(columnIndex)}`}
              style={{
                flexGrow: 1,
                flexBasis: 0,
                color: theme.text,
                fontFamily: theme.font,
                fontSize: 12,
                fontWeight: 400,
              }}
            >
              {row[columnIndex] ?? ""}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
