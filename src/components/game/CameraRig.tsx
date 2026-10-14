"use client";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { CONFIG } from "@/game/config";
import { player } from "@/game/registry";

const target = new Vector3();
const desired = new Vector3();
const offset = new Vector3(...CONFIG.camera.offset);

/** Elevated third-person camera that smoothly follows the player. */
export function CameraRig() {
  useFrame(({ camera }, delta) => {
    if (!player.object) return;
    player.object.getWorldPosition(target);
    desired.copy(target).add(offset);
    const k = 1 - Math.exp(-CONFIG.camera.follow * Math.min(delta, 0.1));
    camera.position.lerp(desired, k);
    camera.lookAt(target.x, target.y + 0.5, target.z);
  });
  return null;
}
