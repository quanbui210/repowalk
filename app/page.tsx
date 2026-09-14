'use client';
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import Link from 'next/link';
import { StoryProvider, StoryUI, useStory } from './lost-found';
import { BuildingMission } from './building-missions';
import {
  compareFiles,
  floorsFor,
  floorPortals,
  type CodeConstruct,
  type SourceAnalysis,
  type CommitInfo,
  type ChangeKind,
} from '@/lib/exploration';
import { buildDistricts, buildPortals, directoryOf } from '@/lib/world-layout';
import {
  ArrowUpRight,
  Box,
  GitBranch,
  GitFork,
  ChevronRight,
  Folder,
  FileCode2,
  Maximize2,
  RotateCcw,
  History,
  ChevronLeft,
  Building2,
  Volume2,
  VolumeX,
  Map,
  Footprints,
  ArrowLeft,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
const World = lazy(() => import('./world'));
export type RepoFile = {
  path: string;
  code: string;
  lines: number;
  todos: number;
  loaded?: boolean;
  sha?: string;
  analysis?: SourceAnalysis;
};
const sample = (name: string) =>
  `import { createContext, useContext, useState } from 'react';\n\n/**\n * ${name} — Repowalk sample repository\n * A small space for thoughtful software.\n */\nexport interface ExplorerState {\n  currentRoom: string | null;\n  discovered: Set<string>;\n  isExploring: boolean;\n}\n\nexport function useExplorer() {\n  const [state, setState] = useState<ExplorerState>({\n    currentRoom: null,\n    discovered: new Set(),\n    isExploring: true,\n  });\n\n  function enterRoom(path: string) {\n    setState(previous => ({\n      ...previous,\n      currentRoom: path,\n      discovered: new Set([...previous.discovered, path]),\n    }));\n  }\n\n  // TODO: persist discovery between expeditions\n  return { ...state, enterRoom };\n}\n`;
const paths = [
  'src/components/Button.tsx',
  'src/components/Navigation.tsx',
  'src/components/Modal.tsx',
  'src/components/Avatar.tsx',
  'src/hooks/useExplorer.ts',
  'src/hooks/useKeyboard.ts',
  'src/lib/utils.ts',
  'src/lib/manifest.ts',
  'src/pages/index.tsx',
  'src/pages/explore.tsx',
  'tests/explorer.test.ts',
  'tests/manifest.test.ts',
];
const demo: RepoFile[] = paths.map((path) => {
  const code =
    sample(path.split('/').pop()!) +
    `\nexport class ExpeditionJournal {\n  entries: string[] = [];\n\n  record(path: string) {\n    if (!this.entries.includes(path)) {\n      this.entries.push(path);\n    }\n  }\n}\n`;
  const lines = code.split('\n');
  const start = (text: string) =>
    lines.findIndex((line) => line.includes(text)) + 1;
  const constructs: CodeConstruct[] = [
    {
      id: 'explorer',
      name: 'useExplorer',
      kind: 'function',
      start: start('export function useExplorer'),
      end: start('return { ...state') + 1,
      lines: 18,
      complexity: 1,
    },
    {
      id: 'enter',
      name: 'enterRoom',
      kind: 'function',
      start: start('function enterRoom'),
      end: start('return { ...state') - 3,
      lines: 7,
      complexity: 1,
    },
    {
      id: 'journal',
      name: 'ExpeditionJournal',
      kind: 'class',
      start: start('export class'),
      end: lines.length - 1,
      lines: 9,
      complexity: 2,
    },
    {
      id: 'record',
      name: 'record',
      kind: 'function',
      start: start('record(path:'),
      end: lines.length - 2,
      lines: 5,
      complexity: 2,
    },
  ];
  return {
    path,
    code,
    lines: lines.length,
    todos: 1,
    analysis: { constructs, mode: 'ast' as const },
  };
});
export default function Home() {
  return <StoryProvider><Game /></StoryProvider>;
}
function Game() {
  const story = useStory();
  const [files, setFiles] = useState(demo),
    [repo, setRepo] = useState('repowalk / playground'),
    [branch, setBranch] = useState('main'),
    [folder, setFolder] = useState('src/components'),
    [inside, setInside] = useState(false),
    [sourceError, setSourceError] = useState(''),
    [sourceAttempt, setSourceAttempt] = useState(0),
    [floor, setFloor] = useState(0),
    [floorRequest, setFloorRequest] = useState<{
      level: number;
      serial: number;
    } | null>(null),
    [symbol, setSymbol] = useState<CodeConstruct | null>(null),
    [historyOpen, setHistoryOpen] = useState(false),
    [historyBusy, setHistoryBusy] = useState(false),
    [historyError, setHistoryError] = useState(''),
    [commits, setCommits] = useState<CommitInfo[]>([]),
    [commitIndex, setCommitIndex] = useState(-1),
    [snapshotRef, setSnapshotRef] = useState(''),
    [layoutFiles, setLayoutFiles] = useState(demo),
    [changes, setChanges] = useState<Record<string, ChangeKind>>({}),
    [timeRevision, setTimeRevision] = useState(0),
    [notice, setNotice] = useState(''),
    [active, setActive] = useState<RepoFile | null>(null),
    [visited, setVisited] = useState<string[]>([]),
    [modal, setModal] = useState(false),
    [url, setUrl] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [help, setHelp] = useState(false),
    [muted, setMuted] = useState(true),
    [map, setMap] = useState(false),
    [reset, setReset] = useState(0),
    [near, setNear] = useState(''),
    [reading, setReading] = useState(false);
  const districts = useMemo(() => buildDistricts(files), [files]);
  const folders = districts.map((d) => d.path);
  const roomFiles = files.filter((f) => directoryOf(f.path) === folder);
  const allPortals = buildPortals(files, districts, folder);
  const floorCount = floorsFor(districts.find((d) => d.path === folder));
  const portals = floorPortals(allPortals, floor, floorCount);
  const historyRequest = useRef(0);
  const historyRetryIndex = useRef(0);
  const codePane = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (reading && symbol)
      codePane.current
        ?.querySelector(`[data-line="${symbol.start}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [reading, symbol]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && reading) {
        e.stopImmediatePropagation();
        setReading(false);
      }
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [reading]);
  function inspectSymbol(construct: CodeConstruct) {
    setSymbol(construct);
    setReading(true);
  }
  function takeLift(level: number) {
    setFloorRequest((request) => ({
      level,
      serial: (request?.serial || 0) + 1,
    }));
  }
  async function openHistory() {
    setHistoryOpen(true);
    if (commits.length || repo === 'repowalk / playground') return;
    setHistoryBusy(true);
    setHistoryError('');
    const id = ++historyRequest.current;
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repo.replaceAll(' ', '') }),
      });
      const data = (await response.json()) as {
        commits: CommitInfo[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      if (id === historyRequest.current) setCommits(data.commits);
    } catch (e) {
      if (id === historyRequest.current) setHistoryError((e as Error).message);
    } finally {
      if (id === historyRequest.current) setHistoryBusy(false);
    }
  }
  async function travelToCommit(index: number) {
    if (!commits[index]) return;
    historyRetryIndex.current = index;
    setHistoryBusy(true);
    setHistoryError('');
    const id = ++historyRequest.current;
    try {
      const response = await fetch('/api/repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: repo.replaceAll(' ', ''),
          ref: commits[index].sha,
        }),
      });
      const data = (await response.json()) as {
        files: RepoFile[];
        sampled: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      if (id !== historyRequest.current) return;
      setChanges(compareFiles(files, data.files));
      setLayoutFiles((previous) => {
        const known = new Set(previous.map((f) => f.path));
        return [...previous, ...data.files.filter((f) => !known.has(f.path))];
      });
      setFiles(data.files);
      setSnapshotRef(commits[index].sha);
      setCommitIndex(index);
      setActive(null);
      setInside(false);
      setReading(false);
      setSymbol(null);
      setTimeRevision((n) => n + 1);
      setNotice(
        data.sampled
          ? 'Partial snapshot: limited to 5,000 supported files.'
          : '',
      );
    } catch (e) {
      if (id === historyRequest.current) setHistoryError((e as Error).message);
    } finally {
      if (id === historyRequest.current) setHistoryBusy(false);
    }
  }

  const mapItems = inside
    ? portals
    : districts.map((d) => ({ path: d.path, kind: 'folder' as const }));
  const activePath = active?.path;
  const needsSource = !!active && active.loaded === false;
  useEffect(() => {
    if (!activePath || !needsSource) return;
    const controller = new AbortController();
    void fetch('/api/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: repo.replaceAll(' ', ''),
        branch: snapshotRef || branch,
        path: activePath,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as RepoFile & { error?: string };
        if (!response.ok)
          throw new Error(data.error || 'Could not load this source file');
        if (controller.signal.aborted) return;
        const loaded = { ...data, loaded: true };
        setFiles((previous) =>
          previous.map((f) =>
            f.path === activePath ? { ...f, ...loaded } : f,
          ),
        );
        setActive((current) =>
          current?.path === activePath ? { ...current, ...loaded } : current,
        );
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setSourceError((error as Error).message);
      });
    return () => controller.abort();
  }, [activePath, needsSource, repo, branch, sourceAttempt, snapshotRef]);
  function enterFolder(path: string) {
    setSymbol(null);
    setFloor(0);
    setFloorRequest(null);
    setFolder(path);
    setInside(true);
    setActive(null);
    setReading(false);
    setSourceError('');
  }
  function leave() {
    setReading(false);
    setSourceError('');
    if (active) setActive(null);
    else setInside(false);
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => void;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      context.registerTool(
        {
          name: 'enter_repository_file',
          description:
            'Enter a source file room in the current repository and show its source code.',
          inputSchema: {
            type: 'object',
            properties: { path: { type: 'string' } },
            required: ['path'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          execute(input: unknown) {
            const path = (input as { path?: string })?.path;
            const file = files.find((f) => f.path === path);
            if (!file)
              throw new Error('File not found in the current repository');
            setFolder(directoryOf(file.path));
            setInside(true);
            setActive(file);
            setVisited((v) => (v.includes(file.path) ? v : [...v, file.path]));
            setReading(true);
            return { path: file.path, lines: file.lines };
          },
        },
        { signal: lifecycle.signal },
      );
    } catch (error) {
      console.warn('WebMCP registration unavailable', error);
    }
    return () => lifecycle.abort();
  }, [files]);
  function enter(file: RepoFile) {
    setSymbol(null);
    setInside(true);
    setFolder(directoryOf(file.path));
    setSourceError('');
    setActive(file);
    setVisited((v) => (v.includes(file.path) ? v : [...v, file.path]));
    setReading(false);
  }
  async function loadRepo() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as {
        error?: string;
        files: RepoFile[];
        repo: string;
        branch: string;
        sampled?: boolean;
      };
      if (!response.ok)
        throw new Error(data.error || 'Repository could not be loaded');
      setInside(false);
      setNotice(
        data.sampled
          ? 'Large repository: showing the first 5,000 supported files.'
          : '',
      );
      historyRequest.current++;
      setCommits([]);
      setHistoryOpen(false);
      setHistoryBusy(false);
      setCommitIndex(-1);
      setSnapshotRef('');
      setChanges({});
      setLayoutFiles(data.files);
      setSymbol(null);
      setFloor(0);
      setFloorRequest(null);
      setFiles(data.files);
      setRepo(data.repo);
      setBranch(data.branch);
      setFolder(directoryOf(data.files[0].path));
      setActive(null);
      setVisited([]);
      setReset((r) => r + 1);
      setModal(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={'app-shell' + (story.storyMode ? ' story-mode' : '') + (inside ? ' story-inside' : '')}>
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <Box size={22} />
          </span>
          {story.storyMode ? 'little helsinki' : 'repowalk'}<span className="alpha">{story.storyMode ? 'LOST & FOUND' : 'ALPHA'}</span>
        </Link>
        <div className="repo-chip">
          <GitFork size={16} />
          <span>{repo}</span>
          <span className="divider" />
          <GitBranch size={14} />
          <small>{branch}</small>
        </div>
        <button className="connect-btn" onClick={() => setModal(true)}>
          Explore a repository <ArrowUpRight size={16} />
        </button>
      </header>
      <div className="workspace">
        <aside className="explorer">
          <div className="eyebrow">
            YOUR EXPEDITION <span className="live-dot" />
          </div>
          <h1>
            Code becomes
            <br />a place.
          </h1>
          <p className="intro">
            Walk the architecture.
            <br />
            Discover what’s inside.
          </p>
          <div className="section-label">
            REPOSITORY <span>{files.length} files</span>
          </div>
          <div className="tree">
            <button
              className="tree-root"
              onClick={() => {
                setInside(false);
                setActive(null);
                setReading(false);
              }}
            >
              <ChevronRight size={13} />
              <Box size={15} />
              {repo.split('/').pop()?.trim()}
            </button>
            {folders.map((f) => (
              <div key={f}>
                <button
                  className={'folder ' + (folder === f ? 'selected' : '')}
                  onClick={() => enterFolder(f)}
                >
                  <ChevronRight
                    size={13}
                    className={folder === f ? 'rotated' : ''}
                  />
                  <Folder size={16} />
                  <span>{f}</span>
                  <small>{districts.find((d) => d.path === f)?.count}</small>
                </button>
                {folder === f &&
                  roomFiles.map((file) => (
                    <button
                      key={file.path}
                      className={
                        'file ' + (active?.path === file.path ? 'current' : '')
                      }
                      onClick={() => enter(file)}
                    >
                      <FileCode2 size={14} />
                      <span>{file.path.split('/').pop()}</span>
                      {visited.includes(file.path) && <i />}
                    </button>
                  ))}
              </div>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="discovered">
              <Footprints size={16} />
              <span>
                {visited.length} of {files.length} rooms discovered
              </span>
            </div>
            <div className="progress-track">
              <span
                style={{ width: `${(visited.length / files.length) * 100}%` }}
              />
            </div>
            <span className="sample-label">
              <span className="live-dot" />
              {repo === 'repowalk / playground'
                ? 'PLAYGROUND · SAMPLE REPOSITORY'
                : 'GITHUB · LIVE SOURCE'}
            </span>
          </div>
        </aside>
        <section className="game-area">
          <div className="scene">
            <Suspense
              fallback={
                <div className="world-loading">
                  <Box />
                  Constructing your world…
                </div>
              }
            >
              <World
                files={files}
                layoutFiles={layoutFiles}
                changes={changes}
                timeRevision={timeRevision}
                floorRequest={floorRequest}
                onFloor={setFloor}
                onInspect={inspectSymbol}
                inside={inside}
                onFolderEnter={enterFolder}
                folder={folder}
                active={active}
                onEnter={enter}
                onLeave={leave}
                onNear={setNear}
                reset={reset}
                paused={modal || help || reading || story.dialog !== null || story.journal || story.missionOpen}
                muted={muted}
              />
            </Suspense>
          </div>
          <div className="scene-vignette" />
          <StoryUI inside={inside} />
          {inside && !active && <BuildingMission key={folder} kind={Math.max(0, folders.indexOf(folder)) % 6} files={files} muted={muted} onEnter={enter} />}
          <div className="scene-heading">
            <div className="eyebrow">
              <span className="live-dot" /> EXPLORATION MODE
            </div>
            <h2>
              {active
                ? active.path.split('/').pop()
                : inside
                  ? folder + ' /'
                  : 'The repository district'}
              <span>
                {' '}
                /{' '}
                {inside
                  ? String(folders.indexOf(folder) + 1).padStart(2, '0')
                  : `${folders.length} buildings`}
              </span>
            </h2>
            <div className="breadcrumb">
              {repo.split('/').pop()?.trim()} <ChevronRight size={12} />{' '}
              {inside
                ? `${folder} · ${floor === floorCount ? 'Rooftop' : `Floor ${floor + 1}`}`
                : 'Street level'}{' '}
              {active && (
                <>
                  <ChevronRight size={12} />
                  {active.path.split('/').pop()}
                </>
              )}
            </div>
          </div>
          <div className="scene-actions">
            <button
              title="Travel through Git history"
              aria-label="Git history"
              onClick={() => void openHistory()}
            >
              <History size={17} />
            </button>
            <button
              title="Reset position"
              aria-label="Reset position"
              onClick={() => {
                setActive(null);
                setReset((r) => r + 1);
              }}
            >
              <RotateCcw size={17} />
            </button>
            <button
              title={muted ? 'Enable ambient audio' : 'Mute ambient audio'}
              aria-label="Toggle ambient audio"
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <button
              title="Full screen"
              aria-label="Full screen"
              onClick={() =>
                document.fullscreenElement
                  ? document.exitFullscreen()
                  : document.querySelector('.app-shell')?.requestFullscreen()
              }
            >
              <Maximize2 size={17} />
            </button>
          </div>
          {(inside || notice) && (
            <button
              className="back-to-street"
              onClick={() => {
                setInside(false);
                setActive(null);
                setReading(false);
              }}
            >
              <ArrowLeft size={14} />
              {inside ? 'Back to street' : notice}
            </button>
          )}
          {inside && !active && (
            <div className="elevator-panel">
              <span>
                <Building2 size={13} />
                {floor === floorCount
                  ? 'ROOFTOP OVERLOOK'
                  : `FLOOR ${floor + 1} / ${floorCount}`}
              </span>
              <p>
                {floor === floorCount
                  ? 'Enjoy the view. Take the stairs or lift back down.'
                  : 'Walk upstairs on the right, or take the lift.'}
              </p>
              <div>
                {Array.from({ length: floorCount + 1 }, (_, level) => (
                  <button
                    key={level}
                    className={level === floor ? 'current' : ''}
                    onClick={() => takeLift(level)}
                    title={
                      level === floorCount ? 'Rooftop' : `Floor ${level + 1}`
                    }
                  >
                    {level === floorCount ? 'R' : level + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="location-tag">
            <span className="location-number">
              {String(folders.indexOf(folder) + 1).padStart(2, '0')}
            </span>
            <div>
              <span className="eyebrow">
                {active
                  ? 'FILE ROOM'
                  : inside
                    ? 'FOLDER INTERIOR'
                    : 'REPOSITORY STREET'}
              </span>
              <strong>
                {active
                  ? active.path.split('/').pop()
                  : inside
                    ? `${portals.filter((p) => p.kind === 'file').length} rooms on this floor`
                    : `${folders.length} folder buildings`}
              </strong>
            </div>
            <span className="location-line" />
          </div>
          {active ? (
            <div className="room-prompt">
              <span className="prompt-icon">
                <FileCode2 size={20} />
              </span>
              <div>
                <strong>You’re inside {active.path.split('/').pop()}</strong>
                <p>
                  {sourceError ||
                    (near ? `E · ${near}` : '') ||
                    (needsSource
                      ? 'Loading source from GitHub…'
                      : `${active.lines} lines of code · Explore the room or open its source.`)}
                </p>
              </div>
              <button
                className="primary"
                disabled={needsSource && !sourceError}
                onClick={() => {
                  if (sourceError) {
                    setSourceError('');
                    setSourceAttempt((n) => n + 1);
                  } else {
                    setSymbol(null);
                    setReading(true);
                  }
                }}
              >
                {sourceError
                  ? 'Retry source'
                  : needsSource
                    ? 'Loading…'
                    : 'Read code'}{' '}
                <ChevronRight size={16} />
              </button>
              <button
                className="icon-btn"
                aria-label="Leave room"
                onClick={leave}
              >
                <ArrowLeft size={17} />
              </button>
            </div>
          ) : (
            <div className="entry-prompt">
              <span className="key">E</span>
              <span>
                {near ? (
                  <>
                    Enter <strong>{near}</strong>
                  </>
                ) : inside && floor === floorCount ? (
                  <>
                    Take the stairs or choose a floor to{' '}
                    <strong>continue exploring</strong>
                  </>
                ) : (
                  <>
                    Walk to a glowing door to{' '}
                    <strong>
                      {inside
                        ? 'explore a file room'
                        : 'enter a folder building'}
                    </strong>
                  </>
                )}
              </span>
            </div>
          )}
          {historyOpen && (
            <div className="history-panel">
              <div className="history-heading">
                <span>
                  <History size={15} /> TIME MACHINE
                </span>
                <button
                  aria-label="Close history"
                  onClick={() => setHistoryOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              {repo === 'repowalk / playground' ? (
                <p>
                  Import a public GitHub repository to walk through its real
                  commit history.
                </p>
              ) : (
                <>
                  <div className="commit-navigation">
                    <button
                      disabled={
                        historyBusy ||
                        !commits.length ||
                        commitIndex >= commits.length - 1
                      }
                      onClick={() =>
                        void travelToCommit(
                          Math.min(commits.length - 1, commitIndex + 1),
                        )
                      }
                    >
                      <ChevronLeft size={17} /> Older
                    </button>
                    <span>
                      {commitIndex < 0
                        ? 'Current branch'
                        : commits[commitIndex]?.sha.slice(0, 7)}
                    </span>
                    <button
                      disabled={historyBusy || commitIndex <= 0}
                      onClick={() => void travelToCommit(commitIndex - 1)}
                    >
                      Newer <ChevronRight size={17} />
                    </button>
                  </div>
                  <p className="commit-message">
                    {historyBusy
                      ? 'Reconstructing this moment…'
                      : commitIndex < 0
                        ? 'Choose a commit to see the city change.'
                        : commits[commitIndex]?.message}
                  </p>
                  {commitIndex >= 0 && (
                    <small>
                      {commits[commitIndex]?.author} ·{' '}
                      {new Date(commits[commitIndex].date).toLocaleDateString()}
                    </small>
                  )}
                  <div className="commit-ticks">
                    {commits.map((commit, index) => (
                      <button
                        key={commit.sha}
                        disabled={historyBusy}
                        className={index === commitIndex ? 'selected' : ''}
                        title={`${commit.sha.slice(0, 7)} · ${commit.message}`}
                        aria-label={`Travel to commit ${commit.sha.slice(0, 7)}: ${commit.message}`}
                        onClick={() => void travelToCommit(index)}
                      />
                    ))}
                  </div>
                  <div className="history-legend">
                    <span>
                      ●{' '}
                      {
                        Object.values(changes).filter((c) => c === 'added')
                          .length
                      }{' '}
                      added
                    </span>
                    <span>
                      ●{' '}
                      {
                        Object.values(changes).filter((c) => c === 'modified')
                          .length
                      }{' '}
                      modified
                    </span>
                    <span>
                      ●{' '}
                      {
                        Object.values(changes).filter((c) => c === 'removed')
                          .length
                      }{' '}
                      removed
                    </span>
                  </div>
                  <small>
                    Changes since the previously viewed snapshot · latest 20
                    commits
                  </small>
                  {historyError && (
                    <p className="error" role="alert">
                      {historyError}
                      <button
                        onClick={() =>
                          void (commits.length
                            ? travelToCommit(historyRetryIndex.current)
                            : openHistory())
                        }
                      >
                        {' '}
                        Retry
                      </button>
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          <div className={'minimap ' + (map ? 'expanded' : '')}>
            <button className="minimap-heading" onClick={() => setMap(!map)}>
              <span>
                <Map size={13} /> {inside ? 'FLOOR PLAN' : story.storyMode ? 'CITY MAP' : 'FOLDER BUILDINGS'}
              </span>
              <span>{map ? '−' : '+'}</span>
            </button>
            <div className="map-grid">
              {mapItems.map((f, i) => (
                <button
                  aria-label={'Enter ' + f.path}
                  key={f.path}
                  className={
                    'map-room ' +
                    (visited.includes(f.path) ? 'seen' : '') +
                    (active?.path === f.path ? ' here' : '')
                  }
                  onClick={() =>
                    f.kind === 'folder'
                      ? enterFolder(f.path)
                      : enter(files.find((file) => file.path === f.path)!)
                  }
                  style={{
                    left: inside
                      ? `${i % 2 ? 59 : 13}%`
                      : `${45 + ((districts[i]?.x || 0) / Math.max(1, ...districts.map((d) => Math.abs(d.x)))) * 35}%`,
                    top: inside
                      ? `${15 + Math.floor(i / 2) * 24}%`
                      : `${12 + (Math.abs(districts[i]?.z || 0) / Math.max(1, ...districts.map((d) => Math.abs(d.z)))) * 65}%`,
                    width: inside ? undefined : '14%',
                    height: inside ? undefined : '13%',
                  }}
                >
                  {map ? f.path.split('/').pop() : ''}
                </button>
              ))}
              <div className="map-street" />
              <span className="map-player" />
            </div>
            <div className="map-caption">
              <span className="live-dot" /> YOU ARE HERE <span>N ↑</span>
            </div>
          </div>
          <div className="game-bottom">
            <div>
              <span className="keys">
                <kbd>W</kbd>
                <span>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd>
                </span>
              </span>
              <span>Move</span>
              <span className="control-separator" />
              <span className="mouse-icon" /> <span>Drag to look</span>
              <span className="control-separator" />
              <kbd>Shift</kbd>
              <span>Run</span>
            </div>
            <button onClick={() => setHelp(true)}>
              <span className="question-mark">?</span> Field guide
            </button>
          </div>
          <div className="touch-controls">
            {['↑', '←', '↓', '→'].map((s, i) => (
              <button
                key={s}
                aria-label={'Move ' + s}
                onPointerDown={() =>
                  window.dispatchEvent(
                    new KeyboardEvent('keydown', {
                      key: ['w', 'a', 's', 'd'][i],
                    }),
                  )
                }
                onPointerUp={() =>
                  window.dispatchEvent(
                    new KeyboardEvent('keyup', {
                      key: ['w', 'a', 's', 'd'][i],
                    }),
                  )
                }
                onPointerLeave={() =>
                  window.dispatchEvent(
                    new KeyboardEvent('keyup', {
                      key: ['w', 'a', 's', 'd'][i],
                    }),
                  )
                }
              >
                {s}
              </button>
            ))}
            <button
              onClick={() =>
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))
              }
            >
              E
            </button>
          </div>
          {active && !reading && active.analysis && (
            <div className="symbol-panel">
              <span className="eyebrow">
                {active.analysis.mode === 'ast'
                  ? 'WALK THE SOURCE'
                  : 'SOURCE VIEW'}
              </span>
              {active.analysis.mode === 'ast' ? (
                <>
                  <p>
                    {active.analysis.constructs.length
                      ? 'Walk up to a station and press E to inspect it.'
                      : 'No functions or classes in this file. Open Read code to inspect its contents.'}
                  </p>
                  {active.analysis.constructs.map((c) => (
                    <button key={c.id} onClick={() => inspectSymbol(c)}>
                      <span>{c.kind === 'class' ? '◇' : 'ƒ'}</span>
                      {c.name}
                      <small>L{c.start}</small>
                    </button>
                  ))}
                </>
              ) : (
                <p>
                  {active.analysis.mode === 'unsupported'
                    ? 'Function architecture currently supports JavaScript and TypeScript. The full source remains available.'
                    : 'This file could not be parsed. You can still read its full source.'}
                </p>
              )}
            </div>
          )}
          {reading && active && (
            <div className="code-panel">
              <div className="code-heading">
                <span>
                  <FileCode2 size={17} />
                  {active.path}
                </span>
                <button
                  aria-label="Close code"
                  onClick={() => setReading(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="code-meta">
                {symbol
                  ? `${symbol.kind.toUpperCase()} · ${symbol.name}`
                  : 'SOURCE CODE'}{' '}
                <span>
                  {symbol
                    ? `Lines ${symbol.start}–${symbol.end}`
                    : `${active.lines} lines`}{' '}
                  · Read only
                </span>
              </div>
              <pre ref={codePane}>
                {active.code.split('\n').map((line, i) => (
                  <div
                    key={i}
                    data-line={i + 1}
                    className={
                      symbol && i + 1 >= symbol.start && i + 1 <= symbol.end
                        ? 'selected-source'
                        : ''
                    }
                  >
                    <span className="line-number">{i + 1}</span>
                    <code
                      className={
                        line.trim().startsWith('//') ||
                        line.trim().startsWith('*')
                          ? 'comment'
                          : /import|export|const |function |return /.test(line)
                            ? 'keyword'
                            : ''
                      }
                    >
                      {line || ' '}
                    </code>
                  </div>
                ))}
              </pre>
            </div>
          )}
        </section>
      </div>
      <footer className="statusbar">
        <span>
          <span className="live-dot" /> WORLD ONLINE{' '}
          <span className="footer-divider">/</span> {folders.length} blocks ·{' '}
          {files.length} rooms
        </span>
        <span>
          {story.storyMode ? 'Every lost thing has a story. Find yours.' : 'Every codebase has a story. Step inside.'} <Box size={12} />
        </span>
      </footer>
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="repo-dialog">
          <DialogTitle>Step into your repository.</DialogTitle>
          <DialogDescription>
            Paste a public GitHub repository URL. Folders become blocks, and
            source files become explorable rooms.
          </DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void loadRepo();
            }}
          >
            <label htmlFor="repo-url">GITHUB REPOSITORY</label>
            <div className="repo-input">
              <GitFork size={18} />
              <input
                id="repo-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                required
              />
            </div>
            <p className="dialog-note">
              Maps up to 5,000 source files from the default branch. Code loads
              when you enter a room. Private repositories aren’t supported.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button disabled={busy} className="primary" type="submit">
              {busy ? 'Building your district…' : 'Generate world'}
              <ArrowUpRight size={16} />
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="repo-dialog">
          <DialogTitle>Your field guide</DialogTitle>
          <DialogDescription>
            Architecture you can walk through.
          </DialogDescription>
          <div className="guide">
            <p>
              Climb the stairs at the right of each lobby. Flights alternate
              sides. Use the numbered lift buttons for a faster ride;{' '}
              <kbd>R</kbd> on the lift panel selects the rooftop.
            </p>
            <p>
              In JavaScript and TypeScript rooms, functions become workstations
              and classes become towers. Walk near one and press <kbd>E</kbd> to
              highlight its exact source lines.
            </p>
            <p>
              Open the clock icon to travel through the latest 20 Git commits.
              Green marks additions, purple marks edits, and red ghosts mark
              removals relative to the snapshot you previously viewed.
            </p>
            <p>
              <kbd>W A S D</kbd> or arrow keys to walk. Hold Shift to run.
            </p>
            <p>Drag the scene to orbit your camera. Scroll to zoom.</p>
            <p>
              <kbd>E</kbd> enters a folder building. Its hallway contains
              file-room doors and subfolder wings. Enter a file room, then
              choose Read code.
            </p>
            <p>
              Enter a folder building from the street or use the explorer
              shortcut. Select a file or a map room to enter directly.
            </p>
            <p>
              <kbd>Esc</kbd> leaves a room. Discovered rooms glow green on the
              map.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
