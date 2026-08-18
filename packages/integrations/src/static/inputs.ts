/**
 * Integration-level client inputs (run config), not Action Marketplace inputs.
 * static has none.
 */

export type StaticInputs = Record<string, never>;

export const STATIC_INPUT_DEFAULTS = {} as const satisfies StaticInputs;
