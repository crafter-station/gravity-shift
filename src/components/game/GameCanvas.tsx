"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { input, useGlobalControls } from "@/game/input";
import { useGameStore } from "@/game/store";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { GravityField } from "./GravityField";
import { Player } from "./Player";
import { Props } from "./Props";
import { Scene } from "./Scene";

/** Client-only 3D game: canvas, physics world and every 3D system. */
export default function GameCanvas() {
  const resetKey = useGameStore((s) => s.resetKey);
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
        <Physics key={resetKey} timeStep={1 / 60} gravity={[0, -20, 0]}>
          <Scene />
          <Props />
          <Player />
          <GravityField />
        </Physics>
        <CameraRig />
        <Effects />
      </Suspense>
    </Canvas>
  );
}
