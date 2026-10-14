"use client";

import { useSyncExternalStore } from "react";

export type GamePhase = "menu" | "playing" | "results";

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
  /** Seconds left in the current round. */
  timeLeft: number;
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
  timeLeft: 0,
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
