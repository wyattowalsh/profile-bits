/**
 * Username is a fetch argument from yaml plugins.chess.user, not a token.
 * Never emit plugin_chess_* or plugin_<plugin>_<widget>_<option> inputs.
 */
import * as z from "zod";

export const LichessInputsSchema = z.strictObject({});

export type LichessInputs = z.infer<typeof LichessInputsSchema>;

export const LICHESS_INPUT_DEFAULTS = {} as const satisfies LichessInputs;
