"use client";

import dynamic from "next/dynamic";
import { Hud } from "./ui/Hud";
import { TouchControls } from "./ui/TouchControls";

const GameCanvas = dynamic(() => import("./game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-linear-to-b from-sky-300 to-sky-100">
      <div className="flex flex-col items-center gap-6">
        <output className="relative block h-20 w-20" aria-label="Loading">
          <div className="absolute inset-0 animate-orbit">
            <div className="absolute top-0 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-amber-400 shadow" />
          </div>
          <div className="absolute inset-4 animate-bob rounded-full bg-brand shadow-[0_0_30px_8px_rgba(124,77,255,0.5)] ring-4 ring-white/80" />
        </output>
        <h1 className="text-4xl font-black tracking-tight text-brand drop-shadow-[0_3px_0_rgba(255,255,255,0.9)] sm:text-5xl">
          Gravity Shift
        </h1>
        <p className="text-sm font-bold text-sky-900/70">Loading…</p>
      </div>
    </div>
  ),
});

/** Client entry: 3D canvas underneath, DOM interface on top. */
export function GameRoot() {
  return (
    <main className="fixed inset-0 touch-none select-none overflow-hidden overscroll-none bg-sky-200">
      <GameCanvas />
      <Hud />
      <TouchControls />
    </main>
  );
}
