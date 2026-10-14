"use client";

import { useFrame } from "@react-three/fiber";
import { useBeforePhysicsStep } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import {
  type Group,
  MathUtils,
  type Mesh,
  type MeshBasicMaterial,
  Vector3,
} from "three";
import { CONFIG } from "@/game/config";
import { isAttracting } from "@/game/input";
import { type PropEntry, player, props } from "@/game/registry";
import { gameStore } from "@/game/store";

const { field, launch } = CONFIG;
const toAim = new Vector3();
const shot = new Vector3();
const up = new Vector3(0, 1, 0);

/** Heavier props react slower and fly shorter. */
function massFactor(entry: PropEntry) {
  return MathUtils.clamp(entry.body.mass(), 0.4, 4);
}

function capture(entry: PropEntry, angle: number, time: number) {
  entry.held = true;
  entry.projectileUntil = 0;
  // Start the orbit where the prop currently is so it doesn't snap across.
  entry.orbitAngle = angle - time * field.orbitSpeed;
  entry.orbitRadius = MathUtils.randFloat(...field.orbitRadius);
  entry.orbitHeight = MathUtils.randFloat(...field.orbitHeight);
  entry.body.setGravityScale(0, true);
}

function drop(entry: PropEntry) {
  entry.held = false;
  entry.body.setGravityScale(1, true);
}

/** Gravity power: attract nearby props, keep them orbiting, launch on release. */
export function GravityField() {
  const time = useRef(0);
  const wasAttracting = useRef(false);

  useEffect(
    () => () => {
      gameStore.setHeld(0);
      gameStore.setAttracting(false);
    },
    [],
  );

  useBeforePhysicsStep((world) => {
    const pb = player.body;
    if (!pb) return;
    const dt = world.timestep;
    time.current += dt;
    const t = time.current;
    const attracting = isAttracting();
    const pp = pb.translation();
    const pv = pb.linvel();

    if (wasAttracting.current && !attracting) launchHeld(pp, pv);
    wasAttracting.current = attracting;

    let held = 0;
    for (const e of props) if (e.held) held++;

    for (const e of props) {
      const p = e.body.translation();

      if (p.y < CONFIG.killY) {
        if (e.held) drop(e);
        e.body.setTranslation(e.spawn, true);
        e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        e.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        continue;
      }
      if (!attracting) continue;

      const dx = p.x - pp.x;
      const dz = p.z - pp.z;
      const dist = Math.hypot(dx, p.y - pp.y, dz);

      if (!e.held) {
        if (dist > field.radius || held >= field.maxHeld) continue;
        capture(e, Math.atan2(dz, dx), t);
        held++;
      } else if (dist > field.radius * 2.5) {
        drop(e);
        held--;
        continue;
      }

      // Orbit slot around the player, with a gentle bob.
      const a = e.orbitAngle + t * field.orbitSpeed;
      const tx = pp.x + Math.cos(a) * e.orbitRadius;
      const ty =
        pp.y + e.orbitHeight + Math.sin(t * 3 + e.orbitAngle * 2) * 0.25;
      const tz = pp.z + Math.sin(a) * e.orbitRadius;

      // Closer to the center → stronger pull.
      const closeness = 1 - MathUtils.clamp(dist / field.radius, 0, 1);
      const pull =
        (field.steer * (0.3 + 0.7 * closeness)) / Math.sqrt(massFactor(e));
      const k = 1 - Math.exp(-pull * dt);

      let vx = (tx - p.x) * 4 + pv.x;
      let vy = (ty - p.y) * 4;
      let vz = (tz - p.z) * 4 + pv.z;
      const speed = Math.hypot(vx, vy, vz);
      if (speed > field.maxSpeed) {
        const s = field.maxSpeed / speed;
        vx *= s;
        vy *= s;
        vz *= s;
      }

      const v = e.body.linvel();
      e.body.setLinvel(
        {
          x: v.x + (vx - v.x) * k,
          y: v.y + (vy - v.y) * k,
          z: v.z + (vz - v.z) * k,
        },
        true,
      );

      // Lazy tumble while floating.
      const w = e.body.angvel();
      const wk = 1 - Math.exp(-2 * dt);
      e.body.setAngvel(
        {
          x: w.x + (Math.sin(e.orbitAngle) * 2 - w.x) * wk,
          y: w.y + (1.5 - w.y) * wk,
          z: w.z + (Math.cos(e.orbitAngle) * 2 - w.z) * wk,
        },
        true,
      );
    }

    gameStore.setAttracting(attracting);
    gameStore.setHeld(attracting ? held : 0);
  });

  return <FieldVisual />;
}

/** Fling every held prop toward a point in front of the player. */
function launchHeld(
  pp: { x: number; y: number; z: number },
  pv: { x: number; z: number },
) {
  const now = performance.now();
  const f = player.facing;
  let count = 0;

  for (const e of props) {
    if (!e.held) continue;
    drop(e);
    count++;

    // Converge slightly on a point ahead, like a shotgun funnel.
    const p = e.body.translation();
    toAim
      .set(pp.x + f.x * 12 - p.x, pp.y + 0.6 - p.y, pp.z + f.z * 12 - p.z)
      .normalize();
    shot
      .set(f.x, 0, f.z)
      .lerp(toAim, 0.5)
      .normalize()
      .applyAxisAngle(up, MathUtils.randFloatSpread(launch.spread));

    const speed = launch.speed / massFactor(e) ** 0.25;
    e.body.setLinvel(
      {
        x: shot.x * speed + pv.x * 0.5,
        y: shot.y * speed + launch.lift,
        z: shot.z * speed + pv.z * 0.5,
      },
      true,
    );
    e.body.setAngvel(
      {
        x: MathUtils.randFloatSpread(14),
        y: MathUtils.randFloatSpread(14),
        z: MathUtils.randFloatSpread(14),
      },
      true,
    );
    e.projectileUntil = now + launch.projectileMs;
  }

  if (count === 0) return;
  gameStore.addLaunched(count);

  // Small recoil sells the throw.
  const pb = player.body;
  if (pb) {
    const recoil = -Math.min(count, 8) * 1.2;
    pb.applyImpulse({ x: f.x * recoil, y: 0, z: f.z * recoil }, true);
  }
}

const playerPos = new Vector3();

/** Ground range ring, inward pulse waves and a glowing aura while attracting. */
function FieldVisual() {
  const root = useRef<Group>(null);
  const range = useRef<Mesh>(null);
  const waves = useRef<(Mesh | null)[]>([]);
  const aura = useRef<Mesh>(null);
  const level = useRef(0);

  useFrame((state, delta) => {
    if (!root.current || !player.object) return;
    player.object.getWorldPosition(playerPos);
    root.current.position.set(playerPos.x, 0, playerPos.z);

    const target = isAttracting() ? 1 : 0;
    level.current = MathUtils.damp(level.current, target, 10, delta);
    const lv = level.current;
    root.current.visible = lv > 0.01;
    if (!root.current.visible) return;

    const t = state.clock.elapsedTime;
    if (range.current) {
      range.current.rotation.z = t * 0.6;
      (range.current.material as MeshBasicMaterial).opacity = 0.8 * lv;
    }
    waves.current.forEach((wave, i) => {
      if (!wave) return;
      // Waves travel from the edge of the field toward the player.
      const phase = (t * 0.9 + i / waves.current.length) % 1;
      wave.scale.setScalar(MathUtils.lerp(field.radius, 0.6, phase));
      (wave.material as MeshBasicMaterial).opacity =
        Math.sin(phase * Math.PI) * 0.5 * lv;
    });
    if (aura.current) {
      aura.current.position.y = playerPos.y;
      aura.current.scale.setScalar((1.1 + Math.sin(t * 10) * 0.08) * lv);
      (aura.current.material as MeshBasicMaterial).opacity = 0.22 * lv;
    }
  });

  return (
    <group ref={root} visible={false}>
      <mesh ref={range} rotation-x={-Math.PI / 2} position-y={0.04}>
        <ringGeometry
          args={[field.radius - 0.12, field.radius, 48, 1, 0, Math.PI * 1.85]}
        />
        <meshBasicMaterial
          color="#b388ff"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            waves.current[i] = m;
          }}
          rotation-x={-Math.PI / 2}
          position-y={0.05}
        >
          <ringGeometry args={[0.96, 1, 40]} />
          <meshBasicMaterial
            color="#8f5cff"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
      <mesh ref={aura}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#b388ff"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
