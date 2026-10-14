"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  type BufferGeometry,
  Euler,
  type Material,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CONFIG } from "@/game/config";

const URL = "/models/buildings.glb";

/**
 * Building nodes in buildings.glb with their wall widths (m). Each one has its
 * origin at the bottom-center of a 6 m deep footprint, shopfront facing +Z.
 */
const TYPES = [
  { name: "BuildingA", width: 7 },
  { name: "BuildingB", width: 6 },
  { name: "BuildingC", width: 8 },
  { name: "BuildingD", width: 6 },
  { name: "BuildingE", width: 5 },
] as const;

type Placement = { name: string; x: number; z: number; rotY: number };

const HALF = CONFIG.arena.size / 2;
/** Shopfronts stand on this line, leaving a sidewalk around the hedges. */
const FRONT = HALF + 3;
const DEPTH = 6;
const GAP = 0.35;

/** Lays building types out along a street, cycling from `offset`. */
function row(
  from: number,
  to: number,
  offset: number,
  place: (along: number) => Omit<Placement, "name">,
): Placement[] {
  const out: Placement[] = [];
  let at = from;
  for (let i = offset; at < to; i++) {
    const t = TYPES[i % TYPES.length];
    out.push({ name: t.name, ...place(at + t.width / 2) });
    at += t.width + GAP;
  }
  return out;
}

const center = FRONT + DEPTH / 2;

/**
 * Back street (-Z) is what the camera stares at; the side streets (±X) run
 * toward the camera. +Z is left empty because it sits behind the camera.
 */
const LAYOUT: Placement[] = [
  ...row(-HALF - 18, HALF + 18, 0, (x) => ({ x, z: -center, rotY: 0 })),
  ...row(-HALF - 1.5, HALF + 6, 2, (z) => ({
    x: -center,
    z,
    rotY: Math.PI / 2,
  })),
  ...row(-HALF - 1.5, HALF + 6, 4, (z) => ({
    x: center,
    z,
    rotY: -Math.PI / 2,
  })),
];

/**
 * Static Blender-modelled buildings around the plaza. Every placement is baked
 * into one merged geometry per material, so the whole backdrop costs one draw
 * call per material.
 */
export function Buildings() {
  const { scene } = useGLTF(URL);

  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const buckets = new Map<Material, BufferGeometry[]>();
    const place = new Matrix4();
    const m = new Matrix4();
    const q = new Quaternion();
    const e = new Euler();
    const one = new Vector3(1, 1, 1);
    const pos = new Vector3();

    for (const b of LAYOUT) {
      const node = scene.getObjectByName(b.name);
      if (!node) continue;
      place.compose(
        pos.set(b.x, 0, b.z),
        q.setFromEuler(e.set(0, b.rotY, 0)),
        one,
      );
      node.traverse((o) => {
        if (!(o instanceof Mesh) || Array.isArray(o.material)) return;
        const g = (o.geometry as BufferGeometry).clone();
        for (const attr of Object.keys(g.attributes)) {
          if (attr !== "position" && attr !== "normal") g.deleteAttribute(attr);
        }
        g.applyMatrix4(m.multiplyMatrices(place, o.matrixWorld));
        const list = buckets.get(o.material) ?? [];
        list.push(g);
        buckets.set(o.material, list);
      });
    }

    return [...buckets].flatMap(([material, geos]) => {
      const geometry = mergeGeometries(geos);
      for (const g of geos) g.dispose();
      return geometry ? [{ material, geometry }] : [];
    });
  }, [scene]);

  useEffect(
    () => () => {
      for (const p of parts) p.geometry.dispose();
    },
    [parts],
  );

  return (
    <group>
      {/* Pavement under the city blocks, just below the arena ground. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#c9d1dc" flatShading />
      </mesh>
      {parts.map((p) => (
        <mesh
          key={p.material.uuid}
          geometry={p.geometry}
          material={p.material}
        />
      ))}
    </group>
  );
}

useGLTF.preload(URL);
