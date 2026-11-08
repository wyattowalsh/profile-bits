import { useBitTheme } from "./Theme.js";

export const BOARD_SIZE = 8;

export const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

const FEN_GLYPHS: Readonly<Record<string, string>> = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

export type BoardSquare = string | null;

export type BoardProps = {
  readonly fen?: string;
  readonly squares?: readonly BoardSquare[];
  readonly size?: number;
  readonly showLabels?: boolean;
};

function emptySquares(): BoardSquare[] {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null);
}

function glyphFor(square: BoardSquare): string | null {
  if (square == null || square === "") {
    return null;
  }
  return FEN_GLYPHS[square] ?? square;
}

function squaresFromFen(fen: string): BoardSquare[] {
  const placement = fen.trim().split(/\s+/)[0] ?? "";
  const ranks = placement.split("/");
  if (ranks.length !== BOARD_SIZE) {
    return emptySquares();
  }
  const squares: BoardSquare[] = [];
  for (const rank of ranks) {
    let files = 0;
    for (const ch of rank) {
      if (ch >= "1" && ch <= "8") {
        const count = Number(ch);
        for (let i = 0; i < count; i++) {
          squares.push(null);
        }
        files += count;
      } else if (Object.hasOwn(FEN_GLYPHS, ch)) {
        squares.push(ch);
        files += 1;
      } else {
        return emptySquares();
      }
    }
    if (files !== BOARD_SIZE) {
      return emptySquares();
    }
  }
  return squares.length === BOARD_SIZE * BOARD_SIZE ? squares : emptySquares();
}

function resolveSquares(
  fen: string | undefined,
  squares: readonly BoardSquare[] | undefined,
): BoardSquare[] {
  if (squares !== undefined) {
    const next = emptySquares();
    const limit = Math.min(squares.length, next.length);
    for (let i = 0; i < limit; i++) {
      next[i] = squares[i] ?? null;
    }
    return next;
  }
  return squaresFromFen(fen ?? STARTING_FEN);
}

export function Board({
  fen,
  squares,
  size = 128,
  showLabels = true,
}: BoardProps) {
  const theme = useBitTheme();
  const cells = resolveSquares(fen, squares);
  const occupied = cells.some((cell) => cell != null && cell !== "");
  const labels = occupied ? showLabels : true;
  const cellSize = Math.max(1, Math.floor(size / BOARD_SIZE));
  const gridSize = cellSize * BOARD_SIZE;
  const labelSize = Math.max(10, Math.floor(cellSize * 0.75));
  const pieceSize = Math.max(8, Math.floor(cellSize * 0.75));

  const rows: BoardSquare[][] = [];
  for (let rankIndex = 0; rankIndex < BOARD_SIZE; rankIndex++) {
    const start = rankIndex * BOARD_SIZE;
    rows.push(cells.slice(start, start + BOARD_SIZE));
  }

  return (
    <div
      tw="flex flex-col"
      style={{
        display: "flex",
        flexDirection: "column",
        width: labels ? labelSize + gridSize : gridSize,
      }}
    >
      {rows.map((rank, rankIndex) => {
        const rankName = String(BOARD_SIZE - rankIndex);
        return (
          <div
            key={`rank-${rankName}`}
            tw="flex flex-row"
            style={{ display: "flex", flexDirection: "row" }}
          >
            {labels ? (
              <span
                tw="flex"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: labelSize,
                  height: cellSize,
                  color: theme.muted,
                  fontFamily: theme.font,
                  fontSize: 10,
                  fontWeight: 400,
                }}
              >
                {rankName}
              </span>
            ) : null}
            {rank.map((square, fileIndex) => {
              const file = FILES[fileIndex] ?? "a";
              const rankFromBottom = BOARD_SIZE - 1 - rankIndex;
              const dark = (fileIndex + rankFromBottom) % 2 === 0;
              const glyph = glyphFor(square);
              return (
                <div
                  key={`${file}${rankName}`}
                  tw="flex"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: dark ? theme.border : theme.card,
                    color: theme.text,
                    fontFamily: theme.font,
                    fontSize: pieceSize,
                    fontWeight: 700,
                  }}
                >
                  {glyph}
                </div>
              );
            })}
          </div>
        );
      })}
      {labels ? (
        <div
          tw="flex flex-row"
          style={{ display: "flex", flexDirection: "row" }}
        >
          <div style={{ width: labelSize, height: labelSize }} />
          {FILES.map((file) => (
            <span
              key={file}
              tw="flex"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: cellSize,
                height: labelSize,
                color: theme.muted,
                fontFamily: theme.font,
                fontSize: 10,
                fontWeight: 400,
              }}
            >
              {file}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
