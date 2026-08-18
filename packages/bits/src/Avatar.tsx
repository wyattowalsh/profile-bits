export function Avatar({
  src,
  size = 36,
  alt = "",
}: {
  src: string;
  size?: number;
  alt?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}
