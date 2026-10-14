import type { RapierRigidBody } from "@react-three/rapier";
import { type Object3D, Vector3 } from "three";

export type PropKind =
  | "box"
  | "cone"
  | "bench"
  | "vehicle"
  | "ball"
  | "pin"
  | "cart"
  | "kiosk"
  | "bus"
  | "husk";

/** Runtime data for every dynamic prop the gravity field can grab. */
export type PropEntry = {
  body: RapierRigidBody;
  /** RigidBody group (interpolated transform), useful for visual effects. */
  object: Object3D;
  kind: PropKind;
  color: string;
  spawn: Vector3;
  held: boolean;
  orbitAngle: number;
  orbitRadius: number;
  orbitHeight: number;
  /** performance.now() timestamp until which the prop counts as a launched projectile. */
  projectileUntil: number;
  lastImpactAt: number;
  /** Minimum player level tier needed to lift it (see KINDS in config). */
  tier: number;
  /** Base points awarded for hits with/against this prop. */
  points: number;
  breakable: boolean;
  /** Counted toward the destruction meter (broken or hit hard by a projectile). */
  wrecked: boolean;
  /** Shattered and removed from the world. */
  broken: boolean;
  /** Auto-aim target assigned at launch (homing upgrade steers toward it). */
  target: EnemyEntry | null;
  /** Already detonated this throw (explosive upgrade). */
  exploded: boolean;
  /** Currently ignoring the player collider (held or just launched). */
  ghost: boolean;
};

/** Props still in play (grabbable). Broken props are removed from here. */
export const props = new Set<PropEntry>();

/** Every prop mounted this round, broken or not (destruction meter denominator). */
export const allProps = new Set<PropEntry>();

/** Lookup from rigid body handle, used to resolve the other side of a collision. */
export const propByHandle = new Map<number, PropEntry>();

/** Player handles shared with the gravity field, camera and effects. */
export const player = {
  body: null as RapierRigidBody | null,
  object: null as Object3D | null,
  /** Normalized XZ direction the player is facing (launch direction). */
  facing: new Vector3(0, 0, -1),
  /** Current (animated) collider radius; grows with level. */
  radius: 0.55,
};

export type EnemyKind = "minion" | "runner" | "brute" | "boss";

/** Runtime data for a live invader. */
export type EnemyEntry = {
  id: number;
  body: RapierRigidBody;
  /** Interpolated transform group (for UI projection / effects). */
  object: Object3D;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  radius: number;
  /** Knocked back: no steering until performance.now() passes this. */
  stunUntil: number;
  /** Last time held-orbit contact damage was applied (spin upgrade). */
  lastContactAt: number;
  /** performance.now() of the last damage, drives the hit flash. */
  hitAt: number;
  /** Called once when the enemy leaves play: killed (becomes a husk) or reached the core. */
  onDefeat: (reason: "killed" | "core") => void;
};

/** Live (not yet defeated) enemies. */
export const enemies = new Set<EnemyEntry>();

/** The plaza core everybody is fighting over. */
export const core = { x: 0, z: 0, radius: 1.4 };
