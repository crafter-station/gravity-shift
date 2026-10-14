"use client";

import { useEffect, useRef } from "react";
import type { EnemyKind } from "@/game/registry";
import { INDICATOR_SLOTS, indicatorSlots } from "./indicatorSlots";

const COLORS: Record<EnemyKind, string> = {
  minion: "#ef4444",
  runner: "#facc15",
  brute: "#3b82f6",
  boss: "#a855f7",
};
const SIZE: Record<EnemyKind, number> = {
  minion: 1,
  runner: 0.85,
  brute: 1.2,
  boss: 1.7,
};

/** Screen-edge arrows for off-screen invaders. Pooled DOM, updated in rAF. */
export function EnemyIndicatorLayer() {
  const els = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      for (let i = 0; i < INDICATOR_SLOTS; i++) {
        const el = els.current[i];
        const s = indicatorSlots[i];
        if (!el) continue;
        if (!s.active) {
          if (el.style.opacity !== "0") el.style.opacity = "0";
          continue;
        }
        let scale = SIZE[s.kind] * (0.8 + s.danger * 0.5);
        if (s.kind === "boss") scale *= 1 + Math.sin(now / 120) * 0.12;
        if (el.dataset.kind !== s.kind) {
          el.dataset.kind = s.kind;
          el.style.color = COLORS[s.kind];
        }
        el.style.opacity = String(0.65 + s.danger * 0.35);
        el.style.transform = `translate3d(${s.sx.toFixed(1)}px, ${s.sy.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${s.angle.toFixed(3)}rad) scale(${scale.toFixed(2)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: INDICATOR_SLOTS }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed pool
          key={i}
          ref={(el) => {
            els.current[i] = el;
          }}
          className="absolute top-0 left-0 opacity-0 will-change-transform drop-shadow-[0_0_3px_rgba(255,255,255,0.9)]"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 4l18 8-18 8 4-8z"
              fill="currentColor"
              stroke="rgba(15,23,42,0.85)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
