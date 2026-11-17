import { Dot, type DotTone } from "./Dot.js";
import { Text } from "./Text.js";

export type StatusProps = {
  readonly label: string;
  readonly tone?: DotTone;
};

export function Status({ label, tone = "accent" }: StatusProps) {
  return (
    <div
      tw="flex flex-row items-center"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Dot tone={tone} />
      <Text size={12} weight={600}>
        {label}
      </Text>
    </div>
  );
}
