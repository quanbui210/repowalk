'use client';

import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Part({
  p,
  s,
  color,
  glow = 0,
}: {
  p: [number, number, number];
  s: [number, number, number];
  color: string;
  glow?: number;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        roughness={0.72}
        emissive={color}
        emissiveIntensity={glow}
      />
    </mesh>
  );
}

function Car({
  index,
  end,
  region,
  paused,
  player,
}: {
  index: number;
  end: number;
  region: number;
  paused: boolean;
  player: RefObject<THREE.Group | null>;
}) {
  const group = useRef<THREE.Group>(null);
  const z = useRef(16 - index * 19);
  const direction = index % 2 ? 1 : -1;
  const x = direction * 1.45;
  useFrame((_, delta) => {
    if (!group.current || paused) return;
    const p = player.current?.position;
    const ahead = p ? (p.z - z.current) * direction : 100;
    // Cars give the explorer space to cross the street.
    const yielding = p && Math.abs(p.x - x) < 1.7 && ahead > -1 && ahead < 5;
    if (!yielding)
      z.current += direction * Math.min(delta, 0.05) * (3 + index * 0.24);
    const low = Math.max(end + 3, region - 65),
      high = Math.min(20, region + 55);
    if (z.current < low) z.current = high;
    if (z.current > high) z.current = low;
    group.current.position.set(x, 0.1, z.current);
  });
  return (
    <group ref={group} rotation={[0, direction > 0 ? 0 : Math.PI, 0]}>
      <Part
        p={[0, 0.5, 0]}
        s={[1.45, 0.55, 2.8]}
        color={['#b15b45', '#d8bd70', '#679692', '#6c819e'][index]}
      />
      <Part p={[0, 0.98, -0.15]} s={[1.22, 0.62, 1.5]} color="#d1d9ce" />
      <Part p={[0, 1.02, 0.615]} s={[1.06, 0.4, 0.035]} color="#294c5b" />
      <Part p={[0, 1.02, -0.915]} s={[1.06, 0.4, 0.035]} color="#294c5b" />
      {[-0.625, 0.625].map((side) => (
        <Part
          key={side}
          p={[side, 1.01, -0.15]}
          s={[0.025, 0.39, 1.13]}
          color="#365766"
        />
      ))}
      {[-0.72, 0.72].flatMap((side) =>
        [-0.86, 0.86].map((axle) => (
          <mesh
            key={`${side}-${axle}`}
            position={[side, 0.3, axle]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.3, 0.3, 0.17, 12]} />
            <meshStandardMaterial color="#223036" roughness={0.9} />
          </mesh>
        )),
      )}
      {[-0.48, 0.48].map((side) => (
        <group key={side}>
          <Part
            p={[side, 0.56, 1.41]}
            s={[0.3, 0.17, 0.035]}
            color="#ffe4af"
            glow={1.8}
          />
          <Part
            p={[side, 0.56, -1.41]}
            s={[0.23, 0.14, 0.035]}
            color="#d86650"
            glow={0.8}
          />
        </group>
      ))}
    </group>
  );
}

function Citizen({
  index,
  end,
  region,
  paused,
}: {
  index: number;
  end: number;
  region: number;
  paused: boolean;
}) {
  const group = useRef<THREE.Group>(null),
    legs = useRef<THREE.Group>(null),
    dog = useRef<THREE.Group>(null);
  const z = useRef(9 - index * 8),
    clock = useRef(index);
  const direction = index % 2 ? 1 : -1;
  const hasDog = index === 1 || index === 4;
  useFrame((_, delta) => {
    if (!group.current || paused) return;
    const dt = Math.min(delta, 0.05);
    clock.current += dt;
    z.current += direction * dt * (hasDog ? 0.78 : 1.05);
    const low = Math.max(end + 3, region - 60),
      high = Math.min(19, region + 50);
    if (z.current < low) z.current = high;
    if (z.current > high) z.current = low;
    group.current.position.set(direction * 3.12, 0.12, z.current);
    if (legs.current)
      legs.current.children.forEach((leg, i) => {
        leg.rotation.x = Math.sin(clock.current * 8 + i * Math.PI) * 0.42;
      });
    if (dog.current) {
      dog.current.position.y = Math.abs(Math.sin(clock.current * 10)) * 0.035;
      dog.current.rotation.y = Math.sin(clock.current * 1.8) * 0.08;
    }
  });
  const coat = [
    '#c89751',
    '#547a88',
    '#a36358',
    '#788969',
    '#d2aa74',
    '#687b9c',
  ][index];
  return (
    <group ref={group} rotation={[0, direction > 0 ? 0 : Math.PI, 0]}>
      <group ref={legs}>
        {[-0.15, 0.15].map((x) => (
          <group key={x} position={[x, 0.55, 0]}>
            <Part p={[0, -0.2, 0]} s={[0.19, 0.5, 0.22]} color="#33424c" />
            <Part p={[0, -0.47, 0.05]} s={[0.22, 0.12, 0.33]} color="#293337" />
          </group>
        ))}
      </group>
      <Part p={[0, 0.96, 0]} s={[0.59, 0.76, 0.35]} color={coat} />
      <Part
        p={[0, 1.49, 0]}
        s={[0.36, 0.38, 0.35]}
        color={index % 3 ? '#d4b495' : '#8d6350'}
      />
      <Part p={[0, 1.72, 0]} s={[0.4, 0.14, 0.39]} color="#e0d5bb" />
      <Part p={[0, 1.26, 0.2]} s={[0.55, 0.13, 0.08]} color="#d9c6a1" />
      {[-0.37, 0.37].map((x) => (
        <Part key={x} p={[x, 0.91, 0]} s={[0.16, 0.58, 0.21]} color={coat} />
      ))}
      {hasDog && (
        <group position={[-0.72, 0, 0.8]}>
          <group ref={dog}>
            <Part p={[0, 0.29, 0]} s={[0.27, 0.26, 0.85]} color="#9a5434" />
            <Part p={[0, 0.44, 0.42]} s={[0.28, 0.29, 0.27]} color="#a6613e" />
            <Part p={[0, 0.4, 0.61]} s={[0.19, 0.15, 0.25]} color="#b5754b" />
            <Part p={[0, 0.42, 0.75]} s={[0.12, 0.1, 0.06]} color="#282c2c" />
            {[-0.17, 0.17].map((x) => (
              <Part
                key={x}
                p={[x, 0.3, 0.39]}
                s={[0.1, 0.31, 0.18]}
                color="#693c2b"
              />
            ))}
            {[-0.09, 0.09].flatMap((x) =>
              [-0.29, 0.29].map((z) => (
                <Part
                  key={`${x}-${z}`}
                  p={[x, 0.1, z]}
                  s={[0.08, 0.2, 0.11]}
                  color="#673e2d"
                />
              )),
            )}
            <group position={[0, 0.36, -0.44]} rotation={[-0.6, 0, 0]}>
              <Part p={[0, 0, -0.12]} s={[0.06, 0.06, 0.3]} color="#78412d" />
            </group>
            <Part p={[0, 0.34, 0.26]} s={[0.3, 0.08, 0.08]} color="#cfad65" />
          </group>
          <mesh
            position={[0.18, 0.54, -0.4]}
            rotation={[Math.PI / 3, 0, -0.28]}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.95, 6]} />
            <meshStandardMaterial color="#d9cbb1" />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function Birch({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Part p={[0, 0.15, 0]} s={[1.25, 0.3, 1.25]} color="#657d72" />
      <Part p={[0, 1.65, 0]} s={[0.16, 3.1, 0.18]} color="#d3d4bd" />
      {[0.6, 1.2, 1.9, 2.5].map((y) => (
        <Part key={y} p={[0, y, 0.1]} s={[0.13, 0.07, 0.025]} color="#4b5b56" />
      ))}
      <mesh position={[0, 3.3, 0]} castShadow>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshStandardMaterial color="#819b69" roughness={1} />
      </mesh>
      <mesh position={[0.42, 2.7, 0.05]} castShadow>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#a4af73" roughness={1} />
      </mesh>
    </group>
  );
}

export function CityLife({
  end,
  region,
  paused,
  player,
}: {
  end: number;
  region: number;
  paused: boolean;
  player: RefObject<THREE.Group | null>;
}) {
  return (
    <group>
      {[0, 1, 2, 3].map((index) => (
        <Car key={`car-${index}`} {...{ index, end, region, paused, player }} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <Citizen key={`citizen-${index}`} {...{ index, end, region, paused }} />
      ))}
    </group>
  );
}
