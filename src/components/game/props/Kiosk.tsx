"use client";

import { CuboidCollider } from "@react-three/rapier";
import { KioskModel } from "../models/KioskModel";
import { PropBody } from "../PropBody";

type KioskProps = {
  position: [number, number, number];
  rotationY?: number;
};

/** Body origin height: colliders and model are offset so the base sits on y = 0. */
const LIFT = 1.0;

/** Ice-cream kiosk (tier 4), serving window toward +Z. */
export function Kiosk({ position, rotationY = 0 }: KioskProps) {
  return (
    <PropBody
      kind="kiosk"
      color="#74c7ff"
      position={[position[0], LIFT, position[2]]}
      rotation={[0, rotationY, 0]}
      colliders={false}
      density={2}
    >
      <CuboidCollider args={[1.0, 0.92, 0.8]} position={[0, -0.08, 0]} />
      <CuboidCollider args={[1.15, 0.08, 0.95]} position={[0, 0.88, 0]} />
      <CuboidCollider args={[0.22, 0.3, 0.22]} position={[0, 1.36, 0]} />
      <KioskModel position={[0, -LIFT, 0]} />
    </PropBody>
  );
}
