import { Box3, Vector3 } from "three";
import { enemyByHandle } from "./combat";
import { emit } from "./events";
import { allProps, type PropEntry, propByHandle, props } from "./registry";
import { gameStore } from "./store";

/** Impact strength (0..1) needed to shatter a breakable prop hit by/with a projectile. */
const BREAK_STRENGTH = 0.5;
/** Odds a breakable prop shatters on a qualifying hit (keeps ammo around). */
const SHATTER_CHANCE = 0.45;
/** Impact strength that counts a sturdy prop as wrecked. */
const WRECK_STRENGTH = 0.35;

export type DebrisSpawn = {
  id: number;
  position: Vector3;
  velocity: Vector3;
  /** Approximate size of the broken prop (bounding box). */
  size: Vector3;
  color: string;
  kind: PropEntry["kind"];
};

const box = new Box3();
let nextId = 1;
const debrisListeners = new Set<(d: DebrisSpawn) => void>();

/** Subscribe to shatter events (used by <Breakables /> to spawn debris bodies). */
export function onDebris(listener: (d: DebrisSpawn) => void) {
  debrisListeners.add(listener);
  return () => {
    debrisListeners.delete(listener);
  };
}

export function registerProp(entry: PropEntry) {
  props.add(entry);
  allProps.add(entry);
  propByHandle.set(entry.body.handle, entry);
  updateDestruction();
}

export function unregisterProp(entry: PropEntry, handle: number) {
  props.delete(entry);
  allProps.delete(entry);
  propByHandle.delete(handle);
}

function updateDestruction() {
  if (allProps.size === 0) return;
  let wrecked = 0;
  for (const e of allProps) if (e.wrecked) wrecked++;
  gameStore.set({ destruction: wrecked / allProps.size });
}

function markWrecked(entry: PropEntry) {
  if (entry.wrecked) return;
  entry.wrecked = true;
  updateDestruction();
}

/**
 * Applies damage from a collision. Only hits involving a launched projectile count,
 * so props bumping each other in orbit or rolling around never break.
 */
export function damage(
  entry: PropEntry,
  strength: number,
  projectile: boolean,
  otherHandle: number | undefined,
) {
  if (entry.broken) return;
  const other =
    otherHandle === undefined ? undefined : propByHandle.get(otherHandle);
  const otherProjectile = other
    ? performance.now() < other.projectileUntil
    : false;
  if (!projectile && !otherProjectile) return;

  // Ground and static scenery never shatter props: thrown ammo can be reused.
  const hitEnemy = otherHandle !== undefined && enemyByHandle.has(otherHandle);
  const hitProp = other !== undefined;
  if (
    entry.breakable &&
    strength >= BREAK_STRENGTH &&
    (hitEnemy || hitProp) &&
    // Husks are bonus ammo and always burst; regular props survive half the time.
    (entry.kind === "husk" || Math.random() < SHATTER_CHANCE)
  ) {
    shatter(entry);
  } else if (strength >= WRECK_STRENGTH) markWrecked(entry);
}

/** Removes the prop from play and asks <Breakables /> to spawn its debris. */
export function shatter(entry: PropEntry) {
  if (entry.broken) return;
  entry.broken = true;
  entry.held = false;
  props.delete(entry);
  markWrecked(entry);

  box.setFromObject(entry.object);
  const size = box.getSize(new Vector3());
  const position = box.getCenter(new Vector3());
  const v = entry.body.linvel();
  const velocity = new Vector3(v.x, v.y, v.z);

  entry.object.visible = false;
  entry.body.setEnabled(false);

  emit("break", {
    x: position.x,
    y: position.y,
    z: position.z,
    color: entry.color,
    kind: entry.kind,
    points: entry.points,
  });
  const spawn: DebrisSpawn = {
    id: nextId++,
    position,
    velocity,
    size,
    color: entry.color,
    kind: entry.kind,
  };
  for (const l of debrisListeners) l(spawn);
}
