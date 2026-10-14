"use client";

import { useEffect } from "react";
import { useGameStore } from "@/game/store";
import { UPGRADES, type UpgradeId } from "@/game/upgrades";
import { pickUpgrade } from "@/game/waves";

const KEY_INDEX: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
};

/** Pick 1 of 3 upgrades between waves. */
export function UpgradePicker() {
  const phase = useGameStore((s) => s.phase);
  if (phase !== "upgrade") return null;
  return <Picker />;
}

function Picker() {
  const wave = useGameStore((s) => s.wave);
  const choices = useGameStore((s) => s.upgradeChoices) as UpgradeId[];
  const owned = useGameStore((s) => s.upgrades);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const id = choices[KEY_INDEX[e.code] ?? -1];
      if (id) pickUpgrade(id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choices]);

  return (
    <div
      className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-slate-900/60 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <style>{`
        @keyframes gs-card { 0% { opacity: 0; transform: translateY(30px) scale(0.8); } 70% { transform: translateY(-4px) scale(1.04); } 100% { opacity: 1; transform: none; } }
      `}</style>
      <h2 className="text-center text-3xl font-black text-white drop-shadow-[0_3px_0_rgba(76,29,149,0.8)] sm:text-5xl">
        Wave {wave} cleared!
      </h2>
      <p className="text-sm font-bold text-white/80">Choose an upgrade</p>
      <div className="flex w-full max-w-3xl flex-col gap-3 sm:flex-row">
        {choices.map((id, i) => {
          const def = UPGRADES[id];
          const stack = owned[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => pickUpgrade(id)}
              style={{
                animation: `gs-card 0.45s ${i * 0.1}s cubic-bezier(0.2,0.8,0.3,1) both`,
              }}
              className="relative flex flex-1 items-center gap-3 rounded-3xl bg-white/95 p-4 text-left shadow-2xl ring-4 ring-white/80 transition active:scale-95 sm:flex-col sm:gap-2 sm:py-6 sm:text-center sm:hover:-translate-y-1"
            >
              <span className="absolute top-2 right-3 text-xs font-black text-slate-400">
                {i + 1}
              </span>
              <span className="text-4xl sm:text-6xl" aria-hidden="true">
                {def.icon}
              </span>
              <span className="flex-1">
                <span className="block text-lg font-black text-brand">
                  {def.name}
                </span>
                <span className="block text-sm font-bold text-slate-600">
                  {def.description}
                </span>
                {def.max < 99 ? (
                  <span className="mt-1 inline-block rounded-full bg-amber-300 px-2 py-0.5 text-xs font-black text-slate-900">
                    Lv {stack}/{def.max}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
