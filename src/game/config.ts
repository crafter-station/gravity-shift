import type { PropKind } from "./registry";

/** Central tuning knobs. Tweak here to change the game feel. */
export const CONFIG = {
  arena: { size: 40 },
  game: { durationSec: 90 },
  player: { radius: 0.55, speed: 7.5, accel: 10 },
  camera: { offset: [0, 9, 10.5] as const, follow: 5 },
  field: {
    radius: 7,
    maxHeld: 14,
    orbitRadius: [2.2, 3.4] as const,
    orbitHeight: [1.2, 2.6] as const,
    orbitSpeed: 2.2,
    steer: 9,
    maxSpeed: 16,
  },
  launch: { speed: 24, lift: 4, spread: 0.18, projectileMs: 1500 },
  impact: { minSpeed: 5, cooldownMs: 150 },
  killY: -10,
} as const;

/**
 * Growth levels (Hole.io style). Reaching `xp` unlocks the level: the orb grows,
 * the field reaches further, holds more and can lift props up to `tier`.
 */
export const LEVELS = [
  { xp: 0, radius: 0.55, field: 6, maxHeld: 8, tier: 1 },
  { xp: 400, radius: 0.7, field: 7.5, maxHeld: 12, tier: 2 },
  { xp: 1300, radius: 0.85, field: 9, maxHeld: 16, tier: 3 },
  { xp: 3000, radius: 1.05, field: 10.5, maxHeld: 20, tier: 4 },
  { xp: 6000, radius: 1.3, field: 12, maxHeld: 26, tier: 5 },
] as const;

/** Per-kind gameplay data: minimum level tier to lift it, base points, can it shatter. */
export const KINDS: Record<
  PropKind,
  { tier: number; points: number; breakable: boolean }
> = {
  ball: { tier: 1, points: 10, breakable: true },
  cone: { tier: 1, points: 10, breakable: true },
  box: { tier: 1, points: 15, breakable: true },
  pin: { tier: 1, points: 20, breakable: true },
  bench: { tier: 2, points: 25, breakable: true },
  cart: { tier: 2, points: 35, breakable: true },
  vehicle: { tier: 3, points: 50, breakable: false },
  kiosk: { tier: 4, points: 80, breakable: true },
  bus: { tier: 5, points: 150, breakable: false },
};
