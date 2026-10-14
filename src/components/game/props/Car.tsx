"use client";

import { CuboidCollider } from "@react-three/rapier";
import { PropBody } from "../PropBody";

type CarProps = {
  position: [number, number, number];
  color: string;
  rotationY?: number;
};

const WHEELS: [number, number][] = [
  [-0.5, -0.42],
  [0.5, -0.42],
  [-0.5, 0.42],
  [0.5, 0.42],
];

/** Small cartoon car: chunky body, glass cabin and four wheels. */
export function Car({ position, color, rotationY = 0 }: CarProps) {
  return (
    <PropBody
      kind="vehicle"
      color={color}
      position={[position[0], 0.42, position[2]]}
      rotation={[0, rotationY, 0]}
      colliders={false}
      density={2}
    >
      <CuboidCollider args={[0.7, 0.2, 0.4]} />
      <CuboidCollider args={[0.35, 0.175, 0.35]} position={[-0.1, 0.375, 0]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.4, 0.8]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh castShadow position={[-0.1, 0.375, 0]}>
        <boxGeometry args={[0.7, 0.35, 0.7]} />
        <meshStandardMaterial color="#bfe9ff" flatShading />
      </mesh>
      {WHEELS.map(([x, z]) => (
        <mesh
          key={`${x}${z}`}
          castShadow
          position={[x, -0.2, z]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.22, 0.22, 0.16, 12]} />
          <meshStandardMaterial color="#2b2b3a" flatShading />
        </mesh>
      ))}
    </PropBody>
  );
}
