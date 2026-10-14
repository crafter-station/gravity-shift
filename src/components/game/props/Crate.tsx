"use client";

import { PropBody } from "../PropBody";

type CrateProps = {
  position: [number, number, number];
  size: number;
  color: string;
  rotationY?: number;
};

/** Plain colored box with a light band around the middle. */
export function Crate({ position, size, color, rotationY = 0 }: CrateProps) {
  return (
    <PropBody
      kind="box"
      color={color}
      position={[position[0], size / 2, position[2]]}
      rotation={[0, rotationY, 0]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh>
        <boxGeometry args={[size * 1.02, size * 0.16, size * 1.02]} />
        <meshStandardMaterial
          color="#ffffff"
          flatShading
          opacity={0.35}
          transparent
        />
      </mesh>
    </PropBody>
  );
}
