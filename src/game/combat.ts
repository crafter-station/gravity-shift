import { addShake, emitImpact } from "./effects";
import { emit } from "./events";
import {
  type EnemyEntry,
  enemies,
  type PropEntry,
  propByHandle,
} from "./registry";
import { gameStore } from "./store";
import { stacks } from "./upgrades";
import { ENEMY_STATS, enemyRemoved } from "./waves";

/** Lookup from rigid body handle to live enemy (collision resolution). */
export const enemyByHandle = new Map<number, EnemyEntry>();

const KIND_COLOR: Record<EnemyEntry["kind"], string> = {
  minion: "#ff5a5f",
  runner: "#ffd23f",
  brute: "#4d7cff",
  boss: "#b04dff",
};

export function enemyColor(kind: EnemyEntry["kind"]) {
  return KIND_COLOR[kind];
}

function upgrades() {
  return gameStore.get().upgrades;
}

/** Damage multiplier from the Heavy Throw upgrade. */
export function powerMultiplier() {
  return 1.3 ** stacks(upgrades(), "power");
}

export function registerEnemy(e: EnemyEntry) {
  enemies.add(e);
  enemyByHandle.set(e.body.handle, e);
}

export function unregisterEnemy(e: EnemyEntry, handle: number) {
  enemies.delete(e);
  enemyByHandle.delete(handle);
}

/** Applies damage; kills (and scores) the enemy when hp runs out. */
export function damageEnemy(e: EnemyEntry, amount: number) {
  if (!enemies.has(e) || amount <= 0) return;
  const now = performance.now();
  e.hp -= amount;
  e.hitAt = now;
  e.stunUntil = now + ENEMY_STATS[e.kind].stun * 1000;
  const p = e.body.translation();
  const killed = e.hp <= 0;
  emit("enemyHit", {
    kind: e.kind,
    damage: amount,
    killed,
    x: p.x,
    y: p.y,
    z: p.z,
  });
  if (!killed) return;

  unregisterEnemy(e, e.body.handle);
  enemyRemoved(true);
  const big = e.kind === "boss" ? 1 : e.kind === "brute" ? 0.8 : 0.55;
  emitImpact({
    x: p.x,
    y: p.y,
    z: p.z,
    strength: big,
    color: KIND_COLOR[e.kind],
    projectile: true,
    kind: "husk",
    points: 0,
  });
  addShake(big * 0.5);
  emit("enemyKilled", {
    kind: e.kind,
    points: ENEMY_STATS[e.kind].points,
    x: p.x,
    y: p.y,
    z: p.z,
  });
  e.onDefeat("killed");
}

/** Damage from a prop slamming into an enemy (relative speed, prop mass, upgrades). */
export function propHitsEnemy(
  e: EnemyEntry,
  prop: PropEntry,
  relSpeed: number,
) {
  const now = performance.now();
  const projectile = now < prop.projectileUntil;
  if (projectile) {
    const dmg = (prop.body.mass() ** 0.7 * relSpeed * powerMultiplier()) / 12;
    if (dmg > 0.05) damageEnemy(e, dmg);
    return;
  }
  // Hyper Orbit: props spinning around the player hurt invaders they clip.
  const spin = stacks(upgrades(), "spin");
  if (prop.held && spin > 0 && now - e.lastContactAt > 300) {
    e.lastContactAt = now;
    damageEnemy(e, 0.35 * spin);
  }
}

/** Radial blast: damages and pushes every enemy inside `radius`. */
export function explode(
  x: number,
  y: number,
  z: number,
  radius: number,
  damage: number,
) {
  emitImpact({
    x,
    y,
    z,
    strength: 1,
    color: "#ff9f1c",
    projectile: true,
    kind: "husk",
    points: 0,
  });
  addShake(0.35);
  for (const e of [...enemies]) {
    const p = e.body.translation();
    const dx = p.x - x;
    const dz = p.z - z;
    const d = Math.hypot(dx, p.y - y, dz);
    if (d > radius + e.radius) continue;
    const falloff = 1 - Math.min(d / (radius + e.radius), 1) * 0.6;
    const len = Math.hypot(dx, dz) || 1;
    const m = e.body.mass();
    e.body.applyImpulse(
      {
        x: (dx / len) * 6 * m * falloff,
        y: 4 * m * falloff,
        z: (dz / len) * 6 * m * falloff,
      },
      true,
    );
    damageEnemy(e, damage * falloff);
  }
}

/** Volatile Matter: a launched prop detonates on its first hit. */
export function maybeDetonate(
  prop: PropEntry,
  x: number,
  y: number,
  z: number,
) {
  const n = stacks(upgrades(), "explosive");
  if (n === 0 || prop.exploded || performance.now() > prop.projectileUntil)
    return;
  prop.exploded = true;
  explode(x, y, z, 2 + n * 0.6, 0.6 + n * 0.5);
}

/** Resolves the prop on the other side of an enemy collision, if any. */
export function propFromHandle(handle: number | undefined) {
  return handle === undefined ? undefined : propByHandle.get(handle);
}
