"use client";

import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Color, type Group, MathUtils } from "three";
import { type DebrisSpawn, onDebris } from "@/game/breakables";

/** Seconds a debris batch lives before shrinking away. */
const LIFETIME = 3.5;
const SHRINK = 0.6;
/** Max simultaneous debris pieces across all batches (oldest batches drop first). */
const MAX_PIECES = 48;

type Piece = {
  offset: [number, number, number];
  size: [number, number, number];
  velocity: [number, number, number];
  spin: [number, number, number];
  color: string;
};

type Batch = DebrisSpawn & { pieces: Piece[] };

function piecesFor(kind: DebrisSpawn["kind"]) {
  switch (kind) {
    case "ball":
      return 0; // pops: impact burst only
    case "cone":
    case "pin":
      return 5;
    case "bench":
    case "cart":
    case "kiosk":
      return 8;
    default:
      return 6;
  }
}

const white = new Color("#ffffff");

function buildBatch(spawn: DebrisSpawn): Batch {
  const count = piecesFor(spawn.kind);
  const base = new Color(spawn.color);
  const pieces: Piece[] = [];
  // Piece size scales with the broken prop, kept chunky but small.
  const unit = MathUtils.clamp(
    Math.cbrt(spawn.size.x * spawn.size.y * spawn.size.z) * 0.45,
    0.14,
    0.6,
  );
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const out = MathUtils.randFloat(3, 7);
    pieces.push({
      offset: [
        Math.cos(a) * spawn.size.x * 0.25,
        MathUtils.randFloatSpread(spawn.size.y * 0.4),
        Math.sin(a) * spawn.size.z * 0.25,
      ],
      size: [
        unit * MathUtils.randFloat(0.6, 1.1),
        unit * MathUtils.randFloat(0.3, 0.8),
        unit * MathUtils.randFloat(0.6, 1.1),
      ],
      velocity: [
        spawn.velocity.x * 0.4 + Math.cos(a) * out,
        Math.max(spawn.velocity.y * 0.3, 0) + MathUtils.randFloat(3, 7),
        spawn.velocity.z * 0.4 + Math.sin(a) * out,
      ],
      spin: [
        MathUtils.randFloatSpread(20),
        MathUtils.randFloatSpread(20),
        MathUtils.randFloatSpread(20),
      ],
      color: `#${base
        .clone()
        .lerp(white, Math.random() * 0.35)
        .getHexString()}`,
    });
  }
  return { ...spawn, pieces };
}

/** Spawns short-lived physical debris whenever a prop shatters. */
export function Breakables() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const remove = useCallback(
    (id: number) => setBatches((prev) => prev.filter((b) => b.id !== id)),
    [],
  );

  useEffect(
    () =>
      onDebris((spawn) => {
        const batch = buildBatch(spawn);
        if (batch.pieces.length === 0) return;
        setBatches((prev) => {
          const next = [...prev, batch];
          let total = next.reduce((n, b) => n + b.pieces.length, 0);
          while (total > MAX_PIECES && next.length > 1) {
            total -= next[0].pieces.length;
            next.shift();
          }
          return next;
        });
      }),
    [],
  );

  return (
    <>
      {batches.map((b) => (
        <DebrisBatch key={b.id} batch={b} onDone={remove} />
      ))}
    </>
  );
}

const DebrisBatch = memo(function DebrisBatch({
  batch,
  onDone,
}: {
  batch: Batch;
  onDone: (id: number) => void;
}) {
  const age = useRef(0);
  const groups = useRef<(Group | null)[]>([]);
  const done = useRef(false);
  const { position, pieces } = batch;

  useFrame((_, delta) => {
    age.current += delta;
    const left = LIFETIME - age.current;
    if (left < SHRINK) {
      const s = Math.max(left / SHRINK, 0.001);
      for (const g of groups.current) g?.scale.setScalar(s);
    }
    if (left <= 0 && !done.current) {
      done.current = true;
      onDone(batch.id);
    }
  });

  return (
    <>
      {pieces.map((p, i) => (
        <RigidBody
          // biome-ignore lint/suspicious/noArrayIndexKey: pieces never reorder
          key={i}
          position={[
            position.x + p.offset[0],
            position.y + p.offset[1],
            position.z + p.offset[2],
          ]}
          linearVelocity={p.velocity}
          angularVelocity={p.spin}
          colliders={false}
          linearDamping={0.2}
          angularDamping={0.4}
        >
          <CuboidCollider
            args={[p.size[0] / 2, p.size[1] / 2, p.size[2] / 2]}
            density={0.5}
          />
          <group
            ref={(g) => {
              groups.current[i] = g;
            }}
          >
            <mesh castShadow>
              <boxGeometry args={p.size} />
              <meshStandardMaterial color={p.color} flatShading />
            </mesh>
          </group>
        </RigidBody>
      ))}
    </>
  );
});
