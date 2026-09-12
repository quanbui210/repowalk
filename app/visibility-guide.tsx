'use client';
import { useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function VisibilityGuide({
  player,
  enabled,
}: {
  player: RefObject<THREE.Group | null>;
  enabled: boolean;
}) {
  const { scene, camera } = useThree();
  const elapsed = useRef(0),
    marker = useRef<THREE.Group>(null);
  const ray = useRef(new THREE.Ray()),
    box = useRef(new THREE.Box3()),
    point = useRef(new THREE.Vector3()),
    hit = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    if (!player.current) return;
    if (marker.current) marker.current.position.copy(player.current.position);
    elapsed.current += dt;
    if (elapsed.current < 0.1) return;
    elapsed.current = 0;
    point.current.copy(player.current.position).y += 1;
    ray.current.origin.copy(camera.position);
    ray.current.direction.copy(point.current).sub(camera.position).normalize();
    const distance = camera.position.distanceTo(point.current);
    let hidden = false;
    scene.traverse((object) => {
      if (!object.userData.occludingBuilding) return;
      box.current.setFromObject(object);
      const intersection =
        enabled && ray.current.intersectBox(box.current, hit.current);
      const obstructing =
        !!intersection &&
        camera.position.distanceTo(hit.current) < distance - 0.8;
      hidden ||= obstructing;
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((material) => {
          if (!material.userData.visibilityOriginal) {
            material.userData.visibilityOriginal = {
              opacity: material.opacity,
              transparent: material.transparent,
              depthWrite: material.depthWrite,
            };
          }
          const original = material.userData.visibilityOriginal;
          const desired = object.userData.removed
            ? 0.2
            : obstructing
              ? 0.035
              : original.opacity;
          material.opacity = THREE.MathUtils.lerp(
            material.opacity,
            desired,
            0.55,
          );
          const transparent = original.transparent || material.opacity < 0.99;
          if (material.transparent !== transparent) {
            material.transparent = transparent;
            material.needsUpdate = true;
          }
          material.depthWrite = obstructing ? false : original.depthWrite;
        });
      });
    });
    if (marker.current) {
      marker.current.visible = enabled && hidden;
      marker.current.rotation.copy(player.current.rotation);
    }
  });
  return (
    <group ref={marker} visible={false}>
      {[
        [0, 1, 0, 0.65, 0.8, 0.4],
        [0, 1.65, 0, 0.43, 0.43, 0.4],
        [-0.19, 0.35, 0, 0.23, 0.6, 0.3],
        [0.19, 0.35, 0, 0.23, 0.6, 0.3],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]]} renderOrder={9999}>
          <boxGeometry args={[p[3], p[4], p[5]]} />
          <meshBasicMaterial
            color="#ffe0a0"
            transparent
            opacity={0.9}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
