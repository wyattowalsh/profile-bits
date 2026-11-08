import { useBitTheme } from "./Theme.js";

export type IconProps = {
  readonly src?: string;
  readonly alt?: string;
  readonly size?: number;
  readonly color?: string;
};

const ICON_SIZE_DEFAULT = 16;
const ICON_RADIUS = 3;
const ICON_MARK = "\u25A0";

export function Icon({
  src,
  alt = "",
  size = ICON_SIZE_DEFAULT,
  color,
}: IconProps) {
  const theme = useBitTheme();
  const fill = color ?? theme.accent;

  if (typeof src === "string" && src !== "") {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: ICON_RADIUS,
        }}
      />
    );
  }

  return (
    <span
      tw="flex"
      style={{
        display: "flex",
        width: size,
        height: size,
        backgroundColor: fill,
        borderRadius: ICON_RADIUS,
        color: fill,
        fontFamily: theme.font,
        fontSize: size,
        lineHeight: 1,
      }}
    >
      {ICON_MARK}
    </span>
  );
}
