/**
 * Destination: packages/integrations/src/chesscom/inputs.ts
 * Integration-level client inputs (run config), NOT Action Marketplace inputs.
 * Username is a fetch argument from yaml plugins.chess.user, not a token.
 * Never emit plugin_chess_* or plugin_<plugin>_<widget>_<option> inputs.
 */
import * as z from "zod";

export const ChesscomInputsSchema = z.strictObject({});

export type ChesscomInputs = z.infer<typeof ChesscomInputsSchema>;

export const CHESSCOM_INPUT_DEFAULTS = {} as const satisfies ChesscomInputs;
