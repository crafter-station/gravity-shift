"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import {
  INDICATOR_SLOTS,
  indicatorSlots,
} from "@/components/ui/indicatorSlots";
import { core, enemies } from "@/game/registry";

const v = new Vector3();
const MARGIN = 30;
const FAR = 20;

/** Projects invaders to screen space; off-screen ones get a clamped edge slot. */
export function EnemyIndicators() {
  const size = useThree((s) => s.size);

  useFrame((state) => {
    const w = size.width;
    const h = size.height;
    const cx = w / 2;
    const cy = h / 2;
    let n = 0;
    for (const e of enemies) {
      if (n >= INDICATOR_SLOTS) break;
      e.object.getWorldPosition(v);
      const dist = Math.hypot(v.x - core.x, v.z - core.z);
      v.project(state.camera);
      const behind = v.z > 1;
      let sx = (v.x * 0.5 + 0.5) * w;
      let sy = (-v.y * 0.5 + 0.5) * h;
      if (behind) {
        sx = w - sx;
        sy = h - sy;
      }
      if (
        !behind &&
        sx >= MARGIN &&
        sx <= w - MARGIN &&
        sy >= MARGIN &&
        sy <= h - MARGIN
      )
        continue;
      const dx = sx - cx;
      let dy = sy - cy;
      if (dx === 0 && dy === 0) dy = 1;
      const k = Math.min(
        (cx - MARGIN) / Math.max(Math.abs(dx), 1e-3),
        (cy - MARGIN) / Math.max(Math.abs(dy), 1e-3),
      );
      const slot = indicatorSlots[n++];
      slot.active = true;
      slot.kind = e.kind;
      slot.angle = Math.atan2(dy, dx);
      slot.sx = cx + dx * k;
      slot.sy = cy + dy * k;
      slot.danger = Math.max(0, Math.min(1, 1 - dist / FAR));
    }
    for (let i = n; i < INDICATOR_SLOTS; i++) indicatorSlots[i].active = false;
  });

  return null;
}
