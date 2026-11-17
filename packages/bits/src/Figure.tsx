import { Image } from "./Image.js";
import { Muted } from "./Muted.js";

export type FigureProps = {
  readonly src: string;
  readonly alt?: string;
  readonly width?: number;
  readonly height?: number;
  readonly caption?: string;
};

export function Figure({
  src,
  alt = "",
  width = 64,
  height = 64,
  caption,
}: FigureProps) {
  return (
    <div
      tw="flex flex-col"
      style={{ display: "flex", flexDirection: "column", gap: 4 }}
    >
      <Image src={src} alt={alt} width={width} height={height} />
      {caption !== undefined && caption !== "" ? (
        <Muted>{caption}</Muted>
      ) : null}
    </div>
  );
}
