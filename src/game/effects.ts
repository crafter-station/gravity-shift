import type { CollisionEnterPayload } from "@react-three/rapier";
import type { PropEntry } from "./registry";

/** Impact event consumed by the <Effects /> component. */
export type ImpactEvent = {
  x: number;
  y: number;
  z: number;
  /** 0..1 normalized impact strength. */
  strength: number;
  color: string;
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

/** Called by every prop on collision enter. Decides whether the hit is worth an effect. */
export function reportImpact(entry: PropEntry, payload: CollisionEnterPayload) {
  // TODO(effects): refine thresholds, use contact point from payload.manifold.
  void payload;
  const v = entry.body.linvel();
  const speed = Math.hypot(v.x, v.y, v.z);
  if (speed < 5) return;
  const p = entry.body.translation();
  emitImpact({
    x: p.x,
    y: p.y,
    z: p.z,
    strength: Math.min(speed / 25, 1),
    color: entry.color,
  });
}
