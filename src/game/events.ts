/** Typed game-wide event bus. Systems emit, audio / UI / juice listen. */
export type GameEvents = {
  /** Gravity field turned on / off. */
  attractStart: Record<string, never>;
  attractEnd: Record<string, never>;
  /** Held props were thrown. Position = player. */
  launch: { count: number; x: number; y: number; z: number };
  /** A prop shattered into debris. */
  break: {
    x: number;
    y: number;
    z: number;
    color: string;
    kind: string;
    points: number;
  };
  /** A prop got lifted-attempted but the player level is too low. */
  tooHeavy: { x: number; y: number; z: number; tier: number };
  levelUp: { level: number };
  /** Points awarded (world position for floating text). */
  points: { amount: number; combo: number; x: number; y: number; z: number };
  /** Combo counter changed (>= 2). */
  combo: { count: number };
  gameStart: Record<string, never>;
  gameEnd: { score: number; destruction: number; best: boolean };
};

type Listener<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

const listeners: { [K in keyof GameEvents]?: Set<Listener<K>> } = {};

export function on<K extends keyof GameEvents>(type: K, listener: Listener<K>) {
  let set = listeners[type] as Set<Listener<K>> | undefined;
  if (!set) {
    set = new Set();
    (listeners as Record<K, Set<Listener<K>>>)[type] = set;
  }
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

export function emit<K extends keyof GameEvents>(
  type: K,
  payload: GameEvents[K],
) {
  const set = listeners[type] as Set<Listener<K>> | undefined;
  if (set) for (const l of set) l(payload);
}
