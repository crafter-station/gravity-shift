"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { Mesh, MeshStandardMaterial, type Object3D } from "three";

/** Props shared by every model component (plain group props, no children). */
export type ModelProps = Omit<ThreeElements["group"], "children">;

/** Material name that model components recolor per instance. */
const PAINT = "Paint";

/**
 * Deep-clones a GLB scene for one instance, turns on shadows and, when
 * `paint` is given, swaps the `Paint` material for a per-instance copy.
 */
export function useModel(url: string, paint?: string): Object3D {
  const { scene } = useGLTF(url);

  const { root, paintMat } = useMemo(() => {
    const root = scene.clone(true);
    let paintMat: MeshStandardMaterial | null = null;
    root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const m = o.material;
      if (m instanceof MeshStandardMaterial && m.name === PAINT) {
        paintMat ??= m.clone();
        o.material = paintMat;
      }
    });
    return { root, paintMat: paintMat as MeshStandardMaterial | null };
  }, [scene]);

  useLayoutEffect(() => {
    if (paintMat && paint) paintMat.color.set(paint);
  }, [paintMat, paint]);

  useEffect(() => () => paintMat?.dispose(), [paintMat]);

  return root;
}
