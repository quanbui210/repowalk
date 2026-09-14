'use client';
import { useEffect, useRef, useState } from 'react';
import { Bell, Check, ArrowRight, X, ScanSearch } from 'lucide-react';
import { useStory } from './lost-found';
import type { RepoFile } from './page';

export function BuildingMission({
  kind,
  files,
  onEnter,
  muted,
}: {
  kind: number;
  files: RepoFile[];
  onEnter: (file: RepoFile) => void;
  muted: boolean;
}) {
  const story = useStory(),
    modal = useRef<HTMLDialogElement>(null);
  const [sequence, setSequence] = useState<string[]>([]),
    [feedback, setFeedback] = useState(''),
    [phase, setPhase] = useState(0),
    [solvedFile, setSolvedFile] = useState<RepoFile | null>(null);
  const audio = useRef<AudioContext | null>(null);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (story.missionOpen) modal.current?.showModal();
  }, [story.missionOpen]);
  const candidates = files
    .flatMap((file) =>
      (file.analysis?.constructs || [])
        .filter((c) => c.kind === 'function')
        .map((c) => ({ file, c })),
    )
    .sort(
      (a, b) => b.c.lines - a.c.lines || a.file.path.localeCompare(b.file.path),
    );
  const choices = candidates
    .filter((v, i, all) => all.findIndex((w) => w.c.name === v.c.name) === i)
    .slice(0, 3)
    .reverse();
  const largest = Math.max(0, ...choices.map((v) => v.c.lines));
  function playBells() {
    if (muted) return;
    const ctx = audio.current || new AudioContext();
    audio.current = ctx;
    void ctx.resume();
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        start = ctx.currentTime + i * 0.35;
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.13, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 2);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 2.1);
    });
  }
  function selectNote(note: string) {
    const next = [...sequence, note];
    if (note !== ['C', 'E', 'G'][sequence.length]) {
      setSequence([]);
      setFeedback(
        'Listen to the score: C comes first, followed by E, then G. Try again.',
      );
      return;
    }
    setSequence(next);
    setFeedback('');
    if (next.length === 3) setPhase(1);
  }
  if (kind !== 0 && kind !== 1) return null;
  return (
    <>
      <button
        className="building-mission"
        onClick={() => story.setMissionOpen(true)}
      >
        {kind === 0 ? <Bell size={20} /> : <ScanSearch size={20} />}
        <span>
          <small>
            {kind === 0 ? 'CATHEDRAL WORKSHOP' : 'CURATOR’S CHALLENGE'}
          </small>
          <strong>
            {kind === 0
              ? story.bells
                ? 'The bells are singing'
                : 'Restore the silent bells'
              : 'Find the hidden masterpiece'}
          </strong>
        </span>
        <ArrowRight size={16} />
      </button>
      {story.missionOpen && (
        <dialog
          ref={modal}
          className="story-paper mission-paper"
          onCancel={() => story.setMissionOpen(false)}
          aria-label="Building mission"
        >
          <button
            autoFocus
            className="paper-close"
            aria-label="Close mission"
            onClick={() => story.setMissionOpen(false)}
          >
            <X size={20} />
          </button>
          <div className="paper-kicker">
            {kind === 0
              ? 'THE SILENT BELLS · A CITY CODE PUZZLE'
              : 'FUNCTION EXHIBITION · YOUR REPOSITORY'}
          </div>
          {kind === 0 ? (
            <>
              <h2>
                {story.bells
                  ? 'Let the city sing.'
                  : phase === 0
                    ? 'A melody, misplaced.'
                    : 'One bell too many.'}
              </h2>
              {story.bells ? (
                <>
                  <p>
                    You restored the melody and repaired the bell controller.
                    The organ glows, the candles are lit, and the square has its
                    voice again.
                  </p>
                  <div className="story-reward">
                    <Check size={17} /> Cathedral restored · Keeper of the bells
                  </div>
                  <button
                    className="paper-action"
                    disabled={muted}
                    onClick={playBells}
                  >
                    {muted
                      ? 'Enable audio in the city toolbar to hear the bells'
                      : 'Ring the bells again'}
                    <Bell size={17} />
                  </button>
                </>
              ) : phase === 0 ? (
                <>
                  <p>
                    The organist found three loose notes. Rebuild the opening
                    chord in the order written on the score.
                  </p>
                  <div className="music-score">
                    C <span>→</span> E <span>→</span> G
                  </div>
                  <div className="note-keys">
                    {['G', 'C', 'E'].map((note) => (
                      <button key={note} onClick={() => selectNote(note)}>
                        {note}
                        <small>
                          {sequence.includes(note) ? 'PLACED' : 'PLAY NOTE'}
                        </small>
                      </button>
                    ))}
                  </div>
                  <p aria-live="polite">
                    {feedback || `${sequence.length} / 3 notes restored`}
                  </p>
                </>
              ) : (
                <>
                  <p>
                    The tune is right, but the controller tries to play a fourth
                    note that does not exist. Which change fixes it?
                  </p>
                  <pre className="mission-code">
                    {
                      'const notes = ["C", "E", "G"];\nfor (let i = 0; i <= notes.length; i++) {\n  ring(notes[i]);\n}'
                    }
                  </pre>
                  <div className="code-choices">
                    {[
                      'i < notes.length',
                      'i > notes.length',
                      'i <= notes.length + 1',
                    ].map((answer) => (
                      <button
                        key={answer}
                        onClick={() => {
                          if (answer === 'i < notes.length') {
                            story.restoreBells();
                            setFeedback('');
                            playBells();
                          } else
                            setFeedback(
                              'That condition skips the melody or reaches outside the array. Valid indexes are 0, 1, and 2.',
                            );
                        }}
                      >
                        {answer}
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                  <p aria-live="polite">
                    {feedback ||
                      'Workshop example: this puzzle does not modify your repository.'}
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <h2>
                {solvedFile
                  ? 'A masterpiece found.'
                  : 'Read the shape of code.'}
              </h2>
              <p>
                The curator is looking for the largest function in this
                selection. Compare the line counts collected from available
                source files.
              </p>
              {choices.length ? (
                <div className="code-choices">
                  {choices.map(({ file, c }) => (
                    <button
                      key={file.path + c.id}
                      onClick={() => {
                        if (c.lines === largest) {
                          setSolvedFile(file);
                          setFeedback(
                            'Exactly. Size is a clue for exploration, not a judgment of quality. Step into its room to read the actual source.',
                          );
                        } else
                          setFeedback(
                            'Look for the largest line count among these exhibits.',
                          );
                      }}
                    >
                      <span>
                        {c.name}
                        <small>{file.path}</small>
                      </span>
                      <strong>{c.lines} lines</strong>
                    </button>
                  ))}
                </div>
              ) : (
                <p>
                  Enter a file room to load its source, then return here. The
                  curator needs parsed functions to build your challenge.
                </p>
              )}
              <p aria-live="polite">{feedback}</p>
              {solvedFile && (
                <button
                  className="paper-action"
                  onClick={() => {
                    story.setMissionOpen(false);
                    onEnter(solvedFile);
                  }}
                >
                  Enter this source room
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          )}
        </dialog>
      )}
    </>
  );
}
