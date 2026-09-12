'use client';
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const INTERIOR_THEMES = [
  {
    name: 'CATHEDRAL ARCHIVE',
    floor: '#817d70',
    wall: '#c8c2ae',
    accent: '#ddba69',
  },
  {
    name: 'FUNCTION EXHIBITION',
    floor: '#8c8881',
    wall: '#d0c9b6',
    accent: '#c98258',
  },
  {
    name: 'KAHVILA · COFFEE & CODE',
    floor: '#977f64',
    wall: '#b7ac90',
    accent: '#e3c377',
  },
  {
    name: 'READING GALLERY',
    floor: '#8c7154',
    wall: '#a38b66',
    accent: '#d8ba7e',
  },
  {
    name: 'DEPARTURE HALL',
    floor: '#68726d',
    wall: '#a18c77',
    accent: '#9fccc2',
  },
  {
    name: 'DESIGN STUDIO',
    floor: '#68677b',
    wall: '#88839b',
    accent: '#bdabd5',
  },
];
function Piece({
  p,
  s,
  c,
  glow = 0,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
  glow?: number;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c}
        roughness={0.85}
        emissive={c}
        emissiveIntensity={glow}
      />
    </mesh>
  );
}
function Visitor({
  i,
  depth,
  paused,
  kind,
}: {
  i: number;
  depth: number;
  paused: boolean;
  kind: number;
}) {
  const group = useRef<THREE.Group>(null),
    time = useRef(i * 5);
  useFrame((_, dt) => {
    if (!group.current || paused) return;
    time.current += Math.min(dt, 0.05);
    const cycle = time.current % 24,
      moving = cycle < 16;
    const t = (Math.min(cycle, 16) / 16) * Math.PI * 2;
    group.current.position.set(
      (i % 2 ? 1 : -1) * (2 + Math.sin(t) * 0.35),
      moving ? Math.abs(Math.sin(time.current * 8)) * 0.035 : 0,
      1 - (0.5 + Math.cos(t) * 0.5) * Math.max(0, Math.min(depth - 5, 17)),
    );
    group.current.rotation.y = moving
      ? Math.sin(t) > 0
        ? 0
        : Math.PI
      : i % 2
        ? Math.PI / 2
        : -Math.PI / 2;
  });
  return (
    <group ref={group} scale={0.85}>
      <Piece
        p={[0, 0.93, 0]}
        s={[0.54, 0.7, 0.32]}
        c={['#a9805c', '#617f8a', '#878967', '#977a8b'][i]}
      />
      <Piece p={[0, 1.47, 0]} s={[0.35, 0.35, 0.33]} c="#ceb094" />
      {[-0.15, 0.15].map((x) => (
        <Piece key={x} p={[x, 0.29, 0]} s={[0.18, 0.58, 0.22]} c="#34444b" />
      ))}
      <Piece
        p={[0.29, 0.81, 0.23]}
        s={[0.25, 0.32, 0.09]}
        c={kind === 3 ? '#b2654e' : '#d6d0b9'}
      />
    </group>
  );
}
function CoffeeCorner({ paused }: { paused: boolean }) {
  const [served, setServed] = useState(false);
  const steam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (steam.current && !paused)
      steam.current.children.forEach((p, i) => {
        p.position.y = 1.15 + ((clock.elapsedTime * 0.35 + i * 0.22) % 0.85);
        p.position.x = Math.sin(clock.elapsedTime * 2 + i) * 0.06;
      });
  });
  return (
    <group position={[5, 0, 5]}>
      <Piece p={[0, 0.5, 0]} s={[2.7, 1, 0.8]} c="#795743" />
      <Piece p={[0, 1.04, 0]} s={[2.9, 0.12, 1]} c="#d6bb91" />
      <Piece p={[-0.8, 1.4, -0.1]} s={[0.6, 0.65, 0.5]} c="#bec9bd" />
      <Piece p={[-0.8, 1.42, 0.17]} s={[0.4, 0.2, 0.04]} c="#30494b" />
      <group
        position={[0.5, 0, 0.1]}
        onClick={(e) => {
          e.stopPropagation();
          setServed(!served);
        }}
      >
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.16, 0.12, 0.24, 16]} />
          <meshStandardMaterial color={served ? '#dda757' : '#f5e9d2'} />
        </mesh>
        <group ref={steam} visible={served}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#f5e7ce" transparent opacity={0.4} />
            </mesh>
          ))}
        </group>
      </group>
      {[-1, 1].map((x) => (
        <group key={x} position={[x, 0, 1.3]}>
          <Piece p={[0, 0.3, 0]} s={[0.08, 0.6, 0.08]} c="#394d47" />
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.12, 16]} />
            <meshStandardMaterial color="#c69869" />
          </mesh>
        </group>
      ))}
      <Piece p={[1.5, 0.3, -0.7]} s={[0.5, 0.6, 0.5]} c="#bb8162" />
      <mesh position={[1.5, 1, -0.7]}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#779565" />
      </mesh>
    </group>
  );
}
export function InteriorAtmosphere({
  kind,
  depth,
  room = false,
  paused = false,
}: {
  kind: number;
  depth: number;
  room?: boolean;
  paused?: boolean;
}) {
  const theme = INTERIOR_THEMES[kind],
    edge = room ? 9 : 6.3;
  return (
    <group>
      <CoffeeCorner paused={paused} />
      {[0, 1, 2, 3].map((i) => (
        <Visitor key={i} {...{ i, depth, paused, kind }} />
      ))}
      {[0, 1, 2]
        .filter((row) => 2 + row * 5.5 < depth - 1)
        .map((row) => (
          <group key={row} position={[0, 0, -2 - row * 5.5]}>
            {[-edge, edge].map((x) => (
              <group key={x} position={[x, 0, 0]}>
                {kind === 0 ? (
                  <>
                    <Piece p={[0, 2, 0]} s={[0.36, 4, 0.38]} c="#ded6bf" />
                    <Piece
                      p={[0, 2.5, 0.25]}
                      s={[0.24, 2.3, 0.08]}
                      c={['#799aa8', '#b491b3', '#cda862'][row]}
                      glow={0.5}
                    />
                    <Piece
                      p={[x > 0 ? -0.5 : 0.5, 0.45, 0]}
                      s={[1, 0.16, 1.8]}
                      c="#7a624a"
                    />
                  </>
                ) : kind === 1 ? (
                  <>
                    <Piece p={[0, 1.8, 0]} s={[0.18, 2.8, 2.5]} c="#a38354" />
                    <Piece
                      p={[x > 0 ? -0.11 : 0.11, 1.8, 0]}
                      s={[0.06, 2.45, 2.15]}
                      c={['#3c7279', '#c08962', '#867c9c'][row]}
                    />
                    <Piece
                      p={[x > 0 ? -0.15 : 0.15, 1.8, 0]}
                      s={[0.08, 0.8, 0.8]}
                      c="#ded3b0"
                    />
                  </>
                ) : kind === 3 ? (
                  <>
                    <Piece p={[0, 1.4, 0]} s={[0.8, 2.8, 3.2]} c="#68533d" />
                    {[0.5, 1.2, 1.9, 2.6].flatMap((y) =>
                      Array.from({ length: 8 }, (_, i) => (
                        <Piece
                          key={`${y}-${i}`}
                          p={[x > 0 ? -0.45 : 0.45, y, -1.25 + i * 0.34]}
                          s={[0.1, 0.48 + (i % 2) * 0.12, 0.22]}
                          c={
                            ['#b88557', '#718f85', '#b4ae87', '#8b7386'][i % 4]
                          }
                        />
                      )),
                    )}
                  </>
                ) : kind === 2 ? (
                  <>
                    <Piece p={[0, 0.65, 0]} s={[1, 1.3, 2.7]} c="#bf9864" />
                    <Piece
                      p={[0, 2.6, 0]}
                      s={[1.4, 0.14, 3]}
                      c={row % 2 ? '#9bbab3' : '#dbb16e'}
                    />
                    <Piece p={[0, 1.5, 0]} s={[0.75, 0.4, 1.8]} c="#749394" />
                  </>
                ) : kind === 4 ? (
                  <>
                    <Piece p={[0, 0.5, 0]} s={[0.9, 0.15, 3]} c="#947e60" />
                    <Piece p={[0, 2.7, 0]} s={[0.13, 0.7, 3]} c="#223d45" />
                    {[0, 1, 2].map((i) => (
                      <Piece
                        key={i}
                        p={[x > 0 ? -0.08 : 0.08, 2.5 + i * 0.18, 0]}
                        s={[0.03, 0.04, 2.5 - i * 0.4]}
                        c="#d5c18a"
                        glow={0.7}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <Piece p={[0, 0.9, 0]} s={[1, 0.12, 2.6]} c="#c4b298" />
                    <mesh position={[0, 1.6, 0]} rotation={[0.3, 0.4, 0.2]}>
                      <icosahedronGeometry args={[0.6, 0]} />
                      <meshStandardMaterial color="#bca5d0" metalness={0.35} />
                    </mesh>
                  </>
                )}
              </group>
            ))}
            <pointLight
              position={[0, 4, 0]}
              color={theme.accent}
              intensity={20}
              distance={12}
            />
          </group>
        ))}
    </group>
  );
}
