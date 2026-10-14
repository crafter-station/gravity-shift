"use client";

import { BeachBall } from "./props/BeachBall";
import { Bench } from "./props/Bench";
import { Car } from "./props/Car";
import { Cone } from "./props/Cone";
import { Crate } from "./props/Crate";

type V3 = [number, number, number];

const CRATES: { p: V3; size: number; color: string; r: number }[] = [
  { p: [-6, 0, -5], size: 0.8, color: "#ff6b6b", r: 0.3 },
  { p: [-7.2, 0, -5.4], size: 0.6, color: "#ffd23f", r: 0.8 },
  { p: [-6.4, 0, -6.4], size: 1.0, color: "#3ec1ff", r: 0 },
  { p: [6, 0, -6], size: 0.7, color: "#7ae582", r: 0.5 },
  { p: [7.1, 0, -6.6], size: 0.9, color: "#c77dff", r: 1.1 },
  { p: [-11, 0, 6], size: 0.8, color: "#ff9f1c", r: 0.2 },
  { p: [-10, 0, 7.4], size: 0.6, color: "#ff6b6b", r: 0.6 },
  { p: [4, 0, 8], size: 1.0, color: "#2ec4b6", r: 0.4 },
];

const CONES: { p: V3; r: number }[] = [
  { p: [8, 0, 3], r: 0 },
  { p: [9, 0, 3.8], r: 0.5 },
  { p: [10, 0, 4.6], r: 1 },
  { p: [-4, 0, 6], r: 0.2 },
  { p: [-3, 0, 7], r: 0.9 },
  { p: [2, 0, -9], r: 0.4 },
];

const BENCHES: { p: V3; r: number; c: string }[] = [
  { p: [-9, 0, -1], r: Math.PI / 2, c: "#c47a3d" },
  { p: [0, 0, 11], r: Math.PI, c: "#d98a4a" },
  { p: [12, 0, -3], r: -Math.PI / 2, c: "#b86b30" },
  { p: [-13, 0, -8], r: 0.4, c: "#c47a3d" },
];

const CARS: { p: V3; r: number; c: string }[] = [
  { p: [5, 0, 5], r: 0.6, c: "#ff4d6d" },
  { p: [-6, 0, 11], r: -0.5, c: "#3ec1ff" },
  { p: [13, 0, -12], r: 2.2, c: "#ffd23f" },
  { p: [-14, 0, 1], r: 1.2, c: "#7ae582" },
];

const BALLS: V3[] = [
  [-3.5, 0, -4],
  [3.8, 0, -3.5],
  [10, 0, 9],
  [-15, 0, 14],
];

/** All grabbable props in the plaza, grouped in small clusters. */
export function Props() {
  return (
    <>
      {CRATES.map((c) => (
        <Crate
          key={c.p.join()}
          position={c.p}
          size={c.size}
          color={c.color}
          rotationY={c.r}
        />
      ))}
      {CONES.map((c) => (
        <Cone key={c.p.join()} position={c.p} rotationY={c.r} />
      ))}
      {BENCHES.map((b) => (
        <Bench key={b.p.join()} position={b.p} rotationY={b.r} color={b.c} />
      ))}
      {CARS.map((c) => (
        <Car key={c.p.join()} position={c.p} rotationY={c.r} color={c.c} />
      ))}
      {BALLS.map((p) => (
        <BeachBall key={p.join()} position={p} />
      ))}
    </>
  );
}
