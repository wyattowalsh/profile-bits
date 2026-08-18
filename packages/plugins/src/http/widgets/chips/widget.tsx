import { Chip, Frame, Muted, Theme, useBitTheme } from "@profile-bits/bits";
import {
  type NormalizedBadge,
  resolveChipColor,
} from "@profile-bits/integrations";
import type { WidgetTheme } from "@profile-bits/renderer";

export const NO_CHIPS_DATA = "No data";

export function ChipsWidget({
  badges,
  theme = "dark",
}: {
  badges: readonly NormalizedBadge[];
  theme?: WidgetTheme;
}) {
  return (
    <Theme theme={theme}>
      <Frame>
        <ChipsBody badges={badges} />
      </Frame>
    </Theme>
  );
}

function ChipsBody({ badges }: { badges: readonly NormalizedBadge[] }) {
  const theme = useBitTheme();
  if (badges.length === 0) {
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
        <Muted>{NO_CHIPS_DATA}</Muted>
      </div>
    );
  }
  return (
    <div
      tw="w-full h-full flex flex-wrap"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        alignContent: "center",
        alignItems: "center",
        gap: 8,
        padding: 8,
      }}
    >
      {badges.map((badge) => (
        <Chip
          key={`${badge.label}:${badge.message}:${badge.color ?? ""}`}
          label={badge.label}
          message={badge.message}
          messageColor={resolveChipColor(badge.color, theme.accent)}
        />
      ))}
    </div>
  );
}
