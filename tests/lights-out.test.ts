import test from 'node:test';
import assert from 'node:assert/strict';
import { flip, solve, matchesTarget, EMPTY_BOARD, TARGETS, type Board } from '../src/games/lights-out/rules.ts';
import { createGame, gameReducer } from '../src/games/lights-out/state.ts';

test('cross flips respect corners and edges without wrapping or changing the input', () => {
  assert.deepEqual(flip(EMPTY_BOARD, 0), [3, 1, 0, 0, 0]);
  assert.deepEqual(flip(EMPTY_BOARD, 4), [24, 16, 0, 0, 0]);
  assert.deepEqual(flip(EMPTY_BOARD, 12), [0, 4, 14, 4, 0]);
  assert.deepEqual(flip(EMPTY_BOARD, 24), [0, 0, 0, 16, 24]);
  assert.deepEqual(EMPTY_BOARD, [0, 0, 0, 0, 0]);
  assert.deepEqual(flip(flip(EMPTY_BOARD, 0), 0), EMPTY_BOARD);
  assert.throws(() => flip(EMPTY_BOARD, -1), RangeError);
  assert.throws(() => flip(EMPTY_BOARD, 25), RangeError);
});

test('both letter outlines can be reached from all dark in eleven moves', () => {
  for (const target of TARGETS) {
    const solution = solve(EMPTY_BOARD, target.rows);
    assert.ok(solution);
    assert.equal(solution.length, 11);
    assert.deepEqual(solution.reduce((board, cell) => flip(board, cell), EMPTY_BOARD), target.rows);
    assert.deepEqual(solve(target.rows, target.rows), []);
  }
});

test('hints solve the current position, and impossible inputs return no solution', () => {
  const current: Board = [1, 24, 20, 4, 31]; // I target after clicks at (1, 3) and (2, 5).
  const solution = solve(current, [31, 4, 4, 4, 31]);
  assert.ok(solution);
  assert.equal(solution.length, 2);
  assert.deepEqual(solution.reduce((board, cell) => flip(board, cell), current), [31, 4, 4, 4, 31]);
  assert.equal(solve(EMPTY_BOARD, [1, 0, 0, 0, 0]), null);
  assert.equal(matchesTarget([31, 4, 4, 4, 31], [31, 4, 4, 4, 31]), true);
  assert.equal(matchesTarget([31, 4, 4, 4, 30], [31, 4, 4, 4, 31]), false);
});

test('panels are independent, undo reverses a click, and resetting one preserves the others', () => {
  const initial = createGame();
  const first = gameReducer(initial, { type: 'click', panel: 0, cell: 0 });
  const second = gameReducer(first, { type: 'click', panel: 1, cell: 24 });
  assert.deepEqual(second[0].rows, [3, 1, 0, 0, 0]);
  assert.deepEqual(second[1].rows, [0, 0, 0, 16, 24]);
  assert.deepEqual(second[2].rows, EMPTY_BOARD);
  assert.deepEqual(initial, createGame());
  assert.deepEqual(gameReducer(second, { type: 'undo', panel: 1 }), first);
  const reset = gameReducer(second, { type: 'reset', panel: 0 });
  assert.deepEqual(reset[0], initial[0]);
  assert.deepEqual(reset[1], second[1]);
});

test('completed panels ignore new clicks but allow undo to resume playing', () => {
  let game = createGame();
  const solution = solve(EMPTY_BOARD, TARGETS[0].rows)!;
  for (const cell of solution) game = gameReducer(game, { type: 'click', panel: 0, cell });
  assert.ok(matchesTarget(game[0].rows, TARGETS[0].rows));
  assert.deepEqual(gameReducer(game, { type: 'click', panel: 0, cell: 0 }), game);
  const undone = gameReducer(game, { type: 'undo', panel: 0 });
  assert.equal(undone[0].clicks.length, solution.length - 1);
  assert.equal(matchesTarget(undone[0].rows, TARGETS[0].rows), false);
});
