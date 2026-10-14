import type { RapierRigidBody } from "@react-three/rapier";
import { type Object3D, Vector3 } from "three";

export type PropKind = "box" | "cone" | "bench" | "vehicle" | "ball";

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
};

export const props = new Set<PropEntry>();

/** Player handles shared with the gravity field, camera and effects. */
export const player = {
  body: null as RapierRigidBody | null,
  object: null as Object3D | null,
  /** Normalized XZ direction the player is facing (launch direction). */
  facing: new Vector3(0, 0, -1),
};
