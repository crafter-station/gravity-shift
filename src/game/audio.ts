import type { PropKind } from "./registry";
import { gameStore } from "./store";

/** WebAudio synth engine: no audio files, everything is generated. */

const MUTE_KEY = "gravity-shift:muted";
const MASTER_VOLUME = 0.5;
const MAX_VOICES = 10;
const THROTTLE_MS = 30;

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let voices = 0;
const lastPlayed = new Map<string, number>();

/** Attract hum state. */
let hum: {
  osc: OscillatorNode;
  osc2: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
} | null = null;

function ensure(): Ctx | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = gameStore.get().muted ? 0 : MASTER_VOLUME;
    master.connect(comp);
    comp.connect(ctx.destination);

    // One second of white noise, reused by every noise voice.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  } catch {
    ctx = null;
    return null;
  }
}

/** Installs gesture listeners that unlock audio. Returns a cleanup. */
export function installUnlock() {
  if (typeof window === "undefined") return () => {};
  const unlock = () => {
    const c = ensure();
    if (c && c.state === "suspended") c.resume().catch(() => {});
  };
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  for (const e of events) window.addEventListener(e, unlock, { passive: true });
  return () => {
    for (const e of events) window.removeEventListener(e, unlock);
  };
}

/** Reads the persisted mute flag into the store. */
export function loadMuted() {
  try {
    if (localStorage.getItem(MUTE_KEY) === "1") gameStore.set({ muted: true });
  } catch {
    // storage unavailable
  }
}

/** Updates store, persistence and master gain. */
export function setMuted(muted: boolean) {
  gameStore.set({ muted });
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // storage unavailable
  }
  applyMute();
}

/** Syncs master gain with the store. */
export function applyMute() {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(
    gameStore.get().muted ? 0 : MASTER_VOLUME,
    t,
    0.02,
  );
}

function ready(name?: string, throttle = THROTTLE_MS): Ctx | null {
  const c = ctx;
  if (!c || !master || c.state !== "running") return null;
  if (gameStore.get().muted) return null;
  if (name) {
    const now = performance.now();
    if (now - (lastPlayed.get(name) ?? 0) < throttle) return null;
    lastPlayed.set(name, now);
  }
  if (voices >= MAX_VOICES) return null;
  return c;
}

/** Tracks a one-shot voice until its end time. */
function claim(c: Ctx, dur: number) {
  voices++;
  const ms = Math.max(0, (dur + 0.05) * 1000);
  setTimeout(() => {
    voices--;
  }, ms);
  void c;
}

type ToneOpts = {
  type?: OscillatorType;
  freq: number;
  /** End frequency for a pitch glide. */
  to?: number;
  dur: number;
  vol: number;
  delay?: number;
  attack?: number;
};

/** Simple enveloped oscillator blip. */
function tone(c: Ctx, o: ToneOpts) {
  if (!master) return;
  const t = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  const a = o.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + o.dur + 0.02);
}

type NoiseOpts = {
  filter: BiquadFilterType;
  freq: number;
  to?: number;
  q?: number;
  dur: number;
  vol: number;
  delay?: number;
  attack?: number;
};

/** Enveloped filtered noise burst. */
function noise(c: Ctx, o: NoiseOpts) {
  if (!master || !noiseBuf) return;
  const t = c.currentTime + (o.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = o.filter;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.freq, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  const g = c.createGain();
  const a = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + o.dur + 0.02);
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// ---------------------------------------------------------------------------
// Public sounds
// ---------------------------------------------------------------------------

/** Starts the looping attract hum. */
export function attractStart() {
  const c = ready();
  if (!c || !master || hum) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const osc2 = c.createOscillator();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc2.type = "sine";
  osc.frequency.setValueAtTime(70, t);
  osc.frequency.exponentialRampToValueAtTime(150, t + 1.6);
  osc2.frequency.setValueAtTime(140, t);
  osc2.frequency.exponentialRampToValueAtTime(300, t + 1.6);
  filter.type = "lowpass";
  filter.Q.value = 4;
  filter.frequency.setValueAtTime(250, t);
  filter.frequency.exponentialRampToValueAtTime(1400, t + 1.6);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.16, t + 0.12);
  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc2.start(t);
  hum = { osc, osc2, filter, gain };
}

/** Fades the attract hum out. */
export function attractEnd() {
  if (!hum || !ctx) return;
  const { osc, osc2, gain } = hum;
  hum = null;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.stop(t + 0.22);
  osc2.stop(t + 0.22);
}

/** Whoosh when props are thrown. */
export function launch(count: number) {
  const c = ready("launch", 80);
  if (!c) return;
  const big = Math.min(count / 8, 1);
  const dur = 0.25 + big * 0.25;
  claim(c, dur);
  noise(c, {
    filter: "bandpass",
    freq: 400,
    to: 2600 + big * 1500,
    q: 1.5,
    dur,
    vol: 0.35 + big * 0.3,
    attack: 0.03,
  });
  tone(c, {
    type: "sine",
    freq: 180,
    to: 520,
    dur: dur * 0.8,
    vol: 0.12 + big * 0.1,
  });
}

/** Impact sound by prop kind and strength 0..1. */
export function impact(kind: PropKind, strength: number) {
  const c = ready(`impact-${kind}`, 45);
  if (!c) return;
  const s = Math.max(0.1, Math.min(1, strength));
  const vol = 0.12 + s * 0.5;
  const p = rand(0.92, 1.08);
  claim(c, 0.4);
  switch (kind) {
    case "vehicle":
    case "bus":
    case "kiosk":
    case "cart": {
      tone(c, {
        type: "sine",
        freq: (110 - s * 30) * p,
        to: 40,
        dur: 0.3,
        vol: vol * 1.2,
      });
      noise(c, {
        filter: "lowpass",
        freq: 900,
        to: 150,
        dur: 0.18,
        vol: vol * 0.7,
      });
      if (kind !== "cart") {
        tone(c, {
          type: "square",
          freq: 260 * p,
          to: 120,
          dur: 0.12,
          vol: vol * 0.15,
        });
      }
      break;
    }
    case "bench": {
      tone(c, { type: "sine", freq: 90 * p, to: 50, dur: 0.22, vol });
      tone(c, {
        type: "triangle",
        freq: 300 * p,
        to: 180,
        dur: 0.1,
        vol: vol * 0.6,
      });
      noise(c, {
        filter: "bandpass",
        freq: 1200,
        q: 2,
        dur: 0.08,
        vol: vol * 0.5,
      });
      break;
    }
    case "box": {
      tone(c, {
        type: "triangle",
        freq: 220 * p,
        to: 110,
        dur: 0.12,
        vol: vol * 0.9,
      });
      noise(c, {
        filter: "bandpass",
        freq: 1500 * p,
        q: 3,
        dur: 0.07,
        vol: vol * 0.6,
      });
      break;
    }
    case "cone":
    case "pin": {
      tone(c, {
        type: "triangle",
        freq: (kind === "pin" ? 520 : 420) * p,
        to: 300 * p,
        dur: 0.09,
        vol: vol * 0.7,
      });
      noise(c, {
        filter: "highpass",
        freq: 2500,
        dur: 0.04,
        vol: vol * 0.35,
      });
      break;
    }
    case "ball": {
      tone(c, {
        type: "sine",
        freq: 200 * p,
        to: 520 * p,
        dur: 0.2,
        vol: vol * 0.9,
      });
      tone(c, {
        type: "sine",
        freq: 400 * p,
        to: 800 * p,
        dur: 0.1,
        vol: vol * 0.25,
      });
      break;
    }
  }
}

/** Shatter sound, bigger for heavy kinds. */
export function shatter(kind: string) {
  const c = ready("break", 40);
  if (!c) return;
  claim(c, 0.5);
  if (kind === "ball") {
    noise(c, { filter: "highpass", freq: 1800, dur: 0.08, vol: 0.5 });
    tone(c, { type: "sine", freq: 900, to: 200, dur: 0.12, vol: 0.4 });
    return;
  }
  const heavy = kind === "vehicle" || kind === "bus" || kind === "kiosk";
  noise(c, {
    filter: "bandpass",
    freq: 3000,
    to: 600,
    q: 0.8,
    dur: heavy ? 0.45 : 0.3,
    vol: heavy ? 0.6 : 0.45,
  });
  if (heavy) {
    tone(c, { type: "sine", freq: 100, to: 35, dur: 0.4, vol: 0.55 });
  }
  // Debris clicks.
  for (let i = 0; i < 5; i++) {
    noise(c, {
      filter: "bandpass",
      freq: rand(1800, 5000),
      q: 6,
      dur: 0.03,
      vol: rand(0.12, 0.28),
      delay: 0.04 + i * rand(0.03, 0.06),
    });
  }
}

const PENTATONIC = [0, 2, 4, 7, 9];

/** Rising pentatonic blip per combo count. */
export function combo(count: number) {
  const c = ready("combo", 60);
  if (!c) return;
  const i = Math.max(0, count - 2);
  const semis =
    PENTATONIC[i % PENTATONIC.length] + 12 * Math.floor(i / PENTATONIC.length);
  const freq = 523.25 * 2 ** (Math.min(semis, 24) / 12);
  claim(c, 0.25);
  tone(c, { type: "triangle", freq, dur: 0.2, vol: 0.22 });
  tone(c, { type: "sine", freq: freq * 2, dur: 0.14, vol: 0.08 });
}

/** Very subtle tick when points are awarded. */
export function pointsTick() {
  const c = ready("tick", 70);
  if (!c) return;
  claim(c, 0.06);
  tone(c, {
    type: "sine",
    freq: 1400 * rand(0.97, 1.03),
    dur: 0.04,
    vol: 0.04,
  });
}

/** Happy arpeggio. */
export function levelUp() {
  const c = ready("levelUp", 200);
  if (!c) return;
  claim(c, 0.7);
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    tone(c, {
      type: "triangle",
      freq: f,
      dur: 0.22,
      vol: 0.22,
      delay: i * 0.07,
    });
    tone(c, {
      type: "sine",
      freq: f * 2,
      dur: 0.15,
      vol: 0.06,
      delay: i * 0.07,
    });
  });
}

/** Low "nope" buzz. */
export function tooHeavy() {
  const c = ready("tooHeavy", 250);
  if (!c) return;
  claim(c, 0.3);
  tone(c, { type: "sawtooth", freq: 130, to: 90, dur: 0.22, vol: 0.14 });
  tone(c, { type: "square", freq: 65, to: 45, dur: 0.22, vol: 0.1 });
}

/** Short start jingle. */
export function gameStart() {
  const c = ready("gameStart", 300);
  if (!c) return;
  claim(c, 0.5);
  [392, 523.25, 659.25].forEach((f, i) => {
    tone(c, {
      type: "triangle",
      freq: f,
      dur: 0.16,
      vol: 0.22,
      delay: i * 0.09,
    });
  });
}

/** Victory fanfare (with sparkle for a new best) or sad trombone on defeat. */
export function gameEnd(victory: boolean, best: boolean) {
  const c = ready("gameEnd", 500);
  if (!c) return;
  if (!victory) {
    claim(c, 1.6);
    [233.08, 220, 207.65].forEach((f, i) => {
      tone(c, {
        type: "sawtooth",
        freq: f,
        dur: 0.38,
        vol: 0.14,
        delay: i * 0.4,
        attack: 0.04,
      });
    });
    // Final wah-wah slide.
    tone(c, {
      type: "sawtooth",
      freq: 196,
      to: 130,
      dur: 0.9,
      vol: 0.16,
      delay: 1.2,
      attack: 0.05,
    });
    return;
  }
  claim(c, 1.4);
  const notes = [392, 523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    tone(c, {
      type: "triangle",
      freq: f,
      dur: i === notes.length - 1 ? 0.7 : 0.2,
      vol: 0.22,
      delay: i * 0.12,
    });
  });
  if (best) {
    for (let i = 0; i < 8; i++) {
      tone(c, {
        type: "sine",
        freq: rand(1800, 3200),
        dur: 0.12,
        vol: 0.07,
        delay: 0.6 + i * 0.07,
      });
    }
  }
}

/** Tiny UI click. */
export function uiClick() {
  const c = ready("click", 50);
  if (!c) return;
  claim(c, 0.06);
  tone(c, { type: "sine", freq: 700, to: 500, dur: 0.05, vol: 0.12 });
}

// ---------------------------------------------------------------------------
// Defend-the-plaza sounds
// ---------------------------------------------------------------------------

/** Horn/drum hit; ominous siren and rumble on boss waves. */
export function waveStart(boss: boolean) {
  const c = ready("waveStart", 300);
  if (!c) return;
  if (boss) {
    claim(c, 1.6);
    tone(c, {
      type: "sawtooth",
      freq: 110,
      to: 190,
      dur: 0.75,
      vol: 0.16,
      attack: 0.1,
    });
    tone(c, {
      type: "sawtooth",
      freq: 190,
      to: 100,
      dur: 0.75,
      vol: 0.16,
      delay: 0.75,
      attack: 0.1,
    });
    tone(c, { type: "sine", freq: 55, to: 35, dur: 1.4, vol: 0.5 });
    noise(c, { filter: "lowpass", freq: 200, dur: 1.4, vol: 0.4, attack: 0.2 });
    return;
  }
  claim(c, 0.5);
  tone(c, { type: "sine", freq: 140, to: 60, dur: 0.25, vol: 0.5 });
  tone(c, { type: "sawtooth", freq: 294, dur: 0.18, vol: 0.12, delay: 0.1 });
  tone(c, { type: "sawtooth", freq: 392, dur: 0.3, vol: 0.12, delay: 0.25 });
}

/** Bright chime. */
export function waveCleared() {
  const c = ready("waveCleared", 300);
  if (!c) return;
  claim(c, 0.8);
  [783.99, 1174.66, 1567.98].forEach((f, i) => {
    tone(c, { type: "sine", freq: f, dur: 0.5, vol: 0.18, delay: i * 0.1 });
    tone(c, { type: "sine", freq: f * 2, dur: 0.3, vol: 0.05, delay: i * 0.1 });
  });
}

/** Power-up sweep. */
export function upgradePicked() {
  const c = ready("upgrade", 200);
  if (!c) return;
  claim(c, 0.5);
  tone(c, { type: "square", freq: 220, to: 1100, dur: 0.35, vol: 0.08 });
  tone(c, { type: "triangle", freq: 440, to: 2200, dur: 0.35, vol: 0.14 });
  tone(c, { type: "sine", freq: 1320, dur: 0.25, vol: 0.12, delay: 0.3 });
}

/** Falling whistle, then soft thuds about a second later. */
export function supplyDrop(count: number) {
  const c = ready("supply", 400);
  if (!c) return;
  claim(c, 1.8);
  tone(c, { type: "sine", freq: 1800, to: 400, dur: 1, vol: 0.1, attack: 0.1 });
  const n = Math.min(Math.max(count, 1), 5);
  for (let i = 0; i < n; i++) {
    const d = 1 + i * rand(0.05, 0.12);
    tone(c, {
      type: "sine",
      freq: rand(90, 130),
      to: 50,
      dur: 0.18,
      vol: 0.28,
      delay: d,
    });
    noise(c, { filter: "lowpass", freq: 600, dur: 0.08, vol: 0.12, delay: d });
  }
}

/** Very subtle teleport blip. */
export function enemySpawn() {
  const c = ready("spawn", 140);
  if (!c) return;
  claim(c, 0.12);
  tone(c, {
    type: "sine",
    freq: rand(600, 800),
    to: rand(1000, 1300),
    dur: 0.08,
    vol: 0.025,
  });
}

/** Cartoony bonk by kind, scaled by damage. */
export function enemyHit(kind: string, damage: number) {
  const c = ready(`ehit-${kind}`, 50);
  if (!c) return;
  const d = Math.max(0.2, Math.min(1, damage / 5));
  const vol = 0.15 + d * 0.3;
  const p = rand(0.94, 1.06);
  claim(c, 0.7);
  if (kind === "boss") {
    tone(c, { type: "sine", freq: 90 * p, to: 70, dur: 0.7, vol: vol * 1.2 });
    tone(c, { type: "sine", freq: 181 * p, dur: 0.6, vol: vol * 0.5 });
    tone(c, { type: "sine", freq: 273 * p, dur: 0.4, vol: vol * 0.3 });
  } else if (kind === "brute") {
    tone(c, {
      type: "square",
      freq: 330 * p,
      to: 250,
      dur: 0.14,
      vol: vol * 0.3,
    });
    tone(c, { type: "sine", freq: 540 * p, dur: 0.25, vol: vol * 0.4 });
    noise(c, {
      filter: "bandpass",
      freq: 2500,
      q: 5,
      dur: 0.1,
      vol: vol * 0.5,
    });
  } else {
    const base = kind === "runner" ? 900 : 650;
    tone(c, {
      type: "triangle",
      freq: base * p,
      to: base * 1.8 * p,
      dur: 0.11,
      vol: vol * 0.8,
    });
    tone(c, {
      type: "sine",
      freq: 200 * p,
      to: 120,
      dur: 0.08,
      vol: vol * 0.5,
    });
  }
}

/** Satisfying pop plus crunch; bigger for brute, huge for boss. */
export function enemyKilled(kind: string) {
  const c = ready(`ekill-${kind}`, 50);
  if (!c) return;
  const p = rand(0.94, 1.06);
  if (kind === "boss") {
    claim(c, 2);
    noise(c, { filter: "lowpass", freq: 3000, to: 80, dur: 1.2, vol: 0.8 });
    tone(c, { type: "sine", freq: 120, to: 30, dur: 1, vol: 0.7 });
    [784, 659, 523, 392, 261].forEach((f, i) => {
      tone(c, {
        type: "triangle",
        freq: f,
        dur: 0.25,
        vol: 0.2,
        delay: 0.5 + i * 0.13,
      });
    });
    return;
  }
  const big = kind === "brute";
  claim(c, 0.4);
  tone(c, {
    type: "sine",
    freq: (big ? 260 : 520) * p,
    to: big ? 70 : 160,
    dur: big ? 0.28 : 0.16,
    vol: big ? 0.5 : 0.35,
  });
  tone(c, {
    type: "triangle",
    freq: (big ? 600 : 1000) * p,
    to: 300,
    dur: 0.08,
    vol: 0.18,
  });
  noise(c, {
    filter: "bandpass",
    freq: 2200,
    q: 1.5,
    dur: big ? 0.2 : 0.1,
    vol: big ? 0.4 : 0.22,
    delay: 0.02,
  });
}

let heartbeat: ReturnType<typeof setInterval> | null = null;

function beat() {
  const c = ready();
  if (!c) return;
  claim(c, 0.4);
  tone(c, { type: "sine", freq: 70, to: 45, dur: 0.14, vol: 0.35 });
  tone(c, {
    type: "sine",
    freq: 62,
    to: 40,
    dur: 0.16,
    vol: 0.28,
    delay: 0.17,
  });
}

/** Stops the low-health heartbeat. */
export function stopHeartbeat() {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
}

/** Alarm thud; starts or stops the heartbeat depending on core hp. */
export function coreHit(hp: number) {
  const c = ready("coreHit", 80);
  if (c) {
    claim(c, 0.5);
    tone(c, { type: "sine", freq: 100, to: 40, dur: 0.35, vol: 0.6 });
    noise(c, { filter: "lowpass", freq: 500, dur: 0.2, vol: 0.3 });
    tone(c, { type: "square", freq: 880, dur: 0.07, vol: 0.07 });
    tone(c, { type: "square", freq: 660, dur: 0.07, vol: 0.07, delay: 0.1 });
  }
  updateCoreHp(hp);
}

/** Starts the heartbeat at hp <= 30 and stops it when hp recovers. */
export function updateCoreHp(hp: number) {
  if (hp > 0 && hp <= 30) {
    if (!heartbeat) heartbeat = setInterval(beat, 900);
  } else {
    stopHeartbeat();
  }
}
