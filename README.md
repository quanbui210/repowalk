# Repowalk

A third-person 3D GitHub repository explorer built with React, React Three Fiber, Three.js, and Vinext.

## Run locally

Requires Node 22.13 or later.

```sh
npm install
npm run dev
```

Open the local URL printed by the development server. The default playground contains clearly labeled sample source. Use **Explore a repository** to load actual source from a public GitHub repository's default branch.

## Controls

- WASD / arrow keys: walk; Shift: run
- Drag: orbit camera; scroll: zoom
- E near a glowing door: enter its folder building or file room
- Read code: open the complete, line-numbered source
- Escape / back arrow: return from a room to its hallway, or from a hallway to the street
- Folder buildings: enter from the street; the sidebar and minimap provide travel shortcuts
- On-screen movement controls are available on touch screens

## Scope

Each directory becomes a building in one connected street. Its footprint and height grow with the number of contained files. Entering a building reveals a hallway of file rooms and immediate subfolder wings. Intermediate directories are preserved, and nested wings can be entered recursively. Discovery is tracked for the current expedition. The source reader is read-only. The 3D wall displays the first 32 source lines; the reader includes the complete downloaded file.

The GitHub importer maps up to 5,000 supported text files under 250 KB each, excluding dependency/build directories and lockfiles. The initial import loads the tree only; actual source is fetched when a room is entered and cached in the current expedition. A visible notice identifies truncated trees. Public GitHub API rate limits apply. A bounded five-minute in-memory cache reduces repeat requests. Private repositories, local-folder importing, issue tracker integration, AST-based code quality analysis, vertical stair/elevator navigation, and persistent expedition history are not implemented in this version.

## Validation

`npx tsc --noEmit` and `npm run build` verify types and the production bundle. `npx oxlint app` checks application code. The scaffold's unused UI catalog has pre-existing full-project lint findings.

The original importer was checked against `jonschlinkert/is-number`. The updated importer returned all 124 supported files across 30 direct folders from `pmndrs/zustand` without sampling; source loading returned its actual `src/index.ts` contents. Invalid repository URLs and unsafe source paths return explicit errors.

`node --experimental-strip-types --test tests/world-layout.test.mjs` verifies directory hierarchy, monotonic building sizes, complete file-room assignment for a 120-file folder, and nonoverlapping variable-size building footprints. Buildings and portals outside the nearby rendering region are omitted to reduce rendering load; they remain part of the walkable world.

An optional, feature-detected WebMCP tool exposes file-room navigation. No compatible WebMCP validation context was available during implementation; that integration has not been runtime verified. Browser interaction and visual QA were not performed.
