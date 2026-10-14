"use client";

import { useEffect, useState } from "react";
import { CONFIG } from "@/game/config";
import { initScoring, lastRound, startGame } from "@/game/score";
import { useGameStore } from "@/game/store";

const PANEL =
  "w-full max-w-sm rounded-3xl bg-white/90 p-6 text-center shadow-2xl ring-4 ring-white/80 backdrop-blur animate-float-in";
const PLAY_BTN =
  "pointer-events-auto w-full rounded-2xl bg-brand px-6 py-4 text-2xl font-black text-white shadow-[0_6px_0_rgba(76,29,149,0.6)] transition active:translate-y-1 active:shadow-none";

/** Start screen and results screen overlays. */
export function Menu() {
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    initScoring();
  }, []);

  if (phase === "playing") return null;
  return (
    <div
      className="absolute inset-0 grid place-items-center bg-sky-900/30 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {phase === "menu" ? <StartScreen /> : <ResultsScreen />}
    </div>
  );
}

function StartScreen() {
  const best = useGameStore((s) => s.best);
  return (
    <div className={PANEL}>
      <h1 className="text-4xl font-black tracking-tight text-brand drop-shadow-[0_3px_0_rgba(255,255,255,0.9)] sm:text-5xl">
        Gravity Shift
      </h1>
      <p className="mt-2 text-sm font-bold text-slate-600">
        Pull. Orbit. Fling. Wreck the plaza in {CONFIG.game.durationSec}{" "}
        seconds.
      </p>
      <button type="button" className={`${PLAY_BTN} mt-5`} onClick={startGame}>
        Play
      </button>
      {best > 0 ? (
        <p className="mt-4 text-sm font-extrabold text-slate-700">
          Best: <span className="tabular-nums text-brand">{best}</span>
        </p>
      ) : null}
      <p className="mt-3 text-xs font-bold text-slate-500">
        <span className="pointer-coarse:hidden">
          WASD / arrows to move · hold click or Space to attract · release to
          launch
        </span>
        <span className="hidden pointer-coarse:inline">
          Joystick to move · hold the button to attract · release to launch
        </span>
      </p>
    </div>
  );
}

function stars(destruction: number) {
  return destruction >= 0.75
    ? 3
    : destruction >= 0.45
      ? 2
      : destruction >= 0.2
        ? 1
        : 0;
}

function ResultsScreen() {
  const score = useGameStore((s) => s.score);
  const destruction = useGameStore((s) => s.destruction);
  const level = useGameStore((s) => s.level);
  const launched = useGameStore((s) => s.launched);
  const [shown, setShown] = useState(0);
  const isBest = lastRound.best;

  useEffect(() => {
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setShown(Math.round(score * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const earned = stars(destruction);
  return (
    <div className={PANEL}>
      <h2 className="text-lg font-black tracking-widest text-slate-500 uppercase">
        Time's up
      </h2>
      <div className="mt-1 text-6xl leading-none font-black text-brand tabular-nums">
        {shown}
      </div>
      {isBest ? (
        <div className="mx-auto mt-2 w-fit animate-pulse rounded-full bg-amber-400 px-3 py-1 text-sm font-black">
          New best!
        </div>
      ) : null}
      <div
        className="mt-3 flex justify-center gap-1 text-4xl"
        role="img"
        aria-label={`${earned} of 3 stars`}
      >
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={n <= earned ? "text-amber-400" : "text-slate-300"}
          >
            ★
          </span>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Wrecked", `${Math.round(destruction * 100)}%`],
          ["Level", `LV ${level}`],
          ["Launched", String(launched)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-100 px-2 py-2">
            <dd className="text-lg font-black tabular-nums">{value}</dd>
            <dt className="text-[0.6rem] font-extrabold tracking-widest text-slate-500 uppercase">
              {label}
            </dt>
          </div>
        ))}
      </dl>
      <button type="button" className={`${PLAY_BTN} mt-5`} onClick={startGame}>
        Play again
      </button>
    </div>
  );
}
