"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Vector3 } from "three";
import { on } from "@/game/events";
import { enemies, player, props } from "@/game/registry";
import { initScoring, popupSlots, tickRound } from "@/game/score";
import { gameStore } from "@/game/store";

const v = new Vector3();

/** Round director: timer tick, scoring hooks, world-space popup projection. */
export function GameDirector() {
  const size = useThree((s) => s.size);

  useEffect(() => {
    initScoring();
    // Dev-only handle for inspecting the live game from the console.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as Record<string, unknown>).__gs = {
        enemies,
        props,
        player,
        store: gameStore,
        on,
      };
    }
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
