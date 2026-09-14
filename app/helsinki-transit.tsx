'use client';
import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { approachSignal, boardingProgress, signalAt } from '@/lib/traffic';

export type RoadVehicle = {
  axis: 'x' | 'z';
  lane: number;
  position: number;
  half: number;
};
export type TrafficState = RefObject<Map<string, RoadVehicle>>;
export function followingVehicle(
  traffic: TrafficState,
  id: string,
  axis: 'x' | 'z',
  lane: number,
  position: number,
  direction: number,
  half: number,
) {
  for (const [otherId, v] of traffic.current) {
    if (otherId === id || v.axis !== axis || Math.abs(v.lane - lane) > 0.4)
      continue;
    const gap = (v.position - position) * direction;
    if (gap > 0 && gap < half + v.half + 1.3) return true;
  }
  return false;
}
function Box({
  p,
  s,
  c,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.6} />
    </mesh>
  );
}
function Sign({
  text,
  p,
  width = 3,
  rotation = 0,
}: {
  text: string;
  p: [number, number, number];
  width?: number;
  rotation?: number;
}) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#10252e';
    ctx.fillRect(0, 0, 512, 128);
    ctx.font = 'bold 35px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdf80';
    ctx.fillText(text, 256, 77, 485);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={p} rotation={[0, rotation, 0]}>
      <planeGeometry args={[width, width / 4]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
}
function Badge({
  p,
  rotation = 0,
  width = 1,
}: {
  p: [number, number, number];
  rotation?: number;
  width?: number;
}) {
  const source = useLoader(THREE.TextureLoader, '/hsl-logo.png');
  const texture = useMemo(() => {
    const copy = source.clone();
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.needsUpdate = true;
    return copy;
  }, [source]);
  useEffect(() => () => texture.dispose(), [texture]);
  const ratio = texture.image.width / texture.image.height;
  return (
    <mesh position={p} rotation={[0, rotation, 0]}>
      <planeGeometry args={[width, width / ratio]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}
function TrafficLight({
  p,
  cross,
  time,
}: {
  p: [number, number, number];
  cross: boolean;
  time: RefObject<number>;
}) {
  const lights = useRef<THREE.Group>(null);
  useFrame(() => {
    const active = signalAt(time.current, cross);
    lights.current?.children.forEach((child, i) => {
      const material = (child as THREE.Mesh)
        .material as THREE.MeshStandardMaterial;
      const on = ['red', 'amber', 'green'][i] === active;
      material.emissiveIntensity = on ? 3 : 0;
      material.color.set(on ? ['#f24d45', '#ffbc44', '#51eb9a'][i] : '#253735');
    });
  });
  return (
    <group position={p} rotation={[0, cross ? Math.PI / 2 : 0, 0]}>
      <Box p={[0, 1.3, 0]} s={[0.09, 2.6, 0.09]} c="#657678" />
      <Box p={[0, 2.8, 0]} s={[0.45, 1.1, 0.3]} c="#182a2e" />
      <group ref={lights}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 3.13 - i * 0.32, 0.17]}>
            <sphereGeometry args={[0.125, 12, 8]} />
            <meshStandardMaterial
              emissive={['#f24d45', '#ffbc44', '#51eb9a'][i]}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
function Passenger({
  i,
  dwell,
  side,
}: {
  i: number;
  dwell: RefObject<number>;
  side: number;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    const progress = boardingProgress(dwell.current, i);
    group.current.visible = progress < 1;
    group.current.position.set(
      side * (2 + i * 0.55) * (1 - progress),
      Math.sin(progress * Math.PI) * 0.16,
      side * (2.4 - 2.1 * progress),
    );
  });
  return (
    <group ref={group} scale={0.75}>
      <Box
        p={[0, 1, 0]}
        s={[0.5, 0.7, 0.3]}
        c={['#ac715d', '#7c98ac', '#d3af62', '#789977'][i]}
      />
      <Box p={[0, 1.5, 0]} s={[0.33, 0.34, 0.3]} c="#d3b18e" />
      {[-0.14, 0.14].map((x) => (
        <Box key={x} p={[x, 0.3, 0]} s={[0.18, 0.6, 0.2]} c="#334349" />
      ))}
      <Box p={[0.33, 0.8, 0.1]} s={[0.15, 0.3, 0.07]} c="#f3dfae" />
    </group>
  );
}
function Shelter({
  x,
  z,
  side,
  dwell,
  tram = false,
}: {
  x: number;
  z: number;
  side: number;
  dwell: RefObject<number>;
  tram?: boolean;
}) {
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0.12, side * 2.6]} s={[6, 0.24, 1.7]} c="#a3aaa0" />
      <Box p={[0, 2.3, side * 3]} s={[4.8, 0.15, 1.8]} c="#576f73" />
      {[-2.2, 2.2].map((a) => (
        <Box key={a} p={[a, 1.2, side * 3.5]} s={[0.1, 2.4, 0.1]} c="#bac4bc" />
      ))}
      <mesh position={[0, 1.3, side * 3.6]}>
        <boxGeometry args={[4.4, 1.8, 0.05]} />
        <meshStandardMaterial
          color="#a6d6e1"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
      <Box p={[0, 0.6, side * 3.1]} s={[3.8, 0.14, 0.45]} c="#baa07a" />
      <Sign
        text={tram ? '7  SENATE SQUARE' : '24  KAUPPATORI'}
        p={[0, 2.65, side * 3]}
        width={4.5}
      />
      <Box p={[-3, 1.45, side * 2]} s={[0.08, 2.9, 0.08]} c="#c7d3ce" />
      <Box
        p={[-3, 2.9, side * 2]}
        s={[0.7, 0.85, 0.1]}
        c={tram ? '#00985f' : '#007ac9'}
      />
      <Suspense fallback={null}>
        <Badge p={[-3, 2.9, side * 2 + 0.06]} width={0.62} />
      </Suspense>
      <group position={[side * (tram ? 3.6 : 2), 0, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <Passenger key={i} i={i} dwell={dwell} side={side} />
        ))}
      </group>
    </group>
  );
}
function TransitVehicle({
  id,
  tram = false,
  routeZ = 7,
  side = 1,
  time,
  traffic,
  player,
  junctions,
  end,
  paused,
}: {
  id: string;
  tram?: boolean;
  routeZ?: number;
  side?: number;
  time: RefObject<number>;
  traffic: TrafficState;
  player: RefObject<THREE.Group | null>;
  junctions: number[];
  end: number;
  paused: boolean;
}) {
  const group = useRef<THREE.Group>(null),
    doors = useRef<THREE.Group>(null),
    dwell = useRef(0);
  const position = useRef(
      tram ? (side > 0 ? 17 : end + 9) : side > 0 ? -30 : 34,
    ),
    served = useRef(false);
  const axis = tram ? 'z' : 'x',
    direction = tram ? -side : side,
    lane = tram ? side * 1.45 : routeZ + side * 1.45;
  const half = tram ? 4.7 : 3.1,
    stop = tram ? -20 : side * 28;
  useEffect(
    () => () => {
      traffic.current.delete(id);
    },
    [id, traffic],
  );
  useFrame((_, delta) => {
    if (!group.current || paused) return;
    const dt = Math.min(delta, 0.04),
      p = player.current?.position;
    const ahead = p ? ((tram ? p.z : p.x) - position.current) * direction : 100;
    const yielding =
      p &&
      Math.abs((tram ? p.x : p.z) - lane) < 1.8 &&
      ahead > -half &&
      ahead < half + 2;
    const red = (tram ? junctions : [0]).some((j) =>
      approachSignal(
        position.current,
        direction,
        j,
        half,
        signalAt(time.current, !tram),
      ),
    );
    const waiting = followingVehicle(
      traffic,
      id,
      axis,
      lane,
      position.current,
      direction,
      half,
    );
    if (!served.current && Math.abs(position.current - stop) < 0.12) {
      position.current = stop;
      dwell.current += dt;
      if (dwell.current > 8) {
        served.current = true;
      }
    } else if (!yielding && !red && !waiting) {
      let step = direction * dt * (tram ? 3.8 : 4.2);
      if (
        !served.current &&
        (stop - position.current) * direction > 0 &&
        Math.abs(step) > Math.abs(stop - position.current)
      )
        step = stop - position.current;
      position.current += step;
    }
    const low = tram ? end + 6 : -43,
      high = tram ? 22 : 43;
    if (position.current < low || position.current > high) {
      position.current = direction > 0 ? low : high;
      served.current = false;
      dwell.current = 0;
    }
    traffic.current.set(id, { axis, lane, position: position.current, half });
    group.current.position.set(
      tram ? lane : position.current,
      0.16,
      tram ? position.current : lane,
    );
    if (doors.current)
      doors.current.scale.z = THREE.MathUtils.lerp(
        doors.current.scale.z,
        dwell.current > 0 && !served.current ? 0.08 : 1,
        dt * 6,
      );
  });
  const color = tram ? '#00985f' : '#007ac9';
  return (
    <>
      {tram ? (
        <group
          position={[side * 1.45, 0, stop]}
          rotation={[0, (-side * Math.PI) / 2, 0]}
        >
          <Shelter x={0} z={0} side={-1} dwell={dwell} tram />
        </group>
      ) : (
        <Shelter x={stop} z={lane} side={side} dwell={dwell} />
      )}
      <group
        ref={group}
        rotation={[
          0,
          tram ? (side > 0 ? Math.PI : 0) : (side * Math.PI) / 2,
          0,
        ]}
      >
        <Box p={[0, 0.7, 0]} s={[1.85, 1.1, half * 2]} c={color} />
        <Box p={[0, 1.65, 0]} s={[1.8, 0.9, half * 2 - 0.2]} c="#173d4d" />
        <Box
          p={[0, 2.15, 0]}
          s={[1.9, 0.2, half * 2]}
          c={tram ? '#e7d8a4' : '#e5eee8'}
        />
        <Box p={[0, 1.55, -half + 0.1]} s={[1.82, 1.1, 0.22]} c="#e4ece8" />
        {[-0.94, 0.94].flatMap((x) =>
          Array.from({ length: tram ? 7 : 5 }, (_, i) => (
            <Box
              key={`${x}-${i}`}
              p={[x, 1.7, -half + 0.7 + i * 1.15]}
              s={[0.05, 0.9, 0.055]}
              c={tram ? '#ecdbae' : '#dce8e7'}
            />
          )),
        )}
        {tram &&
          [-1.4, 1.4].map((z) => (
            <Box key={z} p={[0, 1.2, z]} s={[1.9, 1.8, 0.28]} c="#53645e" />
          ))}
        <group ref={doors} position={[-0.95, 0, half - 1.1]}>
          <Box p={[0, 1.2, 0]} s={[0.06, 1.8, 0.9]} c="#dce8e4" />
          <Box p={[-0.04, 1.6, 0]} s={[0.025, 0.8, 0.73]} c="#284b54" />
        </group>
        {[-0.9, 0.9].flatMap((x) =>
          [-half + 1, half - 1].map((z) => (
            <mesh
              key={`${x}-${z}`}
              position={[x, 0.35, z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.36, 0.36, 0.18, 16]} />
              <meshStandardMaterial color="#233138" />
            </mesh>
          )),
        )}
        <Sign
          text={tram ? '7  SENATE SQUARE' : '24  KAUPPATORI'}
          p={[0, 1.95, half + 0.02]}
          width={1.65}
        />
        <Suspense fallback={null}>
          {[-1, 1].map((s) => (
            <Badge
              key={s}
              p={[s * 0.94, 0.8, 0]}
              rotation={(s * Math.PI) / 2}
              width={tram ? 1.4 : 1.6}
            />
          ))}
        </Suspense>
        {[-0.6, 0.6].map((x) => (
          <mesh key={x} position={[x, 0.65, half + 0.02]}>
            <boxGeometry args={[0.22, 0.15, 0.03]} />
            <meshStandardMaterial
              color="#fff1ca"
              emissive="#ffe6aa"
              emissiveIntensity={2}
            />
          </mesh>
        ))}
        {tram && (
          <group position={[0, 2.35, 0]}>
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.07, 1.2, 0.08]} />
              <meshStandardMaterial color="#4c605d" />
            </mesh>
            <Box p={[0, 0.65, 0]} s={[1.4, 0.06, 0.08]} c="#61736b" />
          </group>
        )}
      </group>
    </>
  );
}
export function HelsinkiTransit(props: {
  time: RefObject<number>;
  traffic: TrafficState;
  player: RefObject<THREE.Group | null>;
  junctions: number[];
  end: number;
  paused: boolean;
}) {
  return (
    <group>
      {props.junctions.map((z) => (
        <group key={z}>
          <TrafficLight
            p={[-3.2, 0, z + 3.4]}
            cross={false}
            time={props.time}
          />
          <group rotation={[0, Math.PI, 0]} position={[3.2, 0, z - 3.4]}>
            <TrafficLight p={[0, 0, 0]} cross={false} time={props.time} />
          </group>
          <TrafficLight p={[-3.5, 0, z - 3.2]} cross time={props.time} />
          <group rotation={[0, Math.PI, 0]} position={[3.5, 0, z + 3.2]}>
            <TrafficLight p={[0, 0, 0]} cross time={props.time} />
          </group>
        </group>
      ))}
      {[-1.95, -0.95, 0.95, 1.95].map((x) => (
        <Box
          key={x}
          p={[x, 0.14, (props.end + 22) / 2]}
          s={[0.06, 0.02, 22 - props.end]}
          c="#bbc2b5"
        />
      ))}
      {props.junctions.map((z) => (
        <group key={`route-${z}`}>
          <TransitVehicle {...props} routeZ={z} id={`bus-east-${z}`} />
          <TransitVehicle
            {...props}
            routeZ={z}
            id={`bus-west-${z}`}
            side={-1}
          />
        </group>
      ))}
      <TransitVehicle {...props} id="tram-south" tram />
      <TransitVehicle {...props} id="tram-north" tram side={-1} />
    </group>
  );
}
