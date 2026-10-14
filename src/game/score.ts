import { emit, on } from "./events";
import { input } from "./input";
import { addXp } from "./progression";
import { gameStore } from "./store";
import { setRunEndHandler, startRun, tickWaves } from "./waves";

const BEST_KEY = "gravity-shift:best-defense";
const COMBO_WINDOW_MS = 1200;
const MAX_MULT = 4;

let comboCount = 0;
let lastHitAt = 0;
let initialized = false;

/** Outcome of the last finished run, read by the results screen. */
export const lastRound = { best: false };

/** Combo multiplier for a combo count: 1 + 0.25 × (n − 1), capped at ×4. */
export function comboMultiplier(count: number) {
  return Math.min(MAX_MULT, 1 + 0.25 * Math.max(0, count - 1));
}

/** Pooled floating-text slots shared by GameDirector (projects) and ScorePopups (renders). */
export const POPUP_SLOTS = 24;
export type PopupSlot = {
  active: boolean;
  amount: number;
  combo: number;
  /** World position the text is anchored to. */
  wx: number;
  wy: number;
  wz: number;
  /** performance.now() at spawn. */
  born: number;
  /** Projected screen position in CSS pixels, written by GameDirector. */
  sx: number;
  sy: number;
  /** False when behind the camera. */
  visible: boolean;
};
export const popupSlots: PopupSlot[] = Array.from(
  { length: POPUP_SLOTS },
  () => ({
    active: false,
    amount: 0,
    combo: 0,
    wx: 0,
    wy: 0,
    wz: 0,
    born: 0,
    sx: 0,
    sy: 0,
    visible: false,
  }),
);
let nextSlot = 0;

function spawnPopup(
  amount: number,
  combo: number,
  x: number,
  y: number,
  z: number,
) {
  const slot = popupSlots[nextSlot];
  nextSlot = (nextSlot + 1) % POPUP_SLOTS;
  slot.active = true;
  slot.amount = amount;
  slot.combo = combo;
  slot.wx = x;
  slot.wy = y;
  slot.wz = z;
  slot.born = performance.now();
  slot.visible = false;
}

function readBest() {
  try {
    const n = Number(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeBest(n: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(n));
  } catch {
    // storage unavailable (private mode): ignore
  }
}

/** Awards points: `base` is multiplied by the combo multiplier. */
function award(base: number, x: number, y: number, z: number) {
  const now = performance.now();
  comboCount =
    comboCount > 0 && now - lastHitAt <= COMBO_WINDOW_MS ? comboCount + 1 : 1;
  lastHitAt = now;
  const points = Math.max(1, Math.round(base * comboMultiplier(comboCount)));
  gameStore.set({ score: gameStore.get().score + points, combo: comboCount });
  addXp(points);
  spawnPopup(points, comboCount, x, y, z);
  emit("points", { amount: points, combo: comboCount, x, y, z });
  if (comboCount >= 2) emit("combo", { count: comboCount });
}

/** Subscribes scoring to invader events once. Safe to call repeatedly. */
export function initScoring() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  if (gameStore.get().phase === "menu") input.enabled = false;
  gameStore.set({ best: readBest() });
  setRunEndHandler(endGame);

  // Kills are the main source of points; chaining kills builds the combo.
  on("enemyKilled", (e) => {
    if (gameStore.get().phase !== "playing") return;
    award(e.points, e.x, e.y + 1, e.z);
  });
}

/** Starts (or restarts) a defense run from wave 1. */
export function startGame() {
  initScoring();
  gameStore.reset();
  comboCount = 0;
  lastHitAt = 0;
  lastRound.best = false;
  for (const p of popupSlots) p.active = false;
  input.enabled = true;
  gameStore.set({ phase: "playing" });
  emit("gameStart", {});
  startRun();
}

/** Ends the run (core destroyed or last wave cleared): persists best, shows results. */
export function endGame(victory: boolean) {
  const s = gameStore.get();
  if (s.phase !== "playing") return;
  input.enabled = false;
  const isBest = s.score > s.best;
  lastRound.best = isBest;
  if (isBest) writeBest(s.score);
  gameStore.set({
    phase: "results",
    result: victory ? "victory" : "defeat",
    combo: 0,
    attracting: false,
    best: isBest ? s.score : s.best,
  });
  emit("gameEnd", { score: s.score, wave: s.wave, victory, best: isBest });
}

/** Advances waves and combo decay; call every frame with delta seconds. */
export function tickRound(dt: number) {
  if (gameStore.get().phase !== "playing") return;
  const now = performance.now();
  if (comboCount > 0 && now - lastHitAt > COMBO_WINDOW_MS) {
    comboCount = 0;
    gameStore.set({ combo: 0 });
  }
  tickWaves(dt);
}
