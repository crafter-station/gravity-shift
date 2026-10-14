import { emit } from "./events";
import { input } from "./input";
import { core, type EnemyKind, enemies } from "./registry";
import { gameStore } from "./store";
import { UPGRADES, type UpgradeId } from "./upgrades";

/** Per-kind invader stats. */
export const ENEMY_STATS: Record<
  EnemyKind,
  {
    radius: number;
    hp: number;
    speed: number;
    coreDamage: number;
    points: number;
    density: number;
    /** Seconds of no steering after a hit (knockback). */
    stun: number;
    /** Level tier needed to grab its knocked-out husk. */
    huskTier: number;
  }
> = {
  minion: {
    radius: 0.45,
    hp: 1,
    speed: 1.7,
    coreDamage: 8,
    points: 20,
    density: 1,
    stun: 0.7,
    huskTier: 1,
  },
  runner: {
    radius: 0.36,
    hp: 0.6,
    speed: 3.2,
    coreDamage: 5,
    points: 25,
    density: 0.8,
    stun: 0.7,
    huskTier: 1,
  },
  brute: {
    radius: 0.8,
    hp: 6,
    speed: 1.2,
    coreDamage: 18,
    points: 70,
    density: 2.5,
    stun: 0.35,
    huskTier: 2,
  },
  boss: {
    radius: 1.7,
    hp: 35,
    speed: 0.75,
    coreDamage: 50,
    points: 500,
    density: 3,
    stun: 0.1,
    huskTier: 99,
  },
};

export const TOTAL_WAVES = 10;
const CORE_HP = 100;
/** Max invaders alive at once (mobile physics budget). */
const MAX_ALIVE = 26;
const SPAWN_RADIUS = 18.5;

type Spawn = { kind: EnemyKind; at: number };

const run = {
  spawns: [] as Spawn[],
  next: 0,
  t: 0,
  /** Spawn requests handed to <Enemies /> but not yet registered. */
  pending: 0,
  clearedAt: 0,
  /** Invaders arrive in packs from one direction, forcing the player to reposition. */
  packAngle: 0,
  packLeft: 0,
  /** Seconds since the last mid-wave supply drop. */
  sinceDrop: 0,
};
/** From this wave on, crates also rain during the wave so ammo never runs dry. */
const MID_WAVE_DROPS_FROM = 3;
const MID_WAVE_DROP_EVERY = 18;

type SpawnRequest = { kind: EnemyKind; x: number; z: number };
const spawnListeners = new Set<(r: SpawnRequest) => void>();

/** <Enemies /> subscribes to spawn requests. */
export function onSpawnRequest(listener: (r: SpawnRequest) => void) {
  spawnListeners.add(listener);
  return () => {
    spawnListeners.delete(listener);
  };
}

/** Called by <Enemies /> once a requested enemy is registered. */
export function spawnFulfilled() {
  run.pending = Math.max(0, run.pending - 1);
}

function buildWave(n: number): Spawn[] {
  const counts: Record<EnemyKind, number> = {
    minion: [5, 8, 10, 10, 8, 14, 16, 18, 22, 20][n - 1] ?? 22,
    runner: [0, 0, 3, 2, 2, 6, 8, 8, 10, 10][n - 1] ?? 10,
    brute: [0, 0, 0, 2, 1, 3, 4, 5, 6, 5][n - 1] ?? 6,
    boss: n === 5 || n === 10 ? 1 : 0,
  };
  const gap = Math.max(0.35, 1.9 - n * 0.16);
  const spawns: Spawn[] = [];
  if (counts.boss) spawns.push({ kind: "boss", at: 1.5 });
  const pool: EnemyKind[] = [];
  for (const kind of ["minion", "runner", "brute"] as EnemyKind[]) {
    for (let i = 0; i < counts[kind]; i++) pool.push(kind);
  }
  // Shuffle so kinds mix; brutes never lead the wave.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Brutes never lead the wave: give the player a few easy kills first.
  for (let i = 0; i < Math.min(3, pool.length); i++) {
    if (pool[i] !== "brute") continue;
    const j = pool.findIndex((k, idx) => idx >= 3 && k !== "brute");
    if (j > 0) [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  pool.forEach((kind, i) => {
    spawns.push({ kind, at: 1 + i * gap });
  });
  return spawns.sort((a, b) => a.at - b.at);
}

function startWave(n: number) {
  run.spawns = buildWave(n);
  run.next = 0;
  run.t = 0;
  run.pending = 0;
  run.clearedAt = 0;
  run.sinceDrop = 0;
  gameStore.set({ wave: n, enemiesLeft: run.spawns.length });
  emit("waveStart", {
    wave: n,
    boss: run.spawns.some((s) => s.kind === "boss"),
  });
}

/** Starts a fresh defense run at wave 1. Store must already be reset. */
export function startRun() {
  gameStore.set({
    totalWaves: TOTAL_WAVES,
    coreHp: CORE_HP,
    coreMaxHp: CORE_HP,
    upgrades: {},
    upgradeChoices: [],
    kills: 0,
    result: null,
  });
  startWave(1);
}

function rollChoices(): UpgradeId[] {
  const s = gameStore.get();
  const ids = (Object.keys(UPGRADES) as UpgradeId[]).filter(
    (id) => (s.upgrades[id] ?? 0) < UPGRADES[id].max,
  );
  // Repair only shows up when the core is actually hurt.
  const pool = ids.filter(
    (id) => id !== "repair" || s.coreHp < s.coreMaxHp * 0.8,
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

function offerUpgrades() {
  input.enabled = false;
  gameStore.set({
    phase: "upgrade",
    upgradeChoices: rollChoices(),
    attracting: false,
  });
}

/** Applies a picked upgrade and starts the next wave. */
export function pickUpgrade(id: UpgradeId) {
  const s = gameStore.get();
  if (s.phase !== "upgrade") return;
  const upgrades = { ...s.upgrades, [id]: (s.upgrades[id] ?? 0) + 1 };
  const patch: Partial<typeof s> = {
    upgrades,
    upgradeChoices: [],
    phase: "playing",
  };
  if (id === "repair") patch.coreHp = Math.min(s.coreMaxHp, s.coreHp + 35);
  gameStore.set(patch);
  emit("upgradePicked", { id });
  emit("supplyDrop", { count: 8 + s.wave });
  input.enabled = true;
  startWave(s.wave + 1);
}

/** Outcome hook, set by score.ts to avoid an import cycle. */
let onRunEnd: (victory: boolean) => void = () => {};
export function setRunEndHandler(handler: (victory: boolean) => void) {
  onRunEnd = handler;
}

/** An invader reached the core. */
export function damageCore(amount: number, x: number, y: number, z: number) {
  const s = gameStore.get();
  if (s.phase !== "playing") return;
  const hp = Math.max(0, s.coreHp - amount);
  gameStore.set({ coreHp: hp });
  emit("coreHit", { damage: amount, hp, x, y, z });
  if (hp <= 0) onRunEnd(false);
}

/** An invader was removed from play (killed or exploded on the core). */
export function enemyRemoved(killed: boolean) {
  const s = gameStore.get();
  gameStore.set({
    enemiesLeft: Math.max(0, s.enemiesLeft - 1),
    kills: s.kills + (killed ? 1 : 0),
  });
}

/** Advances spawning and wave completion; call every frame while playing. */
export function tickWaves(dt: number) {
  if (gameStore.get().phase !== "playing") return;
  run.t += Math.min(dt, 0.1);
  run.sinceDrop += Math.min(dt, 0.1);
  const wave = gameStore.get().wave;
  if (
    wave >= MID_WAVE_DROPS_FROM &&
    run.sinceDrop > MID_WAVE_DROP_EVERY &&
    enemies.size > 0
  ) {
    run.sinceDrop = 0;
    emit("supplyDrop", { count: 4 + Math.floor(wave / 2) });
  }

  while (
    run.next < run.spawns.length &&
    run.spawns[run.next].at <= run.t &&
    enemies.size + run.pending < MAX_ALIVE
  ) {
    const { kind } = run.spawns[run.next++];
    if (run.packLeft <= 0 || kind === "boss") {
      run.packAngle = Math.random() * Math.PI * 2;
      run.packLeft = 2 + Math.floor(gameStore.get().wave / 3);
    }
    run.packLeft--;
    const a = run.packAngle + (Math.random() - 0.5) * 0.7;
    run.pending++;
    for (const l of spawnListeners)
      l({
        kind,
        x: core.x + Math.cos(a) * SPAWN_RADIUS,
        z: core.z + Math.sin(a) * SPAWN_RADIUS,
      });
  }

  const done =
    run.next >= run.spawns.length && run.pending === 0 && enemies.size === 0;
  if (!done) return;
  const now = performance.now();
  if (!run.clearedAt) {
    run.clearedAt = now;
    emit("waveCleared", { wave: gameStore.get().wave });
    return;
  }
  // Short breather so the "wave cleared" moment lands before the picker.
  if (now - run.clearedAt < 1400) return;
  if (gameStore.get().wave >= TOTAL_WAVES) onRunEnd(true);
  else offerUpgrades();
  run.clearedAt = Number.POSITIVE_INFINITY;
}
