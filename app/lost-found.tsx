'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  BookOpen,
  Check,
  Coffee,
  Compass,
  KeyRound,
  PawPrint,
  Sparkles,
  X,
  ArrowRight,
} from 'lucide-react';
import { CASE_STEPS, advanceCase } from '@/lib/lost-found';

const STORAGE = 'little-helsinki:case-one:v1';
type Story = {
  missionOpen: boolean;
  setMissionOpen: (open: boolean) => void;
  bells: boolean;
  restoreBells: () => void;
  walkTo: (target: [number, number] | null) => void;
  walkTarget: RefObject<[number, number] | null>;
  step: number;
  ready: boolean;
  dialog: number | null;
  open: (station: number) => void;
  close: () => void;
  complete: () => void;
  restart: () => void;
  journal: boolean;
  setJournal: (v: boolean) => void;
  storyMode: boolean;
  setStoryMode: (v: boolean) => void;
};
const Context = createContext<Story | null>(null);
export const useStory = () => useContext(Context)!;
export function StoryProvider({ children }: { children: ReactNode }) {
  const [missionOpen, setMissionOpen] = useState(false),
    [bells, setBells] = useState(false);
  const walkTarget = useRef<[number, number] | null>(null);
  const [step, setStep] = useState(0),
    [ready, setReady] = useState(false),
    [dialog, setDialog] = useState<number | null>(null),
    [journal, setJournal] = useState(false),
    [storyMode, setStoryMode] = useState(true);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = Number(localStorage.getItem(STORAGE));
        setBells(localStorage.getItem(STORAGE + ':bells') === 'true');
        if (Number.isInteger(saved) && saved >= 0 && saved <= 4) setStep(saved);
      } catch {
        /* Play still works without storage. */
      }
      setReady(true);
    });
  }, []);
  function save(next: number) {
    setStep(next);
    try {
      localStorage.setItem(STORAGE, String(next));
    } catch {
      /* Session-only progress. */
    }
  }
  return (
    <Context.Provider
      value={{
        missionOpen,
        setMissionOpen,
        bells,
        restoreBells: () => {
          setBells(true);
          try {
            localStorage.setItem(STORAGE + ':bells', 'true');
          } catch {}
        },
        walkTo: (target) => {
          walkTarget.current = target;
        },
        walkTarget,
        step,
        ready,
        dialog,
        open: setDialog,
        close: () => setDialog(null),
        complete: () => {
          if (dialog !== null) save(advanceCase(step, dialog));
          setDialog(null);
        },
        restart: () => {
          save(0);
          setDialog(null);
        },
        journal,
        setJournal,
        storyMode,
        setStoryMode,
      }}
    >
      {children}
    </Context.Provider>
  );
}
const conversations = [
  {
    who: 'Aino',
    role: 'MUSEUM CURATOR',
    initial: 'A',
    text: 'My sketchbook has disappeared. It holds drawings of all the little things people overlook in this city. I left the museum, stopped for coffee… and then it was gone.',
    detail:
      'Mika remembers everyone who visits his coffee cart. Perhaps he saw something?',
    action: 'I’ll find your sketchbook',
    reward: 'A new case in your journal',
  },
  {
    who: 'Mika',
    role: 'COFFEE & GOOD ADVICE',
    initial: 'M',
    text: 'Aino? Oat latte, extra cinnamon. Yes! She left a blue book on that bench. Then a very determined dachshund trotted off with it. Short legs. Big ambitions.',
    detail:
      'Try the dog park across the street. His name is Toffee. Take this cinnamon biscuit—his human says one is plenty.',
    action: 'Take the biscuit',
    reward: 'Cinnamon biscuit added to your pocket',
  },
  {
    who: 'Toffee',
    role: 'LOCAL BOOK COLLECTOR',
    initial: 'T',
    text: 'Toffee sits on a blue sketchbook as if he owns the entire museum. One ear lifts. He has noticed the biscuit. Negotiations can begin.',
    detail:
      'You offer the biscuit. He gently nudges the book toward you. Inside is a beautiful drawing of this very square… with a tiny dog in the corner.',
    action: 'Trade biscuit for sketchbook',
    reward: 'Aino’s sketchbook recovered',
  },
  {
    who: 'Aino',
    role: 'A VERY HAPPY CURATOR',
    initial: 'A',
    text: 'You found it! Look—this is the first drawing I made when I moved here. I thought I was drawing buildings. Really, I was drawing the people who made this place feel like home.',
    detail:
      'Help me put these drawings on display. And take this brass key. It belongs to the old observatory. There is a story behind that door… for another day.',
    action: 'Open the little exhibition',
    reward: 'Exhibition restored · Observatory key earned',
  },
];
export function StoryUI({ inside }: { inside: boolean }) {
  const s = useStory();
  const modalRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (s.dialog !== null || s.journal) modalRef.current?.showModal();
  }, [s.dialog, s.journal]);
  const current = CASE_STEPS[s.step];
  const expected = [0, 1, 2, 0][s.step];
  const correct = s.dialog === expected;
  const conversation = conversations[s.step < 4 ? s.step : 3];
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        s.close();
        s.setJournal(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [s]);
  if (!s.storyMode)
    return (
      <button className="story-return" onClick={() => s.setStoryMode(true)}>
        <Compass size={16} /> Return to the story
      </button>
    );
  return (
    <>
      <div className="case-card">
        <div className="case-eyebrow">
          <span className="case-dot" /> LITTLE HELSINKI <span>01 / 01</span>
        </div>
        <h1>
          {s.step === 4 ? 'A little kindness.' : 'The missing\nsketchbook.'}
        </h1>
        <p>
          {s.step === 4
            ? 'A small favor. A new friend. A city that remembers.'
            : 'Every lost thing has a story.'}
        </p>
        <div className="case-rule" />
        <div className="case-objective">
          <span>
            {s.step === 4 ? <Check size={17} /> : <Compass size={17} />}
          </span>
          <div>
            <small>
              {s.step === 4
                ? 'CASE COMPLETE'
                : `CHAPTER 01 · ${s.step + 1} OF 4`}
            </small>
            <strong>{current.objective}</strong>
          </div>
        </div>
        {inside && s.step < 4 && (
          <p className="case-reminder">
            Your next lead is outside. Use Back to street.
          </p>
        )}
        <button className="journal-button" onClick={() => s.setJournal(true)}>
          <BookOpen size={16} /> Journal & pocket{' '}
          <span>{s.step ? '•' : '+'}</span>
        </button>
      </div>
      {!inside && (
        <div className="story-hint">
          <span>F</span> Click a resident to walk over · F to talk
        </div>
      )}
      <button
        className="story-world-toggle"
        onClick={() => s.setStoryMode(false)}
      >
        Explore the code behind the city <ArrowRight size={13} />
      </button>
      {(s.dialog !== null || s.journal) && (
        <div className="story-scrim">
          <dialog
            ref={modalRef}
            className="story-paper"
            aria-label={s.journal ? 'Case journal' : 'Resident conversation'}
            onCancel={() => {
              s.close();
              s.setJournal(false);
            }}
          >
            <button
              autoFocus
              className="paper-close"
              aria-label="Close"
              onClick={() => {
                s.close();
                s.setJournal(false);
              }}
            >
              <X size={20} />
            </button>
            {s.journal ? (
              <>
                <div className="paper-kicker">
                  THE KEEPER’S JOURNAL · VOL. 01
                </div>
                <h2>
                  Small things.
                  <br />
                  Wonderful stories.
                </h2>
                <p>
                  A sketchbook, a coffee cart, and a dog with excellent taste in
                  art.
                </p>
                <div className="journal-steps">
                  {CASE_STEPS.slice(0, 4).map((v, i) => (
                    <div
                      key={v.title}
                      className={
                        i < s.step ? 'done' : i === s.step ? 'now' : ''
                      }
                    >
                      <span>
                        {i < s.step ? <Check size={15} /> : `0${i + 1}`}
                      </span>
                      <div>
                        <strong>{v.title}</strong>
                        <small>
                          {i <= s.step
                            ? v.objective
                            : 'Follow the next clue to discover more.'}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pocket">
                  <small>IN YOUR POCKET</small>
                  <div>
                    {s.step === 0 ? (
                      <span>A little curiosity</span>
                    ) : s.step === 1 ? (
                      <>
                        <BookOpen size={20} /> Aino’s description
                      </>
                    ) : s.step === 2 ? (
                      <>
                        <Coffee size={20} /> Cinnamon biscuit
                      </>
                    ) : s.step === 3 ? (
                      <>
                        <BookOpen size={20} /> The blue sketchbook
                      </>
                    ) : (
                      <>
                        <KeyRound size={20} /> Brass observatory key
                      </>
                    )}
                  </div>
                  {s.step === 4 && (
                    <p>
                      A keepsake for a future chapter. The observatory story is
                      still to come.
                    </p>
                  )}
                </div>
                {s.step === 4 && (
                  <button
                    className="paper-action"
                    onClick={() => {
                      s.restart();
                      s.setJournal(false);
                    }}
                  >
                    Play this chapter again <ArrowRight size={17} />
                  </button>
                )}
              </>
            ) : correct ? (
              <>
                <div className="resident-portrait">
                  {s.dialog === 2 ? (
                    <PawPrint size={32} />
                  ) : (
                    conversation.initial
                  )}
                </div>
                <div className="paper-kicker">{conversation.role}</div>
                <h2>{conversation.who}</h2>
                <p className="dialogue-text">“{conversation.text}”</p>
                <p>{conversation.detail}</p>
                <div className="story-reward">
                  <Sparkles size={16} />
                  {conversation.reward}
                </div>
                <button className="paper-action" onClick={s.complete}>
                  {conversation.action}
                  <ArrowRight size={17} />
                </button>
              </>
            ) : (
              <>
                <div className="paper-kicker">A MOMENT IN THE SQUARE</div>
                <h2>
                  {s.dialog === 2
                    ? 'A friendly little face.'
                    : s.dialog === 1
                      ? 'Coffee is always a good idea.'
                      : 'Welcome, neighbor.'}
                </h2>
                <p>
                  {s.step === 4
                    ? 'The drawings are back on display. Aino waves, Mika saves you a seat, and Toffee is already hoping for another biscuit. Take your time. The city is yours to explore.'
                    : s.dialog === 2
                      ? 'Toffee wags his tail. Someone at the coffee cart might know more about his adventures.'
                      : s.dialog === 1
                        ? 'Mika smiles. “Aino is waiting at the Lost & Found kiosk. She could use a little help.”'
                        : '“Any luck?” Aino asks. Your journal has the next lead.'}
                </p>
                <button className="paper-action" onClick={s.close}>
                  See you around <ArrowRight size={17} />
                </button>
              </>
            )}
          </dialog>
        </div>
      )}
    </>
  );
}
function Cuboid({
  p,
  size,
  color,
}: {
  p: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}
function Resident({ color }: { color: string }) {
  return (
    <group>
      <Cuboid p={[0, 0.85, 0]} size={[0.5, 0.75, 0.35]} color={color} />
      <Cuboid p={[0, 1.48, 0]} size={[0.38, 0.43, 0.36]} color="#e4bd9b" />
      <Cuboid p={[0, 1.73, 0]} size={[0.43, 0.12, 0.4]} color="#433c36" />
      {[-0.14, 0.14].map((x) => (
        <Cuboid
          key={x}
          p={[x, 0.28, 0]}
          size={[0.17, 0.5, 0.22]}
          color="#293e45"
        />
      ))}
    </group>
  );
}
export function StoryStations({
  player,
  visible,
  paused,
}: {
  player: RefObject<THREE.Group | null>;
  visible: boolean;
  paused: boolean;
}) {
  const s = useStory(),
    [near, setNear] = useState(-1);
  const nearRef = useRef(-1),
    dog = useRef<THREE.Group>(null);
  const positions = [
    [-5, 12],
    [-8, 18],
    [8, 16],
  ];
  useFrame(({ clock }) => {
    if (dog.current)
      dog.current.rotation.y = Math.sin(clock.elapsedTime * 1.4) * 0.2;
    let next = -1;
    if (visible && player.current)
      positions.forEach(([x, z], i) => {
        if (
          Math.hypot(
            player.current!.position.x - x,
            player.current!.position.z - z,
          ) < 3.2
        )
          next = i;
      });
    if (next !== nearRef.current) {
      nearRef.current = next;
      setNear(next);
    }
  });
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const keyName = typeof e.key === 'string' ? e.key.toLowerCase() : '';
      if (
        keyName === 'f' &&
        !e.repeat &&
        !paused &&
        visible &&
        nearRef.current >= 0 &&
        !(e.target instanceof HTMLInputElement)
      ) {
        e.preventDefault();
        s.open(nearRef.current);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [paused, visible, s]);
  if (!visible || !s.storyMode) return null;
  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.055, 0]}>
            <ringGeometry args={[1, 1.09, 48]} />
            <meshBasicMaterial
              color={i === [0, 1, 2, 0][s.step] ? '#ffd19a' : '#9dc7bb'}
              transparent
              opacity={0.8}
              depthWrite={false}
            />
          </mesh>
          {i < 2 ? (
            <>
              <group position={[0, 0, -0.7]}>
                <Resident color={i === 0 ? '#cc886d' : '#9bbaa8'} />
              </group>
              <Cuboid
                p={[0, 0.5, 0.2]}
                size={[1.8, 0.95, 0.8]}
                color={i === 0 ? '#3f7774' : '#c1845e'}
              />
              <Cuboid p={[0, 1.02, 0.2]} size={[2, 0.12, 1]} color="#eee0bf" />
              {[-0.9, 0.9].map((xx) => (
                <Cuboid
                  key={xx}
                  p={[xx, 1.7, -0.1]}
                  size={[0.07, 1.5, 0.07]}
                  color="#e6d5b6"
                />
              ))}
              <Cuboid
                p={[0, 2.45, 0]}
                size={[2.25, 0.16, 1.4]}
                color={i === 0 ? '#d3ae73' : '#e5b1a0'}
              />
              {i === 1 && (
                <>
                  <Cuboid
                    p={[-0.45, 1.24, 0.1]}
                    size={[0.5, 0.4, 0.4]}
                    color="#344c51"
                  />
                  <mesh position={[0.45, 1.18, 0.25]}>
                    <cylinderGeometry args={[0.12, 0.1, 0.23, 12]} />
                    <meshStandardMaterial color="#fff0d4" />
                  </mesh>
                </>
              )}
            </>
          ) : (
            <group ref={dog}>
              <Cuboid
                p={[0, 0.42, 0]}
                size={[1.05, 0.32, 0.35]}
                color="#9e6037"
              />
              <Cuboid
                p={[0.57, 0.61, 0]}
                size={[0.35, 0.38, 0.32]}
                color="#a96940"
              />
              <Cuboid
                p={[0.78, 0.52, 0]}
                size={[0.25, 0.17, 0.25]}
                color="#5b3529"
              />
              {[-0.2, 0.2].map((zz) => (
                <Cuboid
                  key={zz}
                  p={[0.5, 0.44, zz]}
                  size={[0.18, 0.4, 0.09]}
                  color="#573726"
                />
              ))}
              {[-0.38, 0.37].flatMap((xx) =>
                [-0.12, 0.12].map((zz) => (
                  <Cuboid
                    key={`${xx}${zz}`}
                    p={[xx, 0.17, zz]}
                    size={[0.12, 0.28, 0.12]}
                    color="#673d2a"
                  />
                )),
              )}
              {s.step < 3 && (
                <Cuboid
                  p={[0, 0.1, 0.6]}
                  size={[0.65, 0.08, 0.45]}
                  color="#588eaf"
                />
              )}
            </group>
          )}
          <Html
            position={[0, i === 2 ? 1.6 : 3.05, 0]}
            center
            zIndexRange={[30, 0]}
          >
            <button
              className={'resident-label ' + (near === i ? 'is-near' : '')}
              onClick={() => {
                if (!paused) {
                  if (near === i) s.open(i);
                  else s.walkTo([x, z + 1.6]);
                }
              }}
            >
              <small>{['LOST & FOUND', 'KAHVILA', 'DOG PARK'][i]}</small>
              <strong>
                {['Aino', 'Mika', 'Toffee'][i]}{' '}
                {i === [0, 1, 2, 0][s.step] ? '✦' : ''}
              </strong>
              <span>{near === i ? 'F · Talk' : 'Click to walk'}</span>
            </button>
          </Html>
        </group>
      ))}
      {s.step === 4 && (
        <group position={[-8, 0, 12]}>
          {[0, 1, 2].map((i) => (
            <group key={i} position={[-i * 1.4, 0, 0]}>
              <Cuboid
                p={[0, 0.75, 0]}
                size={[0.08, 1.5, 0.1]}
                color="#6b5c44"
              />
              <Cuboid
                p={[0, 1.6, 0]}
                size={[1.15, 1.25, 0.12]}
                color="#f2dfba"
              />
              <Cuboid
                p={[0, 1.6, 0.08]}
                size={[0.9, 1, 0.03]}
                color={['#719999', '#cda276', '#91a682'][i]}
              />
              <Cuboid
                p={[0, 1.6, 0.12]}
                size={[0.45, 0.55, 0.04]}
                color="#eee4cc"
              />
              <mesh position={[0, 2.04, 0.12]}>
                <sphereGeometry
                  args={[0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]}
                />
                <meshStandardMaterial color="#47716b" />
              </mesh>
            </group>
          ))}
          <Html position={[-1.4, 2.9, 0]} center>
            <div className="exhibition-label">
              SMALL THINGS, BIG CITY
              <br />
              <small>Aino’s open-air exhibition · Restored by you</small>
            </div>
          </Html>
          <pointLight
            position={[-1, 3, 2]}
            color="#ffd79c"
            intensity={12}
            distance={10}
          />
        </group>
      )}
    </group>
  );
}
