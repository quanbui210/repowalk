import type { District, Portal } from './world-layout';
export type CodeConstruct = {
  id: string;
  name: string;
  kind: 'function' | 'class';
  start: number;
  end: number;
  lines: number;
  complexity: number;
};
export type SourceAnalysis = {
  constructs: CodeConstruct[];
  mode: 'ast' | 'unsupported' | 'unparsed';
};
export type CommitInfo = {
  sha: string;
  message: string;
  date: string;
  author: string;
};
export type ChangeKind = 'added' | 'modified' | 'removed' | 'unchanged';
export function floorsFor(district: District | undefined) {
  return district ? Math.max(1, Math.ceil(district.height / 6)) : 1;
}
export function floorPortals(portals: Portal[], floor: number, floors: number) {
  const perFloor = Math.max(1, Math.ceil(portals.length / floors));
  return portals
    .slice(floor * perFloor, (floor + 1) * perFloor)
    .map((p, i) => ({
      ...p,
      x: i % 2 ? 4.5 : -4.5,
      z: -Math.floor(i / 2) * 5.5,
    }));
}
// Flights alternate direction. A candidate must be reachable in one walking step,
// preventing teleportation to overlapping flights or stepping through a stair side.
export function walkingHeight(
  x: number,
  z: number,
  y: number,
  floors: number,
): number | null {
  if (x >= 6.4 && x <= 13.4 && z >= 2 && z <= 8) {
    const candidates = Array.from({ length: floors }, (_, i) => ({
      height: i * 6 + (i % 2 === 0 ? 8 - z : z - 2),
      lane: i % 2,
    }))
      .filter((candidate) => (candidate.lane === 0 ? x <= 9.6 : x >= 10.2))
      .map((candidate) => candidate.height)
      .filter((height) => Math.abs(height - y) < 0.65);
    return candidates.length
      ? candidates.reduce((a, b) => (Math.abs(a - y) < Math.abs(b - y) ? a : b))
      : null;
  }
  const level = Math.max(0, Math.min(floors, Math.round(y / 6))) * 6;
  return Math.abs(level - y) < 0.65 ? level : null;
}
export function symbolPosition(index: number) {
  return { x: index % 2 ? 4.8 : -4.8, z: -2 - Math.floor(index / 2) * 5.5 };
}
export function roomDepth(count: number) {
  return Math.max(18, Math.ceil(count / 2) * 5.5 + 9);
}
export function compareFiles(
  before: Array<{ path: string; sha?: string }>,
  after: Array<{ path: string; sha?: string }>,
) {
  const old = new Map(before.map((f) => [f.path, f.sha]));
  const next = new Map(after.map((f) => [f.path, f.sha]));
  const changes: Record<string, ChangeKind> = {};
  for (const file of after)
    changes[file.path] = !old.has(file.path)
      ? 'added'
      : old.get(file.path) !== file.sha
        ? 'modified'
        : 'unchanged';
  for (const file of before)
    if (!next.has(file.path)) changes[file.path] = 'removed';
  return changes;
}
