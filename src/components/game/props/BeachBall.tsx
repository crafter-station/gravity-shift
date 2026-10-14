"use client";

import { PropBody } from "../PropBody";

type BeachBallProps = {
  position: [number, number, number];
};

const GORES = [
  "#ff4d6d",
  "#ffffff",
  "#ffd23f",
  "#ffffff",
  "#3ec1ff",
  "#ffffff",
];

/** Light beach ball built from six colored gores. */
export function BeachBall({ position }: BeachBallProps) {
  const r = 0.5;
  return (
    <PropBody
      kind="ball"
      color="#ff4d6d"
      position={[position[0], r, position[2]]}
      colliders="ball"
      density={0.4}
    >
      {GORES.map((c, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          key={i}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[r, 6, 10, (i * Math.PI) / 3, Math.PI / 3]} />
          <meshStandardMaterial color={c} flatShading side={2} />
        </mesh>
      ))}
    </PropBody>
  );
}
