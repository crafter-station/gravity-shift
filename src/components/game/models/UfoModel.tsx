"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { type ModelProps, useModel } from "./useModel";

const URL = "/models/ufo.glb";

type UfoModelProps = ModelProps & {
  /** Spin speed of the rim lights in rad/s (0 to stop). */
  spin?: number;
};

/**
 * Player flying saucer. Widest point ~1.15 m (hull 1.13 m), so scale by
 * `radius / 0.55` to match the player collider.
 * Origin: center of the hull's equator; the mesh spans y -0.23..0.50
 * (dome top), so it sits inside a ball collider of radius 0.55.
 * The alien inside looks toward +Z: use `rotation.y = atan2(facing.x, facing.z)`
 * to face the move direction.
 * Nodes: `UfoHull`, `UfoDome` (material `Glass`, already alpha-blended),
 * `UfoAlien`, `UfoLights` (material `Lights`, emissive).
 */
export function UfoModel({ spin = 1.5, ...props }: UfoModelProps) {
  const scene = useModel(URL);
  const lights = useMemo(() => scene.getObjectByName("UfoLights"), [scene]);

  useFrame((_, dt) => {
    if (lights && spin) lights.rotation.y += spin * dt;
  });

  return <primitive object={scene} {...props} />;
}

useGLTF.preload(URL);
