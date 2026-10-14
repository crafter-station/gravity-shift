"use client";

import { useGLTF } from "@react-three/drei";
import { type ModelProps, useModel } from "./useModel";

const URL = "/models/kiosk.glb";

/**
 * Ice-cream kiosk with a striped awning and a giant cone on the roof
 * (~2.3 x 2.73 x 2.33 m). Origin at bottom-center of the 2 x 1.6 m base,
 * serving window and awning facing +Z (awning reaches z = 1.38).
 */
export function KioskModel(props: ModelProps) {
  const scene = useModel(URL);
  return <primitive object={scene} {...props} />;
}

useGLTF.preload(URL);
