"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  type RapierCollider,
  type RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
} from "@react-three/rapier";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  Vector3,
} from "three";
import { registerProp, shatter, unregisterProp } from "@/game/breakables";
import {
  enemyColor,
  propFromHandle,
  propHitsEnemy,
  registerEnemy,
  unregisterEnemy,
} from "@/game/combat";
import { emitImpact, reportImpact } from "@/game/effects";
import { emit } from "@/game/events";
import {
  core,
  type EnemyEntry,
  type EnemyKind,
  type PropEntry,
} from "@/game/registry";
import { gameStore } from "@/game/store";
import {
  damageCore,
  ENEMY_STATS,
  enemyRemoved,
  onSpawnRequest,
  spawnFulfilled,
} from "@/game/waves";

/** Seconds a knocked-out husk lies around before crumbling (if not grabbed). */
const HUSK_LIFETIME = 14;

type Spawned = { id: number; kind: EnemyKind; x: number; z: number };

let nextId = 1;

/** Spawns invaders on request from the wave director. */
export function Enemies() {
  const [list, setList] = useState<Spawned[]>([]);
  const remove = useCallback(
    (id: number) => setList((prev) => prev.filter((e) => e.id !== id)),
    [],
  );

  useEffect(
    () =>
      onSpawnRequest((r) => {
        setList((prev) => [...prev, { id: nextId++, ...r }]);
      }),
    [],
  );

  return (
    <>
      {list.map((e) => (
        <Enemy key={e.id} spawn={e} onGone={remove} />
      ))}
    </>
  );
}

const toCore = new Vector3();

const Enemy = memo(function Enemy({
  spawn,
  onGone,
}: {
  spawn: Spawned;
  onGone: (id: number) => void;
}) {
  const stats = ENEMY_STATS[spawn.kind];
  const body = useRef<RapierRigidBody>(null);
  const collider = useRef<RapierCollider>(null);
  const group = useRef<Group>(null);
  const visual = useRef<Group>(null);
  const hpBar = useRef<Mesh>(null);
  const entry = useRef<EnemyEntry | null>(null);
  const husk = useRef<PropEntry | null>(null);
  const [dead, setDead] = useState(false);
  const wobble = useRef(Math.random() * Math.PI * 2);
  const huskAge = useRef(0);
  const stuck = useRef(0);
  const detourUntil = useRef(0);
  const detourSide = useRef(1);
  const flashMats = useRef<MeshStandardMaterial[]>([]);
  const halfHeight = stats.radius * 0.35;

  // biome-ignore lint/correctness/useExhaustiveDependencies: registered once per mount
  useEffect(() => {
    const rb = body.current;
    const obj = group.current;
    if (!rb || !obj) return;
    const handle = rb.handle;
    // The final boss is a tougher king.
    const maxHp =
      stats.hp *
      (spawn.kind === "boss" && gameStore.get().wave >= 10 ? 1.6 : 1);
    const becomeHusk = () => {
      rb.lockRotations(false, true);
      rb.setLinearDamping(0.3);
      // Walkers glide frictionless; husks tumble and grip like normal props.
      collider.current?.setFriction(0.7);
      const h: PropEntry = {
        body: rb,
        object: obj as Group,
        kind: "husk",
        color: enemyColor(spawn.kind),
        spawn: new Vector3(0, 2, 0),
        held: false,
        orbitAngle: 0,
        orbitRadius: 0,
        orbitHeight: 0,
        projectileUntil: 0,
        lastImpactAt: 0,
        tier: stats.huskTier,
        points: 5,
        breakable: true,
        wrecked: true,
        broken: false,
        target: null,
        exploded: false,
        ghost: false,
      };
      husk.current = h;
      registerProp(h);
      setDead(true);
    };

    const e: EnemyEntry = {
      id: spawn.id,
      body: rb,
      object: obj,
      kind: spawn.kind,
      hp: maxHp,
      maxHp,
      radius: stats.radius,
      stunUntil: 0,
      lastContactAt: 0,
      hitAt: 0,
      onDefeat: (reason) => {
        if (reason === "core" || spawn.kind === "boss") {
          // Gone in a flash: no husk left behind.
          entry.current = null;
          rb.setEnabled(false);
          obj.visible = false;
          window.setTimeout(() => onGone(spawn.id), 50);
          return;
        }
        becomeHusk();
      },
    };
    entry.current = e;
    registerEnemy(e);
    spawnFulfilled();
    const p = rb.translation();
    emit("enemySpawn", { kind: spawn.kind, x: p.x, y: p.y, z: p.z });
    emitImpact({
      x: p.x,
      y: 0.2,
      z: p.z,
      strength: spawn.kind === "boss" ? 1 : 0.45,
      color: enemyColor(spawn.kind),
      projectile: false,
      kind: "husk",
      points: 0,
    });

    return () => {
      if (entry.current) {
        unregisterEnemy(entry.current, handle);
        // Unmounted while alive (round reset): don't count it as a kill.
      }
      if (husk.current) unregisterProp(husk.current, handle);
    };
  }, []);

  useBeforePhysicsStep(() => {
    const rb = body.current;
    const e = entry.current;
    if (!rb) return;
    const p = rb.translation();

    if (p.y < -10) {
      if (e && !husk.current) {
        unregisterEnemy(e, rb.handle);
        enemyRemoved(false);
      }
      entry.current = null;
      onGone(spawn.id);
      return;
    }
    if (husk.current || !e) return;

    toCore.set(core.x - p.x, 0, core.z - p.z);
    const dist = toCore.length();
    if (dist < core.radius + stats.radius + 0.35) {
      entry.current = null;
      unregisterEnemy(e, rb.handle);
      enemyRemoved(false);
      damageCore(stats.coreDamage, p.x, p.y, p.z);
      emitImpact({
        x: p.x,
        y: p.y,
        z: p.z,
        strength: 0.9,
        color: "#ff3b3b",
        projectile: true,
        kind: "husk",
        points: 0,
      });
      e.onDefeat("core");
      return;
    }
    if (performance.now() < e.stunUntil) return;

    // March toward the core with a slight zig-zag so lines don't look robotic.
    toCore.normalize();
    wobble.current += 0.04;
    let side = Math.sin(wobble.current) * 0.35;

    // No pathfinding: if blocked (barely moving), sidestep around the obstacle for a bit.
    const now = performance.now();
    const vel = rb.linvel();
    if (Math.hypot(vel.x, vel.z) < stats.speed * 0.25) {
      stuck.current += 1 / 60;
      if (stuck.current > 0.5 && now > detourUntil.current) {
        detourUntil.current = now + 1200;
        detourSide.current = Math.random() < 0.5 ? -1 : 1;
        stuck.current = 0;
      }
    } else stuck.current = Math.max(0, stuck.current - 1 / 60);
    if (now < detourUntil.current) side = detourSide.current * 1.6;
    const dx = toCore.x - toCore.z * side;
    const dz = toCore.z + toCore.x * side;
    const len = Math.hypot(dx, dz) || 1;
    const v = rb.linvel();
    const k = 0.12;
    rb.setLinvel(
      {
        x: v.x + ((dx / len) * stats.speed - v.x) * k,
        y: v.y,
        z: v.z + ((dz / len) * stats.speed - v.z) * k,
      },
      true,
    );
  });

  useFrame((state, delta) => {
    const e = entry.current;
    const v = visual.current;
    if (!v) return;
    const now = performance.now();
    if (!dead && e) {
      // Waddle + face the core.
      const t =
        state.clock.elapsedTime * (spawn.kind === "runner" ? 16 : 9) + spawn.id;
      v.position.y = Math.abs(Math.sin(t)) * stats.radius * 0.18;
      v.rotation.z = Math.sin(t) * 0.12;
      const p = e.body.translation();
      v.rotation.y = Math.atan2(core.x - p.x, core.z - p.z);
      if (hpBar.current) {
        hpBar.current.scale.x = Math.max(e.hp / e.maxHp, 0.001);
        hpBar.current.position.x = -(1 - hpBar.current.scale.x) * stats.radius;
      }
    } else {
      v.position.y = 0;
      v.rotation.z = 0;
    }
    // White hit flash.
    const flash = e ? Math.max(0, 1 - (now - e.hitAt) / 140) : 0;
    for (const m of flashMats.current) m.emissiveIntensity = flash * 1.6;

    if (dead && husk.current) {
      if (husk.current.broken) {
        huskAge.current += delta;
        if (huskAge.current > 1) onGone(spawn.id);
        return;
      }
      if (!husk.current.held && now > husk.current.projectileUntil)
        huskAge.current += delta;
      if (huskAge.current > HUSK_LIFETIME) shatter(husk.current);
    }
  });

  const collectMat = (m: MeshStandardMaterial | null) => {
    if (m && !flashMats.current.includes(m)) flashMats.current.push(m);
  };

  return (
    <RigidBody
      ref={body}
      position={[spawn.x, stats.radius + halfHeight + 0.1, spawn.z]}
      colliders={false}
      lockRotations
      ccd
      linearDamping={0.2}
      onCollisionEnter={(payload) => {
        const e = entry.current;
        if (husk.current) {
          reportImpact(husk.current, payload);
          return;
        }
        if (!e) return;
        const prop = propFromHandle(payload.other.rigidBody?.handle);
        if (!prop || !payload.other.rigidBody) return;
        const a = e.body.linvel();
        const b = payload.other.rigidBody.linvel();
        propHitsEnemy(e, prop, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
      }}
    >
      <CapsuleCollider
        ref={collider}
        args={[halfHeight, stats.radius]}
        density={stats.density}
        friction={0}
      />
      <group ref={group}>
        <group position-y={-(stats.radius + halfHeight)}>
          <group ref={visual}>
            <InvaderModel
              kind={spawn.kind}
              radius={stats.radius}
              matRef={collectMat}
            />
          </group>
        </group>
        {!dead && (spawn.kind === "brute" || spawn.kind === "boss") && (
          <Billboard position-y={stats.radius + halfHeight + 0.45}>
            <mesh position-z={-0.01}>
              <planeGeometry args={[stats.radius * 2 + 0.08, 0.2]} />
              <meshBasicMaterial color="#1e1b3a" transparent opacity={0.7} />
            </mesh>
            <mesh ref={hpBar}>
              <planeGeometry args={[stats.radius * 2, 0.12]} />
              <meshBasicMaterial
                color={spawn.kind === "boss" ? "#ff4d6d" : "#7ae582"}
              />
            </mesh>
          </Billboard>
        )}
      </group>
    </RigidBody>
  );
});

/** Cute low-poly invaders built from primitives. Origin at the feet, facing +Z. */
function InvaderModel({
  kind,
  radius: r,
  matRef,
}: {
  kind: EnemyKind;
  radius: number;
  matRef: (m: MeshStandardMaterial | null) => void;
}) {
  const color = enemyColor(kind);
  const bodyH = r * 1.6;
  const eyeY = bodyH * 0.72;
  const eyeR = r * (kind === "boss" ? 0.22 : 0.3);
  const eyeX = r * 0.38;
  return (
    <group>
      {/* Body */}
      <mesh castShadow position-y={bodyH / 2 + r * 0.2}>
        {kind === "brute" ? (
          <boxGeometry args={[r * 2, bodyH, r * 1.7]} />
        ) : kind === "runner" ? (
          <coneGeometry args={[r * 1.05, bodyH * 1.2, 7]} />
        ) : (
          <capsuleGeometry args={[r, bodyH - r, 3, 9]} />
        )}
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive="#ffffff"
          emissiveIntensity={0}
          flatShading
        />
      </mesh>
      {/* Feet */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[s * r * 0.45, r * 0.12, 0]}>
          <boxGeometry args={[r * 0.5, r * 0.25, r * 0.7]} />
          <meshStandardMaterial color="#2b2540" flatShading />
        </mesh>
      ))}
      {/* Eyes */}
      {(kind === "boss" ? [-1, 0, 1] : [-1, 1]).map((s) => (
        <group
          key={s}
          position={[
            s * eyeX * (kind === "boss" ? 1.3 : 1),
            eyeY + (s === 0 ? r * 0.3 : 0),
            r * (kind === "brute" ? 0.86 : 0.88),
          ]}
        >
          <mesh>
            <sphereGeometry args={[eyeR, 10, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position-z={eyeR * 0.65}>
            <sphereGeometry args={[eyeR * 0.5, 8, 6]} />
            <meshBasicMaterial color="#1a1530" />
          </mesh>
        </group>
      ))}
      {/* Antenna / horns / visor */}
      {kind === "minion" && (
        <group position-y={bodyH + r * 0.55}>
          <mesh position-y={r * 0.2}>
            <cylinderGeometry args={[0.03, 0.03, r * 0.5, 5]} />
            <meshStandardMaterial color="#2b2540" />
          </mesh>
          <mesh position-y={r * 0.5}>
            <sphereGeometry args={[r * 0.16, 8, 6]} />
            <meshStandardMaterial
              color="#fff27a"
              emissive="#fff27a"
              emissiveIntensity={1.2}
            />
          </mesh>
        </group>
      )}
      {kind === "brute" && (
        <mesh position={[0, eyeY + r * 0.42, r * 0.2]}>
          <boxGeometry args={[r * 2.15, r * 0.3, r * 1.5]} />
          <meshStandardMaterial color="#2b3a7a" flatShading />
        </mesh>
      )}
      {kind === "boss" &&
        [-1, 1].map((s) => (
          <mesh
            key={s}
            castShadow
            position={[s * r * 0.7, bodyH + r * 0.9, 0]}
            rotation-z={-s * 0.5}
          >
            <coneGeometry args={[r * 0.28, r * 0.9, 6]} />
            <meshStandardMaterial color="#ffd23f" flatShading />
          </mesh>
        ))}
    </group>
  );
}
