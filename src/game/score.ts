import { CONFIG } from "./config";
import { onImpact } from "./effects";
import { emit, on } from "./events";
import { input } from "./input";
import { addXp } from "./progression";
import { gameStore } from "./store";

const BEST_KEY = "gravity-shift:best";
const COMBO_WINDOW_MS = 1200;
const MAX_MULT = 4;

/** Precise round clock (the store copy is throttled). */
const round = { timeLeft: 0, storeAt: 0 };
let comboCount = 0;
let lastHitAt = 0;
let initialized = false;

/** Outcome of the last finished round, read by the results screen. */
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

/** Subscribes scoring to impact / break events once. Safe to call repeatedly. */
export function initScoring() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  if (gameStore.get().phase === "menu") input.enabled = false;
  gameStore.set({ best: readBest() });

  onImpact((e) => {
    if (gameStore.get().phase !== "playing" || !e.projectile) return;
    award(e.points * (0.5 + e.strength), e.x, e.y, e.z);
  });
  on("break", (e) => {
    if (gameStore.get().phase !== "playing") return;
    award(e.points * 2, e.x, e.y, e.z);
  });
}

/** Starts (or restarts) a timed round. */
export function startGame() {
  initScoring();
  gameStore.reset();
  comboCount = 0;
  lastHitAt = 0;
  lastRound.best = false;
  round.timeLeft = CONFIG.game.durationSec;
  round.storeAt = 0;
  for (const p of popupSlots) p.active = false;
  input.enabled = true;
  gameStore.set({ phase: "playing", timeLeft: CONFIG.game.durationSec });
  emit("gameStart", {});
}

/** Ends the round: persists best, shows results. */
export function endGame() {
  const s = gameStore.get();
  if (s.phase !== "playing") return;
  input.enabled = false;
  const isBest = s.score > s.best;
  lastRound.best = isBest;
  if (isBest) writeBest(s.score);
  gameStore.set({
    phase: "results",
    timeLeft: 0,
    combo: 0,
    attracting: false,
    best: isBest ? s.score : s.best,
  });
  emit("gameEnd", {
    score: s.score,
    destruction: s.destruction,
    best: isBest,
  });
}

/** Advances the round clock and combo decay; call every frame with delta seconds. */
export function tickRound(dt: number) {
  if (gameStore.get().phase !== "playing") return;
  const now = performance.now();
  if (comboCount > 0 && now - lastHitAt > COMBO_WINDOW_MS) {
    comboCount = 0;
    gameStore.set({ combo: 0 });
  }
  round.timeLeft = Math.max(0, round.timeLeft - Math.min(dt, 0.1));
  if (round.timeLeft <= 0) {
    endGame();
    return;
  }
  if (now - round.storeAt >= 100) {
    round.storeAt = now;
    gameStore.set({ timeLeft: round.timeLeft });
  }
}
