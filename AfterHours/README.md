# AfterHours — cabin engine

The pixel room beside the portfolio, built on the **CabinEngine**
reconstruction of Mayank's Procreate sketch. Served at
`mayankdate.github.io/AfterHours/`, embedded into the site at
`mayankdate.github.io/afterhours.html`.

Everything is **data-driven and modular** — new content and
behaviour is config, not surgery. Three systems sit on top of the
engine: Sprites (animation), Interactions (effect runner), Ambience
(synth audio + overlays).

---

## Running locally

```bash
cd AfterHours
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
AfterHours/
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
├── assets/map/        templates/ (unpainted 2048² slices: island, floor,
│                       one per object, window frames, sky_template, manifest)
│                       + painted/ (your painted slices; override templates)
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

The **window frames** (`window_<id>_frame.png`) are not animated, so they're
map art, not sprites — a full-canvas 2048² slice like everything else (the
glass is left open as the live sky viewport). The **sky** is drawn from its
own template, see "Drawing the sky" below.

Change a frame size? Update it in `sprites.yaml` and redraw at that
size. Missing sheet? The engine falls back to the code-drawn shape,
so nothing breaks while you work.

---

## Drawing the map (slices)

Every map layer is a **full-canvas 2048×2048 slice** — the island, the house
floor, and one per object (each wall, each station, …). No cropping, no
grouping: you paint each layer at full map size and stack them in Procreate.

**The two folders:**

- `assets/map/templates/` — the **unpainted** slices the generator exports.
- `assets/map/painted/` — the **painted** slices you make (same filenames).

A painted slice **overrides** its template automatically: the game loads
`painted/<name>.png` when it exists, otherwise `templates/<name>.png`. So to
replace a layer you just drop your PNG in `painted/` — nothing else to edit.

**Workflow:**

1. `python3 scripts/build_templates.py` exports the unpainted slices into
   `templates/`, plus `_painter_reference.png` (the ground + red collision
   strips + an id label at each object's foot) to import as a tracing layer.
2. In a **2048×2048** Procreate canvas, paint each slice on its own layer and
   export it (same filename) into `assets/map/painted/`.
3. Refresh — done.

**Ground is two slices:** `island.png` (grass + cliff) and `floor.png` (the
house floor footprint + stairs), so they take different colours. They're listed
under `ground:` in `map.yaml` and drawn back-to-front.

**Each object is its own slice at its own sortY**, so occlusion and the wall
cutaway fade (a wall going translucent while you stand behind it) work exactly
as before — the slices behave like the individual objects they represent.

**A station slice includes the device that sits on it** (monitors, espresso
machine, record player, plates) — paint the table at the foot and the device in
the headroom above. Where its animated sprite lands (`flame` / `platter` /
`cup` steam) is marked with a magenta placeholder box, labelled; paint *around*
it, don't paint it in. (Those rects are also in `manifest.json`.)

**Only genuinely moving things stay sprites**, in `assets/sprites/`: the flame,
the spinning record, the coffee steam (`flame.png`, `platter.png`, `cup.png`).

Anything not listed in `map.yaml` stays code-drawn, so nothing breaks while a
slice is still unpainted.

**Re-export after editing the scene:**

```bash
cd AfterHours
python3 scripts/build_templates.py          # --dry-run to preview
```

It re-renders `island.png`, `floor.png`, every `<object>.png`,
`sky_template.png`, `_painter_reference.png` and `manifest.json` from
`scene.js` + the configs, only rewriting a file when its pixels change. It
never touches `assets/map/painted/` or `assets/sprites/sky.png`.

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

- **Ground** is *world-space*: each 2048×2048 slice = the 64×64-tile island
  at 32 px / tile. Draw at that exact size (`templates/island.png`,
  `templates/floor.png`, and every `templates/<object>.png`).
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