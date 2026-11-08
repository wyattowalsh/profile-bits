import {
  ChesscomClientError,
  type ChesscomFetch,
  createChesscomClient,
} from "../../../integrations/src/chesscom/client.js";
import type { ChesscomDump } from "../../../integrations/src/chesscom/payload.js";
import {
  createLichessClient,
  type LichessFetch,
} from "../../../integrations/src/lichess/client.js";
import type { LichessDump } from "../../../integrations/src/lichess/payload.js";

export type ChessLoadedDump =
  | { readonly source: "chesscom"; readonly dump: ChesscomDump }
  | { readonly source: "lichess"; readonly dump: LichessDump };

export type ChessLoadDeps = {
  fetch?: ChesscomFetch & LichessFetch;
};

/**
 * Chess.com first. Lichess runs only when chess.com reports HTTP 404.
 * Widgets do not call this; the pack loader does.
 */
export async function loadChessDump(
  user: string,
  deps: ChessLoadDeps = {},
): Promise<ChessLoadedDump> {
  const chesscom = createChesscomClient(
    deps.fetch === undefined ? {} : { fetch: deps.fetch },
  );
  try {
    const dump = await chesscom.fetchDump(user);
    return { source: "chesscom", dump };
  } catch (error: unknown) {
    if (error instanceof ChesscomClientError && error.status === 404) {
      const lichess = createLichessClient(
        deps.fetch === undefined ? {} : { fetch: deps.fetch },
      );
      const dump = await lichess.fetchDump(user);
      return { source: "lichess", dump };
    }
    throw error;
  }
}
