"use client";

import { useEffect, useRef } from "react";
import { LEVELS } from "@/game/config";
import { on } from "@/game/events";
import { POPUP_SLOTS, popupSlots } from "@/game/score";

const LIFE_MS = 1100;
const RISE_PX = 70;
const TIER_NAMES: Record<number, string> = {
  2: "benches & food carts",
  3: "cars",
  4: "kiosks",
  5: "the bus",
};

/** First player level whose tier can lift props of the given tier. */
function levelForTier(tier: number) {
  const i = LEVELS.findIndex((l) => l.tier >= tier);
  return i < 0 ? LEVELS.length : i + 1;
}

/** Floating +points texts, level-up banner and too-heavy toast. DOM only, no per-frame React renders. */
export function ScorePopups() {
  const popupEls = useRef<(HTMLDivElement | null)[]>([]);
  const bornSeen = useRef<number[]>(new Array(POPUP_SLOTS).fill(-1));
  const bannerRef = useRef<HTMLDivElement>(null);
  const bannerTextRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      for (let i = 0; i < POPUP_SLOTS; i++) {
        const el = popupEls.current[i];
        const slot = popupSlots[i];
        if (!el) continue;
        if (!slot.active) {
          if (el.style.opacity !== "0") el.style.opacity = "0";
          continue;
        }
        const t = (now - slot.born) / LIFE_MS;
        if (t >= 1 || !slot.visible) {
          if (t >= 1) slot.active = false;
          el.style.opacity = "0";
          continue;
        }
        if (bornSeen.current[i] !== slot.born) {
          bornSeen.current[i] = slot.born;
          const c = slot.combo;
          el.textContent = `+${slot.amount}`;
          el.style.color =
            c >= 8
              ? "#ff5252"
              : c >= 4
                ? "#ffb300"
                : c >= 2
                  ? "#ffe066"
                  : "#fff";
          el.style.fontSize = `${Math.min(1.1 + c * 0.12 + slot.amount / 200, 2.4)}rem`;
        }
        const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.6 : 1.2 - (t - 0.15) * 0.25;
        el.style.opacity = String(t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4);
        el.style.transform = `translate3d(${slot.sx.toFixed(1)}px, ${(slot.sy - t * RISE_PX).toFixed(1)}px, 0) translate(-50%, -50%) scale(${pop.toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    let bannerTimer = 0;
    let toastTimer = 0;
    let lastToast = 0;
    const offLevel = on("levelUp", ({ level }) => {
      const banner = bannerRef.current;
      const text = bannerTextRef.current;
      if (!banner || !text) return;
      const name = TIER_NAMES[level];
      text.textContent = `LEVEL UP! LV ${level}${name ? ` — can lift ${name}` : ""}`;
      banner.classList.remove("gs-banner");
      void banner.offsetWidth;
      banner.classList.add("gs-banner");
      window.clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(
        () => banner.classList.remove("gs-banner"),
        2300,
      );
    });
    const offHeavy = on("tooHeavy", ({ tier }) => {
      const now = performance.now();
      const toast = toastRef.current;
      if (!toast || now - lastToast < 1500) return;
      lastToast = now;
      toast.textContent = `Too heavy — reach LV ${levelForTier(tier)}`;
      toast.style.opacity = "1";
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.style.opacity = "0";
      }, 1400);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(bannerTimer);
      window.clearTimeout(toastTimer);
      offLevel();
      offHeavy();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes gs-banner { 0% { opacity: 0; transform: scale(0.5); } 12% { opacity: 1; transform: scale(1.15); } 22% { transform: scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: translateY(-20px); } }
        .gs-banner { animation: gs-banner 2.2s ease-out forwards; }
      `}</style>
      {Array.from({ length: POPUP_SLOTS }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed pool
          key={i}
          ref={(el) => {
            popupEls.current[i] = el;
          }}
          className="absolute top-0 left-0 font-black whitespace-nowrap opacity-0 will-change-transform [-webkit-text-stroke:4px_rgba(15,23,42,0.85)] [paint-order:stroke_fill]"
        />
      ))}
      <div
        ref={bannerRef}
        className="absolute inset-x-0 top-[28%] flex justify-center px-4 opacity-0"
      >
        <div
          ref={bannerTextRef}
          className="max-w-full rounded-3xl bg-brand px-5 py-3 text-center text-lg font-black text-white shadow-2xl ring-4 ring-white/80 sm:text-2xl"
        />
      </div>
      <div
        ref={toastRef}
        className="absolute inset-x-0 top-[40%] mx-auto w-fit rounded-full bg-slate-900/75 px-4 py-1.5 text-sm font-extrabold text-white opacity-0 transition-opacity"
      />
    </div>
  );
}
