import type { CollisionEnterPayload } from "@react-three/rapier";
import { damage } from "./breakables";
import { maybeDetonate } from "./combat";
import { CONFIG } from "./config";
import type { PropEntry, PropKind } from "./registry";

/** Impact event consumed by the <Effects /> component. */
export type ImpactEvent = {
  x: number;
  y: number;
  z: number;
  /** 0..1 normalized impact strength. */
  strength: number;
  color: string;
  /** True when the hit prop is a launched projectile. */
  projectile: boolean;
  /** Kind and base points of the prop reporting the hit. */
  kind: PropKind;
  points: number;
};

const listeners = new Set<(e: ImpactEvent) => void>();

export function onImpact(listener: (e: ImpactEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitImpact(event: ImpactEvent) {
  for (const l of listeners) l(event);
}

/** Camera shake trauma (0..1), decayed and consumed by <CameraRig />. */
export const shake = { trauma: 0 };

/** Adds camera shake trauma (0..1), clamped. */
export function addShake(amount: number) {
  shake.trauma = Math.min(1, shake.trauma + amount);
}

/** Strength above which held props still produce effects. */
const HELD_MIN_STRENGTH = 0.8;

/** Called by every prop on collision enter. Decides whether the hit is worth an effect. */
export function reportImpact(entry: PropEntry, payload: CollisionEnterPayload) {
  const now = performance.now();
  if (now - entry.lastImpactAt < CONFIG.impact.cooldownMs) return;

  const v = entry.body.linvel();
  const o = payload.other.rigidBody?.linvel();
  const rx = v.x - (o?.x ?? 0);
  const ry = v.y - (o?.y ?? 0);
  const rz = v.z - (o?.z ?? 0);
  const speed = Math.hypot(rx, ry, rz);
  if (speed < CONFIG.impact.minSpeed) return;

  const projectile = now < entry.projectileUntil;
  const strength = Math.min(speed / 25, 1) * (projectile ? 1 : 0.7);
  damage(entry, strength, projectile, payload.other.rigidBody?.handle);
  if (entry.held && strength < HELD_MIN_STRENGTH) return;

  entry.lastImpactAt = now;

  let x: number;
  let y: number;
  let z: number;
  const m = payload.manifold;
  if (m.numSolverContacts() > 0) {
    const c = m.solverContactPoint(0);
    x = c.x;
    y = c.y;
    z = c.z;
  } else {
    const p = entry.body.translation();
    x = p.x;
    y = p.y;
    z = p.z;
  }

  if (projectile) maybeDetonate(entry, x, y, z);

  emitImpact({
    x,
    y,
    z,
    strength,
    color: entry.color,
    projectile,
    kind: entry.kind,
    points: entry.points,
  });

  if (projectile && strength > 0.4) addShake(strength * 0.45);
  else if (strength > 0.7) addShake(strength * 0.2);
}
