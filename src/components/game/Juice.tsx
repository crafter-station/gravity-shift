"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  RingGeometry,
  Vector3,
} from "three";
import { addShake, onImpact } from "@/game/effects";
import { on } from "@/game/events";
import { type PropEntry, player, props } from "@/game/registry";
import { gameStore } from "@/game/store";

const TRAILS = 16;
const POINTS = 12;
/** ms a trail takes to fade after its prop stops being a projectile. */
const FADE_MS = 350;

const HITSTOP_MS = 60;
const HITSTOP_MIN_GAP_MS = 330;
const HEAVY = new Set(["vehicle", "bus", "kiosk", "bench"]);

const SPARKS = 28;
const BURST_SECONDS = 0.8;

type Trail = {
  line: Line;
  positions: Float32Array;
  colors: Float32Array;
  color: Color;
  entry: PropEntry | null;
  /** performance.now() when the prop stopped being a projectile (0 = still active). */
  endedAt: number;
};

function createTrail(): Trail {
  const positions = new Float32Array(POINTS * 3);
  const colors = new Float32Array(POINTS * 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  const material = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const line = new Line(geometry, material);
  line.frustumCulled = false;
  line.visible = false;
  return {
    line,
    positions,
    colors,
    color: new Color(),
    entry: null,
    endedAt: 0,
  };
}

/** Projectile trails, hitstop, launch FOV punch and level-up burst. */
export function Juice() {
  const camera = useThree((s) => s.camera);

  const trails = useMemo(() => {
    const list: Trail[] = [];
    for (let i = 0; i < TRAILS; i++) list.push(createTrail());
    return list;
  }, []);

  const burst = useMemo(() => {
    const ringMat = new MeshBasicMaterial({
      color: "#ffd24a",
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    const ring = new Mesh(new RingGeometry(0.85, 1, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;

    const pos = new Float32Array(SPARKS * 3);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    const sparkMat = new PointsMaterial({
      color: "#fff0a0",
      size: 0.25,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const sparks = new Points(geo, sparkMat);
    sparks.frustumCulled = false;
    sparks.visible = false;

    const vel = new Float32Array(SPARKS * 3);
    return { ring, ringMat, sparks, sparkMat, pos, vel, origin: new Vector3() };
  }, []);

  const state = useRef({
    /** Seconds since the level-up burst began (negative = idle). */
    burstT: -1,
    /** Current FOV punch in degrees, and what is applied to the camera. */
    punch: 0,
    applied: 0,
    lastHitstop: 0,
    hitstopTimer: null as ReturnType<typeof setTimeout> | null,
  });

  // Hitstop, launch punch and level-up triggers.
  useEffect(() => {
    const st = state.current;

    const clearHitstop = () => {
      if (st.hitstopTimer) clearTimeout(st.hitstopTimer);
      st.hitstopTimer = null;
      if (gameStore.get().frozen) gameStore.set({ frozen: false });
    };

    const hitstop = () => {
      const now = performance.now();
      if (st.hitstopTimer || now - st.lastHitstop < HITSTOP_MIN_GAP_MS) return;
      st.lastHitstop = now;
      gameStore.set({ frozen: true });
      st.hitstopTimer = setTimeout(() => {
        st.hitstopTimer = null;
        gameStore.set({ frozen: false });
      }, HITSTOP_MS);
    };

    const offs = [
      onImpact((e) => {
        if (e.projectile && e.strength >= 0.85) hitstop();
      }),
      on("break", (e) => {
        if (HEAVY.has(e.kind)) hitstop();
      }),
      on("launch", ({ count }) => {
        st.punch = Math.max(st.punch, Math.min(4, 1.5 + count * 0.5));
        if (count >= 4) addShake(Math.min(0.25, count * 0.03));
      }),
      on("levelUp", () => {
        const o = player.object;
        if (o) o.getWorldPosition(burst.origin);
        else burst.origin.set(0, 0.5, 0);
        const { pos, vel } = burst;
        for (let i = 0; i < SPARKS; i++) {
          const a = (i / SPARKS) * Math.PI * 2 + Math.random() * 0.3;
          const sp = 3 + Math.random() * 3;
          pos[i * 3] = burst.origin.x;
          pos[i * 3 + 1] = burst.origin.y;
          pos[i * 3 + 2] = burst.origin.z;
          vel[i * 3] = Math.cos(a) * sp;
          vel[i * 3 + 1] = 3 + Math.random() * 4;
          vel[i * 3 + 2] = Math.sin(a) * sp;
        }
        burst.ring.position.set(burst.origin.x, 0.15, burst.origin.z);
        st.burstT = 0;
      }),
      on("gameStart", clearHitstop),
    ];

    return () => {
      for (const off of offs) off();
      clearHitstop();
    };
  }, [burst]);

  // Restore FOV and free GPU resources on unmount.
  useEffect(() => {
    const st = state.current;
    return () => {
      if (camera instanceof PerspectiveCamera && st.applied !== 0) {
        camera.fov -= st.applied;
        camera.updateProjectionMatrix();
        st.applied = 0;
      }
      for (const t of trails) {
        t.line.geometry.dispose();
        (t.line.material as LineBasicMaterial).dispose();
      }
      burst.ring.geometry.dispose();
      burst.ringMat.dispose();
      burst.sparks.geometry.dispose();
      burst.sparkMat.dispose();
    };
  }, [camera, trails, burst]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const now = performance.now();
    const st = state.current;

    // --- Trails ---
    // Release trails whose prop is no longer a projectile, start fading them.
    for (const t of trails) {
      const e = t.entry;
      if (!e) continue;
      if (t.endedAt === 0 && (e.broken || now >= e.projectileUntil)) {
        t.endedAt = now;
      }
    }
    // Assign free trails to new projectiles.
    for (const e of props) {
      if (e.broken || now >= e.projectileUntil) continue;
      let tracked = false;
      let free: Trail | null = null;
      for (const t of trails) {
        if (t.entry === e && t.endedAt === 0) {
          tracked = true;
          break;
        }
        if (!free && !t.entry) free = t;
      }
      if (tracked || !free) continue;
      free.entry = e;
      free.endedAt = 0;
      free.color.set(e.color);
      const p = e.object.position;
      for (let i = 0; i < POINTS; i++) {
        free.positions[i * 3] = p.x;
        free.positions[i * 3 + 1] = p.y;
        free.positions[i * 3 + 2] = p.z;
      }
      free.line.visible = true;
    }
    // Update every active trail.
    for (const t of trails) {
      const e = t.entry;
      if (!e) continue;
      const pos = t.positions;
      let intensity = 1;
      if (t.endedAt === 0) {
        pos.copyWithin(3, 0, (POINTS - 1) * 3);
        const p = e.object.position;
        pos[0] = p.x;
        pos[1] = p.y;
        pos[2] = p.z;
      } else {
        intensity = 1 - (now - t.endedAt) / FADE_MS;
        if (intensity <= 0) {
          t.entry = null;
          t.endedAt = 0;
          t.line.visible = false;
          continue;
        }
      }
      const col = t.colors;
      const { r, g, b } = t.color;
      for (let i = 0; i < POINTS; i++) {
        const f = (1 - i / (POINTS - 1)) * intensity;
        col[i * 3] = r * f;
        col[i * 3 + 1] = g * f;
        col[i * 3 + 2] = b * f;
      }
      const geo = t.line.geometry;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }

    // --- FOV punch ---
    if (camera instanceof PerspectiveCamera) {
      st.punch += (0 - st.punch) * Math.min(1, dt * 7);
      if (st.punch < 0.01) st.punch = 0;
      if (st.punch !== st.applied) {
        camera.fov += st.punch - st.applied;
        st.applied = st.punch;
        camera.updateProjectionMatrix();
      }
    }

    // --- Level-up burst ---
    if (st.burstT >= 0) {
      st.burstT += dt;
      const k = st.burstT / BURST_SECONDS;
      if (k >= 1) {
        st.burstT = -1;
        burst.ring.visible = false;
        burst.sparks.visible = false;
      } else {
        const ease = 1 - (1 - k) * (1 - k);
        burst.ring.visible = true;
        burst.ring.scale.setScalar(0.5 + ease * 7);
        burst.ringMat.opacity = 1 - k;
        burst.sparks.visible = true;
        burst.sparkMat.opacity = 1 - k;
        const { pos, vel } = burst;
        for (let i = 0; i < SPARKS; i++) {
          vel[i * 3 + 1] -= 12 * dt;
          pos[i * 3] += vel[i * 3] * dt;
          pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
          pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        }
        burst.sparks.geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {trails.map((t, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed pool
        <primitive key={i} object={t.line} />
      ))}
      <primitive object={burst.ring} />
      <primitive object={burst.sparks} />
    </group>
  );
}
