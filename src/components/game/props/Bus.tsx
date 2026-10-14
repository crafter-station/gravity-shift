"use client";

import { CuboidCollider } from "@react-three/rapier";
import { BusModel } from "../models/BusModel";
import { PropBody } from "../PropBody";

type BusProps = {
  position: [number, number, number];
  color?: string;
  rotationY?: number;
};

/** Body origin height: colliders and model are offset so wheels touch y = 0. */
const LIFT = 1.17;

/** City bus (tier 5): the heaviest thing in the plaza, front toward +Z. */
export function Bus({ position, color = "#ffd23f", rotationY = 0 }: BusProps) {
  return (
    <PropBody
      kind="bus"
      color={color}
      position={[position[0], LIFT, position[2]]}
      rotation={[0, rotationY, 0]}
      colliders={false}
      density={2.5}
    >
      <CuboidCollider args={[1.02, 1.15, 2.56]} />
      <BusModel color={color} position={[0, -LIFT, 0]} />
    </PropBody>
  );
}
