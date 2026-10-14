# Gravity Shift

A hypercasual 3D web game. You are a small orb with gravity powers in a low-poly plaza. You pull nearby objects into orbit around you, then throw them.

There are no levels or goals yet. This MVP is a playground for one mechanic: pull, orbit, throw.

Built with Next.js (App Router), React Three Fiber, Three.js, drei, Rapier physics, Tailwind CSS and Biome. It runs on Bun.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move (camera-relative) | `WASD` / arrow keys | Virtual joystick (bottom-left) |
| Attract objects | Hold left click or `Space` | Hold the gravity button (bottom-right) |
| Throw | Release | Release |
| Restart | **Reset** button | **Reset** button |

Objects closer to you are pulled harder. Thrown objects fly in the direction you are facing, shown by the white arrow under the orb.

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
  game/                   Framework-agnostic shared state
    config.ts             All tuning values (speeds, radii, forces)
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

Physics runs on a fixed 60 Hz timestep with interpolation.
