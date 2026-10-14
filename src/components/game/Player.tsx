"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  BallCollider,
  type RapierCollider,
  type RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
} from "@react-three/rapier";
import { useEffect, useRef } from "react";
import { type Group, MathUtils, Vector3 } from "three";
import { PLAYER_GROUPS } from "@/game/combat";
import { CONFIG, LEVELS } from "@/game/config";
import { getMoveVector } from "@/game/input";
import { player } from "@/game/registry";
import { gameStore } from "@/game/store";
import { UfoModel } from "./models/UfoModel";

const forward = new Vector3();
const right = new Vector3();
const dir = new Vector3();
const BASE_RADIUS = LEVELS[0].radius;

/** The player: camera-relative movement, growth per level and a facing arrow. */
export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const collider = useRef<RapierCollider>(null);
  const anchor = useRef<Group>(null);
  const visual = useRef<Group>(null);
  const arrow = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const { speed, accel } = CONFIG.player;

  useEffect(() => {
    player.body = body.current;
    player.object = anchor.current;
    player.facing.set(0, 0, -1);
    player.radius = BASE_RADIUS;
    return () => {
      player.body = null;
      player.object = null;
    };
  }, []);

  useBeforePhysicsStep((world) => {
    const rb = body.current;
    if (!rb) return;
    const dt = world.timestep;
    const level = gameStore.get().level;

    // Grow smoothly toward the level's radius.
    const target = LEVELS[level - 1].radius;
    if (Math.abs(player.radius - target) > 0.001) {
      player.radius = MathUtils.damp(player.radius, target, 6, dt);
      collider.current?.setRadius(player.radius);
    }

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.set(-forward.z, 0, forward.x);

    const move = getMoveVector();
    dir.copy(right).multiplyScalar(move.x).addScaledVector(forward, move.y);

    const topSpeed = speed * (1 + (level - 1) * 0.08);
    const v = rb.linvel();
    const k = 1 - Math.exp(-accel * dt);
    rb.setLinvel(
      {
        x: v.x + (dir.x * topSpeed - v.x) * k,
        y: v.y,
        z: v.z + (dir.z * topSpeed - v.z) * k,
      },
      true,
    );

    if (dir.lengthSq() > 0.01) {
      player.facing.lerp(dir.normalize(), 1 - Math.exp(-12 * dt)).normalize();
    }

    const p = rb.translation();
    if (p.y < CONFIG.killY) {
      rb.setTranslation({ x: 0, y: 2, z: 5 }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  });

  useFrame((state) => {
    if (!anchor.current || !visual.current || !arrow.current) return;
    const scale = player.radius / BASE_RADIUS;
    const yaw = Math.atan2(player.facing.x, player.facing.z);

    // The visual follows the (interpolated) body but never rolls with it.
    anchor.current.getWorldPosition(visual.current.position);
    visual.current.position.y +=
      Math.sin(state.clock.elapsedTime * 3) * 0.06 * scale;
    visual.current.rotation.y = yaw;
    visual.current.scale.setScalar(scale);

    arrow.current.position.set(
      visual.current.position.x,
      0.03,
      visual.current.position.z,
    );
    arrow.current.rotation.y = yaw;
    arrow.current.scale.setScalar(scale);
  });

  return (
    <>
      <RigidBody
        ref={body}
        position={[0, 1, 5]}
        colliders={false}
        ccd
        linearDamping={0.5}
        angularDamping={0.6}
      >
        <BallCollider
          ref={collider}
          args={[BASE_RADIUS]}
          density={6}
          collisionGroups={PLAYER_GROUPS}
          friction={1.2}
        />
        <group ref={anchor} />
      </RigidBody>
      <group ref={visual}>
        <UfoModel />
      </group>
      <group ref={arrow}>
        <mesh rotation-x={-Math.PI / 2} position-z={BASE_RADIUS + 0.55}>
          <circleGeometry args={[0.28, 3]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
      </group>
    </>
  );
}
