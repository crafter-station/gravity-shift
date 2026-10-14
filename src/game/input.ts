"use client";

import { useEffect } from "react";

/**
 * Mutable input state shared between DOM controls and the 3D loop.
 * Written by keyboard / mouse / touch controls, read every physics step.
 */
export const input = {
  /** False while menus/results are shown: movement and attraction are ignored. */
  enabled: true,
  keyboard: { x: 0, y: 0 },
  joystick: { x: 0, y: 0 },
  attract: { mouse: false, key: false, touch: false },
};

const pressed = new Set<string>();

const AXES: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

function syncKeyboard() {
  let x = 0;
  let y = 0;
  for (const code of pressed) {
    const axis = AXES[code];
    if (axis) {
      x += axis[0];
      y += axis[1];
    }
  }
  input.keyboard.x = Math.sign(x);
  input.keyboard.y = Math.sign(y);
  input.attract.key = pressed.has("Space");
}

function releaseAll() {
  pressed.clear();
  syncKeyboard();
  input.joystick.x = 0;
  input.joystick.y = 0;
  input.attract.mouse = false;
  input.attract.touch = false;
}

/** Movement vector in screen space (x = right, y = forward), length <= 1. */
export function getMoveVector() {
  if (!input.enabled) return { x: 0, y: 0 };
  const x = input.keyboard.x + input.joystick.x;
  const y = input.keyboard.y + input.joystick.y;
  const len = Math.hypot(x, y);
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}

export function isAttracting() {
  if (!input.enabled) return false;
  const { mouse, key, touch } = input.attract;
  return mouse || key || touch;
}

/** Binds keyboard + global mouse release listeners for the lifetime of the game. */
export function useGlobalControls() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code in AXES || e.code === "Space") e.preventDefault();
      pressed.add(e.code);
      syncKeyboard();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.delete(e.code);
      syncKeyboard();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse") input.attract.mouse = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, []);
}
