"use client";

import { CuboidCollider } from "@react-three/rapier";
import { CartModel } from "../models/CartModel";
import { PropBody } from "../PropBody";

type FoodCartProps = {
  position: [number, number, number];
  rotationY?: number;
};

/** Body origin height: colliders and model are offset so wheels touch y = 0. */
const LIFT = 0.55;

/** Street food cart with umbrella (tier 2), serving side toward +Z. */
export function FoodCart({ position, rotationY = 0 }: FoodCartProps) {
  return (
    <PropBody
      kind="cart"
      color="#2ec4b6"
      position={[position[0], LIFT, position[2]]}
      rotation={[0, rotationY, 0]}
      colliders={false}
      density={1.2}
    >
      <CuboidCollider args={[0.78, 0.52, 0.45]} position={[0.05, -0.03, 0]} />
      <CuboidCollider args={[0.04, 0.24, 0.04]} position={[0, 0.79, 0]} />
      <CuboidCollider args={[0.6, 0.12, 0.6]} position={[0, 1.07, 0]} />
      <CartModel position={[0, -LIFT, 0]} />
    </PropBody>
  );
}
