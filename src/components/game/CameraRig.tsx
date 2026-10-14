"use client";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { CONFIG, LEVELS } from "@/game/config";
import { shake } from "@/game/effects";
import { player } from "@/game/registry";

const target = new Vector3();
const desired = new Vector3();
const base = new Vector3();
const offset = new Vector3(...CONFIG.camera.offset);
let initialized = false;

const MAX_SHAKE = 0.35;
const TRAUMA_DECAY = 1.8;

/** Elevated third-person camera that smoothly follows the player, with trauma shake. */
export function CameraRig() {
  useFrame(({ camera, clock, size }, delta) => {
    if (!player.object) return;
    const dt = Math.min(delta, 0.1);
    player.object.getWorldPosition(target);
    // Pull back on portrait screens so the field still fits horizontally.
    const aspect = size.width / Math.max(size.height, 1);
    const zoom = aspect < 1 ? Math.min(1 / aspect, 1.8) ** 0.75 : 1;
    // Pull back as the orb grows so bigger levels see more of the plaza.
    const growth = (player.radius / LEVELS[0].radius) ** 0.6;
    desired.copy(target).addScaledVector(offset, zoom * growth);
    if (!initialized) {
      base.copy(camera.position);
      initialized = true;
    }
    // Smooth base position never includes the shake offset.
    base.lerp(desired, 1 - Math.exp(-CONFIG.camera.follow * dt));
    camera.position.copy(base);

    if (shake.trauma > 0) {
      const t = clock.elapsedTime * 38;
      const amp = shake.trauma * shake.trauma * MAX_SHAKE;
      camera.position.x += Math.sin(t * 1.3) * amp;
      camera.position.y += Math.sin(t * 1.7 + 2) * amp * 0.7;
      camera.position.z += Math.sin(t * 1.1 + 4) * amp;
      shake.trauma = Math.max(0, shake.trauma - TRAUMA_DECAY * dt);
    }
    camera.lookAt(target.x, target.y + 0.5, target.z);
  });
  return null;
}
