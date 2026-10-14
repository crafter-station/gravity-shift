# Gravity Shift

A hypercasual 3D web game. You are a small orb with gravity powers in a low-poly plaza. You pull nearby objects into orbit around you, then throw them.

Each round lasts **90 seconds**. Wreck as much of the plaza as you can.

- **Score and combos.** Thrown objects score when they hit something. Chained hits raise a combo multiplier, up to ×4.
- **Grow like Hole.io.** Points are XP. Each level makes the orb bigger, extends the field's reach, lets you hold more, and unlocks heavier things: benches and food carts at LV 2, cars at LV 3, kiosks at LV 4, the bus at LV 5. Objects that are too heavy shudder when you try to lift them.
- **Destruction.** Crates, cones, bowling pins, benches, carts and kiosks shatter into debris. Beach balls pop. The *Plaza wrecked* meter rates your round with up to 3 stars.
- **Sound.** Every sound is synthesized live with WebAudio, so there are no audio files. You can mute it from the HUD.

Built with Next.js (App Router), React Three Fiber, Three.js, drei, Rapier physics, Tailwind CSS and Biome. It runs on Bun.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move (camera-relative) | `WASD` / arrow keys | Virtual joystick (bottom-left) |
| Attract objects | Hold left click or `Space` | Hold the gravity button (bottom-right) |
| Throw | Release | Release |
| Restart | **Reset** button | **Reset** button |

Objects closer to you are pulled harder. Hits can briefly freeze the action (hitstop), and thrown objects leave trails. Thrown objects fly in the direction you are facing, shown by the white arrow under the orb.

## Run locally

Requires [Bun](https://bun.sh) 1.3+.

```bash
bun install
```

```bash
bun dev
```

Open http://localhost:3000.

### Scripts

| Script | What it does |
| --- | --- |
| `bun dev` | Development server |
| `bun run build` | Production build |
| `bun start` | Serve the production build |
| `bun run typecheck` | Generate Next route types and run `tsc` |
| `bun run lint` | Biome lint + format check |
| `bun run format` | Biome format (write) |

## Project structure

```
src/
  app/                    Next.js layout + page (server components)
  components/
    GameRoot.tsx          Client entry: lazy 3D canvas (ssr: false) + DOM UI on top
    game/                 3D only (React Three Fiber)
      GameCanvas.tsx      Canvas, fixed-timestep physics world, systems
      GameDirector.tsx    Round timer and world-space score popup projection
      Structures.tsx      Crate pyramids and giant bowling pins
      Breakables.tsx      Physical debris when props shatter
      Juice.tsx           Projectile trails, hitstop, launch FOV punch, level-up burst
      Player.tsx          Rolling orb, camera-relative movement, facing arrow
      CameraRig.tsx       Smooth follow camera + impact shake
      GravityField.tsx    Attract → orbit → launch logic and field visuals
      Effects.tsx         Pooled shockwaves + instanced debris on impacts
      Scene.tsx           Static plaza, decor, lights, arena walls
      Props.tsx, props/   26 grabbable props (crates, cones, benches, cars, beach balls)
      PropBody.tsx        Dynamic body wrapper that registers a prop
    ui/                   DOM interface (Tailwind)
      Hud.tsx             Throw counter, held pill, controls hint, reset
      TouchControls.tsx   Joystick + gravity button (coarse pointers only)
      Menu.tsx            Start and results screens
      ScorePopups.tsx     Floating +points, level-up banner, "too heavy" toast
      MuteButton.tsx      Sound toggle
    AudioSystem.tsx       Plays synthesized sounds for game events
  game/                   Framework-agnostic shared state
    config.ts             Tuning values, growth LEVELS and per-kind tiers/points (KINDS)
    events.ts             Typed event bus (launch, break, levelUp, points, ...)
    score.ts              Round flow, scoring and combos
    progression.ts        XP and level-ups
    breakables.ts         Damage, shattering and the destruction meter
    audio.ts              WebAudio synth
    input.ts              Mutable input state + keyboard/mouse bindings
    store.ts              Tiny external store for the HUD
    registry.ts           Live props + player handles
    effects.ts            Impact event bus and camera shake trauma
```

The HUD and the 3D loop communicate through `src/game/`. The physics loop writes to mutable objects, so React does not re-render every frame.

## Tuning

Change how the game feels in `src/game/config.ts`:

- `field.radius`, `field.maxHeld`: attraction range and how many objects you can hold
- `field.steer`, `field.maxSpeed`: how fast objects snap into orbit and their speed cap
- `launch.speed`, `launch.lift`, `launch.spread`: how fast, high and wide throws go
- `impact.minSpeed`: lowest collision speed that triggers effects
- `LEVELS`: XP needed for each level, plus orb size, field reach, capacity and liftable tier
- `KINDS`: the tier, base points and breakability of each prop type
- `game.durationSec`: round length

Physics runs on a fixed 60 Hz timestep with interpolation.
