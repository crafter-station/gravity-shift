"use client";

import { useSyncExternalStore } from "react";

/** menu → playing ⇄ upgrade (pick 1 of 3 between waves) → results. */
export type GamePhase = "menu" | "playing" | "upgrade" | "results";

/** Tiny external store for state the UI needs. The 3D loop writes, React reads. */
export type GameState = {
  phase: GamePhase;
  launched: number;
  held: number;
  attracting: boolean;
  /** Incremented to remount (reset) the physics world. */
  resetKey: number;
  score: number;
  best: number;
  combo: number;
  /** Current wave (1-based) out of totalWaves. */
  wave: number;
  totalWaves: number;
  /** Enemies still to defeat this wave (alive + not yet spawned). */
  enemiesLeft: number;
  kills: number;
  /** Plaza core health; reaching 0 loses the run. */
  coreHp: number;
  coreMaxHp: number;
  /** Upgrade ids offered while phase === "upgrade". */
  upgradeChoices: string[];
  /** Picked upgrade stacks by id. */
  upgrades: Record<string, number>;
  /** Outcome once phase === "results". */
  result: "victory" | "defeat" | null;
  /** 1-based player level and XP (XP = points earned this round). */
  level: number;
  xp: number;
  /** 0..1 share of the plaza wrecked. */
  destruction: number;
  muted: boolean;
  /** Physics paused for hitstop. */
  frozen: boolean;
};

const initialRound = {
  launched: 0,
  held: 0,
  attracting: false,
  score: 0,
  combo: 0,
  wave: 0,
  totalWaves: 10,
  enemiesLeft: 0,
  kills: 0,
  coreHp: 100,
  coreMaxHp: 100,
  upgradeChoices: [] as string[],
  upgrades: {} as Record<string, number>,
  result: null,
  level: 1,
  xp: 0,
  destruction: 0,
  frozen: false,
} satisfies Partial<GameState>;

let state: GameState = {
  ...initialRound,
  phase: "menu",
  resetKey: 0,
  best: 0,
  muted: false,
};
const listeners = new Set<() => void>();

function set(patch: Partial<GameState>) {
  let changed = false;
  for (const key of Object.keys(patch) as (keyof GameState)[]) {
    if (patch[key] !== state[key]) changed = true;
  }
  if (!changed) return;
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export const gameStore = {
  get: () => state,
  set,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  addLaunched: (n: number) => set({ launched: state.launched + n }),
  setHeld: (held: number) => set({ held }),
  setAttracting: (attracting: boolean) => set({ attracting }),
  /** Clears round stats and rebuilds the physics world. Phase is left untouched. */
  reset: () => set({ ...initialRound, resetKey: state.resetKey + 1 }),
};

export function useGameStore<T>(selector: (s: GameState) => T): T {
  return useSyncExternalStore(
    gameStore.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
