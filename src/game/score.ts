import { input } from "./input";
import { gameStore } from "./store";

/** Starts (or restarts) a timed round. TODO(score): full scoring, combos, timer. */
export function startGame() {
  gameStore.reset();
  input.enabled = true;
  gameStore.set({ phase: "playing" });
}
