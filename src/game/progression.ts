import { LEVELS } from "./config";
import { emit } from "./events";
import { gameStore } from "./store";

export type LevelSpec = (typeof LEVELS)[number];

export const MAX_LEVEL = LEVELS.length;

/** Stats for the current player level. */
export function currentLevel(): LevelSpec {
  return LEVELS[gameStore.get().level - 1];
}

/** XP progress inside the current level, for progress bars (ratio is 1 at max level). */
export function levelProgress(level: number, xp: number) {
  if (level >= MAX_LEVEL)
    return { from: LEVELS[MAX_LEVEL - 1].xp, to: null, ratio: 1 };
  const from = LEVELS[level - 1].xp;
  const to = LEVELS[level].xp;
  return { from, to, ratio: Math.min((xp - from) / (to - from), 1) };
}

/** Adds XP (1 point = 1 XP) and levels up when thresholds are crossed. */
export function addXp(amount: number) {
  const s = gameStore.get();
  const xp = s.xp + amount;
  let level = s.level;
  while (level < MAX_LEVEL && xp >= LEVELS[level].xp) level++;
  gameStore.set({ xp, level });
  if (level > s.level) emit("levelUp", { level });
}
