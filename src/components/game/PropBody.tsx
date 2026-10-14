"use client";

import {
  type RapierRigidBody,
  RigidBody,
  type RigidBodyProps,
} from "@react-three/rapier";
import { type ReactNode, useEffect, useRef } from "react";
import { type Group, Vector3 } from "three";
import { registerProp, unregisterProp } from "@/game/breakables";
import { KINDS } from "@/game/config";
import { reportImpact } from "@/game/effects";
import type { PropEntry, PropKind } from "@/game/registry";

type PropBodyProps = {
  kind: PropKind;
  /** Main color, used by impact effects. */
  color: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  colliders?: RigidBodyProps["colliders"];
  /** Mass density multiplier (heavier props lag behind in the field). */
  density?: number;
  /** Override the level tier needed to lift it (defaults to KINDS[kind].tier). */
  tier?: number;
  /** Override base points (defaults to KINDS[kind].points). */
  points?: number;
  children: ReactNode;
};

/**
 * Dynamic rigid body that registers itself as a grabbable prop.
 * Put meshes (and optional explicit colliders) as children.
 */
export function PropBody({
  kind,
  color,
  position,
  rotation,
  colliders = "cuboid",
  density = 1,
  tier,
  points,
  children,
}: PropBodyProps) {
  const body = useRef<RapierRigidBody>(null);
  const group = useRef<Group>(null);
  const entry = useRef<PropEntry | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: registered once per mount; reset remounts the physics world
  useEffect(() => {
    if (!body.current || !group.current) return;
    const e: PropEntry = {
      body: body.current,
      object: group.current,
      kind,
      color,
      spawn: new Vector3(...position),
      held: false,
      orbitAngle: 0,
      orbitRadius: 0,
      orbitHeight: 0,
      projectileUntil: 0,
      lastImpactAt: 0,
      tier: tier ?? KINDS[kind].tier,
      points: points ?? KINDS[kind].points,
      breakable: KINDS[kind].breakable,
      wrecked: false,
      broken: false,
      target: null,
      exploded: false,
    };
    entry.current = e;
    const handle = e.body.handle;
    registerProp(e);
    return () => {
      unregisterProp(e, handle);
      entry.current = null;
    };
  }, []);

  return (
    <RigidBody
      ref={body}
      position={position}
      rotation={rotation}
      colliders={colliders}
      density={density}
      ccd
      linearDamping={0.15}
      angularDamping={0.3}
      onCollisionEnter={(payload) => {
        if (entry.current) reportImpact(entry.current, payload);
      }}
    >
      <group ref={group}>{children}</group>
    </RigidBody>
  );
}
