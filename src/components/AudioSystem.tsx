"use client";

import { useEffect } from "react";
import * as audio from "@/game/audio";
import { onImpact } from "@/game/effects";
import { on } from "@/game/events";
import { gameStore } from "@/game/store";

/** Synthesized sound effects bound to game events. */
export function AudioSystem() {
  useEffect(() => {
    audio.loadMuted();
    const offs = [
      audio.installUnlock(),
      gameStore.subscribe(audio.applyMute),
      on("attractStart", audio.attractStart),
      on("attractEnd", audio.attractEnd),
      on("launch", ({ count }) => audio.launch(count)),
      onImpact((e) => audio.impact(e.kind, e.strength)),
      on("break", ({ kind }) => audio.shatter(kind)),
      on("combo", ({ count }) => audio.combo(count)),
      on("points", () => audio.pointsTick()),
      on("levelUp", audio.levelUp),
      on("tooHeavy", audio.tooHeavy),
      on("gameStart", audio.gameStart),
      on("gameEnd", ({ best }) => audio.gameEnd(best)),
    ];
    return () => {
      for (const off of offs) off();
      audio.attractEnd();
    };
  }, []);

  return null;
}
