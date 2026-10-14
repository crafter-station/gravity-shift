"use client";

import { CylinderCollider } from "@react-three/rapier";
import { useMemo } from "react";
import { LatheGeometry, Vector2 } from "three";
import { PropBody } from "./PropBody";

type V3 = [number, number, number];

const CRATE = 0.75;
const GAP = 0.02;
const PYRAMID_COLORS = [
  "#ff6b6b",
  "#ffd23f",
  "#3ec1ff",
  "#7ae582",
  "#c77dff",
  "#ff9f1c",
];

/** Crate walls stacked 3-2-1, the classic "knock it down" target. */
const PYRAMIDS: { origin: V3; rotationY: number }[] = [
  { origin: [-8, 0, -12], rotationY: 0.25 },
  { origin: [14, 0, 7], rotationY: -1.2 },
];

/** Bowling pins in a triangle, front pin facing the plaza center. */
const PIN_ORIGIN: V3 = [-1, 0, -13];
const PIN_HEIGHT = 1.3;

/** Targets placed to be knocked down: crate pyramids and giant bowling pins. */
export function Structures() {
  return (
    <>
      {PYRAMIDS.map((p) => (
        <CratePyramid key={p.origin.join()} {...p} />
      ))}
      <PinTriangle />
    </>
  );
}

function CratePyramid({
  origin,
  rotationY,
}: {
  origin: V3;
  rotationY: number;
}) {
  const crates = useMemo(() => {
    const out: { pos: V3; color: string }[] = [];
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    let i = 0;
    for (let row = 0; row < 3; row++) {
      const count = 3 - row;
      for (let c = 0; c < count; c++) {
        const local = (c - (count - 1) / 2) * (CRATE + GAP);
        out.push({
          pos: [
            origin[0] + local * cos,
            CRATE / 2 + row * (CRATE + GAP),
            origin[2] - local * sin,
          ],
          color: PYRAMID_COLORS[i++ % PYRAMID_COLORS.length],
        });
      }
    }
    return out;
  }, [origin, rotationY]);

  return (
    <>
      {crates.map((c) => (
        <PropBody
          key={c.pos.join()}
          kind="box"
          color={c.color}
          position={c.pos}
          rotation={[0, rotationY, 0]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[CRATE, CRATE, CRATE]} />
            <meshStandardMaterial color={c.color} flatShading />
          </mesh>
          <mesh>
            <boxGeometry args={[CRATE * 1.02, CRATE * 0.16, CRATE * 1.02]} />
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

function PinTriangle() {
  const positions = useMemo(() => {
    const out: V3[] = [];
    for (let row = 0; row < 3; row++) {
      for (let c = 0; c <= row; c++) {
        out.push([
          PIN_ORIGIN[0] + (c - row / 2) * 0.75,
          PIN_HEIGHT / 2,
          PIN_ORIGIN[2] - row * 0.7,
        ]);
      }
    }
    return out;
  }, []);

  return (
    <>
      {positions.map((p) => (
        <Pin key={p.join()} position={p} />
      ))}
    </>
  );
}

/** Classic bowling pin silhouette, revolved around Y, centered vertically. */
function usePinGeometry() {
  return useMemo(() => {
    const h = PIN_HEIGHT;
    const profile = [
      [0, 0],
      [0.16, 0],
      [0.22, 0.12],
      [0.25, 0.3],
      [0.22, 0.5],
      [0.12, 0.72],
      [0.1, 0.82],
      [0.13, 0.95],
      [0.13, 1.1],
      [0.08, 1.25],
      [0, 1.3],
    ].map(([x, y]) => new Vector2(x, (y / 1.3) * h - h / 2));
    const geometry = new LatheGeometry(profile, 10);
    geometry.computeVertexNormals();
    return geometry;
  }, []);
}

function Pin({ position }: { position: V3 }) {
  const geometry = usePinGeometry();
  return (
    <PropBody
      kind="pin"
      color="#ffffff"
      position={position}
      colliders={false}
      density={0.6}
    >
      <CylinderCollider args={[PIN_HEIGHT / 2, 0.2]} />
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#fffaf0" flatShading />
      </mesh>
      {[0.2, 0.27].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.105, 0.11, 0.04, 10]} />
          <meshStandardMaterial color="#ff4d6d" flatShading />
        </mesh>
      ))}
    </PropBody>
  );
}
