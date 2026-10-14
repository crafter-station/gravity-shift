"use client";

import { useEffect, useRef } from "react";
import { input } from "@/game/input";

const BASE = 128;
const RADIUS = 44;
const DEAD_ZONE = 0.12;

/** Capture can throw for pointers the browser no longer tracks; input still works without it. */
function capture(e: React.PointerEvent<HTMLElement>) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {}
}

/** Virtual joystick (floating, bottom-left) + gravity button, only on coarse pointers. */
export function TouchControls() {
  const areaRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const stick = useRef({ id: -1, cx: 0, cy: 0 });
  const attractId = useRef(-1);

  useEffect(
    () => () => {
      input.joystick.x = 0;
      input.joystick.y = 0;
      input.attract.touch = false;
    },
    [],
  );

  const resetStick = () => {
    stick.current.id = -1;
    input.joystick.x = 0;
    input.joystick.y = 0;
    const base = baseRef.current;
    if (base) {
      base.style.left = "";
      base.style.top = "";
      base.style.bottom = "";
      base.dataset.active = "false";
    }
    if (knobRef.current) knobRef.current.style.transform = "translate(0, 0)";
  };

  const moveStick = (clientX: number, clientY: number) => {
    const { cx, cy } = stick.current;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    const nx = dx / RADIUS;
    const ny = -dy / RADIUS;
    if (Math.hypot(nx, ny) < DEAD_ZONE) {
      input.joystick.x = 0;
      input.joystick.y = 0;
    } else {
      input.joystick.x = nx;
      input.joystick.y = ny;
    }
  };

  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stick.current.id !== -1) return;
    const area = areaRef.current;
    const base = baseRef.current;
    if (!area || !base) return;
    capture(e);
    const rect = area.getBoundingClientRect();
    const half = BASE / 2;
    // Floating origin, clamped so the whole base stays inside the area.
    const cx = Math.min(
      Math.max(e.clientX - rect.left, half),
      rect.width - half,
    );
    const cy = Math.min(
      Math.max(e.clientY - rect.top, half),
      rect.height - half,
    );
    stick.current = { id: e.pointerId, cx: rect.left + cx, cy: rect.top + cy };
    base.style.left = `${cx - half}px`;
    base.style.top = `${cy - half}px`;
    base.style.bottom = "auto";
    base.dataset.active = "true";
    moveStick(e.clientX, e.clientY);
  };

  const onStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === stick.current.id) moveStick(e.clientX, e.clientY);
  };

  const onStickEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === stick.current.id) resetStick();
  };

  const setAttract = (on: boolean) => {
    input.attract.touch = on;
    if (buttonRef.current) buttonRef.current.dataset.pressed = String(on);
  };

  const onButtonDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (attractId.current !== -1) return;
    capture(e);
    attractId.current = e.pointerId;
    setAttract(true);
  };

  const onButtonEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== attractId.current) return;
    attractId.current = -1;
    setAttract(false);
  };

  return (
    <div className="pointer-events-none absolute inset-0 hidden pointer-coarse:block">
      <div
        ref={areaRef}
        className="pointer-events-auto absolute bottom-0 left-0 h-[45%] w-1/2 touch-none"
        onPointerDown={onStickDown}
        onPointerMove={onStickMove}
        onPointerUp={onStickEnd}
        onPointerCancel={onStickEnd}
        onLostPointerCapture={onStickEnd}
      >
        <div
          ref={baseRef}
          data-active="false"
          className="pointer-events-none absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1.5rem,env(safe-area-inset-left))] grid place-items-center rounded-full bg-white/35 ring-4 ring-white/60 backdrop-blur-sm transition-opacity data-[active=false]:opacity-70"
          style={{ width: BASE, height: BASE }}
        >
          <div
            ref={knobRef}
            className="h-14 w-14 rounded-full bg-brand shadow-lg ring-4 ring-white/80"
          />
        </div>
      </div>

      <button
        ref={buttonRef}
        type="button"
        aria-label="Hold to attract objects with gravity"
        data-pressed="false"
        className="pointer-events-auto absolute right-[max(1.5rem,env(safe-area-inset-right))] bottom-[max(1.5rem,env(safe-area-inset-bottom))] grid h-24 w-24 touch-none place-items-center rounded-full bg-brand text-white shadow-[0_8px_0_#4527c4,0_12px_24px_rgba(0,0,0,0.25)] ring-4 ring-white/80 transition-all duration-100 select-none data-[pressed=true]:translate-y-1.5 data-[pressed=true]:scale-90 data-[pressed=true]:shadow-[0_2px_0_#4527c4,0_0_40px_12px_rgba(124,77,255,0.8)]"
        onPointerDown={onButtonDown}
        onPointerUp={onButtonEnd}
        onPointerCancel={onButtonEnd}
        onLostPointerCapture={onButtonEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg
          width="56"
          height="56"
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="4" fill="currentColor" />
          <circle cx="24" cy="24" r="11" opacity="0.8" />
          <circle cx="24" cy="24" r="19" opacity="0.5" strokeDasharray="6 7" />
        </svg>
      </button>
    </div>
  );
}
