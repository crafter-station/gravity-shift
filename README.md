# Gravity Shift

A hypercasual 3D web game. You pilot a small UFO with gravity powers. Invaders are marching on the crystal core in the middle of a low-poly plaza. Pull nearby objects into orbit, then fling them at the invaders.

**Defend the plaza for 10 waves.**

- **Invaders.**
  - Minions go down in one hit.
  - Runners are fast.
  - Brutes carry shields and need several hits or something heavy.
  - Bosses arrive on waves 5 and 10.

  If invaders reach the core, it takes damage. If the core reaches 0, you lose. Invaders arrive in packs from one direction, so you have to reposition.
- **Auto-aim.** Each throw homes in on the closest invaders in front of you and spreads the volley over up to three targets.
- **Ammo.** Use anything in the plaza: crates, cones, benches, food carts, cars, kiosks, the bus. Knocked-out invaders leave husks you can throw too. Supply crates rain down between waves, and also during them from wave 3.
- **Grow like Hole.io.** Kills give points and XP. Each level makes the UFO bigger, extends the field's reach and lets it hold more. It also unlocks heavier ammo: benches and carts at LV 2, cars at LV 3, kiosks at LV 4, the bus at LV 5.
- **Upgrades between waves.** Pick 1 of 3:
  - explosive throws
  - homing
  - a release pulse
  - wider reach
  - heavier throws
  - orbit contact damage
  - core repair
- **Combos and stars.** Chained kills raise a score multiplier up to ×4. A win is rated by how much core health is left.
- **Sound and juice.** Every sound is synthesized live with WebAudio. Throws get trails, hitstop and screen shake.

Built with Next.js (App Router), React Three Fiber, Three.js, drei, Rapier physics, Tailwind CSS and Biome. It runs on Bun.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move (camera-relative) | `WASD` / arrow keys | Virtual joystick (bottom-left) |
| Attract objects | Hold left click or `Space` | Hold the gravity button (bottom-right) |
| Throw | Release | Release |
| Pick upgrade | Click a card or press `1` `2` `3` | Tap a card |
| Restart | **Reset** button | **Reset** button |

Objects closer to you are pulled harder. Throws auto-aim at invaders in front of you, which is the direction of the white arrow under the UFO. With no invader in range they fly straight ahead. Arrows at the screen edge point to invaders you can't see.

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
      Player.tsx          UFO: camera-relative movement, growth, facing arrow
      Enemies.tsx         Invader spawning, steering, hits and throwable husks
      Core.tsx            The crystal core invaders attack
      Supplies.tsx        Supply crates that fall from the sky
      EnemyIndicators.tsx Off-screen invader projection
      Buildings.tsx       City backdrop (Blender GLBs, merged per material)
      models/             Blender model components (UFO, car, bus, cart, kiosk)
      CameraRig.tsx       Smooth follow camera + impact shake
      GravityField.tsx    Attract → orbit → launch logic and field visuals
      Effects.tsx         Pooled shockwaves + instanced debris on impacts
      Scene.tsx           Static plaza, decor, lights, arena walls
      Props.tsx, props/   Grabbable props: crates, cones, benches, cars, beach balls, carts, kiosks, bus
      PropBody.tsx        Dynamic body wrapper that registers a prop
    ui/                   DOM interface (Tailwind)
      Hud.tsx             Score, combo, wave, core health, level/XP, reset
      TouchControls.tsx   Joystick + gravity button (coarse pointers only)
      Menu.tsx            Start and results (victory / defeat) screens
      UpgradePicker.tsx   Pick 1 of 3 upgrades between waves
      EnemyIndicatorLayer.tsx  Screen-edge arrows for off-screen invaders
      ScorePopups.tsx     Floating +points, level-up banner, "too heavy" toast
      MuteButton.tsx      Sound toggle
    AudioSystem.tsx       Plays synthesized sounds for game events
  game/                   Framework-agnostic shared state
    config.ts             Tuning values, growth LEVELS and per-kind tiers/points (KINDS)
    events.ts             Typed event bus (launch, break, levelUp, points, ...)
    score.ts              Run start/end, scoring and combos
    waves.ts              Wave composition, spawning, core damage, upgrade flow
    combat.ts             Invader damage, explosions, player-pass-through groups
    upgrades.ts           Upgrade definitions
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
- `ENEMY_STATS` and `buildWave` in `src/game/waves.ts`: invader hp, speed and core damage, plus each wave's makeup
- `UPGRADES` in `src/game/upgrades.ts`: upgrade names and max stacks

## Assets

The 3D models (UFO, car, bus, food cart, kiosk, buildings) were made in Blender. Their source is `assets/blender/gravity-shift-models.blend`, and the exported GLBs are in `public/models/`. They have no textures, use flat colors, and total about 420 KB.

Physics runs on a fixed 60 Hz timestep with interpolation.
