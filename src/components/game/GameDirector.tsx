"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Vector3 } from "three";
import { initScoring, popupSlots, tickRound } from "@/game/score";

const v = new Vector3();

/** Round director: timer tick, scoring hooks, world-space popup projection. */
export function GameDirector() {
  const size = useThree((s) => s.size);

  useEffect(() => {
    initScoring();
  }, []);

  useFrame((state, dt) => {
    tickRound(dt);
    for (const p of popupSlots) {
      if (!p.active) continue;
      v.set(p.wx, p.wy, p.wz).project(state.camera);
      p.visible = v.z < 1;
      p.sx = (v.x * 0.5 + 0.5) * size.width;
      p.sy = (-v.y * 0.5 + 0.5) * size.height;
    }
  });

  return null;
}
