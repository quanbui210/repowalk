import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceCase, CASE_STEPS } from '../lib/lost-found.ts';
test('the sketchbook can only be returned after the coffee clue and dog trade', () => {
  let step = 0;
  assert.equal(advanceCase(step, 2), 0);
  for (const station of [0, 1, 2, 0]) step = advanceCase(step, station);
  assert.equal(step, 4);
  assert.equal(advanceCase(step, 0), 4);
  assert.equal(advanceCase(1, 0), 1);
  assert.equal(advanceCase(2, 0), 2);
  assert.equal(CASE_STEPS[step].place, 'CASE CLOSED');
});
