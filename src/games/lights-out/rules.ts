export type Board = readonly number[];
export const EMPTY_BOARD: Board = Object.freeze([0, 0, 0, 0, 0]);
export const TARGETS = [
  { letter: 'I', rows: Object.freeze([31, 4, 4, 4, 31]) },
  { letter: '+', rows: Object.freeze([4, 4, 31, 4, 4]) },
  { letter: '+', rows: Object.freeze([4, 4, 31, 4, 4]) }
] as const;

export function flip(board: Board, cell: number): Board {
  if (!Number.isInteger(cell) || cell < 0 || cell >= 25) throw new RangeError('Cell must be within the 5×5 board');
  const next = [...board];
  const row = Math.floor(cell / 5), col = cell % 5;
  for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < 5 && c >= 0 && c < 5) next[r] ^= 1 << c;
  }
  return next;
}

export function matchesTarget(board: Board, target: Board): boolean {
  return board.length === target.length && board.every((row, index) => row === target[index]);
}

/** Enumerate the 32 possible first rows, then chase each mismatch downwards.
 * This covers all solutions, including the 5×5 grid's nullspace. */
export function solve(board: Board, target: Board): number[] | null {
  let best: number[] | null = null;
  for (let firstRow = 0; firstRow < 32; firstRow++) {
    let current: Board = board.map((row, index) => row ^ target[index]);
    const clicks: number[] = [];
    const press = (cell: number) => { current = flip(current, cell); clicks.push(cell); };
    for (let col = 0; col < 5; col++) if (firstRow & (1 << col)) press(col);
    for (let row = 1; row < 5; row++) {
      const above = current[row - 1];
      for (let col = 0; col < 5; col++) if (above & (1 << col)) press(row * 5 + col);
    }
    if (current[4] === 0 && (best === null || clicks.length < best.length)) best = clicks;
  }
  return best;
}
