"use client";

import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import { Color, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { on } from "@/game/events";
import { core } from "@/game/registry";
import { gameStore } from "@/game/store";

const healthy = new Color("#3ee6ff");
const critical = new Color("#ff3b5c");
const tint = new Color();

/** The glowing crystal at the plaza center. Invaders that reach it damage it. */
export function Core() {
  const crystal = useRef<Mesh>(null);
  const ring = useRef<Group>(null);
  const hitAt = useRef(0);

  useEffect(
    () =>
      on("coreHit", () => {
        hitAt.current = performance.now();
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { coreHp, coreMaxHp } = gameStore.get();
    const health = coreMaxHp > 0 ? coreHp / coreMaxHp : 1;
    const hit = Math.max(0, 1 - (performance.now() - hitAt.current) / 300);
    if (crystal.current) {
      crystal.current.rotation.y = t * 0.8;
      crystal.current.position.y = 2.3 + Math.sin(t * 2) * 0.15;
      crystal.current.scale.setScalar(1 + hit * 0.25 - (1 - health) * 0.25);
      const m = crystal.current.material as MeshStandardMaterial;
      tint.copy(critical).lerp(healthy, health);
      m.color.copy(tint);
      m.emissive.copy(tint);
      // Pulses faster when the core is in danger.
      m.emissiveIntensity =
        0.6 + Math.sin(t * (3 + (1 - health) * 10)) * 0.25 + hit * 2;
    }
    if (ring.current) ring.current.rotation.y = -t * 0.5;
  });

  return (
    <group position={[core.x, 0, core.z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.45, core.radius]} position-y={0.45} />
        <mesh castShadow receiveShadow position-y={0.45}>
          <cylinderGeometry args={[core.radius, core.radius * 1.15, 0.9, 8]} />
          <meshStandardMaterial color="#e8e2ff" flatShading />
        </mesh>
      </RigidBody>
      <mesh ref={crystal} castShadow position-y={2.3}>
        <octahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial
          color="#3ee6ff"
          emissive="#3ee6ff"
          emissiveIntensity={0.7}
          flatShading
        />
      </mesh>
      <group ref={ring} position-y={2.3}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i / 6) * Math.PI * 2) * 1.5,
              0,
              Math.sin((i / 6) * Math.PI * 2) * 1.5,
            ]}
          >
            <octahedronGeometry args={[0.14, 0]} />
            <meshBasicMaterial color="#c9f7ff" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
