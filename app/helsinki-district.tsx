'use client';

import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Birch } from './city-life';

function Box({
  p,
  s,
  c = '#e5e1d3',
  glow = 0,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c?: string;
  glow?: number;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c}
        roughness={0.75}
        emissive={c}
        emissiveIntensity={glow}
      />
    </mesh>
  );
}

function Dome({
  x = 0,
  y,
  z = 0,
  radius = 1.4,
}: {
  x?: number;
  y: number;
  z?: number;
  radius?: number;
}) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.82, radius * 0.82, 0.9, 16]} />
        <meshStandardMaterial color="#ece9df" />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <sphereGeometry
          args={[radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial
          color="#497d73"
          roughness={0.55}
          metalness={0.3}
        />
      </mesh>
      <Box p={[0, radius + 1.16, 0]} s={[0.07, 0.7, 0.07]} c="#d9bf78" />
      <Box p={[0, radius + 1.29, 0]} s={[0.4, 0.065, 0.07]} c="#d9bf78" />
    </group>
  );
}

function Pediment({ y, c = '#ede9dc' }: { y: number; c?: string }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-3.4, 0);
    s.lineTo(3.4, 0);
    s.lineTo(0, 1.7);
    s.closePath();
    return s;
  }, []);
  return (
    <mesh position={[0, y, 2.75]} castShadow>
      <extrudeGeometry args={[shape, { depth: 0.55, bevelEnabled: false }]} />
      <meshStandardMaterial color={c} />
    </mesh>
  );
}

export const LANDMARK_NAMES = [
  'CATHEDRAL',
  'ART MUSEUM',
  'MARKET HALL',
  'CITY LIBRARY',
  'CENTRAL STATION',
  'DESIGN QUARTER',
];

// Each silhouette fits the existing footprint, so repository navigation and collision bounds stay aligned.
export function LandmarkShell({
  kind,
  h,
  children,
}: {
  kind: number;
  h: number;
  children: ReactNode;
}) {
  const rows = Math.max(1, Math.floor((h - 4.8) / 2));
  return (
    <group>
      <Box p={[0, 0.12, -0.4]} s={[8, 0.24, 7.5]} c="#88918d" />
      {kind === 0 && (
        <>
          <Box p={[0, h / 2, -0.8]} s={[6.8, h, 6.2]} />
          <Box p={[0, h * 0.36, -0.4]} s={[7.6, h * 0.72, 3]} />
          <Box p={[0, h - 0.15, -0.8]} s={[7.2, 0.3, 6.6]} />
          <Dome y={h} z={-0.8} radius={1.6} />
          {[-2.5, 2.5].flatMap((x) =>
            [-2.8, 1].map((z) => (
              <Dome key={`${x}-${z}`} x={x} y={h - 0.15} z={z} radius={0.55} />
            )),
          )}
          {[0, 1, 2, 3].map((step) => (
            <Box
              key={`stair-${step}`}
              p={[0, 0.045 + step * 0.035, 4.5 - step * 0.28]}
              s={[7.6 - step * 0.25, 0.09 + step * 0.07, 0.32]}
              c="#cecabc"
            />
          ))}
          {[-2.9, -2.1, -1.3, 1.3, 2.1, 2.9].map((x) => (
            <group key={x}>
              <mesh position={[x, h * 0.37, 2.5]} castShadow>
                <cylinderGeometry args={[0.19, 0.25, h * 0.69, 12]} />
                <meshStandardMaterial color="#faf5e8" />
              </mesh>
              <Box p={[x, 0.35, 2.5]} s={[0.6, 0.35, 0.6]} />
              <Box p={[x, h * 0.72, 2.5]} s={[0.58, 0.23, 0.58]} />
            </group>
          ))}
          <Pediment y={h * 0.74} />
          {[-1, 1].flatMap((side) =>
            [-2.7, -0.8, 1].map((z) => (
              <group
                key={`${side}-${z}`}
                position={[side * 3.42, 2.8, z]}
                rotation={[0, (side * Math.PI) / 2, 0]}
              >
                <Box p={[0, 0, 0]} s={[0.78, 2, 0.09]} c="#677c79" />
                <mesh position={[0, 1, 0.02]}>
                  <circleGeometry args={[0.39, 20, 0, Math.PI]} />
                  <meshStandardMaterial color="#677c79" />
                </mesh>
                <Box p={[0, 0, 0.07]} s={[0.065, 2.1, 0.04]} c="#f6f0de" />
                <Box p={[0, 0.35, 0.07]} s={[0.78, 0.065, 0.04]} c="#f6f0de" />
              </group>
            )),
          )}
        </>
      )}
      {kind === 1 && (
        <>
          <Box p={[0, h / 2, -0.65]} s={[7.6, h, 6.8]} c="#b68b6d" />
          <Box p={[0, h + 0.08, -0.65]} s={[8, 0.3, 7.2]} c="#ead9b7" />
          {[-3.4, -1.45, 1.45, 3.4].map((x) => (
            <Box key={x} p={[x, h / 2, 2.86]} s={[0.32, h, 0.28]} c="#e2c9a3" />
          ))}
          <Pediment y={h} c="#ddc39a" />
          {[-2.5, 2.5].map((x) => (
            <group key={x}>
              <Box
                p={[x, h * 0.53, 3.04]}
                s={[1.25, h * 0.5, 0.09]}
                c={x < 0 ? '#34646b' : '#b25e48'}
              />
              <mesh position={[x, h * 0.62, 3.12]}>
                <torusGeometry args={[0.36, 0.07, 8, 24]} />
                <meshStandardMaterial color="#ecd5a3" />
              </mesh>
            </group>
          ))}
        </>
      )}
      {kind === 2 && (
        <>
          <Box p={[0, h / 2, -0.65]} s={[7.6, h, 6.8]} c="#365d65" />
          {Array.from({ length: rows + 1 }, (_, row) =>
            [-3, -1.5, 0, 1.5, 3].map((x) => (
              <Box
                key={`${row}-${x}`}
                p={[x, 1.25 + row * 1.65, 2.8]}
                s={[1.35, 1.42, 0.08]}
                c={(row + x) % 2 ? '#76a8b1' : '#a4c4c2'}
              />
            )),
          )}
          {[-3.75, -2.25, -0.75, 0.75, 2.25, 3.75].map((x) => (
            <Box key={x} p={[x, h / 2, 2.94]} s={[0.08, h, 0.13]} c="#dddfce" />
          ))}
          <Box p={[0, h + 0.05, -0.65]} s={[8, 0.2, 7.2]} c="#d5e1d5" />
          <group rotation={[-0.12, 0, 0]} position={[0, 4.85, 3.2]}>
            <Box p={[0, 0, 0]} s={[7.7, 0.13, 1.4]} c="#d7b967" />
          </group>
        </>
      )}
      {kind === 3 && (
        <>
          <Box p={[0, 1.95, -0.65]} s={[7.6, 3.9, 6.8]} c="#477280" />
          <Box
            p={[0, (h + 3.9) / 2, -0.65]}
            s={[7.6, Math.max(0.2, h - 3.9), 6.8]}
            c="#b88f59"
          />
          {Array.from({ length: 20 }, (_, n) => (
            <Box
              key={n}
              p={[-3.7 + n * 0.39, (h + 3.9) / 2, 2.86]}
              s={[0.12, Math.max(0.2, h - 3.9), 0.19]}
              c={n % 2 ? '#d9b981' : '#c6a36b'}
            />
          ))}
          <group rotation={[0, 0, -0.08]} position={[0, h + 0.15, -0.65]}>
            <Box p={[0, 0, 0]} s={[8, 0.3, 7.2]} c="#e8e4d4" />
          </group>
          {[-2.8, -1.5, 1.5, 2.8].map((x) => (
            <Box key={x} p={[x, 1.8, 2.84]} s={[0.08, 3.6, 0.16]} c="#d6e0d3" />
          ))}
        </>
      )}
      {kind === 4 && (
        <>
          <Box p={[0, h * 0.36, -0.65]} s={[7.6, h * 0.72, 6.8]} c="#a48472" />
          <Box
            p={[-2.65, h * 0.57, -1.2]}
            s={[1.7, h * 1.14, 1.9]}
            c="#a48472"
          />
          <Box
            p={[-2.65, h * 1.14 + 0.2, -1.2]}
            s={[2, 0.35, 2.2]}
            c="#4d7169"
          />
          <mesh position={[-2.65, h * 0.93, -0.22]}>
            <circleGeometry args={[0.57, 32]} />
            <meshStandardMaterial
              color="#eee0b9"
              emissive="#eee0b9"
              emissiveIntensity={0.3}
            />
          </mesh>
          <Box
            p={[-2.65, h * 0.93 + 0.16, -0.19]}
            s={[0.05, 0.36, 0.035]}
            c="#3d4e52"
          />
          <Box
            p={[-2.48, h * 0.93, -0.18]}
            s={[0.37, 0.05, 0.035]}
            c="#3d4e52"
          />
          <Box
            p={[0.5, h * 0.72 + 0.08, -0.65]}
            s={[5.6, 0.22, 7]}
            c="#4d7169"
          />
          {[-2.5, 2.5].map((x) => (
            <group key={x}>
              <Box p={[x, 1.8, 3]} s={[0.5, 3.6, 0.5]} c="#887469" />
              <mesh position={[x, 3.8, 3]}>
                <sphereGeometry args={[0.38, 12, 8]} />
                <meshStandardMaterial
                  color="#ffe4b0"
                  emissive="#ffe4b0"
                  emissiveIntensity={1}
                />
              </mesh>
            </group>
          ))}
        </>
      )}
      {children}
    </group>
  );
}

function ParkDog({ index, paused }: { index: number; paused: boolean }) {
  const ref = useRef<THREE.Group>(null),
    tail = useRef<THREE.Group>(null),
    time = useRef(index * 2),
    bounce = useRef(0);
  useFrame((_, delta) => {
    if (paused || !ref.current) return;
    const dt = Math.min(delta, 0.05);
    time.current += dt;
    bounce.current = Math.max(0, bounce.current - dt);
    const phase = time.current * (0.22 + index * 0.015),
      radius = 1.3 + index * 0.42;
    ref.current.position.set(
      Math.sin(phase) * radius,
      Math.abs(Math.sin(time.current * 9)) * 0.035 +
        Math.sin(bounce.current * Math.PI) * 0.8,
      Math.cos(phase) * radius * 0.66,
    );
    ref.current.rotation.y = phase + Math.PI / 2;
    if (tail.current)
      tail.current.rotation.y = Math.sin(time.current * 14) * 0.65;
  });
  const c = [
    '#a66a3e',
    '#e0c49b',
    '#54463d',
    '#b8895a',
    '#c9c5b5',
    '#965130',
    '#65564c',
    '#d4aa77',
  ][index];
  return (
    <group
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        bounce.current = 1;
      }}
    >
      <Box p={[0, 0.32, 0]} s={[0.32, 0.3, index % 3 ? 0.67 : 1.02]} c={c} />
      <Box p={[0, 0.52, 0.43]} s={[0.32, 0.32, 0.34]} c={c} />
      <Box p={[0, 0.44, 0.65]} s={[0.21, 0.17, 0.24]} c={c} />
      <Box p={[0, 0.46, 0.79]} s={[0.13, 0.09, 0.045]} c="#242c2d" />
      {[-0.19, 0.19].map((x) => (
        <Box
          key={x}
          p={[x, 0.4, 0.4]}
          s={[0.1, index % 3 ? 0.2 : 0.37, 0.19]}
          c="#594233"
        />
      ))}
      {[-0.12, 0.12].flatMap((x) =>
        [-0.25, 0.25].map((z) => (
          <Box
            key={`${x}-${z}`}
            p={[x, 0.11, z]}
            s={[0.09, 0.22, 0.13]}
            c={c}
          />
        )),
      )}
      <group ref={tail} position={[0, 0.4, -0.36]}>
        <Box p={[0, 0.05, -0.15]} s={[0.07, 0.07, 0.4]} c={c} />
      </group>
      <Box
        p={[0, 0.4, 0.25]}
        s={[0.34, 0.075, 0.09]}
        c={index % 2 ? '#b85542' : '#68a1a8'}
      />
    </group>
  );
}

function Bench({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0.5, 0]} s={[2.4, 0.15, 0.65]} c="#bb945f" />
      <Box p={[0, 0.95, -0.32]} s={[2.4, 0.55, 0.1]} c="#bb945f" />
      {[-0.9, 0.9].map((x) => (
        <Box key={x} p={[x, 0.25, 0]} s={[0.12, 0.5, 0.5]} c="#344e50" />
      ))}
    </group>
  );
}

export function CityParks({
  paused,
  label,
}: {
  paused: boolean;
  label: (
    text: string,
    p: [number, number, number],
    width: number,
  ) => ReactNode;
}) {
  return (
    <>
      {[-1, 1].map((side) => (
        <Box
          key={`park-path-${side}`}
          p={[side * 8, -0.015, 16.5]}
          s={[10, 0.07, 2.2]}
          c="#a0a292"
        />
      ))}
      <group position={[-13, 0, 15]} scale={0.7}>
        <Box p={[0, -0.06, 0]} s={[15, 0.12, 12]} c="#668768" />
        <Box p={[0, 0.015, 0]} s={[2.4, 0.025, 12]} c="#b5ae92" />
        {[-5.5, 5.5].flatMap((x) =>
          [-4, 4].map((z) => <Birch key={`${x}-${z}`} x={x} z={z} />),
        )}
        <Bench x={-4} z={0} />
        <Bench x={4} z={0} />
        <mesh position={[0, 0.05, -2.3]}>
          <cylinderGeometry args={[1.4, 1.4, 0.1, 32]} />
          <meshStandardMaterial color="#617d85" />
        </mesh>
        <mesh position={[0, 1.6, -2.3]} rotation={[0.2, 0, 0.3]} castShadow>
          <torusGeometry args={[0.95, 0.15, 10, 32]} />
          <meshStandardMaterial
            color="#b3c6c0"
            metalness={0.65}
            roughness={0.3}
          />
        </mesh>
        {label('ESPLANADE · SCULPTURE GARDEN', [0, 1.25, 5.4], 8)}
      </group>
      <group position={[13, 0, 15]} scale={0.7}>
        <Box p={[0, -0.06, 0]} s={[15, 0.12, 12]} c="#81956b" />
        {[-7, 7].map((x) => (
          <group key={x}>
            <Box p={[x, 0.65, 0]} s={[0.08, 0.08, 11.5]} c="#c4b48b" />
            {[-5, -3, -1, 1, 3, 5].map((z) => (
              <Box key={z} p={[x, 0.5, z]} s={[0.12, 1, 0.12]} c="#bdad83" />
            ))}
          </group>
        ))}
        <Box p={[0, 0.65, -5.5]} s={[14, 0.08, 0.08]} c="#c4b48b" />
        <Bench x={-4.5} z={-4.5} />
        <Birch x={5.5} z={-4.4} />
        {Array.from({ length: 8 }, (_, index) => (
          <ParkDog key={index} index={index} paused={paused} />
        ))}
        <mesh position={[-3, 0.2, 2]}>
          <sphereGeometry args={[0.2, 12, 8]} />
          <meshStandardMaterial color="#df754a" />
        </mesh>
        <mesh position={[4, 0.65, 2]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.65, 0.09, 8, 24]} />
          <meshStandardMaterial color="#e6bf72" />
        </mesh>
        {label('KOIRAPUISTO · CLICK A DOG TO SAY HELLO', [0, 1.25, 5.4], 9)}
      </group>
    </>
  );
}
