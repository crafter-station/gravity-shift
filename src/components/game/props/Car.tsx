"use client";

import { CuboidCollider } from "@react-three/rapier";
import { CarModel } from "../models/CarModel";
import { PropBody } from "../PropBody";

type CarProps = {
  position: [number, number, number];
  color: string;
  rotationY?: number;
};

/** Body origin height: colliders and model are offset so wheels touch y = 0. */
const LIFT = 0.52;

/** Small cartoon car (Blender model), nose toward +Z before rotation. */
export function Car({ position, color, rotationY = 0 }: CarProps) {
  return (
    <PropBody
      kind="vehicle"
      color={color}
      position={[position[0], LIFT, position[2]]}
      rotation={[0, rotationY, 0]}
      colliders={false}
      density={2}
    >
      <CuboidCollider args={[0.5, 0.32, 1.0]} position={[0, -0.2, 0]} />
      <CuboidCollider args={[0.42, 0.22, 0.5]} position={[0, 0.32, -0.12]} />
      <CarModel color={color} position={[0, -LIFT, 0]} />
    </PropBody>
  );
}
