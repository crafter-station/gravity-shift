"use client";

import { gameStore, useGameStore } from "@/game/store";

/** Minimal overlay: launched counter, controls hint and reset button. */
export function Hud() {
  const launched = useGameStore((s) => s.launched);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
      <div className="rounded-xl bg-white/80 px-3 py-2 font-bold">
        {launched}
      </div>
      <button
        type="button"
        className="pointer-events-auto rounded-xl bg-white/80 px-3 py-2 font-bold"
        onClick={gameStore.reset}
      >
        Reset
      </button>
    </div>
  );
}
