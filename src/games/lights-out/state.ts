import { EMPTY_BOARD, TARGETS, flip, matchesTarget, type Board } from './rules';
export type Panel = { rows: Board; clicks: readonly number[] };
export type Game = readonly Panel[];
export type Action = { type: 'click'; panel: number; cell: number }
  | { type: 'undo'; panel: number } | { type: 'reset'; panel: number };
export const createGame = (): Game => TARGETS.map(() => ({ rows: EMPTY_BOARD, clicks: [] }));
export function gameReducer(game: Game, action: Action): Game {
  return game.map((panel, index) => {
    if (index !== action.panel) return panel;
    if (action.type === 'reset') return { rows: EMPTY_BOARD, clicks: [] };
    if (action.type === 'undo') {
      const cell = panel.clicks.at(-1);
      return cell === undefined ? panel : { rows: flip(panel.rows, cell), clicks: panel.clicks.slice(0, -1) };
    }
    if (matchesTarget(panel.rows, TARGETS[index].rows)) return panel;
    return { rows: flip(panel.rows, action.cell), clicks: [...panel.clicks, action.cell] };
  });
}
