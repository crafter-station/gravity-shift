"use client";

import { useEffect, useState } from "react";
import { levelProgress, MAX_LEVEL } from "@/game/progression";
import { comboMultiplier, startGame } from "@/game/score";
import { useGameStore } from "@/game/store";
import { MuteButton } from "./MuteButton";

const HINT_MS = 8000;
const CARD =
  "rounded-2xl bg-white/85 shadow-lg ring-2 ring-white/70 backdrop-blur";

function formatTime(t: number) {
  const s = Math.max(0, Math.ceil(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Playing-only overlay: score, combo, timer, level, destruction, controls hint. */
export function Hud() {
  const phase = useGameStore((s) => s.phase);
  if (phase !== "playing") return null;
  return <HudInner />;
}

function HudInner() {
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const timeLeft = useGameStore((s) => s.enemiesLeft);
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);
  const destruction = useGameStore((s) => s.destruction);
  const held = useGameStore((s) => s.held);
  const attracting = useGameStore((s) => s.attracting);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setHintVisible(false), HINT_MS);
    return () => window.clearTimeout(id);
  }, []);

  const urgent = timeLeft <= 10;
  const maxed = level >= MAX_LEVEL;
  const { ratio } = levelProgress(level, xp);
  const pct = Math.round(destruction * 100);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] text-slate-900">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <div className={`${CARD} px-3 py-1.5 sm:px-4 sm:py-2`}>
              <div
                key={score}
                className="animate-pop text-3xl leading-none font-black text-brand tabular-nums sm:text-5xl"
                aria-live="polite"
              >
                {score}
              </div>
              <div className="mt-0.5 text-[0.6rem] font-extrabold tracking-widest text-slate-600 uppercase">
                Score
              </div>
            </div>
            {combo >= 2 ? (
              <div className="animate-pulse rounded-full bg-amber-400 px-3 py-0.5 text-xs font-black text-slate-900 shadow-lg ring-2 ring-white/70 sm:text-sm">
                ×
                {comboMultiplier(combo)
                  .toFixed(2)
                  .replace(/\.?0+$/, "")}{" "}
                COMBO {combo}
              </div>
            ) : null}
            {attracting ? (
              <div className="animate-float-in rounded-full bg-brand px-3 py-1 text-sm font-extrabold text-white shadow-lg ring-2 ring-white/70">
                Holding {held}
              </div>
            ) : null}
          </div>

          <div className="flex items-start gap-2">
            <div
              className={`${CARD} px-3 py-1.5 text-center text-2xl leading-none font-black tabular-nums sm:text-3xl ${
                urgent ? "animate-pulse bg-red-500/90 text-white" : ""
              }`}
              role="timer"
            >
              {formatTime(timeLeft)}
            </div>
            <MuteButton />
            <button
              type="button"
              aria-label="Restart round"
              className={`${CARD} pointer-events-auto flex items-center gap-2 px-2.5 py-2 text-sm font-extrabold transition active:scale-95`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={startGame}
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
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        <div className="flex max-w-sm flex-col gap-1.5">
          <div className={`${CARD} flex items-center gap-2 px-2.5 py-1.5`}>
            <span className="rounded-lg bg-brand px-2 py-0.5 text-xs font-black text-white">
              LV {level}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-300/70">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-300"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            {maxed ? (
              <span className="text-xs font-black text-brand">MAX</span>
            ) : null}
          </div>
          <div className={`${CARD} px-2.5 py-1.5`}>
            <div className="mb-1 flex justify-between text-[0.65rem] font-extrabold tracking-wide uppercase">
              <span>Plaza wrecked</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-300/70">
              <div
                className="h-full rounded-full bg-linear-to-r from-amber-400 to-red-500 transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
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
