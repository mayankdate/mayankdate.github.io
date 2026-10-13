# Elsewhere — cabin engine

The pixel room beside the portfolio, built on the **CabinEngine**
reconstruction of Mayank's Procreate sketch. Served at
`mayankdate.github.io/Elsewhere/`, embedded into the site at
`mayankdate.github.io/elsewhere.html`.

Everything is **data-driven and modular** — new content and
behaviour is config, not surgery. Three systems sit on top of the
engine: Sprites (animation), Interactions (effect runner), Ambience
(synth audio + overlays).

---

## Running locally

```bash
cd Elsewhere
python -m http.server 8000      # open http://localhost:8000
```

Fully self-contained — js-yaml + marked are vendored under `vendor/`,
so there are no external script dependencies and no build step. The
world is drawn by `engine.js`; animated things blit from sprite sheets.

---

## The experience

Splash → **Load clone** → the clone drops onto the spawn tile → the
bioprinter dialog (**E / Space**) → you walk.

- **WASD / arrows** move (engine collision, floor levels, stairs).
- **E / Space** interacts with the nearest thing — same key as
  dialog. Walk up, a `E <name>` prompt appears. No mouse.
- **+ / − / scroll** zoom.
- **On touch devices** a floating joystick (drag the left side) moves
  you and a right-hand **E** button interacts; it just synthesizes an
  E press, so every control path is shared. Detected by
  `pointer: coarse`; the page sizes to the viewport with `100dvh`.

Interactions wired now: books / games / music / art (modals);
**coffee** (whirrs, brews a cup, "firewall blocked the espresso",
cup vanishes); **sushi** (a random piece + a line); **fireplace**
(on/off + crackle); **either window** (cycles the weather: cloudy →
rain → storm → clear — the sky in every window *and* the whole
backdrop change, with rain + thunder + lightning); four **cats**
(pet with E).

---

## Architecture

```
Elsewhere/
├── engine.js          CabinEngine (geometry, collision, levels, occlusion).
│                       Extended with a 'sprite' part kind + playerSprite.
├── scene.js           window.CABIN_SCENE — the authored cabin map.
├── index.html / styles.css
├── config/            ← edit these
│   ├── sprites.yaml        sheets + frame grids + animations
│   ├── accents.yaml        looping sprites pinned on a station (flame, disc)
│   ├── interactions.yaml   each station's effect sequence
│   ├── cats.yaml           4 cats: sheet, zone, speed, personality
│   ├── sushi.yaml          random sushi variants
│   ├── intro.yaml          splash + bioprinter dialog
│   └── books/music/games/art.yaml   modal content
├── assets/sprites/    player, cat_*, cup, sushi, flame, platter, sky
│                       ← animated sheets; PLACEHOLDERS, paint over these
├── assets/map/        ground.png + templates/ (object guides, window
│                       frames, sky_template.png, manifest.json)
├── assets/covers,art/ modal images
├── scripts/
│   └── build_templates.py  regenerates the map/sky guides + manifest
├── vendor/            js-yaml + marked (self-hosted, no CDN)
└── src/
    ├── main.js        glue: camera, movement, animators, spawns, env, sky
    └── systems/
        ├── Sprites.js      sheet loader + per-entity Animator
        ├── Interactions.js effect runner (data → actions)
        ├── Ambience.js     Web Audio layers + screen overlays
        ├── Dialog.js       DOM dialog, E/Space advance
        ├── Modal.js        content popups
        └── Config.js       loads the YAML
```
(Window viewports + the weather sky live in `engine.js` + `main.js`, not a
separate module.)

---

## Drawing the art (the whole point)

The placeholders in `assets/sprites/` are **grids you paint over**.
Keep the frame size, the grid, and the frame order and everything
keeps animating. Layout is in `sprites.yaml`:

| Sheet | Grid | Frame | Rows |
|-------|------|-------|------|
| `player.png` | 4×4 | 48×64 | down / left / right / up; col0 idle, col1-3 walk |
| `cat_<name>.png` | 4×4 | 40×32 | idle / walk / sit / sleep |
| `cup.png` | 4×1 | 24×28 | steam frames |
| `sushi.png` | 6×1 | 28×28 | one piece per frame |
| `flame.png` | 4×1 | 48×48 | fireplace fire, flicker loop |
| `platter.png` | 4×1 | 32×32 | turntable vinyl, spin loop |
| `sky.png` | 4×4 | 512×512 | weather backdrop + window view: clear/rain/storm/cloudy (a row each, 4 frames across) |

The **window frames** (`window_<id>_frame.png`) are not animated, so they
moved out of `assets/sprites/` to `assets/map/templates/` — draw them with
the rest of the map art. The **sky** is drawn from its own template, see
"Drawing the sky" below.

Change a frame size? Update it in `sprites.yaml` and redraw at that
size. Missing sheet? The engine falls back to the code-drawn shape,
so nothing breaks while you work.

---

## Drawing the map (layers)

The static cabin — ground + every wall and furniture body — is also
paintable, the same way, in layers.

- **Templates** live in `assets/map/templates/`: `ground.png`
  (the whole 2048×2048 terrain/floor/stairs) and one PNG per object
  (`wall_cafe.png`, `fireplace.png`, …), each already the right size
  and position. `templates/manifest.json` records every object's
  pixel position, size, sort depth, and collision rect.
- **To replace a layer:** paint over a template, keep its canvas
  size, save it into `assets/map/`, and list it in `config/map.yaml`:

  ```yaml
  ground: assets/map/ground.png
  objects:
    wall_cafe: assets/map/wall_cafe.png
    fireplace: assets/map/fireplace.png
  ```

- Anything **not listed stays code-drawn**, so you redraw the map one
  piece at a time and nothing breaks. Drawn layers keep the original
  occlusion and sort order — walls still hide you, you still walk in
  front of the counter.
- **A station template includes what sits on it.** The device a station
  carries — the monitors on the gaming desk, the espresso machine on the
  coffee counter, the record player on the turntable cabinet, the plates
  on the sushi display — is part of that station's template, not a
  separate layer. Each station card is drawn tall enough for it: paint
  the table at the foot and the device in the headroom above (see the
  contact sheet — the transparent space above the box is yours).
- **Only genuinely moving things are separate sprites**, in
  `assets/sprites/` not `assets/map/`: the **flame**, the **spinning
  record**, and the **coffee steam**. They loop over their hand-drawn sheet
  (`flame.png`, `platter.png`, `cup.png`) and draw on top of the painted
  station. Everything else that used to be code-drawn vector art is gone —
  paint it into the station template.
- **Where an interactive sprite lands is marked on its station template.**
  The generator draws a magenta placeholder box (labelled with the sprite)
  on the station it spawns over — `flame` on `fireplace`, `platter` on
  `turntable`, `cup` (steam) on `coffee`. Paint the station *around* the
  box so the animated sprite sits correctly; the box itself is scaffolding,
  not art, so don't paint it in. Because the flat template doubles as the
  live art until you paint it, the box shows in the running game while the
  station is still a placeholder — paint over it and it's gone. The same
  rects are in `manifest.json` under each object's `placeholders`, if you'd
  rather keep the live template clean and reference the numbers instead.

**Re-export templates** (after editing the scene) by running the generator:

```bash
cd Elsewhere
python3 scripts/build_templates.py          # --dry-run to preview
```

It re-renders every guide + `manifest.json` + the sky template from
`scene.js` and the configs, adds the placeholder boxes, and only rewrites a
file when its pixels actually change. It never touches your painted art
(`assets/sprites/sky.png`, `assets/map/ground.png`, the window frames).

**Decorations & seasons** slot in here later: a cherry-blossom tree
behind the house or props on the satellite islands are just more
entries (a sprite + a world position), and a "season" field can pick
which decoration set loads — the systems are already shaped for it.

---

## Adding / changing behaviour

**An interaction** is a list of effects in `interactions.yaml`, run
in order on E:

```yaml
coffee:
  label: Coffee
  effects:
    - { sound: whirr, duration: 1600 }
    - { spawn: { ref: cup, id: _cup, at: [29.7, 19.9], anim: steam } }
    - { wait: 350 }
    - { dialog: [ "…your firewall blocked the espresso. Try harder." ] }
    - { despawn: _cup }
```

Effect types today: `modal`, `dialog`, `sound`, `spawn`, `despawn`,
`wait`, `toggle_fire`, `cycle_weather`, `serve_sushi`. **A new
effect = one case in `Interactions.js` + one handler in `main.js`'s
`env`.** That's the extension point — the rest of the game never
changes.

**A cat's personality** lives in `cats.yaml`: `temperament`
(`approach` — Apollo comes to you; `avoid` — Hope flees to a
corner; `neutral`) plus `rest: { idle, sit, sleep }` weights, and
speed / zone / sheet / bio. Interactions can't be triggered from
behind an object (front + sides only); cats are pettable from any
side.

**An accent** (a looping sprite on top of a station) is one line in
`accents.yaml` — a sheet `ref`, a foot anchor `at`, a `sortY`, the
`anim` to loop, and optionally `visibleWhen: fire` to tie it to the
fireplace toggle. The flame and the spinning record are the two today;
add a candle flicker, steam, a bubbling pot the same way.

**The weather** is one sky sheet (`sky.png`) used in two places: the
**full backdrop** behind the floating island (the void is transparent, so
the sky shows through) and the **interior of every window**. Tapping either
window steps the weather cloudy → rain → storm → clear;
`Ambience.currentWeather()` is the single source of truth, and both the
backdrop (`skyFrame()` in `main.js`) and the window cutouts (in
`engine.js`'s `drawScene`) read the same frame. Rain streaks and the
lightning flash draw live on top (`Ambience.drawOverlay`). A window is
drawn in three layers: the sky frame, the live rain/flash, then its
**frame + ledge** PNG (`assets/map/templates/window_<id>_frame.png`) —
paint that to redraw the woodwork; the glass stays a viewport. Add a
weather by adding a `sky.png` row + a `WEATHER` entry in `Ambience.js`
and listing it in the windows' `cycle_weather`.

### Drawing the sky

The sky and the ground live in **different coordinate systems**, which is
why they're sized differently:

- **Ground** is *world-space*: one 2048×2048 layer = the 64×64-tile island
  at 32 px / tile. Draw it at that exact size (`templates/ground.png`).
- **Sky** is *screen-space*: each frame is stretched to fill the whole
  viewport, whatever its size. So frame resolution is just "how crisp,"
  not tied to the map. It's now **2048×2048 — sixteen 512×512 cells**, a
  row per weather (clear / rain / storm / cloudy) and 4 animation frames
  across.

Paint `assets/map/templates/sky_template.png` (the labelled 4×4 grid the
generator emits), keep the 512 px cells and the row order, then export it
back as `assets/sprites/sky.png`. To draw at a different resolution, change
`frameW`/`frameH` on `sky` in `sprites.yaml` and redraw at that cell size —
the engine adapts automatically.

**Ambience** layers (`rain`, `fire`, `birds`, `thunder`) are
synthesized in `Ambience.js`. Each is a swap-point: drop in a real
audio file later behind the same on/off call.

---

## Libraries

js-yaml 4.1.0 · marked 11.1.1, both vendored under `vendor/` (served
from the repo, not a CDN). Everything else is local too.

# Audio drop-in folder

Downloaded ambient audio files go here. They replace the synthesized
versions in `Ambience.js` on a per-layer basis.

## How to use

1. Download a file (freesound.org, pixabay, etc.) — mp3, ogg, or wav.
2. Save it in this folder, e.g. `rain.mp3`.
3. Open `../config/sounds.yaml` and uncomment / add the matching line:

   ```yaml
   rain: assets/sounds/rain.mp3
   ```

4. Refresh the game. The file takes over from the synthesizer.

## Which sounds use what

| Layer | Mode | Good source clip |
|---|---|---|
| `rain` | looped | 20–60s steady rain, no thunder in it |
| `fire` | looped | 20–60s fireplace crackle, no voices |
| `birds` | looped | 20–60s daytime birdsong, no traffic |
| `thunder` | one-shot (per cue) | a single rumble / clap, 2–5s |
| `whirr` | one-shot (coffee brew) | an espresso machine's 1–2s whirr |

`rain`, `fire`, `birds` are seamlessly looped — pick clips designed to
loop so the join isn't audible. `thunder` and `whirr` play once per
trigger, so a single sample is fine.

A layer left out of `sounds.yaml` keeps its synthesized version, so you
can swap one at a time.