"use client";

import { PropBody } from "./PropBody";

/** All grabbable props in the plaza (target: ~20-30 bodies). */
export function Props() {
  return (
    <>
      {[-3, 0, 3].map((x) => (
        <PropBody key={x} kind="box" color="#ff6b6b" position={[x, 0.5, -5]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial color="#ff6b6b" flatShading />
          </mesh>
        </PropBody>
      ))}
    </>
  );
}
