# Repowalk

A third-person 3D GitHub repository explorer built with Next.js, React, React Three Fiber, and Three.js. The project also keeps Vinext/Sites commands for the existing Sites deployment.

## Run locally

Requires Node 22.13 or later.

```sh
npm install
npm run dev
```

Open the local URL printed by the development server. The default playground contains clearly labeled sample source. Use **Explore a repository** to load actual source from a public GitHub repository's default branch.

## Deploy to Vercel

Import this repository into Vercel as a Next.js project. If your GitHub repository contains this app in a subfolder, set Vercel's **Root Directory** to that folder. Otherwise leave the root directory blank.

Use the default install command and these build settings:

```sh
npm install
npm run build
```

The included `vercel.json` selects the Next.js preset and clears any stale `dist` output override. Vercel will use its normal Next.js output handling. You do not need to set an Output Directory in the dashboard.

The production build uses `next build --webpack` to avoid current Turbopack CSS worker issues with this Tailwind v4 setup. No environment variables are required for public GitHub repository exploration. The app uses GitHub's public API, so heavy use can still hit GitHub's unauthenticated rate limits.

For the original Sites/Cloudflare flow, use `npm run sites:dev`, `npm run sites:build`, and `npm run sites:start`.

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

The GitHub importer maps up to 5,000 supported text files under 250 KB each, excluding dependency/build directories and lockfiles. The initial import loads the tree only; actual source is fetched when a room is entered and cached in the current expedition. A visible notice identifies truncated trees. Public GitHub API rate limits apply. A bounded five-minute in-memory cache reduces repeat requests. Private repositories, local-folder importing, issue tracker integration, coverage/issue-tracker analysis and persistent expedition history are not implemented in this version.

## Vertical exploration, source structures, and Git history

Folder buildings contain stacked file galleries, alternating walkable stair flights, a moving lift, and a rooftop overlooking the surrounding repository. The floor panel provides a quicker lift route; R selects the roof. File doors are distributed across gallery floors without omitting rooms.

JavaScript and TypeScript source is parsed with Babel. Up to 150 functions, arrow functions, methods, and classes become interactive stations and towers. Height responds to source length, and color indicates classes or branch-heavy functions. E or a station click opens and highlights its exact source range. Other languages retain the complete source reader and clearly indicate that structural parsing is unavailable. The sample world includes predefined, source-aligned structures.

The Time Machine loads the latest 20 actual commits from a public repository. Selecting a commit requests that exact SHA's tree and pins subsequent source requests to that SHA. Added buildings grow in, removed buildings fade into collapsed ghosts, and modified building windows change color. Existing building positions are anchored to the accumulated directory layout. Change counts compare against the previously viewed snapshot, not necessarily the selected commit's parent. Only supported source files in the imported manifest participate in these comparisons. History is unavailable in the synthetic playground.

## Validation

`npx tsc --noEmit` and `npm run build` verify types and the production bundle. `npx oxlint app` checks application code. The scaffold's unused UI catalog has pre-existing full-project lint findings.

The original importer was checked against `jonschlinkert/is-number`. The updated importer returned all 124 supported files across 30 direct folders from `pmndrs/zustand` without sampling; source loading returned its actual `src/index.ts` contents. Invalid repository URLs and unsafe source paths return explicit errors.

`node --experimental-strip-types --test tests/*.test.mjs` verifies directory hierarchy, monotonic building sizes, complete file-room assignment for a 120-file folder, and nonoverlapping variable-size building footprints. The exploration tests additionally check bidirectional stair traversal, rejection of impossible side entry, complete floor assignment, exact AST ranges, and blob-based snapshot changes. A live GitHub check loaded 20 Zustand commits, detected 20 modified files between two snapshots, and confirmed that `src/middleware/devtools.ts` returns different source at the two pinned revisions.

Buildings and portals outside the nearby rendering region are omitted to reduce rendering load; they remain part of the walkable world.

An optional, feature-detected WebMCP tool exposes file-room navigation. No compatible WebMCP validation context was available during implementation; that integration has not been runtime verified. Browser interaction and visual QA were not performed.
