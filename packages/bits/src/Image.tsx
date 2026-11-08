export type ImageProps = {
  readonly src: string;
  readonly alt?: string;
  readonly width?: number;
  readonly height?: number;
};

export function Image({ src, alt = "", width = 64, height = 64 }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={{
        width,
        height,
        borderRadius: 0,
        objectFit: "cover",
      }}
    />
  );
}
