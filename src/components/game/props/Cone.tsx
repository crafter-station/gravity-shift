"use client";

import { ConeCollider, CuboidCollider } from "@react-three/rapier";
import { PropBody } from "../PropBody";

type ConeProps = {
  position: [number, number, number];
  rotationY?: number;
};

/** Orange traffic cone with a white stripe and flat square base. */
export function Cone({ position, rotationY = 0 }: ConeProps) {
  return (
    <PropBody
      kind="cone"
      color="#ff8a1f"
      position={[position[0], 0.4, position[2]]}
      rotation={[0, rotationY, 0]}
      colliders={false}
    >
      <CuboidCollider args={[0.35, 0.04, 0.35]} position={[0, -0.36, 0]} />
      <ConeCollider args={[0.35, 0.28]} position={[0, 0.03, 0]} />
      <mesh castShadow receiveShadow position={[0, -0.36, 0]}>
        <boxGeometry args={[0.7, 0.08, 0.7]} />
        <meshStandardMaterial color="#ff8a1f" flatShading />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.03, 0]}>
        <coneGeometry args={[0.3, 0.7, 12]} />
        <meshStandardMaterial color="#ff8a1f" flatShading />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.14, 12]} />
        <meshStandardMaterial color="#ffffff" flatShading />
      </mesh>
    </PropBody>
  );
}
