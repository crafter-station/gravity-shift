"use client";

import { useSyncExternalStore } from "react";

/** Tiny external store for state the HUD needs. The 3D loop writes, React reads. */
export type GameState = {
  launched: number;
  held: number;
  attracting: boolean;
  resetKey: number;
};

let state: GameState = { launched: 0, held: 0, attracting: false, resetKey: 0 };
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
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  addLaunched: (n: number) => set({ launched: state.launched + n }),
  setHeld: (held: number) => set({ held }),
  setAttracting: (attracting: boolean) => set({ attracting }),
  reset: () =>
    set({
      launched: 0,
      held: 0,
      attracting: false,
      resetKey: state.resetKey + 1,
    }),
};

export function useGameStore<T>(selector: (s: GameState) => T): T {
  return useSyncExternalStore(
    gameStore.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
