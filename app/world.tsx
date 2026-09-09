'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { RepoFile } from './page';
import {
  buildDistricts,
  buildPortals,
  type District,
  type Portal,
} from '@/lib/world-layout';
type Props = {
  files: RepoFile[];
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
}: {
  district: District;
  i: number;
  onEnter: (path: string) => void;
}) {
  const { x, z, scale, height: h } = district;
  return (
    <group position={[x, 0, z]} scale={[scale, 1, scale]}>
      <Block p={[0, 0.15, 0]} s={[9, 0.3, 8.8]} c="#526064" />
      <Block
        p={[0, h / 2, -0.6]}
        s={[7.6, h, 6.9]}
        c={i % 3 === 0 ? '#4c5c60' : i % 3 === 1 ? '#5e6460' : '#414e56'}
      />
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
          <Block p={[wx, 2.3, 2.92]} s={[1.4, 1.85, 0.12]} c="#202f37" />
          <Block
            p={[wx, 2.3, 3]}
            s={[1.1, 1.5, 0.03]}
            c={i % 3 === 1 ? '#ca985e' : '#8baaa8'}
            glow={0.65}
          />
          <Block p={[wx, 2.3, 3.04]} s={[0.08, 1.6, 0.07]} c="#3c4b4b" />
          <Block p={[wx, 2.3, 3.04]} s={[1.2, 0.07, 0.07]} c="#3c4b4b" />
          <Block p={[wx, 1.48, 3.13]} s={[1.6, 0.15, 0.5]} c="#5c6a68" />
        </group>
      ))}
      <Block p={[0, 1.52, 3.01]} s={[2.2, 3.05, 0.22]} c="#1b282e" />
      <Block p={[-1.04, 1.52, 3.16]} s={[0.07, 3, 0.1]} c={amber} glow={2} />
      <Block p={[1.04, 1.52, 3.16]} s={[0.07, 3, 0.1]} c={amber} glow={2} />
      <Block p={[0, 3.04, 3.16]} s={[2.15, 0.07, 0.1]} c={amber} glow={2} />
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
        c={amber}
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
              <Block
                key={wx}
                p={[wx, 5 + floor * 1.5, 2.95]}
                s={[1.1, 0.75, 0.035]}
                c={i % 2 ? '#a0bdb8' : '#d0ae7b'}
                glow={0.45}
              />
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
        color={amber}
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
function Interior({ file }: { file: RepoFile }) {
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
      <Block p={[0, -0.2, -2]} s={[17, 0.4, 18]} c="#435657" />
      <Block p={[0, 3.2, -10]} s={[17, 6.4, 0.45]} c="#394a50" />
      <Block p={[-8.5, 3.2, -2]} s={[0.45, 6.4, 16]} c="#34494e" />
      <Block p={[8.5, 3.2, -2]} s={[0.45, 6.4, 16]} c="#34494e" />
      <Label text={file.path} p={[0, 5.7, -9.72]} width={11} size={36} />
      <mesh position={[0, 3.2, -9.7]}>
        <planeGeometry args={[9, 5.2]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      <Block p={[0, 0.35, -8.7]} s={[10, 0.7, 2]} c="#4b5d5c" />
      {[-7.5, 7.5].map((x) => (
        <group key={x}>
          <Block p={[x, 3, -9.6]} s={[0.12, 5.6, 0.15]} c={amber} glow={3} />
          <pointLight
            position={[x, 4, -7]}
            color={amber}
            intensity={45}
            distance={13}
          />
          <Block p={[x / 1.6, 0.7, -3]} s={[2.5, 1.4, 1.2]} c="#2b4048" />
          <Block p={[x / 1.6, 1.45, -3]} s={[2.8, 0.1, 1.4]} c="#9aa99c" />
        </group>
      ))}
      <Label text="←  ESC · BACK TO THE DISTRICT" p={[0, 1.6, 5]} width={5} />
      <pointLight
        position={[0, 5, 0]}
        color="#99c9d1"
        intensity={40}
        distance={16}
      />
    </group>
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
}: {
  portals: Portal[];
  folder: string;
  onPortal: (p: Portal) => void;
  region: number;
}) {
  const end = Math.min(-6, ...portals.map((p) => p.z - 4));
  return (
    <group>
      <Block p={[0, -0.15, (end + 9) / 2]} s={[16, 0.3, 9 - end]} c="#455653" />
      <Block
        p={[0, 0.02, (end + 9) / 2]}
        s={[3.2, 0.025, 9 - end]}
        c="#596762"
      />
      <Block p={[-7, 1.7, (end + 9) / 2]} s={[0.3, 3.4, 9 - end]} c="#34464c" />
      <Block p={[7, 1.7, (end + 9) / 2]} s={[0.3, 3.4, 9 - end]} c="#34464c" />
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
        <Label text="EXIT TO STREET · E" p={[0, 1.7, 0]} width={4} />
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
function Scene(props: Props) {
  const {
    files,
    folder,
    inside,
    active,
    onEnter,
    onFolderEnter,
    onLeave,
    onNear,
    reset,
    paused,
  } = props;
  const districts = useMemo(() => buildDistricts(files), [files]);
  const portals = useMemo(
    () => buildPortals(files, districts, folder),
    [files, districts, folder],
  );
  const player = useRef<THREE.Group>(null),
    moving = useRef(false),
    keys = useRef(new Set<string>()),
    angle = useRef(0.28),
    zoom = useRef(25),
    drag = useRef<number | null>(null),
    lastNear = useRef(''),
    nearest = useRef<Portal | { kind: 'exit'; path: string } | null>(null),
    target = useRef(new THREE.Vector3()),
    positions = useRef(new Map<string, THREE.Vector3>()),
    previous = useRef('city'),
    lastReset = useRef(reset);
  const [region, setRegion] = useState(0);
  const regionRef = useRef(0);
  const { camera, gl } = useThree();
  const activePath = active?.path;
  const location = activePath
    ? 'room:' + activePath
    : inside
      ? 'hall:' + folder
      : 'city';
  const perform = (portal: Portal | { kind: 'exit'; path: string }) => {
    if (portal.kind === 'exit') {
      onLeave();
      return;
    }
    if (portal.kind === 'folder') {
      onFolderEnter(portal.path);
      return;
    }
    const file = files.find((f) => f.path === portal.path);
    if (file) onEnter(file);
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea') || paused)
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
      if (k === 'e' && !e.repeat && nearest.current && !activePath) {
        const portal = nearest.current;
        if (portal.kind === 'exit') onLeave();
        else if (portal.kind === 'folder') onFolderEnter(portal.path);
        else {
          const file = files.find((f) => f.path === portal.path);
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
  }, [activePath, inside, onEnter, onFolderEnter, onLeave, paused, files]);
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
    keys.current.clear();
    lastNear.current = '';
    onNear('');
  }, [location, activePath, inside, onNear, reset]);
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
        46,
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
    hallEnd = (portals.at(-1)?.z || 0) - 2;
  useFrame((_, dt) => {
    if (!player.current) return;
    dt = Math.min(dt, 0.04);
    const p = player.current;
    let dx = 0,
      dz = 0;
    if (!paused) {
      if (keys.current.has('w') || keys.current.has('arrowup')) dz--;
      if (keys.current.has('s') || keys.current.has('arrowdown')) dz++;
      if (keys.current.has('a') || keys.current.has('arrowleft')) dx--;
      if (keys.current.has('d') || keys.current.has('arrowright')) dx++;
    }
    moving.current = !!(dx || dz);
    if (moving.current) {
      const length = Math.hypot(dx, dz);
      dx /= length;
      dz /= length;
      const speed = (keys.current.has('shift') ? 8 : 4.4) * dt;
      const mx =
          (dx * Math.cos(angle.current) + dz * Math.sin(angle.current)) * speed,
        mz =
          (-dx * Math.sin(angle.current) + dz * Math.cos(angle.current)) *
          speed;
      const nx = p.position.x + mx,
        nz = p.position.z + mz;
      const blocked = (x: number, z: number) =>
        !inside &&
        !activePath &&
        districts.some(
          (d) =>
            Math.abs(x - d.x) < 3.8 * d.scale + 0.35 &&
            z < d.z + 2.85 * d.scale + 0.4 &&
            z > d.z - 4.05 * d.scale - 0.4,
        );
      const bound = activePath ? 7.5 : inside ? 3.8 : 35;
      if (!blocked(nx, p.position.z))
        p.position.x = THREE.MathUtils.clamp(nx, -bound, bound);
      if (!blocked(p.position.x, nz))
        p.position.z = THREE.MathUtils.clamp(
          nz,
          activePath ? -7.5 : inside ? hallEnd : cityEnd,
          activePath ? 6 : inside ? 8 : 20,
        );
      const rotation = Math.atan2(mx, mz);
      p.rotation.y +=
        Math.atan2(
          Math.sin(rotation - p.rotation.y),
          Math.cos(rotation - p.rotation.y),
        ) *
        (1 - Math.exp(-12 * dt));
    }
    let close: Portal | { kind: 'exit'; path: string } | null = null;
    if (!activePath) {
      if (inside) {
        if (p.position.z > 6.8)
          close = { kind: 'exit', path: 'Back to the street' };
        else
          for (const portal of portals) {
            if (
              Math.hypot(p.position.x - portal.x, p.position.z - portal.z) < 2.4
            ) {
              close = portal;
              break;
            }
          }
      } else
        for (const d of districts) {
          if (
            Math.hypot(
              p.position.x - d.x,
              p.position.z - (d.z + 3.8 * d.scale),
            ) <
            3.2 * d.scale
          ) {
            close = { kind: 'folder', path: d.path, x: d.x, z: d.z };
            break;
          }
        }
    }
    nearest.current = close;
    const name = close
      ? close.kind === 'folder'
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
    const dist = inside || activePath ? zoom.current * 0.59 : zoom.current;
    const desired = new THREE.Vector3(
      target.current.x + Math.sin(angle.current) * dist,
      target.current.y + dist * 0.79,
      target.current.z + Math.cos(angle.current) * dist,
    );
    camera.position.lerp(desired, 1 - Math.exp(-4 * dt));
    camera.lookAt(target.current);
  });
  return (
    <>
      <color attach="background" args={['#19252d']} />
      <fog attach="fog" args={['#19252d', 35, 110]} />
      <ambientLight intensity={0.55} color="#a2bdc8" />
      <hemisphereLight args={['#a7c5d1', '#26363d', 1.4]} />
      <directionalLight
        position={[-12, 25, 7]}
        color="#c5d3d2"
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.0005}
      />
      {active ? (
        <Interior file={active} />
      ) : inside ? (
        <Hallway
          portals={portals}
          folder={folder}
          onPortal={perform}
          region={region}
        />
      ) : (
        <>
          <Block
            p={[0, -0.35, (cityEnd + 22) / 2]}
            s={[160, 0.5, 22 - cityEnd]}
            c="#293b43"
          />
          <Block
            p={[0, -0.04, (cityEnd + 22) / 2]}
            s={[7, 0.12, 22 - cityEnd]}
            c="#35444a"
          />
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
          {[-3.5, 3.5].map((x) => (
            <Block
              key={x}
              p={[x, 0.03, (cityEnd + 22) / 2]}
              s={[0.15, 0.15, 22 - cityEnd]}
              c="#77847e"
            />
          ))}
          {districts.map((d, i) =>
            Math.abs(d.z - region) < 110 ? (
              <Building
                key={d.path}
                district={d}
                i={i}
                onEnter={onFolderEnter}
              />
            ) : null,
          )}
          {districts
            .filter((d) => Math.abs(d.z - region) < 55)
            .map((d) => (
              <Lamp
                key={d.path}
                x={d.x > 0 ? 3.8 : -3.8}
                z={d.z + 5 * d.scale}
              />
            ))}
          {Array.from({ length: 14 }, (_, i) => (
            <Block
              key={'skyline' + i}
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
      shadows
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
