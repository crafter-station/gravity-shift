"use client";

import { useFrame } from "@react-three/fiber";
import { useBeforePhysicsStep } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import {
  Box3,
  type Group,
  MathUtils,
  type Mesh,
  type MeshBasicMaterial,
  Vector3,
} from "three";
import { damageEnemy } from "@/game/combat";
import { CONFIG, LEVELS } from "@/game/config";
import { emitImpact } from "@/game/effects";
import { emit } from "@/game/events";
import { isAttracting } from "@/game/input";
import {
  type EnemyEntry,
  enemies,
  type PropEntry,
  player,
  props,
} from "@/game/registry";
import { gameStore } from "@/game/store";
import { stacks } from "@/game/upgrades";

const { field, launch } = CONFIG;
const toAim = new Vector3();
const shot = new Vector3();
const up = new Vector3(0, 1, 0);
const bounds = new Box3();
const extentSize = new Vector3();
/** Minimum ms between "too heavy" hints. */
const TOO_HEAVY_MS = 1500;
let lastTooHeavy = 0;

/** Current level stats (orb size, field reach, capacity, liftable tier). */
function levelSpec() {
  const { level, upgrades } = gameStore.get();
  const base = LEVELS[level - 1];
  const reach = stacks(upgrades, "reach");
  return {
    ...base,
    field: base.field * 1.25 ** reach,
    maxHeld: base.maxHeld + reach * 4,
  };
}

/** Orbit scale grows with the orb so bigger levels make wider, grander orbits. */
function orbitScale() {
  return (levelSpec().radius / LEVELS[0].radius) ** 0.8;
}

/** Heavier props react slower and fly shorter. */
function massFactor(entry: PropEntry) {
  return MathUtils.clamp(entry.body.mass(), 0.4, 4);
}

function capture(entry: PropEntry, angle: number, time: number) {
  entry.held = true;
  entry.projectileUntil = 0;
  // Big props (cars, the bus) need a wider orbit so they don't clip the orb.
  bounds.setFromObject(entry.object).getSize(extentSize);
  const extent = Math.max(extentSize.x, extentSize.z) / 2;
  const scale = orbitScale();
  // Start the orbit where the prop currently is so it doesn't snap across.
  entry.orbitAngle = angle - time * field.orbitSpeed;
  entry.orbitRadius =
    MathUtils.randFloat(...field.orbitRadius) * scale + extent * 0.9;
  entry.orbitHeight =
    MathUtils.randFloat(...field.orbitHeight) * scale + extent * 0.4;
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

    if (attracting !== wasAttracting.current) {
      if (attracting) emit("attractStart", {});
      else {
        emit("attractEnd", {});
        launchHeld(pp, pv);
        releasePulse(pp);
      }
    }
    wasAttracting.current = attracting;
    const lvl = levelSpec();
    const spinBoost = 1.5 ** stacks(gameStore.get().upgrades, "spin");
    steerProjectiles(dt);

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
        if (dist > lvl.field) continue;
        if (e.tier > lvl.tier) {
          tooHeavy(e, p, dist / lvl.field);
          continue;
        }
        if (held >= lvl.maxHeld) continue;
        capture(e, Math.atan2(dz, dx), t);
        held++;
      } else if (dist > lvl.field * 2.5) {
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
      const closeness = 1 - MathUtils.clamp(dist / lvl.field, 0, 1);
      const pull =
        (field.steer * spinBoost * (0.3 + 0.7 * closeness)) /
        Math.sqrt(massFactor(e));
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

/** Props above the player's tier shudder in place: a hint that they need a higher level. */
function tooHeavy(
  e: PropEntry,
  p: { x: number; y: number; z: number },
  reach: number,
) {
  const jolt = (1 - reach) * 0.6 * e.body.mass();
  e.body.applyImpulse(
    {
      x: MathUtils.randFloatSpread(jolt),
      y: jolt * 0.4 * Math.random(),
      z: MathUtils.randFloatSpread(jolt),
    },
    true,
  );
  const now = performance.now();
  if (now - lastTooHeavy < TOO_HEAVY_MS) return;
  lastTooHeavy = now;
  emit("tooHeavy", { x: p.x, y: p.y, z: p.z, tier: e.tier });
}

const GRAVITY = 20;
/** Max distance for auto-aim, and the cone half-angle cosine (≈60°). */
const AIM_RANGE = 30;
const AIM_CONE = 0.5;
/** Invaders this close are always valid targets, whatever the facing. */
const AIM_CLOSE = 7;

/** Up to 3 invaders to spread a volley over, best (close + in front) first. */
function pickTargets(pp: { x: number; z: number }, f: Vector3): EnemyEntry[] {
  const scored: { e: EnemyEntry; score: number }[] = [];
  for (const e of enemies) {
    const p = e.body.translation();
    const dx = p.x - pp.x;
    const dz = p.z - pp.z;
    const d = Math.hypot(dx, dz) || 0.001;
    if (d > AIM_RANGE) continue;
    const cos = (dx * f.x + dz * f.z) / d;
    if (cos < AIM_CONE && d > AIM_CLOSE) continue;
    // Bosses and brutes soak more, so they attract more of the volley.
    const weight = e.kind === "boss" ? 0.6 : e.kind === "brute" ? 0.8 : 1;
    scored.push({ e, score: d * (1.6 - cos) * weight });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, 3).map((s) => s.e);
}

/** Gravity Lock upgrade: launched props curve toward their target. */
function steerProjectiles(dt: number) {
  const n = stacks(gameStore.get().upgrades, "homing");
  if (n === 0) return;
  const now = performance.now();
  const k = 1 - Math.exp(-2.5 * n * dt);
  for (const e of props) {
    const target = e.target;
    if (!target || now > e.projectileUntil || !enemies.has(target)) continue;
    const p = e.body.translation();
    const tp = target.body.translation();
    const v = e.body.linvel();
    const speed = Math.hypot(v.x, v.y, v.z);
    const dx = tp.x - p.x;
    const dy = tp.y - p.y;
    const dz = tp.z - p.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    e.body.setLinvel(
      {
        x: v.x + ((dx / d) * speed - v.x) * k,
        y: v.y + ((dy / d) * speed - v.y) * k,
        z: v.z + ((dz / d) * speed - v.z) * k,
      },
      true,
    );
  }
}

/** Release Pulse upgrade: letting go blasts nearby invaders away. */
function releasePulse(pp: { x: number; y: number; z: number }) {
  const n = stacks(gameStore.get().upgrades, "shockwave");
  if (n === 0) return;
  const radius = 4 + n * 1.5;
  emitImpact({
    x: pp.x,
    y: 0.3,
    z: pp.z,
    strength: 1,
    color: "#b388ff",
    projectile: true,
    kind: "husk",
    points: 0,
  });
  for (const e of [...enemies]) {
    const p = e.body.translation();
    const dx = p.x - pp.x;
    const dz = p.z - pp.z;
    const d = Math.hypot(dx, dz) || 0.001;
    if (d > radius + e.radius) continue;
    const m = e.body.mass();
    const push = (1 - (d / (radius + e.radius)) * 0.5) * (6 + n * 3) * m;
    e.body.applyImpulse(
      { x: (dx / d) * push, y: m * 3, z: (dz / d) * push },
      true,
    );
    damageEnemy(e, 0.4 * n);
  }
}

/** Fling every held prop toward a point in front of the player. */
function launchHeld(
  pp: { x: number; y: number; z: number },
  pv: { x: number; z: number },
) {
  const now = performance.now();
  const f = player.facing;
  const { level, upgrades } = gameStore.get();
  const power = (1 + (level - 1) * 0.1) * 1.2 ** stacks(upgrades, "power");
  const targets = pickTargets(pp, f);
  let count = 0;

  for (const e of props) {
    if (!e.held) continue;
    drop(e);
    const speed = (launch.speed * power) / massFactor(e) ** 0.25;
    const p = e.body.translation();
    const target = targets.length ? targets[count % targets.length] : null;
    count++;
    e.target = target;
    e.exploded = false;

    if (target) {
      // Auto-aim: ballistic shot with lead on the invader's movement.
      const tp = target.body.translation();
      const tv = target.body.linvel();
      let tx = tp.x;
      let tz = tp.z;
      let t = Math.hypot(tx - p.x, tz - p.z) / speed;
      tx += tv.x * t;
      tz += tv.z * t;
      const dist = Math.hypot(tx - p.x, tz - p.z);
      t = Math.max(dist / speed, 0.05);
      const vy = MathUtils.clamp(
        (tp.y + 0.2 - p.y) / t + 0.5 * GRAVITY * t,
        -6,
        18,
      );
      e.body.setLinvel(
        {
          x: ((tx - p.x) / dist) * speed,
          y: vy,
          z: ((tz - p.z) / dist) * speed,
        },
        true,
      );
    } else {
      // No target: converge slightly on a point ahead, like a shotgun funnel.
      toAim
        .set(pp.x + f.x * 12 - p.x, pp.y + 0.6 - p.y, pp.z + f.z * 12 - p.z)
        .normalize();
      shot
        .set(f.x, 0, f.z)
        .lerp(toAim, 0.5)
        .normalize()
        .applyAxisAngle(up, MathUtils.randFloatSpread(launch.spread));
      e.body.setLinvel(
        {
          x: shot.x * speed + pv.x * 0.5,
          y: shot.y * speed + launch.lift,
          z: shot.z * speed + pv.z * 0.5,
        },
        true,
      );
    }
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
  emit("launch", { count, x: pp.x, y: pp.y, z: pp.z });

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
    const lvl = levelSpec();
    if (range.current) {
      range.current.scale.setScalar(lvl.field / field.radius);
      range.current.rotation.z = t * 0.6;
      (range.current.material as MeshBasicMaterial).opacity = 0.8 * lv;
    }
    waves.current.forEach((wave, i) => {
      if (!wave) return;
      // Waves travel from the edge of the field toward the player.
      const phase = (t * 0.9 + i / waves.current.length) % 1;
      wave.scale.setScalar(MathUtils.lerp(lvl.field, lvl.radius + 0.3, phase));
      (wave.material as MeshBasicMaterial).opacity =
        Math.sin(phase * Math.PI) * 0.5 * lv;
    });
    if (aura.current) {
      aura.current.position.y = playerPos.y;
      aura.current.scale.setScalar(
        (lvl.radius * 2 + Math.sin(t * 10) * 0.08) * lv,
      );
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
