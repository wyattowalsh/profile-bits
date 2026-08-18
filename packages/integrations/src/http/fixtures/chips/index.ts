import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const CHIP_FIXTURE_PRESETS = ["shieldcn", "shields"] as const;
export const CHIP_FIXTURE_TYPES = [
  "npm",
  "stars",
  "forks",
  "license",
  "release",
  "issues",
  "prs",
  "ci",
] as const;

export type ChipFixturePreset = (typeof CHIP_FIXTURE_PRESETS)[number];
export type ChipFixtureType = (typeof CHIP_FIXTURE_TYPES)[number];

const fixturesDir = dirname(fileURLToPath(import.meta.url));
const PRESET_SET = new Set<string>(CHIP_FIXTURE_PRESETS);
const TYPE_SET = new Set<string>(CHIP_FIXTURE_TYPES);

function chipFixturePath(
  preset: ChipFixturePreset,
  type: ChipFixtureType,
): string {
  return join(fixturesDir, preset, `${type}.json`);
}

function loadChipFixture(
  preset: ChipFixturePreset,
  type: ChipFixtureType,
): unknown {
  const path = chipFixturePath(preset, type);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to load chip fixture ${preset}/${type}: ${detail}`);
  }
}

const CHIP_FIXTURES: Record<
  ChipFixturePreset,
  Record<ChipFixtureType, unknown>
> = {
  shieldcn: Object.fromEntries(
    CHIP_FIXTURE_TYPES.map((type) => [type, loadChipFixture("shieldcn", type)]),
  ) as Record<ChipFixtureType, unknown>,
  shields: Object.fromEntries(
    CHIP_FIXTURE_TYPES.map((type) => [type, loadChipFixture("shields", type)]),
  ) as Record<ChipFixtureType, unknown>,
};

export function chipFixture(
  preset: ChipFixturePreset,
  type: ChipFixtureType,
): unknown {
  if (!PRESET_SET.has(preset) || !TYPE_SET.has(type)) {
    throw new Error(
      `unknown chip fixture combo: ${String(preset)}/${String(type)}`,
    );
  }
  return CHIP_FIXTURES[preset][type];
}
