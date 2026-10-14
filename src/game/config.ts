/** Central tuning knobs. Tweak here to change the game feel. */
export const CONFIG = {
  arena: { size: 40 },
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
