"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { input, useGlobalControls } from "@/game/input";
import { useGameStore } from "@/game/store";
import { Breakables } from "./Breakables";
import { Buildings } from "./Buildings";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { GameDirector } from "./GameDirector";
import { GravityField } from "./GravityField";
import { Juice } from "./Juice";
import { Player } from "./Player";
import { Props } from "./Props";
import { Scene } from "./Scene";
import { Structures } from "./Structures";

/** Client-only 3D game: canvas, physics world and every 3D system. */
export default function GameCanvas() {
  const resetKey = useGameStore((s) => s.resetKey);
  const frozen = useGameStore((s) => s.frozen);
  useGlobalControls();

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 50, position: [0, 10, 12], near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button === 0)
          input.attract.mouse = true;
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Suspense fallback={null}>
        <Physics
          key={resetKey}
          timeStep={1 / 60}
          gravity={[0, -20, 0]}
          paused={frozen}
        >
          <Scene />
          <Props />
          <Structures />
          <Breakables />
          <Player />
          <GravityField />
        </Physics>
        <Suspense fallback={null}>
          <Buildings />
        </Suspense>
        <CameraRig />
        <Effects />
        <Juice />
        <GameDirector />
      </Suspense>
    </Canvas>
  );
}
