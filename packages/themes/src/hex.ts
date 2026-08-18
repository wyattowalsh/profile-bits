const HEX_BODY = /^([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i;

export type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function nibble(ch: string): number {
  return Number.parseInt(ch, 16);
}

function bytePair(hi: string, lo: string): number {
  return Number.parseInt(`${hi}${lo}`, 16);
}

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

export function isHexColor(ref: string): boolean {
  return ref.startsWith("#") && HEX_BODY.test(ref.slice(1));
}

export function parseHex(ref: string): Rgba {
  if (!isHexColor(ref)) {
    throw new Error(`Malformed hex color "${ref}"`);
  }
  const body = ref.slice(1).toLowerCase();
  if (body.length === 3) {
    return {
      r: nibble(body[0] ?? "") * 17,
      g: nibble(body[1] ?? "") * 17,
      b: nibble(body[2] ?? "") * 17,
      a: 255,
    };
  }
  const r = bytePair(body[0] ?? "", body[1] ?? "");
  const g = bytePair(body[2] ?? "", body[3] ?? "");
  const b = bytePair(body[4] ?? "", body[5] ?? "");
  const a = body.length === 8 ? bytePair(body[6] ?? "", body[7] ?? "") : 255;
  return { r, g, b, a };
}

export function normalizeHex(ref: string): string {
  const { r, g, b, a } = parseHex(ref);
  const rgb = `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
  if (ref.length === 9) {
    return `${rgb}${toHexByte(a)}`;
  }
  return rgb;
}
