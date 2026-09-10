'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CityLife, Birch } from './city-life';
import type { RepoFile } from './page';
import {
  floorsFor,
  floorPortals,
  walkingHeight,
  symbolPosition,
  roomDepth,
  type CodeConstruct,
  type ChangeKind,
} from '@/lib/exploration';
import {
  buildDistricts,
  buildPortals,
  type District,
  type Portal,
} from '@/lib/world-layout';
type Props = {
  files: RepoFile[];
  layoutFiles: RepoFile[];
  changes: Record<string, ChangeKind>;
  timeRevision: number;
  floorRequest: { level: number; serial: number } | null;
  onFloor: (floor: number) => void;
  onInspect: (symbol: CodeConstruct) => void;
  folder: string;
  inside: boolean;
  onFolderEnter: (path: string) => void;
  active: RepoFile | null;
  onEnter: (f: RepoFile) => void;
  onLeave: () => void;
  onNear: (s: string) => void;
  reset: number;
  paused: boolean;
  muted: boolean;
};
const amber = '#f5ae65';
function Block({
  p,
  s,
  c = '#414e52',
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
        roughness={0.82}
        metalness={0.15}
        emissive={c}
        emissiveIntensity={glow}
      />
    </mesh>
  );
}
function Label({
  text,
  p,
  width = 4,
  color = '#ead5b5',
  size = 40,
}: {
  text: string;
  p: [number, number, number];
  width?: number;
  color?: string;
  size?: number;
}) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#182127';
    ctx.fillRect(0, 0, 1024, 128);
    ctx.strokeStyle = '#677570';
    ctx.strokeRect(4, 4, 1016, 120);
    ctx.fillStyle = color;
    ctx.font = `500 ${size}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 64, 970);
    return new THREE.CanvasTexture(c);
  }, [text, color, size]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={p}>
      <planeGeometry args={[width, width / 8]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
function Lamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Block p={[0, 1.85, 0]} s={[0.1, 3.7, 0.1]} c="#283a40" />
      <Block p={[0, 3.7, 0.23]} s={[0.18, 0.12, 0.7]} c="#80918f" />
      <Block p={[0, 3.63, 0.48]} s={[0.14, 0.035, 0.2]} c={amber} glow={4} />
      <pointLight
        position={[0, 3.4, 0.5]}
        color={amber}
        intensity={16}
        distance={8}
        decay={2}
      />
      <Block p={[0, 0.09, 0]} s={[0.5, 0.18, 0.5]} c="#435358" />
    </group>
  );
}
function Building({
  district,
  i,
  onEnter,
  status = 'unchanged',
}: {
  district: District;
  status?: ChangeKind;
  i: number;
  onEnter: (path: string) => void;
}) {
  const { x, z, scale } = district;
  const h = floorsFor(district) * 6 + 0.3;
  const accent =
    status === 'added'
      ? '#92dfb1'
      : status === 'modified'
        ? '#c0a0f0'
        : status === 'removed'
          ? '#dc8c8c'
          : amber;
  return (
    <group position={[x, 0, z]} scale={[scale, 1, scale]}>
      <Block p={[0, 0.15, 0]} s={[9, 0.3, 8.8]} c="#526064" />
      <Block
        p={[0, h / 2, -0.6]}
        s={[7.6, h, 6.9]}
        c={
          ['#a95f4d', '#c5a161', '#769592', '#bdac8e', '#73859c', '#b97d64'][
            i % 6
          ]
        }
      />
      {[-3.65, 3.65].map((x) => (
        <Block
          key={`corner-${x}`}
          p={[x, h / 2, 2.9]}
          s={[0.18, h, 0.14]}
          c="#dfd6bb"
        />
      ))}
      <Block p={[0, 4.65, 2.94]} s={[7.6, 0.18, 0.2]} c="#d8ccb3" />
      <Block p={[0, h - 0.12, 2.94]} s={[7.9, 0.23, 0.3]} c="#dfd6bb" />
      {[-1, 1].map((side) => (
        <group
          key={`roof-${side}`}
          position={[side * 2, h + 0.7, -0.6]}
          rotation={[0, 0, side * -0.32]}
        >
          <Block p={[0, 0, 0]} s={[4.3, 0.16, 7.45]} c="#3d535b" />
        </group>
      ))}
      <Block p={[0, h + 0.12, -0.6]} s={[8, 0.24, 7.3]} c="#68716c" />
      <Block p={[0, h + 0.34, -3.95]} s={[8, 0.5, 0.18]} c="#596561" />
      <Block p={[-3.9, h + 0.34, -0.6]} s={[0.18, 0.5, 7]} c="#56625e" />
      <Block p={[3.9, h + 0.34, -0.6]} s={[0.18, 0.5, 7]} c="#56625e" />
      <Block p={[-1.8, h + 0.5, -1]} s={[1.6, 0.7, 1.9]} c="#39494f" />
      {[0, 1, 2, 3].map((v) => (
        <Block
          key={v}
          p={[-1.8, h + 0.87, -1.65 + v * 0.42]}
          s={[1.35, 0.05, 0.12]}
          c="#72817c"
        />
      ))}
      <Block p={[1.8, h + 0.6, -2]} s={[0.6, 1, 0.6]} c="#35464c" />
      {[-2.7, 2.7].map((wx) => (
        <group key={wx}>
          <Block p={[wx, 2.3, 2.92]} s={[1.4, 1.85, 0.12]} c="#e2d7bc" />
          <Block
            p={[wx, 2.3, 3]}
            s={[1.1, 1.5, 0.03]}
            c={
              status === 'unchanged'
                ? i % 3 === 1
                  ? '#ca985e'
                  : '#8baaa8'
                : accent
            }
            glow={0.65}
          />
          <Block p={[wx, 2.3, 3.04]} s={[0.08, 1.6, 0.07]} c="#3c4b4b" />
          <Block p={[wx, 2.3, 3.04]} s={[1.2, 0.07, 0.07]} c="#3c4b4b" />
          <Block p={[wx, 1.48, 3.13]} s={[1.6, 0.15, 0.5]} c="#5c6a68" />
        </group>
      ))}
      <Block p={[0, 1.52, 3.01]} s={[2.2, 3.05, 0.22]} c="#1b282e" />
      <Block p={[-1.04, 1.52, 3.16]} s={[0.07, 3, 0.1]} c={accent} glow={2} />
      <Block p={[1.04, 1.52, 3.16]} s={[0.07, 3, 0.1]} c={accent} glow={2} />
      <Block p={[0, 3.04, 3.16]} s={[2.15, 0.07, 0.1]} c={accent} glow={2} />
      <mesh
        position={[0, 1.47, 3.2]}
        onClick={(e) => {
          e.stopPropagation();
          onEnter(district.path);
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[1.9, 2.9, 0.13]} />
        <meshStandardMaterial color="#263941" roughness={0.6} />
      </mesh>
      <Block
        p={[0.68, 1.45, 3.31]}
        s={[0.055, 0.32, 0.09]}
        c={accent}
        glow={1}
      />
      <Block p={[0, 0.24, 3.57]} s={[2.8, 0.2, 1.1]} c="#77827b" />
      <Block p={[0, 0.08, 4.13]} s={[3.2, 0.16, 0.7]} c="#636f6a" />
      <Label
        text={district.path + '/'}
        p={[0, 3.61, 3.28]}
        width={5.5}
        size={43}
      />
      <Label
        text={`${district.count} FILES · ${district.directCount} ROOMS${district.children.length ? ' + ' + district.children.length + ' WINGS' : ''}`}
        p={[0, 4.18, 3.28]}
        width={5.5}
        size={29}
      />
      {Array.from(
        { length: Math.max(0, Math.floor((h - 4.5) / 1.5)) },
        (_, floor) => (
          <group key={'floor' + floor}>
            {[-2.7, -0.9, 0.9, 2.7].map((wx) => (
              <group key={wx}>
                <Block
                  p={[wx, 5 + floor * 1.5, 2.95]}
                  s={[1.18, 0.95, 0.1]}
                  c="#ddd5bf"
                />
                <Block
                  p={[wx, 5 + floor * 1.5, 3.01]}
                  s={[0.96, 0.75, 0.035]}
                  c={i % 2 ? '#90b1b4' : '#d5b883'}
                  glow={0.3}
                />
                <Block
                  p={[wx, 5 + floor * 1.5, 3.04]}
                  s={[0.055, 0.8, 0.035]}
                  c="#ded4bb"
                />
              </group>
            ))}
          </group>
        ),
      )}
      <Label
        text={String(i + 1).padStart(2, '0')}
        p={[-3.15, 4.04, 3.03]}
        width={0.6}
        size={70}
      />
      <pointLight
        position={[0, 2.5, 4.1]}
        intensity={22}
        distance={7}
        color={accent}
        decay={2}
      />
      <Block p={[-3.53, 1.9, 3.18]} s={[0.08, 3.8, 0.12]} c="#83908b" />
      <Block p={[3.5, 0.48, 3.4]} s={[0.6, 0.7, 0.7]} c="#33474b" />
      {Array.from({ length: 3 }, (_, j) => (
        <Block
          key={j}
          p={[3.6 + j * 0.27, 0.24, 4]}
          s={[0.2, 0.4, 0.65]}
          c="#6b7569"
        />
      ))}
    </group>
  );
}
function Interior({
  file,
  onInspect,
}: {
  file: RepoFile;
  onInspect: (symbol: CodeConstruct) => void;
}) {
  const constructs = file.analysis?.constructs || [],
    depth = roomDepth(constructs.length);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1536;
    canvas.height = 1024;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#101e25';
    c.fillRect(0, 0, 1536, 1024);
    c.font = '25px monospace';
    (file.loaded === false ? 'Loading source from GitHub…' : file.code)
      .split('\n')
      .slice(0, 32)
      .forEach((line, i) => {
        c.fillStyle = '#4b6974';
        c.fillText(String(i + 1).padStart(2, '0'), 40, 48 + i * 29);
        c.fillStyle = line.includes('//')
          ? '#759485'
          : /import|export|return|const/.test(line)
            ? '#c3acd8'
            : '#bacbd0';
        c.fillText(line.slice(0, 90), 110, 48 + i * 29);
      });
    return new THREE.CanvasTexture(canvas);
  }, [file]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      <Block
        p={[0, -0.2, (8 - depth) / 2]}
        s={[22, 0.4, depth + 8]}
        c="#384b50"
      />
      <Block
        p={[0, 0.025, (8 - depth) / 2]}
        s={[2.2, 0.035, depth + 8]}
        c="#657269"
      />
      <Block p={[0, 3.2, -depth]} s={[22, 6.4, 0.45]} c="#273d49" />
      <Block
        p={[-11, 2, (8 - depth) / 2]}
        s={[0.4, 4, depth + 8]}
        c="#34494e"
      />
      <Block p={[11, 2, (8 - depth) / 2]} s={[0.4, 4, depth + 8]} c="#34494e" />
      <Label
        text={file.path + ' / SOURCE ARCHITECTURE'}
        p={[0, 5.8, -depth + 0.3]}
        width={15}
        size={36}
      />
      <mesh position={[0, 3.1, -depth + 0.3]}>
        <planeGeometry args={[9, 5.2]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {constructs.map((symbol, i) => {
        const { x, z } = symbolPosition(i),
          height =
            (symbol.kind === 'class' ? 2.6 : 1) +
            Math.log2(symbol.lines + 1) * 0.35;
        const color =
          symbol.kind === 'class'
            ? '#b9a0ed'
            : symbol.complexity > 6
              ? '#edaa72'
              : '#8ad2ca';
        return (
          <group key={symbol.id} position={[x, 0, z]}>
            <Block p={[0, 0.15, 0]} s={[3.2, 0.3, 3]} c="#2a3942" />
            <mesh
              position={[0, height / 2 + 0.3, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onInspect(symbol);
              }}
            >
              <boxGeometry
                args={[symbol.kind === 'class' ? 1.8 : 2.5, height, 1.6]}
              />
              <meshStandardMaterial
                color="#314852"
                metalness={0.4}
                roughness={0.4}
              />
            </mesh>
            <Block
              p={[0, height + 0.35, 0]}
              s={[2.9, 0.1, 2.3]}
              c={color}
              glow={1.5}
            />
            {Array.from(
              { length: Math.min(8, Math.ceil(symbol.lines / 8)) },
              (_, j) => (
                <Block
                  key={j}
                  p={[0, 0.6 + j * 0.32, 0.84]}
                  s={[1.7 - 0.08 * (j % 3), 0.06, 0.02]}
                  c={color}
                  glow={1.4}
                />
              ),
            )}
            <Label
              text={symbol.name}
              p={[0, height + 0.92, 1.2]}
              width={4.1}
              size={40}
              color={color}
            />
            <Label
              text={`${symbol.kind.toUpperCase()} · L${symbol.start}–${symbol.end}`}
              p={[0, 0.65, 1.62]}
              width={3.1}
              size={30}
            />
            {i < 12 && (
              <pointLight
                position={[0, height + 0.8, 1]}
                color={color}
                intensity={10}
                distance={8}
              />
            )}
          </group>
        );
      })}
      <Label
        text={
          constructs.length
            ? `${constructs.length} STRUCTURES · E TO INSPECT`
            : 'SOURCE READING ROOM'
        }
        p={[0, 1.5, 6]}
        width={6}
      />
      <pointLight
        position={[0, 6, 3]}
        color="#afcad4"
        intensity={45}
        distance={22}
      />
    </group>
  );
}
function TemporalBuilding({
  district,
  i,
  onEnter,
  status,
  revision,
}: {
  district: District;
  i: number;
  onEnter: (path: string) => void;
  status: ChangeKind;
  revision: number;
}) {
  const group = useRef<THREE.Group>(null),
    progress = useRef(0);
  useEffect(() => {
    progress.current = 0;
    if (group.current)
      group.current.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => {
            material.transparent = status === 'removed';
            material.opacity = status === 'removed' ? 0.2 : 1;
          });
        }
      });
  }, [status, revision]);
  useFrame((_, dt) => {
    progress.current = Math.min(1, progress.current + dt * 0.85);
    if (group.current) {
      const target = status === 'removed' ? 0.15 : 1;
      group.current.scale.y =
        status === 'added'
          ? THREE.MathUtils.smoothstep(progress.current, 0, 1)
          : status === 'removed'
            ? THREE.MathUtils.lerp(1, target, progress.current)
            : 1;
    }
  });
  return (
    <group ref={group}>
      <Building
        district={district}
        i={i}
        onEnter={status === 'removed' ? () => {} : onEnter}
        status={status}
      />
    </group>
  );
}
// Thin treads and diagonal stringers leave an open, readable stairwell.
function Rail({
  x,
  y,
  reverse = false,
}: {
  x: number;
  y: number;
  reverse?: boolean;
}) {
  return (
    <group
      position={[x, y + 4.05, 5]}
      rotation={[reverse ? -Math.PI / 4 : Math.PI / 4, 0, 0]}
    >
      <Block p={[0, 0, 0]} s={[0.09, 0.09, Math.sqrt(72)]} c="#c2b49a" />
    </group>
  );
}
function FloorSurface({
  x,
  z,
  width,
  depth,
}: {
  x: number;
  z: number;
  width: number;
  depth: number;
}) {
  // A repeated material gives large galleries detail without hundreds of meshes.
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#687875';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1800; i++) {
      const value = 100 + ((i * 37) % 35);
      ctx.fillStyle = `rgba(${value},${value + 9},${value + 7},0.16)`;
      ctx.fillRect((i * 47) % 128, (i * 71) % 127, 2, 1);
    }
    ctx.strokeStyle = '#3d4c4b';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 128, 128);
    ctx.strokeStyle = '#81908a';
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, 122, 122);
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(width / 2, depth / 2);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [width, depth]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh
      position={[x, 0.006, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texture} roughness={0.78} metalness={0.08} />
    </mesh>
  );
}
function Stairwell({ floors, current }: { floors: number; current: number }) {
  return (
    <group>
      {Array.from({ length: floors }, (_, flight) =>
        flight <= current && flight >= current - 1 ? (
          <group key={flight}>
            {Array.from({ length: 24 }, (_, step) => {
              const rise = (step + 1) * 0.25;
              const z =
                flight % 2 === 0
                  ? 8 - (step + 0.5) * 0.25
                  : 2 + (step + 0.5) * 0.25;
              return (
                <group key={step}>
                  <Block
                    p={[8 + (flight % 2) * 3.8, flight * 6 + rise - 0.12, z]}
                    s={[3.2, 0.24, 0.25]}
                    c="#778b89"
                  />
                  <Block
                    p={[
                      8 + (flight % 2) * 3.8,
                      flight * 6 + rise + 0.008,
                      z + (flight % 2 ? -0.105 : 0.105),
                    ]}
                    s={[3.08, 0.016, 0.04]}
                    c="#d6bc8d"
                    glow={0.35}
                  />
                </group>
              );
            })}
            {[6.4, 9.6].map((base) => {
              const x = base + (flight % 2) * 3.8;
              return (
                <group key={base}>
                  <Rail x={x} y={flight * 6} reverse={flight % 2 === 1} />
                  <group
                    position={[x, flight * 6 + 2.82, 5]}
                    rotation={[flight % 2 ? -Math.PI / 4 : Math.PI / 4, 0, 0]}
                  >
                    <Block
                      p={[0, 0, 0]}
                      s={[0.14, 0.24, Math.sqrt(72)]}
                      c="#30444b"
                    />
                  </group>
                  {Array.from({ length: 7 }, (_, j) => (
                    <Block
                      key={j}
                      p={[
                        x,
                        flight * 6 + (flight % 2 ? j : 6 - j) + 0.55,
                        2 + j,
                      ]}
                      s={[0.055, 1.1, 0.055]}
                      c="#9aa9a0"
                    />
                  ))}
                </group>
              );
            })}
          </group>
        ) : null,
      )}
      {Array.from({ length: floors + 1 }, (_, level) =>
        level === current || level === current - 1 ? (
          <group key={level} position={[0, level * 6, 0]}>
            {[1.4, 8.6].map((z) => (
              <group key={z}>
                <Block p={[10.1, -0.15, z]} s={[7.4, 0.3, 1.2]} c="#4b6164" />
                <FloorSurface x={10.1} z={z} width={7.4} depth={1.2} />
                <Block
                  p={[10.1, 0.018, z < 2 ? 0.85 : 9.15]}
                  s={[7.4, 0.035, 0.07]}
                  c={amber}
                  glow={0.6}
                />
              </group>
            ))}
            <Label
              text={
                level === floors ? 'ROOFTOP' : `FLOOR ${level + 1} · STAIRS ↑`
              }
              p={[12, 1.6, 0.9]}
              width={3}
              size={38}
            />
          </group>
        ) : null,
      )}
    </group>
  );
}
function Roof({
  district,
  districts,
  level,
  onEnter,
}: {
  district: District | undefined;
  districts: District[];
  level: number;
  onEnter: (path: string) => void;
}) {
  return (
    <>
      <group position={[0, level * 6, 0]}>
        {/* A clean L-shaped roof keeps the entire stair shaft open. */}
        <Block p={[-2.3, -0.2, -1.2]} s={[17.4, 0.4, 22.6]} c="#4e625f" />
        <FloorSurface x={-2.3} z={-1.2} width={17.4} depth={22.6} />
        <Block p={[10.2, -0.2, -5.65]} s={[7.6, 0.4, 13.7]} c="#4e625f" />
        <FloorSurface x={10.2} z={-5.65} width={7.6} depth={13.7} />
        <Block p={[-10.7, 0.55, -1.2]} s={[0.2, 1.1, 22.6]} c="#71847a" />
        <Block p={[13.7, 0.55, -1.2]} s={[0.2, 1.1, 22.6]} c="#71847a" />
        <Block p={[0, 0.55, -12.4]} s={[21.5, 1.1, 0.2]} c="#71847a" />
        <Block p={[-2.3, 0.55, 10]} s={[17.4, 1.1, 0.2]} c="#71847a" />

        {/* Railings frame the stair opening and make its route obvious. */}
        {[2, 3.5, 5, 6.5, 8].map((z) => (
          <Block
            key={`shaft-post-${z}`}
            p={[6.3, 0.72, z]}
            s={[0.07, 1.45, 0.07]}
            c="#aab8ae"
          />
        ))}
        <Block p={[6.3, 1.38, 5]} s={[0.1, 0.1, 6.15]} c="#c6b99e" />
        <Block p={[6.3, 0.84, 5]} s={[0.07, 0.07, 6.15]} c="#7f928b" />
        {[6.3, 8, 9.8, 11.6, 13.4].map((x) => (
          <Block
            key={`shaft-back-${x}`}
            p={[x, 0.72, 1.15]}
            s={[0.07, 1.45, 0.07]}
            c="#aab8ae"
          />
        ))}
        <Block p={[9.85, 1.38, 1.15]} s={[7.1, 0.1, 0.1]} c="#c6b99e" />
        <Block p={[9.85, 0.84, 1.15]} s={[7.1, 0.07, 0.07]} c="#7f928b" />

        {/* The observatory is a small raised deck rather than a floating slab. */}
        <Block p={[-1.8, 0.09, -3.5]} s={[7.6, 0.18, 6.2]} c="#394d52" />
        <Block p={[-1.8, 0.19, -3.5]} s={[7.15, 0.035, 5.75]} c="#71817d" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.8, 0.22, -3.5]}>
          <ringGeometry args={[1.65, 1.72, 64]} />
          <meshBasicMaterial color={amber} transparent opacity={0.72} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.8, 0.225, -3.5]}>
          <ringGeometry args={[2.45, 2.49, 64]} />
          <meshBasicMaterial color="#9dc8c1" transparent opacity={0.45} />
        </mesh>
        {[
          [-5, -6],
          [1.4, -6],
          [-5, -1],
          [1.4, -1],
        ].map(([x, z]) => (
          <group key={`${x}-${z}`}>
            <Block p={[x, 0.48, z]} s={[0.13, 0.55, 0.13]} c="#637771" />
            <Block p={[x, 0.78, z]} s={[0.2, 0.08, 0.2]} c={amber} glow={2.4} />
          </group>
        ))}
        <Label
          text={(district?.path || '') + ' / ROOFTOP OBSERVATORY'}
          p={[0.5, 1.45, -12.25]}
          width={10}
          size={36}
        />
        <Label
          text="REPOSITORY OVERLOOK"
          p={[-1.8, 0.52, -0.38]}
          width={5.2}
          size={32}
        />
        <Block p={[-7.6, 0.4, -8.6]} s={[2.8, 0.8, 1.3]} c="#34494e" />
        {[-8.25, -7.8, -7.35, -6.9].map((x) => (
          <Block
            key={x}
            p={[x, 0.82, -8.6]}
            s={[0.22, 0.035, 0.82]}
            c="#91aaa2"
          />
        ))}
        <pointLight
          position={[-1.8, 3, -3.5]}
          color={amber}
          intensity={19}
          distance={15}
        />
      </group>
      <group position={[-(district?.x || 0), 0, -(district?.z || 0)]}>
        {districts
          .filter(
            (d) =>
              d.path !== district?.path &&
              Math.abs(d.z - (district?.z || 0)) < 100,
          )
          .map((d, i) => (
            <Building key={d.path} district={d} i={i} onEnter={onEnter} />
          ))}
        <Block
          p={[0, -0.4, (district?.z || 0) - 20]}
          s={[160, 0.5, 250]}
          c="#263b44"
        />
      </group>
    </>
  );
}
function Player({ moving }: { moving: React.RefObject<boolean> }) {
  const left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const swing = moving.current ? Math.sin(clock.elapsedTime * 12) * 0.55 : 0;
    if (left.current) left.current.rotation.x = swing;
    if (right.current) right.current.rotation.x = -swing;
  });
  return (
    <group>
      <group ref={left} position={[-0.19, 0.52, 0]}>
        <Block p={[0, -0.2, 0]} s={[0.24, 0.55, 0.27]} c="#26353a" />
        <Block p={[0, -0.46, 0.06]} s={[0.29, 0.17, 0.43]} c="#202a2e" />
      </group>
      <group ref={right} position={[0.19, 0.52, 0]}>
        <Block p={[0, -0.2, 0]} s={[0.24, 0.55, 0.27]} c="#26353a" />
        <Block p={[0, -0.46, 0.06]} s={[0.29, 0.17, 0.43]} c="#202a2e" />
      </group>
      <Block p={[0, 0.91, 0]} s={[0.68, 0.77, 0.43]} c="#c0804f" />
      <Block p={[0, 1.02, -0.29]} s={[0.47, 0.53, 0.23]} c="#5c6b62" />
      <Block p={[0, 1.06, -0.42]} s={[0.28, 0.09, 0.035]} c="#d7c3a0" />
      <Block p={[0, 1.53, 0]} s={[0.46, 0.44, 0.43]} c="#b8b7a3" />
      <Block p={[0, 1.57, 0.23]} s={[0.36, 0.17, 0.035]} c="#253940" />
      <Block p={[-0.44, 0.9, 0]} s={[0.2, 0.65, 0.26]} c="#b3764c" />
      <Block p={[0.44, 0.9, 0]} s={[0.2, 0.65, 0.26]} c="#b3764c" />
      <Block p={[0.46, 0.56, 0.13]} s={[0.12, 0.16, 0.25]} c="#7b8e88" />
      <pointLight
        position={[0.46, 0.6, 0.3]}
        color="#ffd4a3"
        intensity={7}
        distance={5}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[0.64, 0.68, 40]} />
        <meshBasicMaterial color="#e4b882" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
function Hallway({
  portals,
  folder,
  onPortal,
  region,
  level = 0,
}: {
  level?: number;
  portals: Portal[];
  folder: string;
  onPortal: (p: Portal) => void;
  region: number;
}) {
  const end = Math.min(-6, ...portals.map((p) => p.z - 4));
  return (
    <group>
      <Block
        p={[-0.8, -0.15, (end + 9.2) / 2]}
        s={[14.4, 0.3, 9.2 - end]}
        c="#455653"
      />
      <FloorSurface
        x={-0.8}
        z={(end + 9.2) / 2}
        width={14.4}
        depth={9.2 - end}
      />
      {[-1.72, 1.72].map((x) => (
        <Block
          key={x}
          p={[x, 0.025, (end + 9) / 2]}
          s={[0.045, 0.02, 9 - end]}
          c="#c2a77f"
          glow={0.25}
        />
      ))}
      <Block
        p={[-6.82, 0.15, (end + 9) / 2]}
        s={[0.07, 0.3, 9 - end]}
        c="#8b9990"
      />
      <Block
        p={[6.82, 0.15, (end + 1) / 2]}
        s={[0.07, 0.3, 1 - end]}
        c="#8b9990"
      />
      <Block
        p={[0, 0.02, (end + 9) / 2]}
        s={[3.2, 0.025, 9 - end]}
        c="#596762"
      />
      <Block p={[-7, 1.7, (end + 9) / 2]} s={[0.3, 3.4, 9 - end]} c="#34464c" />
      <Block p={[7, 1.7, (end + 1) / 2]} s={[0.3, 3.4, 1 - end]} c="#34464c" />
      <Block p={[0, 2, end]} s={[14, 4, 0.3]} c="#34464c" />
      <Label
        text={folder + ' /  FILE GALLERY'}
        p={[0, 3.5, end + 0.2]}
        width={10}
      />
      {portals
        .filter((p) => Math.abs(p.z - region) < 75)
        .map((portal, i) => (
          <group
            key={portal.path}
            position={[portal.x, 0, portal.z]}
            rotation={[0, portal.x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          >
            <Block p={[0, 1.65, -0.7]} s={[5.1, 3.3, 1.3]} c="#34484f" />
            <Block p={[0, 1.45, 0.02]} s={[2.1, 2.9, 0.12]} c="#172a32" />
            <Block
              p={[-1.08, 1.45, 0.14]}
              s={[0.065, 2.95, 0.09]}
              c={portal.kind === 'folder' ? '#a9d7da' : amber}
              glow={2}
            />
            <Block
              p={[1.08, 1.45, 0.14]}
              s={[0.065, 2.95, 0.09]}
              c={portal.kind === 'folder' ? '#a9d7da' : amber}
              glow={2}
            />
            <Block
              p={[0, 2.93, 0.14]}
              s={[2.2, 0.065, 0.09]}
              c={portal.kind === 'folder' ? '#a9d7da' : amber}
              glow={2}
            />
            <mesh
              position={[0, 1.45, 0.17]}
              onClick={(e) => {
                e.stopPropagation();
                onPortal(portal);
              }}
            >
              <boxGeometry args={[1.95, 2.8, 0.08]} />
              <meshStandardMaterial
                color={portal.kind === 'folder' ? '#37545b' : '#2c3f48'}
              />
            </mesh>
            <Block
              p={[0.72, 1.4, 0.25]}
              s={[0.06, 0.3, 0.1]}
              c={amber}
              glow={1}
            />
            <Label
              text={
                (portal.kind === 'folder' ? '↳ ' : '') +
                portal.path.split('/').pop() +
                (portal.kind === 'folder' ? '/' : '')
              }
              p={[0, 3.48, 0.05]}
              width={4.8}
              size={40}
            />
            <Label
              text={portal.kind === 'folder' ? 'SUBFOLDER WING' : 'FILE ROOM'}
              p={[0, 0.5, 0.24]}
              width={1.6}
              size={36}
            />
            {i % 4 === 0 && (
              <pointLight
                position={[0, 2, 1.3]}
                color={portal.kind === 'folder' ? '#b5dbe4' : amber}
                intensity={13}
                distance={8}
              />
            )}
          </group>
        ))}
      <group position={[0, 0, 8]} rotation={[0, Math.PI, 0]}>
        <Label
          text={
            level === 0 ? 'EXIT TO STREET · E' : 'STAIRS DOWN · LIFT TO STREET'
          }
          p={[0, 1.7, 0]}
          width={4}
        />
        <Block p={[0, 0.04, 0]} s={[4, 0.08, 1]} c="#8fa797" />
      </group>
      <pointLight
        position={[0, 5, 3]}
        intensity={45}
        color="#bdcfc7"
        distance={19}
      />
    </group>
  );
}
type Interaction =
  | Portal
  | { kind: 'exit'; path: string }
  | { kind: 'symbol'; path: string; symbol: CodeConstruct };
function Scene(props: Props) {
  const {
    files,
    layoutFiles,
    folder,
    inside,
    active,
    onEnter,
    onFolderEnter,
    onLeave,
    onNear,
    reset,
    paused,
    onFloor,
    onInspect,
    floorRequest,
    changes,
    timeRevision,
  } = props;
  const districts = useMemo(() => {
    const current = new Map(buildDistricts(files).map((d) => [d.path, d]));
    return buildDistricts(layoutFiles).map((base) => ({
      ...base,
      ...current.get(base.path),
      x: base.x,
      z: base.z,
    }));
  }, [files, layoutFiles]);
  const presentFolders = useMemo(
    () => new Set(buildDistricts(files).map((d) => d.path)),
    [files],
  );
  const currentDistrict = districts.find((d) => d.path === folder),
    floors = floorsFor(currentDistrict);
  const allPortals = useMemo(
    () => buildPortals(files, districts, folder),
    [files, districts, folder],
  );
  const [level, setLevel] = useState(0),
    [region, setRegion] = useState(0);
  const levelRef = useRef(0),
    regionRef = useRef(0);
  const portals = useMemo(
    () => floorPortals(allPortals, level, floors),
    [allPortals, level, floors],
  );
  const player = useRef<THREE.Group>(null),
    lift = useRef<THREE.Group>(null),
    moving = useRef(false),
    keys = useRef(new Set<string>()),
    angle = useRef(0.28),
    zoom = useRef(25),
    drag = useRef<number | null>(null),
    lastNear = useRef(''),
    nearest = useRef<Interaction | null>(null),
    target = useRef(new THREE.Vector3()),
    positions = useRef(new Map<string, THREE.Vector3>()),
    previous = useRef('city'),
    lastReset = useRef(reset),
    elevatorTarget = useRef<number | null>(null),
    lastLiftRequest = useRef<Props['floorRequest']>(null);
  const { camera, gl } = useThree();
  const activePath = active?.path;
  const location = activePath
    ? 'room:' + activePath
    : inside
      ? 'hall:' + folder
      : 'city';
  const activate = (item: Interaction) => {
    if (item.kind === 'exit') onLeave();
    else if (item.kind === 'symbol') onInspect(item.symbol);
    else if (item.kind === 'folder') onFolderEnter(item.path);
    else {
      const file = files.find((f) => f.path === item.path);
      if (file) onEnter(file);
    }
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        (e.target instanceof Element &&
          e.target.closest('input,textarea,[role="slider"]')) ||
        paused
      )
        return;
      const k = e.key.toLowerCase();
      if (
        [
          'w',
          'a',
          's',
          'd',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
          ' ',
        ].includes(k)
      )
        e.preventDefault();
      keys.current.add(k);
      if (k === 'e' && !e.repeat && nearest.current) {
        const item = nearest.current;
        if (item.kind === 'exit') onLeave();
        else if (item.kind === 'symbol') onInspect(item.symbol);
        else if (item.kind === 'folder') onFolderEnter(item.path);
        else {
          const file = files.find((f) => f.path === item.path);
          if (file) onEnter(file);
        }
      }
      if (k === 'escape' && (activePath || inside)) onLeave();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [
    activePath,
    inside,
    onEnter,
    onFolderEnter,
    onLeave,
    onInspect,
    paused,
    files,
  ]);
  useEffect(() => {
    if (player.current) {
      if (lastReset.current !== reset) {
        positions.current.clear();
        lastReset.current = reset;
      } else if (previous.current !== location)
        positions.current.set(
          previous.current,
          player.current.position.clone(),
        );
      const saved = positions.current.get(location);
      player.current.position.copy(
        saved || new THREE.Vector3(0, 0, activePath ? 3 : inside ? 6 : 12),
      );
      player.current.rotation.y = Math.PI;
      target.current.copy(player.current.position);
      previous.current = location;
    }
    elevatorTarget.current = null;
    levelRef.current = -1;
    keys.current.clear();
    lastNear.current = '';
    onNear('');
  }, [location, activePath, inside, onNear, reset]);
  useEffect(() => {
    if (
      floorRequest &&
      floorRequest !== lastLiftRequest.current &&
      inside &&
      !activePath &&
      player.current
    ) {
      lastLiftRequest.current = floorRequest;
      player.current.position.x = 2;
      player.current.position.z = 8.6;
      elevatorTarget.current =
        Math.min(floors, Math.max(0, floorRequest.level)) * 6;
      keys.current.clear();
    }
  }, [floorRequest, inside, activePath, floors]);
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current = e.clientX;
    };
    const move = (e: PointerEvent) => {
      if (drag.current !== null) {
        angle.current -= (e.clientX - drag.current) * 0.006;
        drag.current = e.clientX;
      }
    };
    const up = () => {
      drag.current = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom.current = THREE.MathUtils.clamp(
        zoom.current + e.deltaY * 0.015,
        10,
        60,
      );
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl]);
  const cityEnd = (districts.at(-1)?.z || 0) - 15,
    hallEnd = (portals.at(-1)?.z || 0) - 2,
    depth = roomDepth(active?.analysis?.constructs.length || 0);
  useFrame((_, delta) => {
    if (!player.current) return;
    const dt = Math.min(delta, 0.04),
      p = player.current;
    let dx = 0,
      dz = 0;
    if (!paused && elevatorTarget.current === null) {
      if (keys.current.has('w') || keys.current.has('arrowup')) dz--;
      if (keys.current.has('s') || keys.current.has('arrowdown')) dz++;
      if (keys.current.has('a') || keys.current.has('arrowleft')) dx--;
      if (keys.current.has('d') || keys.current.has('arrowright')) dx++;
    }
    if (elevatorTarget.current !== null) {
      const difference = elevatorTarget.current - p.position.y;
      const step =
        Math.sign(difference) * Math.min(Math.abs(difference), dt * 4.5);
      p.position.y += step;
      if (Math.abs(difference) < 0.03) {
        p.position.y = elevatorTarget.current;
        elevatorTarget.current = null;
      }
    }
    moving.current = !!(dx || dz);
    if (moving.current) {
      const length = Math.hypot(dx, dz);
      dx /= length;
      dz /= length;
      const speed = (keys.current.has('shift') ? 8 : 4.4) * dt,
        mx =
          (dx * Math.cos(angle.current) + dz * Math.sin(angle.current)) * speed,
        mz =
          (-dx * Math.sin(angle.current) + dz * Math.cos(angle.current)) *
          speed;
      const blocked = (x: number, z: number) =>
        activePath
          ? (active?.analysis?.constructs || []).some((_, i) => {
              const q = symbolPosition(i);
              return Math.abs(x - q.x) < 1.8 && Math.abs(z - q.z) < 1.65;
            })
          : inside
            ? level < floors && z < 1 && Math.abs(x) > 3.8
            : districts.some(
                (d) =>
                  Math.abs(x - d.x) < 3.8 * d.scale + 0.35 &&
                  z < d.z + 2.85 * d.scale + 0.4 &&
                  z > d.z - 4.05 * d.scale - 0.4,
              );
      const minX = activePath
          ? -10
          : inside
            ? level === floors
              ? -10
              : -6.5
            : -35,
        maxX = activePath ? 10 : inside ? 13.4 : 35,
        minZ = activePath
          ? -depth + 1
          : inside
            ? level === floors
              ? -11
              : hallEnd
            : cityEnd,
        maxZ = activePath ? 6 : inside ? 9 : 20;
      const move = (x: number, z: number) => {
        x = THREE.MathUtils.clamp(x, minX, maxX);
        z = THREE.MathUtils.clamp(z, minZ, maxZ);
        if (blocked(x, z)) return;
        const height =
          inside && !activePath ? walkingHeight(x, z, p.position.y, floors) : 0;
        if (height === null) return;
        p.position.set(x, height, z);
      };
      move(p.position.x + mx, p.position.z);
      move(p.position.x, p.position.z + mz);
      const rotation = Math.atan2(mx, mz);
      p.rotation.y +=
        Math.atan2(
          Math.sin(rotation - p.rotation.y),
          Math.cos(rotation - p.rotation.y),
        ) *
        (1 - Math.exp(-12 * dt));
    }
    const nextLevel =
      inside && !activePath
        ? Math.max(0, Math.min(floors, Math.round(p.position.y / 6)))
        : levelRef.current;
    if (nextLevel !== levelRef.current) {
      levelRef.current = nextLevel;
      setLevel(nextLevel);
      onFloor(nextLevel);
    }
    if (lift.current) {
      lift.current.visible = inside && !activePath;
      lift.current.position.set(2, p.position.y - 0.13, 8.6);
    }
    let close: Interaction | null = null;
    if (activePath) {
      for (const [i, symbol] of (
        active?.analysis?.constructs || []
      ).entries()) {
        const q = symbolPosition(i);
        if (Math.hypot(p.position.x - q.x, p.position.z - q.z) < 3.4) {
          close = { kind: 'symbol', path: symbol.name, symbol };
          break;
        }
      }
    } else if (inside) {
      if (
        elevatorTarget.current === null &&
        Math.abs(p.position.y - level * 6) < 0.3
      ) {
        if (level === 0 && p.position.z > 7 && Math.abs(p.position.x) < 1.4)
          close = { kind: 'exit', path: 'Back to street' };
        else if (level < floors)
          for (const portal of portals) {
            if (
              Math.hypot(p.position.x - portal.x, p.position.z - portal.z) < 2.4
            ) {
              close = portal;
              break;
            }
          }
      }
    } else
      for (const d of districts) {
        const exists = presentFolders.has(d.path);
        if (
          exists &&
          Math.hypot(p.position.x - d.x, p.position.z - (d.z + 3.8 * d.scale)) <
            3.2 * d.scale
        ) {
          close = { kind: 'folder', path: d.path, x: d.x, z: d.z };
          break;
        }
      }
    nearest.current = close;
    const name = close
      ? close.kind === 'symbol'
        ? `Inspect ${close.path}`
        : close.kind === 'folder'
          ? close.path + '/'
          : close.kind === 'exit'
            ? close.path
            : close.path.split('/').pop()!
      : '';
    if (name !== lastNear.current) {
      lastNear.current = name;
      onNear(name);
    }
    const nextRegion = Math.round(p.position.z / 30) * 30;
    if (nextRegion !== regionRef.current) {
      regionRef.current = nextRegion;
      setRegion(nextRegion);
    }
    target.current.lerp(
      new THREE.Vector3(p.position.x, p.position.y + 1, p.position.z - 3),
      1 - Math.exp(-4 * dt),
    );
    const dist = inside || activePath ? zoom.current * 0.62 : zoom.current;
    const desired = new THREE.Vector3(
      target.current.x + Math.sin(angle.current) * dist,
      target.current.y + dist * 0.79,
      target.current.z + Math.cos(angle.current) * dist,
    );
    camera.position.lerp(desired, 1 - Math.exp(-4 * dt));
    camera.lookAt(target.current);
  });
  const statusFor = (d: District): ChangeKind => {
    const values = Object.entries(changes)
      .filter(([path]) => d.path === '.' || path.startsWith(d.path + '/'))
      .map(([, kind]) => kind);
    if (values.length && values.every((v) => v === 'removed')) return 'removed';
    if (values.length && values.every((v) => v === 'added')) return 'added';
    return values.some((v) => v !== 'unchanged') ? 'modified' : 'unchanged';
  };
  return (
    <>
      <color attach="background" args={['#364d59']} />
      <fog attach="fog" args={['#364d59', 45, 125]} />
      <ambientLight intensity={0.55} color="#a2bdc8" />
      <hemisphereLight args={['#a7c5d1', '#26363d', 1.4]} />
      <directionalLight
        position={[-12, 40, 7]}
        color="#c5d3d2"
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0005}
      />
      {active ? (
        <Interior file={active} onInspect={onInspect} />
      ) : inside ? (
        <>
          {level < floors ? (
            <group position={[0, level * 6, 0]}>
              <Hallway
                portals={portals}
                folder={`${folder} · FLOOR ${level + 1}`}
                onPortal={activate}
                region={region}
                level={level}
              />
            </group>
          ) : (
            <Roof
              district={currentDistrict}
              districts={districts}
              level={floors}
              onEnter={onFolderEnter}
            />
          )}
          <Stairwell floors={floors} current={level} />
          <group ref={lift}>
            <Block p={[0, 0, 0]} s={[2.7, 0.22, 2]} c="#628d85" />
            <Block
              p={[0, 0.12, 0]}
              s={[2.6, 0.03, 1.9]}
              c="#b0ddd1"
              glow={0.6}
            />
          </group>
        </>
      ) : (
        <>
          <Block
            p={[0, -0.35, (cityEnd + 22) / 2]}
            s={[160, 0.5, 22 - cityEnd]}
            c="#293b43"
          />
          <Block
            p={[0, -0.04, (cityEnd + 22) / 2]}
            s={[5.1, 0.12, 22 - cityEnd]}
            c="#35444a"
          />
          <CityLife
            end={cityEnd}
            region={region}
            paused={paused}
            player={player}
          />
          {[-3.08, 3.08].map((x) => (
            <group key={`pavement-${x}`}>
              <Block
                p={[x, 0.035, (cityEnd + 22) / 2]}
                s={[1.05, 0.15, 22 - cityEnd]}
                c="#8f9b94"
              />
            </group>
          ))}
          {[-2, -1.2, -0.4, 0.4, 1.2, 2].map((x) => (
            <Block
              key={`crossing-${x}`}
              p={[x, 0.03, 10]}
              s={[0.42, 0.025, 2.4]}
              c="#dbd8be"
            />
          ))}
          {Array.from({ length: 70 }, (_, i) => region + 65 - i * 2)
            .filter((z) => z < 22 && z > cityEnd)
            .map((z) => (
              <Block
                key={z}
                p={[0, 0.035, z]}
                s={[0.08, 0.01, 0.7]}
                c="#919685"
              />
            ))}
          {[-2.57, 2.57].map((x) => (
            <Block
              key={x}
              p={[x, 0.03, (cityEnd + 22) / 2]}
              s={[0.15, 0.15, 22 - cityEnd]}
              c="#77847e"
            />
          ))}
          {districts.map((d, i) =>
            Math.abs(d.z - region) < 110 ? (
              <TemporalBuilding
                key={d.path}
                district={d}
                i={i}
                onEnter={onFolderEnter}
                status={statusFor(d)}
                revision={timeRevision}
              />
            ) : null,
          )}
          {districts
            .filter((d) => Math.abs(d.z - region) < 55)
            .map((d) => (
              <group key={d.path}>
                <Lamp x={d.x > 0 ? 3.8 : -3.8} z={d.z + 5 * d.scale} />
                <Birch x={d.x > 0 ? 5.1 : -5.1} z={d.z + 5 * d.scale + 1.2} />
              </group>
            ))}
          {Array.from({ length: 14 }, (_, i) => (
            <Block
              key={i}
              p={[
                (i % 2 ? 1 : -1) * (32 + (i % 3) * 6),
                3 + (i % 4) * 2,
                region + 15 - Math.floor(i / 2) * 15,
              ]}
              s={[7, 6 + (i % 4) * 4, 9]}
              c="#2f424b"
            />
          ))}
        </>
      )}
      <group ref={player} position={[0, 0, 12]}>
        <Player moving={moving} />
      </group>
    </>
  );
}
export default function World(props: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (props.muted) return;
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0.025;
    gain.connect(ctx.destination);
    const oscillators = [65.4, 98, 130.8].map((f) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      return o;
    });
    void ctx.resume();
    return () => {
      oscillators.forEach((o) => o.stop());
      void ctx.close();
    };
  }, [props.muted]);
  if (failed)
    return (
      <div className="world-loading">
        3D rendering is unavailable. Enable WebGL or try another browser.
      </div>
    );
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.7]}
      camera={{ position: [12, 20, 30], fov: 43, near: 0.1, far: 160 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        gl.domElement.addEventListener('webglcontextlost', () =>
          setFailed(true),
        );
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
