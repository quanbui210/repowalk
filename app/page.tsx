'use client';
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import Link from 'next/link';
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
const demo: RepoFile[] = paths.map((path) => ({
  path,
  code: sample(path.split('/').pop()!),
  lines: 31,
  todos: 1,
}));
export default function Home() {
  const [files, setFiles] = useState(demo),
    [repo, setRepo] = useState('repowalk / playground'),
    [branch, setBranch] = useState('main'),
    [folder, setFolder] = useState('src/components'),
    [inside, setInside] = useState(false),
    [sourceError, setSourceError] = useState(''),
    [sourceAttempt, setSourceAttempt] = useState(0),
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
  const portals = buildPortals(files, districts, folder);
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
        branch,
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
          previous.map((f) => (f.path === activePath ? loaded : f)),
        );
        setActive((current) =>
          current?.path === activePath ? loaded : current,
        );
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setSourceError((error as Error).message);
      });
    return () => controller.abort();
  }, [activePath, needsSource, repo, branch, sourceAttempt]);
  function enterFolder(path: string) {
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
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <Box size={22} />
          </span>
          repowalk<span className="alpha">ALPHA</span>
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
                inside={inside}
                onFolderEnter={enterFolder}
                folder={folder}
                active={active}
                onEnter={enter}
                onLeave={leave}
                onNear={setNear}
                reset={reset}
                paused={modal || help || reading}
                muted={muted}
              />
            </Suspense>
          </div>
          <div className="scene-vignette" />
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
              {inside ? folder : 'Street level'}{' '}
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
                    ? `${roomFiles.length} rooms · ${portals.length - roomFiles.length} wings`
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
                  } else setReading(true);
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
          <div className={'minimap ' + (map ? 'expanded' : '')}>
            <button className="minimap-heading" onClick={() => setMap(!map)}>
              <span>
                <Map size={13} /> {inside ? 'FLOOR PLAN' : 'FOLDER BUILDINGS'}
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
                    left: `${i % 2 ? 59 : 13}%`,
                    top: `${15 + Math.floor(i / 2) * 24}%`,
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
                SOURCE CODE <span>{active.lines} lines · Read only</span>
              </div>
              <pre>
                {active.code.split('\n').map((line, i) => (
                  <div key={i}>
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
          Every codebase has a story. Step inside. <Box size={12} />
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
