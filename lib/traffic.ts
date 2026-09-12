export type Signal = 'green' | 'amber' | 'red';
// A clearance interval allows the junction to empty before crossing traffic starts.
export function signalAt(time: number, cross: boolean): Signal {
  const phase = ((time % 28) + 28) % 28;
  const local = cross ? (phase + 14) % 28 : phase;
  return local < 8 ? 'green' : local < 10 ? 'amber' : 'red';
}
export function approachSignal(
  position: number,
  direction: number,
  junction: number,
  halfLength: number,
  signal: Signal,
) {
  const frontDistance = (junction - position) * direction - halfLength;
  return signal !== 'green' && frontDistance >= 3.2 && frontDistance <= 5;
}
export function movementVector(dx: number, dz: number, yaw: number) {
  const length = Math.hypot(dx, dz) || 1;
  return {
    x: (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / length,
    z: (-dx * Math.sin(yaw) + dz * Math.cos(yaw)) / length,
  };
}
// A complete stop cycle: arrive, open doors, board one at a time, depart.
export function boardingProgress(dwell: number, person: number) {
  return Math.max(0, Math.min(1, (dwell - 1.5 - person * 1.15) / 1.1));
}
