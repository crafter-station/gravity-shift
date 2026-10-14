"use client";

import { useGLTF } from "@react-three/drei";
import { type ModelProps, useModel } from "./useModel";

const URL = "/models/cart.glb";

/**
 * Street food cart with a striped umbrella (~1.84 x 1.87 x 1.7 m, the
 * umbrella sets the footprint). Origin at bottom-center, serving side +Z,
 * wheels on -X and push handle on +X.
 */
export function CartModel(props: ModelProps) {
  const scene = useModel(URL);
  return <primitive object={scene} {...props} />;
}

useGLTF.preload(URL);
