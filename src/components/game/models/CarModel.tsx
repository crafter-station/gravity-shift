"use client";

import { useGLTF } from "@react-three/drei";
import { type ModelProps, useModel } from "./useModel";

const URL = "/models/car.glb";

type CarModelProps = ModelProps & {
  /** Body paint color (the GLB `Paint` material, cloned per instance). */
  color?: string;
};

/**
 * Compact cartoon car (~1.1 x 1.06 x 2.04 m incl. wheels).
 * Origin at bottom-center (wheels touch y = 0), nose facing +Z.
 */
export function CarModel({ color = "#ff4d6d", ...props }: CarModelProps) {
  const scene = useModel(URL, color);
  return <primitive object={scene} {...props} />;
}

useGLTF.preload(URL);
