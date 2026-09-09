export type FileEntry = { path: string };
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
  let z = 0;
  return entries.map(([path, counts], i) => {
    const scale = 1 + Math.log2(1 + counts.count) * 0.14;
    if (i > 0 && i % 2 === 0) {
      const previousScale = Math.max(
        ...entries
          .slice(i - 2, i)
          .map(([, group]) => 1 + Math.log2(1 + group.count) * 0.14),
      );
      const nextScale = Math.max(
        ...entries
          .slice(i, i + 2)
          .map(([, group]) => 1 + Math.log2(1 + group.count) * 0.14),
      );
      z -= (previousScale + nextScale) * 4.5 + 5;
    }
    return {
      path,
      ...counts,
      children: childrenByParent.get(path) || [],
      x: (i % 2 ? 1 : -1) * (4 + 3.8 * scale),
      z,
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
