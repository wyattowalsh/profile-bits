/**
 * Integration-level client inputs (run config), NOT Action Marketplace inputs.
 * Never emit plugin_spotify_* or plugin_<plugin>_<widget>_<option> inputs.
 */
import * as z from "zod";

export const SpotifyInputsSchema = z.strictObject({});

export type SpotifyInputs = z.infer<typeof SpotifyInputsSchema>;

export const SPOTIFY_INPUT_DEFAULTS = {} as const satisfies SpotifyInputs;
