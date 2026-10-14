"use client";

import { useEffect, useState } from "react";
import { gameStore, useGameStore } from "@/game/store";

const HINT_MS = 8000;

/** Minimal overlay: launched counter, held pill, controls hint and reset button. */
export function Hud() {
  const launched = useGameStore((s) => s.launched);
  const held = useGameStore((s) => s.held);
  const attracting = useGameStore((s) => s.attracting);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setHintVisible(false), HINT_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] text-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-2">
          <div className="rounded-2xl bg-white/85 px-4 py-2 shadow-lg ring-2 ring-white/70 backdrop-blur">
            <div
              key={launched}
              className={`text-4xl leading-none font-black text-brand tabular-nums sm:text-5xl ${
                launched > 0 ? "animate-pop" : ""
              }`}
              aria-live="polite"
            >
              {launched}
            </div>
            <div className="mt-1 text-[0.65rem] font-extrabold tracking-widest text-slate-600 uppercase">
              Launched
            </div>
          </div>
          {attracting ? (
            <div className="animate-float-in rounded-full bg-brand px-3 py-1 text-sm font-extrabold text-white shadow-lg ring-2 ring-white/70">
              Holding {held}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="Reset game"
          className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-2 text-sm font-extrabold shadow-lg ring-2 ring-white/70 backdrop-blur transition active:scale-95"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={gameStore.reset}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          Reset
        </button>
      </div>

      <div
        className={`flex justify-center transition-opacity duration-700 ${
          hintVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          type="button"
          aria-label="Dismiss controls hint"
          disabled={!hintVisible}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setHintVisible(false)}
          className={`mb-28 max-w-sm rounded-2xl bg-slate-900/70 px-4 py-2 text-center text-xs font-bold text-white backdrop-blur pointer-coarse:mb-36 sm:text-sm ${
            hintVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <span className="pointer-coarse:hidden">
            WASD / arrows to move · hold click or Space to attract · release to
            launch
          </span>
          <span className="hidden pointer-coarse:inline">
            Joystick to move · hold the button to attract · release to launch
          </span>
        </button>
      </div>
    </div>
  );
}
