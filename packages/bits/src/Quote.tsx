import { useBitTheme } from "./Theme.js";

export type QuoteProps = {
  readonly text: string;
  readonly attribution?: string;
};

export function Quote({ text, attribution }: QuoteProps) {
  const theme = useBitTheme();
  return (
    <div
      tw="flex flex-col"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: "100%",
      }}
    >
      <span
        style={{
          color: theme.muted,
          fontFamily: theme.font,
          fontSize: 13,
          fontWeight: 400,
        }}
      >
        {text}
      </span>
      {attribution !== undefined && attribution !== "" ? (
        <span
          style={{
            color: theme.text,
            fontFamily: theme.font,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {`\u2014 ${attribution}`}
        </span>
      ) : null}
    </div>
  );
}
