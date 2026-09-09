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
- E near a glowing door: enter its source room
- Read code: open the complete, line-numbered source
- Escape / back arrow: leave the room
- Folder explorer: switch blocks; file or minimap selection: travel directly
- On-screen movement controls are available on touch screens

## Scope

Each directory becomes a district block, each file a building and explorable room. Discovery is tracked for the current expedition. The source reader is read-only. The 3D wall displays the first 32 source lines; the reader includes the complete downloaded file.

The GitHub importer supports up to 80 text source files under 100 KB each, excludes dependency/build directories and lockfiles, and loads requests in batches of eight. Public GitHub API rate limits apply. A bounded five-minute in-memory cache reduces repeat requests. Private repositories, local-folder importing, issue tracker integration, AST-based code quality analysis, multi-floor navigation, and persistent expedition history are not implemented in this version.

## Validation

`npx tsc --noEmit` and `npm run build` verify types and the production bundle. `npx oxlint app` checks application code. The scaffold's unused UI catalog has pre-existing full-project lint findings.

The live repository route was checked against `jonschlinkert/is-number` and returned ten files with real source. Invalid URLs and repositories without supported files return explicit errors.

An optional, feature-detected WebMCP tool exposes file-room navigation. No compatible WebMCP validation context was available during implementation; that integration has not been runtime verified. Browser interaction and visual QA were not performed.
