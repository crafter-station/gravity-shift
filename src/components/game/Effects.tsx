"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  DoubleSide,
  type InstancedMesh,
  type Mesh,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
} from "three";
import { type ImpactEvent, onImpact } from "@/game/effects";

const SLOTS = 16;
const SPARKS = 12;
const LIFE = 0.6;
const GRAVITY = 14;
const RING_LIFE = 0.45;

type Slot = {
  age: number;
  active: boolean;
  x: number;
  y: number;
  z: number;
  strength: number;
  /** Per-spark position (3) and velocity (3). */
  pos: Float32Array;
  vel: Float32Array;
};

const dummy = new Object3D();
const tmpColor = new Color();

/** Pooled shockwave rings + one instanced mesh of debris for all impacts. */
export function Effects() {
  const sparks = useRef<InstancedMesh>(null);
  const rings = useRef<(Mesh | null)[]>([]);
  const next = useRef(0);

  const { slots, ringGeo, ringMats, sparkMat } = useMemo(() => {
    const slots: Slot[] = Array.from({ length: SLOTS }, () => ({
      age: 0,
      active: false,
      x: 0,
      y: 0,
      z: 0,
      strength: 0,
      pos: new Float32Array(SPARKS * 3),
      vel: new Float32Array(SPARKS * 3),
    }));
    const ringGeo = new RingGeometry(0.85, 1, 32).rotateX(-Math.PI / 2);
    const ringMats = Array.from(
      { length: SLOTS },
      () =>
        new MeshBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: DoubleSide,
        }),
    );
    const sparkMat = new MeshBasicMaterial({ color: "#ffffff" });
    return { slots, ringGeo, ringMats, sparkMat };
  }, []);

  useEffect(() => {
    const inst = sparks.current;
    if (inst) {
      // Hide all instances initially.
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      for (let i = 0; i < SLOTS * SPARKS; i++) {
        inst.setMatrixAt(i, dummy.matrix);
        inst.setColorAt(i, tmpColor.set("#ffffff"));
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }

    const spawn = (e: ImpactEvent) => {
      const idx = next.current;
      next.current = (idx + 1) % SLOTS;
      const s = slots[idx];
      s.active = true;
      s.age = 0;
      s.x = e.x;
      s.y = Math.max(e.y, 0.06);
      s.z = e.z;
      s.strength = e.strength;

      ringMats[idx].color.set(e.projectile ? "#ffffff" : e.color);

      const speed = 3 + e.strength * 7 * (e.projectile ? 1.3 : 1);
      for (let i = 0; i < SPARKS; i++) {
        const a = Math.random() * Math.PI * 2;
        const h = speed * (0.4 + Math.random() * 0.6);
        s.pos[i * 3] = e.x;
        s.pos[i * 3 + 1] = e.y;
        s.pos[i * 3 + 2] = e.z;
        s.vel[i * 3] = Math.cos(a) * h;
        s.vel[i * 3 + 1] = speed * (0.4 + Math.random() * 0.8);
        s.vel[i * 3 + 2] = Math.sin(a) * h;
      }
      if (inst) {
        tmpColor.set(e.color);
        for (let i = 0; i < SPARKS; i++) {
          inst.setColorAt(idx * SPARKS + i, tmpColor);
        }
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      }
    };

    return onImpact(spawn);
  }, [slots, ringMats]);

  useEffect(
    () => () => {
      ringGeo.dispose();
      sparkMat.dispose();
      for (const m of ringMats) m.dispose();
    },
    [ringGeo, sparkMat, ringMats],
  );

  useFrame((_, delta) => {
    const inst = sparks.current;
    if (!inst) return;
    const dt = Math.min(delta, 0.05);
    let dirty = false;

    for (let si = 0; si < SLOTS; si++) {
      const s = slots[si];
      if (!s.active) continue;
      const ring = rings.current[si];
      s.age += dt;
      dirty = true;

      if (ring) {
        const rt = s.age / RING_LIFE;
        if (rt < 1) {
          const size = (1.2 + s.strength * 3.2) * (1 - (1 - rt) ** 3) + 0.2;
          ring.visible = true;
          ring.position.set(s.x, s.y, s.z);
          ring.scale.set(size, 1, size);
          ringMats[si].opacity = (1 - rt) * (0.5 + s.strength * 0.4);
        } else {
          ring.visible = false;
        }
      }

      const t = s.age / LIFE;
      const done = t >= 1;
      for (let i = 0; i < SPARKS; i++) {
        const k = i * 3;
        if (done) {
          dummy.scale.setScalar(0);
        } else {
          s.vel[k + 1] -= GRAVITY * dt;
          s.pos[k] += s.vel[k] * dt;
          s.pos[k + 1] += s.vel[k + 1] * dt;
          s.pos[k + 2] += s.vel[k + 2] * dt;
          if (s.pos[k + 1] < 0.05) {
            s.pos[k + 1] = 0.05;
            s.vel[k + 1] *= -0.3;
          }
          dummy.position.set(s.pos[k], s.pos[k + 1], s.pos[k + 2]);
          dummy.rotation.set(s.age * 9 + i, s.age * 7, 0);
          dummy.scale.setScalar((0.1 + s.strength * 0.14) * (1 - t));
        }
        dummy.updateMatrix();
        inst.setMatrixAt(si * SPARKS + i, dummy.matrix);
      }
      if (done) {
        s.active = false;
        if (ring) ring.visible = false;
      }
    }
    if (dirty) inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {ringMats.map((mat, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-size pool
          key={i}
          ref={(m) => {
            rings.current[i] = m;
          }}
          geometry={ringGeo}
          material={mat}
          visible={false}
          renderOrder={2}
        />
      ))}
      <instancedMesh
        ref={sparks}
        args={[undefined, undefined, SLOTS * SPARKS]}
        material={sparkMat}
        frustumCulled={false}
      >
        <tetrahedronGeometry args={[1, 0]} />
      </instancedMesh>
    </>
  );
}
