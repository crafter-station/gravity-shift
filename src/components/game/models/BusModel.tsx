"use client";

import { useGLTF } from "@react-three/drei";
import { type ModelProps, useModel } from "./useModel";

const URL = "/models/bus.glb";

type BusModelProps = ModelProps & {
  /** Body paint color (the GLB `Paint` material, cloned per instance). */
  color?: string;
};

/**
 * Chunky city bus (~2.1 x 2.34 x 5.18 m incl. wheels and bumpers).
 * Origin at bottom-center (wheels touch y = 0), front facing +Z, door on +X.
 */
export function BusModel({ color = "#ffd23f", ...props }: BusModelProps) {
  const scene = useModel(URL, color);
  return <primitive object={scene} {...props} />;
}

useGLTF.preload(URL);
