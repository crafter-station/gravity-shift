"use client";

import { useEffect, useState } from "react";
import { on } from "@/game/events";
import { core } from "@/game/registry";
import { PropBody } from "./PropBody";

const COLORS = [
  "#ff6b6b",
  "#ffd23f",
  "#3ec1ff",
  "#7ae582",
  "#c77dff",
  "#ff9f1c",
];
/** Keep the newest supply crates only (physics budget). */
const MAX_CRATES = 36;

type Crate = {
  id: number;
  position: [number, number, number];
  color: string;
  size: number;
};

let nextId = 1;

/** Fresh ammo: crates rain from the sky around the core between waves. */
export function Supplies() {
  const [crates, setCrates] = useState<Crate[]>([]);

  useEffect(
    () =>
      on("supplyDrop", ({ count }) => {
        const drop: Crate[] = [];
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 4 + Math.random() * 6;
          drop.push({
            id: nextId++,
            position: [
              core.x + Math.cos(a) * r,
              12 + Math.random() * 6,
              core.z + Math.sin(a) * r,
            ],
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            size: 0.7 + Math.random() * 0.3,
          });
        }
        setCrates((prev) => [...prev, ...drop].slice(-MAX_CRATES));
      }),
    [],
  );

  return (
    <>
      {crates.map((c) => (
        <PropBody
          key={c.id}
          kind="box"
          color={c.color}
          position={c.position}
          rotation={[0.3, c.id, 0.2]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[c.size, c.size, c.size]} />
            <meshStandardMaterial color={c.color} flatShading />
          </mesh>
          <mesh>
            <boxGeometry args={[c.size * 1.02, c.size * 0.16, c.size * 1.02]} />
            <meshStandardMaterial
              color="#ffffff"
              flatShading
              opacity={0.35}
              transparent
            />
          </mesh>
        </PropBody>
      ))}
    </>
  );
}
