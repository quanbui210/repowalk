import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDistricts,
  buildPortals,
  directoryOf,
  crossStreets,
  ROAD_HALF_WIDTH,
  sidewalkSegments,
} from '../lib/world-layout.ts';

test('every directory is a building, including intermediate directories', () => {
  const files = [
    { path: 'README.md' },
    { path: 'src/ui/Button.tsx' },
    { path: 'src/ui/Modal.tsx' },
    { path: 'src/state/store.ts' },
  ];
  const districts = buildDistricts(files);
  assert.deepEqual(
    districts.map((d) => d.path),
    ['.', 'src', 'src/ui', 'src/state'],
  );
  assert.equal(districts.find((d) => d.path === 'src').count, 3);
  assert.deepEqual(districts.find((d) => d.path === 'src').children, [
    'src/ui',
    'src/state',
  ]);
  assert.equal(districts.find((d) => d.path === '.').count, 4);
  assert.equal(directoryOf('README.md'), '.');
});

test('folders with more files have larger footprints and taller buildings', () => {
  const files = [
    { path: 'small/a.ts' },
    ...Array.from({ length: 120 }, (_, i) => ({ path: `large/file-${i}.ts` })),
  ];
  const [small, large] = buildDistricts(files);
  assert.ok(large.scale > small.scale);
  assert.ok(large.height > small.height);
  assert.equal(large.count, 120);
  assert.equal(buildPortals(files, [small, large], 'large').length, 120);
});

test('hallways have one portal per direct file and one per immediate subfolder', () => {
  const files = [
    { path: 'src/index.ts' },
    { path: 'src/ui/Button.tsx' },
    { path: 'src/ui/icons/Close.tsx' },
  ];
  const districts = buildDistricts(files);
  assert.deepEqual(
    buildPortals(files, districts, 'src').map((p) => [p.path, p.kind]),
    [
      ['src/ui', 'folder'],
      ['src/index.ts', 'file'],
    ],
  );
  assert.deepEqual(
    buildPortals(files, districts, 'src/ui').map((p) => [p.path, p.kind]),
    [
      ['src/ui/icons', 'folder'],
      ['src/ui/Button.tsx', 'file'],
    ],
  );
});

test('civic blocks preserve road clearance and never overlap across neighbourhoods', () => {
  const files = Array.from({ length: 25 }, (_, i) =>
    Array.from({ length: 1 + i * 7 }, (_, j) => ({
      path: `folder-${i}/file-${j}.ts`,
    })),
  ).flat();
  const districts = buildDistricts(files);
  for (const d of districts) assert.ok(Math.abs(d.x) - 3.8 * d.scale >= 3.999);
  for (const d of districts) assert.ok(d.scale <= 1.45);
  for (const d of districts)
    for (const z of crossStreets(districts.length)) {
      assert.ok(
        Math.abs(d.z - z) > 4.5 * d.scale + ROAD_HALF_WIDTH + 1,
        `${d.path} overlaps road at ${z}`,
      );
    }
  for (const s of sidewalkSegments(-260, crossStreets(districts.length)))
    for (const z of crossStreets(districts.length)) {
      assert.ok(Math.abs(s.z - z) >= s.length / 2 + 3 - 1e-8);
    }
  const centre = districts.slice(0, 6);
  assert.ok(
    Math.max(...centre.map((d) => d.x)) - Math.min(...centre.map((d) => d.x)) <=
      68,
  );
  assert.ok(
    Math.max(...centre.map((d) => d.z)) - Math.min(...centre.map((d) => d.z)) <=
      23,
  );
  assert.ok(new Set(districts.map((d) => d.x)).size >= 4);
  for (let i = 0; i < districts.length; i++) {
    for (let j = i + 1; j < districts.length; j++) {
      const a = districts[i],
        b = districts[j];
      assert.ok(
        Math.abs(a.x - b.x) > 4.5 * (a.scale + b.scale) ||
          Math.abs(a.z - b.z) > 4.5 * (a.scale + b.scale),
      );
    }
  }
});
