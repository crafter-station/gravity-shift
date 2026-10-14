"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  BallCollider,
  type RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
} from "@react-three/rapier";
import { useEffect, useRef } from "react";
import { type Group, MathUtils, type Mesh, Vector3 } from "three";
import { CONFIG } from "@/game/config";
import { getMoveVector } from "@/game/input";
import { player } from "@/game/registry";

const forward = new Vector3();
const right = new Vector3();
const dir = new Vector3();

/** The player orb: camera-relative rolling movement + facing indicator. */
export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const group = useRef<Group>(null);
  const arrow = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const { radius, speed, accel } = CONFIG.player;

  useEffect(() => {
    player.body = body.current;
    player.object = group.current;
    player.facing.set(0, 0, -1);
    return () => {
      player.body = null;
      player.object = null;
    };
  }, []);

  useBeforePhysicsStep((world) => {
    const rb = body.current;
    if (!rb) return;
    const dt = world.timestep;

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.set(-forward.z, 0, forward.x);

    const move = getMoveVector();
    dir.copy(right).multiplyScalar(move.x).addScaledVector(forward, move.y);

    const v = rb.linvel();
    const k = 1 - Math.exp(-accel * dt);
    rb.setLinvel(
      {
        x: v.x + (dir.x * speed - v.x) * k,
        y: v.y,
        z: v.z + (dir.z * speed - v.z) * k,
      },
      true,
    );

    if (dir.lengthSq() > 0.01) {
      player.facing.lerp(dir.normalize(), 1 - Math.exp(-12 * dt)).normalize();
    }

    const p = rb.translation();
    if (p.y < CONFIG.killY) {
      rb.setTranslation({ x: 0, y: 2, z: 0 }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  });

  useFrame(() => {
    if (!arrow.current || !group.current) return;
    group.current.getWorldPosition(arrow.current.position);
    arrow.current.position.y = 0.03;
    arrow.current.rotation.y = Math.atan2(player.facing.x, player.facing.z);
  });

  return (
    <>
      <RigidBody
        ref={body}
        position={[0, 1, 0]}
        colliders={false}
        ccd
        linearDamping={0.5}
        angularDamping={0.6}
      >
        <BallCollider args={[radius]} density={6} friction={1.2} />
        <group ref={group}>
          <PlayerOrb radius={radius} />
        </group>
      </RigidBody>
      <group ref={arrow}>
        <mesh rotation-x={-Math.PI / 2} position-z={radius + 0.55}>
          <circleGeometry args={[0.28, 3]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
      </group>
    </>
  );
}

function PlayerOrb({ radius }: { radius: number }) {
  const core = useRef<Mesh>(null);
  useFrame((state) => {
    if (!core.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.04;
    core.current.scale.setScalar(MathUtils.lerp(core.current.scale.x, s, 0.2));
  });
  return (
    <mesh ref={core} castShadow>
      <icosahedronGeometry args={[radius, 1]} />
      <meshStandardMaterial
        color="#7c4dff"
        emissive="#5b2bff"
        emissiveIntensity={0.6}
        flatShading
      />
    </mesh>
  );
}
