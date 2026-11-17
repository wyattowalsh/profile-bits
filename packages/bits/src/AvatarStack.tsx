import { useBitTheme } from "./Theme.js";

export type AvatarStackProps = {
  readonly srcs: readonly string[];
  readonly size?: number;
  readonly max?: number;
};

const AVATAR_STACK_MAX = 4;

export function AvatarStack({
  srcs,
  size = 28,
  max = AVATAR_STACK_MAX,
}: AvatarStackProps) {
  const theme = useBitTheme();
  const px = Math.max(8, size);
  const limit = Math.max(1, Math.floor(max));
  const overflow = srcs.length > limit;
  const shown = overflow ? srcs.slice(0, limit - 1) : srcs;
  const extra = overflow ? srcs.length - shown.length : 0;
  const overlap = Math.floor(px / 3);
  return (
    <div
      tw="flex flex-row"
      style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
    >
      {shown.map((src, index) => (
        <img
          key={`${src}:${String(index)}`}
          src={src}
          alt=""
          width={px}
          height={px}
          style={{
            width: px,
            height: px,
            borderRadius: px / 2,
            marginLeft: index === 0 ? 0 : -overlap,
          }}
        />
      ))}
      {extra > 0 ? (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: px,
            height: px,
            marginLeft: shown.length === 0 ? 0 : -overlap,
            borderRadius: px / 2,
            backgroundColor: theme.card,
            color: theme.muted,
            borderWidth: 1,
            borderColor: theme.border,
            fontFamily: theme.font,
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {`+${String(extra)}`}
        </span>
      ) : null}
    </div>
  );
}
