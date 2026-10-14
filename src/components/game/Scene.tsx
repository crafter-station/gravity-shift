"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { CONFIG } from "@/game/config";

/** Static plaza: ground, lights, decor and arena bounds. */
export function Scene() {
  const half = CONFIG.arena.size / 2;
  return (
    <>
      <color attach="background" args={["#bfe3ff"]} />
      <hemisphereLight args={["#ffffff", "#8fb3c9", 1.1]} />
      <directionalLight
        castShadow
        position={[12, 20, 8]}
        intensity={2.2}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
      />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[half, 0.5, half]} position={[0, -0.5, 0]} />
        <mesh receiveShadow rotation-x={-Math.PI / 2}>
          <planeGeometry args={[CONFIG.arena.size, CONFIG.arena.size]} />
          <meshStandardMaterial color="#f4d9a6" />
        </mesh>
      </RigidBody>
    </>
  );
}
