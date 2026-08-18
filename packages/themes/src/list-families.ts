import type { ThemeFamilyGroup, ThemeFlavor, ThemeRegistry } from "./types.js";

export function listFamilies(registry: ThemeRegistry): ThemeFamilyGroup[] {
  const groups = new Map<string, ThemeFlavor[]>();
  for (const flavor of Object.values(registry)) {
    const existing = groups.get(flavor.family);
    if (existing) {
      existing.push(flavor);
    } else {
      groups.set(flavor.family, [flavor]);
    }
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, flavors]) => ({
      id,
      flavors: [...flavors].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    }));
}
