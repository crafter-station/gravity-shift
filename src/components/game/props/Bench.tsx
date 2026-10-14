"use client";

import { CuboidCollider } from "@react-three/rapier";
import { PropBody } from "../PropBody";

type BenchProps = {
  position: [number, number, number];
  rotationY?: number;
  color?: string;
};

/** Park bench: wooden seat and backrest on two metal legs. */
export function Bench({
  position,
  rotationY = 0,
  color = "#c47a3d",
}: BenchProps) {
  return (
    <PropBody
      kind="bench"
      color={color}
      position={[position[0], 0.45, position[2]]}
      rotation={[0, rotationY, 0]}
      colliders={false}
      density={1.5}
    >
      <CuboidCollider args={[0.8, 0.05, 0.25]} />
      <CuboidCollider args={[0.05, 0.2, 0.25]} position={[-0.7, -0.25, 0]} />
      <CuboidCollider args={[0.05, 0.2, 0.25]} position={[0.7, -0.25, 0]} />
      <CuboidCollider args={[0.8, 0.25, 0.04]} position={[0, 0.3, -0.21]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.1, 0.5]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.3, -0.21]}>
        <boxGeometry args={[1.6, 0.5, 0.08]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} castShadow position={[x, -0.25, 0]}>
          <boxGeometry args={[0.1, 0.4, 0.5]} />
          <meshStandardMaterial color="#3d4a5c" flatShading />
        </mesh>
      ))}
    </PropBody>
  );
}
