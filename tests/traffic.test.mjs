import test from 'node:test';
import assert from 'node:assert/strict';
import {
  signalAt,
  approachSignal,
  movementVector,
  boardingProgress,
} from '../lib/traffic.ts';
test('opposing streets never receive permission together and include clearance', () => {
  for (let t = 0; t < 56; t += 0.1)
    assert.ok(signalAt(t, false) === 'red' || signalAt(t, true) === 'red');
  assert.equal(signalAt(8, false), 'amber');
  assert.equal(signalAt(12, false), 'red');
  assert.equal(signalAt(12, true), 'red');
  assert.equal(signalAt(14, true), 'green');
});
test('cars and long trams stop before the junction in both directions', () => {
  for (const half of [1.4, 3.1, 4.7])
    for (const direction of [-1, 1]) {
      const p = 7 - direction * (half + 4);
      assert.equal(approachSignal(p, direction, 7, half, 'red'), true);
      assert.equal(approachSignal(p, direction, 7, half, 'green'), false);
      assert.equal(approachSignal(7, direction, 7, half, 'red'), false);
    }
});
test('up is straight north at startup, camera-relative after orbit, diagonals normalized', () => {
  assert.deepEqual(movementVector(0, -1, 0), { x: 0, z: -1 });
  const orbit = movementVector(0, -1, Math.PI / 2);
  assert.ok(Math.abs(orbit.x + 1) < 1e-9 && Math.abs(orbit.z) < 1e-9);
  assert.ok(
    Math.abs(Math.hypot(...Object.values(movementVector(1, -1, 0.3))) - 1) <
      1e-9,
  );
});
test('passengers wait for doors, board in order, and all finish before departure', () => {
  for (let i = 0; i < 4; i++) assert.equal(boardingProgress(0, i), 0);
  assert.equal(boardingProgress(2, 0) > 0, true);
  assert.equal(boardingProgress(2, 1), 0);
  for (let i = 0; i < 4; i++) assert.equal(boardingProgress(8, i), 1);
});
