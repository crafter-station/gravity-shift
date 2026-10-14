"use client";

import dynamic from "next/dynamic";
import { Hud } from "./ui/Hud";
import { TouchControls } from "./ui/TouchControls";

const GameCanvas = dynamic(() => import("./game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center font-bold text-sky-900">
      Loading…
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
