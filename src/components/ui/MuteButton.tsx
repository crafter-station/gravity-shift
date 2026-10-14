"use client";

import { setMuted } from "@/game/audio";
import { useGameStore } from "@/game/store";

/** Sound on/off toggle. */
export function MuteButton() {
  const muted = useGameStore((s) => s.muted);

  return (
    <button
      type="button"
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      aria-pressed={muted}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => setMuted(!muted)}
      className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 text-slate-700 shadow-lg ring-2 ring-white/70 backdrop-blur transition active:scale-95"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
        {muted ? (
          <>
            <path d="m16 9 5 6" />
            <path d="m21 9-5 6" />
          </>
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        )}
      </svg>
    </button>
  );
}
