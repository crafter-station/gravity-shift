import type { EnemyKind } from "@/game/registry";

/** Pooled off-screen invader arrows: written by EnemyIndicators, read by EnemyIndicatorLayer. */
export const INDICATOR_SLOTS = 24;
export type IndicatorSlot = {
  active: boolean;
  kind: EnemyKind;
  /** Clamped screen position in CSS pixels. */
  sx: number;
  sy: number;
  /** Radians, pointing toward the enemy. */
  angle: number;
  /** 0..1, higher when closer to the core. */
  danger: number;
};
export const indicatorSlots: IndicatorSlot[] = Array.from(
  { length: INDICATOR_SLOTS },
  () => ({ active: false, kind: "minion", sx: 0, sy: 0, angle: 0, danger: 0 }),
);
