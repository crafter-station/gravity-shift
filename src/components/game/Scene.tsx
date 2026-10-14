"use client";

import {
  CuboidCollider,
  CylinderCollider,
  RigidBody,
} from "@react-three/rapier";
import { CONFIG } from "@/game/config";

const SIZE = CONFIG.arena.size;
const HALF = SIZE / 2;

type V2 = [number, number];

const TREES: V2[] = [
  [-15, -14],
  [15, 13],
  [-16, 11],
  [7, 16],
  [-5, -17],
  [17, -6],
];

const LAMPS: V2[] = [
  [11, 1],
  [-11, -3],
  [3, -13],
  [-3, 14],
];

const FOUNTAIN: V2 = [10, -9];

/** Static plaza: ground, lights, decor and arena bounds. */
export function Scene() {
  return (
    <>
      <color attach="background" args={["#a9e0ff"]} />
      <fog attach="fog" args={["#a9e0ff", 35, 80]} />
      <hemisphereLight args={["#ffffff", "#9ed08a", 1.2]} />
      <directionalLight
        castShadow
        position={[12, 20, 8]}
        intensity={2.2}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-HALF}
        shadow-camera-right={HALF}
        shadow-camera-top={HALF}
        shadow-camera-bottom={-HALF}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />
      <Ground />
      <Fountain />
      {TREES.map((p) => (
        <Tree key={p.join()} x={p[0]} z={p[1]} />
      ))}
      {LAMPS.map((p) => (
        <Lamp key={p.join()} x={p[0]} z={p[1]} />
      ))}
      <Hedges />
      <Walls />
    </>
  );
}

/** Grass base, paved plaza, spawn ring and a few path stripes. */
function Ground() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[HALF, 0.5, HALF]} position={[0, -0.5, 0]} />
      <mesh receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#7ed957" flatShading />
      </mesh>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <planeGeometry args={[SIZE - 8, SIZE - 8]} />
        <meshStandardMaterial color="#f4d9a6" flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          receiveShadow
          rotation-x={-Math.PI / 2}
          position={[0, 0.02, s * 8]}
        >
          <planeGeometry args={[SIZE - 8, 1.5]} />
          <meshStandardMaterial color="#e8c487" flatShading />
        </mesh>
      ))}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <ringGeometry args={[2.6, 3.4, 32]} />
        <meshStandardMaterial color="#b794f6" flatShading />
      </mesh>
    </RigidBody>
  );
}

/** Low round fountain with a central spout. */
function Fountain() {
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={[FOUNTAIN[0], 0, FOUNTAIN[1]]}
    >
      <CylinderCollider args={[0.35, 2.4]} position={[0, 0.35, 0]} />
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[2.4, 2.5, 0.7, 14]} />
        <meshStandardMaterial color="#d9dee8" flatShading />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.06, 14]} />
        <meshStandardMaterial color="#4cc9f0" flatShading />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.25, 0.4, 1.0, 8]} />
        <meshStandardMaterial color="#d9dee8" flatShading />
      </mesh>
      <mesh castShadow position={[0, 1.7, 0]}>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color="#4cc9f0" flatShading />
      </mesh>
    </RigidBody>
  );
}

/** Low-poly tree: trunk plus two stacked foliage blobs. */
function Tree({ x, z }: { x: number; z: number }) {
  return (
    <RigidBody type="fixed" colliders={false} position={[x, 0, z]}>
      <CylinderCollider args={[1.5, 0.3]} position={[0, 1.5, 0]} />
      <mesh castShadow receiveShadow position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.25, 0.35, 2.4, 6]} />
        <meshStandardMaterial color="#8b5a2b" flatShading />
      </mesh>
      <mesh castShadow position={[0, 3.1, 0]}>
        <icosahedronGeometry args={[1.6, 0]} />
        <meshStandardMaterial color="#2fbf71" flatShading />
      </mesh>
      <mesh castShadow position={[0.3, 4.3, 0.1]}>
        <icosahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial color="#3ddc84" flatShading />
      </mesh>
    </RigidBody>
  );
}

/** Lamp post with a glowing bulb. */
function Lamp({ x, z }: { x: number; z: number }) {
  return (
    <RigidBody type="fixed" colliders={false} position={[x, 0, z]}>
      <CylinderCollider args={[1.6, 0.12]} position={[0, 1.6, 0]} />
      <mesh castShadow position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 3.2, 6]} />
        <meshStandardMaterial color="#3d4a5c" flatShading />
      </mesh>
      <mesh position={[0, 3.35, 0]}>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color="#fff3b0"
          emissive="#ffe066"
          emissiveIntensity={0.8}
          flatShading
        />
      </mesh>
    </RigidBody>
  );
}

/** Low hedges along all four borders. */
function Hedges() {
  const o = HALF - 0.6;
  const len = SIZE - 2;
  const strips: {
    pos: [number, number, number];
    args: [number, number, number];
  }[] = [
    { pos: [0, 0.4, -o], args: [len, 0.8, 1] },
    { pos: [0, 0.4, o], args: [len, 0.8, 1] },
    { pos: [-o, 0.4, 0], args: [1, 0.8, len] },
    { pos: [o, 0.4, 0], args: [1, 0.8, len] },
  ];
  return (
    <RigidBody type="fixed" colliders={false}>
      {strips.map((s) => (
        <group key={s.pos.join()}>
          <CuboidCollider
            args={[s.args[0] / 2, 0.4, s.args[2] / 2]}
            position={s.pos}
          />
          <mesh castShadow receiveShadow position={s.pos}>
            <boxGeometry args={s.args} />
            <meshStandardMaterial color="#1fa85a" flatShading />
          </mesh>
        </group>
      ))}
    </RigidBody>
  );
}

/** Invisible tall walls so launched props stay in the world. */
function Walls() {
  const h = 4;
  const t = 0.5;
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[HALF + t, h, t]} position={[0, h, -HALF - t]} />
      <CuboidCollider args={[HALF + t, h, t]} position={[0, h, HALF + t]} />
      <CuboidCollider args={[t, h, HALF + t]} position={[-HALF - t, h, 0]} />
      <CuboidCollider args={[t, h, HALF + t]} position={[HALF + t, h, 0]} />
    </RigidBody>
  );
}
