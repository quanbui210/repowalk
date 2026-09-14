export type FileEntry = { path: string };
export const BLOCK_SPACING = 44;
export const CROSS_STREET_Z = 7;
export const ROAD_HALF_WIDTH = 2.55;
export const crossStreets = (count: number) =>
  Array.from(
    { length: Math.ceil(count / 12) },
    (_, i) => CROSS_STREET_Z - i * BLOCK_SPACING,
  );
export function sidewalkSegments(end: number, junctions: number[]) {
  const segments: { z: number; length: number }[] = [];
  let cursor = end;
  for (const z of [...junctions].sort((a, b) => a - b)) {
    if (z - 3 > cursor)
      segments.push({ z: (cursor + z - 3) / 2, length: z - 3 - cursor });
    cursor = Math.max(cursor, z + 3);
  }
  if (cursor < 22) segments.push({ z: (cursor + 22) / 2, length: 22 - cursor });
  return segments;
}
export const directoryOf = (path: string) =>
  path.split('/').slice(0, -1).join('/') || '.';
export type District = {
  path: string;
  count: number;
  directCount: number;
  children: string[];
  x: number;
  z: number;
  scale: number;
  height: number;
};
export function buildDistricts(files: FileEntry[]): District[] {
  const groups = new Map<string, { count: number; directCount: number }>();
  for (const file of files) {
    const folder = directoryOf(file.path);
    const parts = folder === '.' ? ['.'] : folder.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join('/');
      const group = groups.get(path) || { count: 0, directCount: 0 };
      group.count++;
      if (i === parts.length) group.directCount++;
      groups.set(path, group);
    }
  }
  if (groups.has('.')) groups.get('.')!.count = files.length;
  const entries = [...groups.entries()];
  const childrenByParent = new Map<string, string[]>();
  for (const [path] of entries) {
    const parent = directoryOf(path);
    if (parent !== path) {
      const children = childrenByParent.get(parent) || [];
      children.push(path);
      childrenByParent.set(parent, children);
    }
  }
  // Bounded footprints keep even very large repositories walkable.
  // Twelve addresses share one walkable block instead of stretching six along a corridor.
  const addresses = [
    [-10, -10],
    [10, -10],
    [22, -10],
    [-22, -10],
    [-10, -24],
    [10, -24],
    [34, -10],
    [-34, -10],
    [22, -24],
    [-22, -24],
    [34, -24],
    [-34, -24],
  ];
  return entries.map(([path, counts], i) => {
    const scale = 0.95 + 0.35 * (1 - Math.exp(-counts.count / 45));
    const address = addresses[i % addresses.length];
    return {
      path,
      ...counts,
      children: childrenByParent.get(path) || [],
      x: address[0],
      z: address[1] - Math.floor(i / addresses.length) * BLOCK_SPACING,
      scale,
      height: 4.3 + Math.log2(1 + counts.count) * 1.25,
    };
  });
}
export type Portal = {
  path: string;
  kind: 'folder' | 'file';
  x: number;
  z: number;
};
export function buildPortals(
  files: FileEntry[],
  districts: District[],
  folder: string,
): Portal[] {
  const children = districts.find((d) => d.path === folder)?.children || [];
  return [
    ...children.map((path) => ({ path, kind: 'folder' as const })),
    ...files
      .filter((f) => directoryOf(f.path) === folder)
      .map((f) => ({ path: f.path, kind: 'file' as const })),
  ].map((item, i) => ({
    ...item,
    x: i % 2 ? 4.5 : -4.5,
    z: -Math.floor(i / 2) * 5.5,
  }));
}
