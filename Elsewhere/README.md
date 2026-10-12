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

CDN scripts: js-yaml + marked only. No build step. The world is
drawn by `engine.js`; animated things blit from sprite sheets.

---

## The experience

Splash → **Load clone** → the clone drops onto the spawn tile → the
bioprinter dialog (**E / Space**) → you walk.

- **WASD / arrows** move (engine collision, floor levels, stairs).
- **E / Space** interacts with the nearest thing — same key as
  dialog. Walk up, a `E <name>` prompt appears. No mouse.
- **+ / − / scroll** zoom.

Interactions wired now: books / games / music / art (modals);
**coffee** (whirrs, brews a cup, "firewall blocked the espresso",
cup vanishes); **sushi** (a random piece + a line); **fireplace**
(on/off + crackle); **either window** (cycles the weather: clear →
rain → storm → cloudy — the sky in every window *and* the whole
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
├── assets/sprites/    player, cat_*, cup, sushi  ← PLACEHOLDERS, paint over these
├── assets/covers,art/ modal images
└── src/
    ├── main.js        glue: camera, movement, player/cat animators, spawns, env
    └── systems/
        ├── Sprites.js      sheet loader + per-entity Animator
        ├── Interactions.js effect runner (data → actions)
        ├── Windows.js      live sky viewports (weather) + frame overlay
        ├── Ambience.js     Web Audio layers + screen overlays
        ├── Dialog.js       DOM dialog, E/Space advance
        ├── Modal.js        content popups
        └── Config.js       loads the YAML
```

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
| `sky.png` | 4×1 | 256×256 | weather backdrop + window view: clear/rain/storm/cloudy |
| `window_<id>_frame.png` | — | per window | frame + ledge over the glass; transparent panes |

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
  `assets/sprites/` not `assets/map/`: the **flame** and the **spinning
  record**. They loop over their hand-drawn sheet (`flame.png`,
  `platter.png`) and draw on top of the painted station. Everything else
  that used to be code-drawn vector art is gone — paint it into the
  station template.

**Re-export templates** (after editing the scene) with the exporter
in the project notes; it re-renders every template + the manifest
from `scene.js`.

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

**The weather** is one sky sheet (`sky.png`, four frames) used in two
places: the **full backdrop** behind the floating island (the void is
transparent now, so the sky shows through) and the **interior of every
window**. Tapping either window steps the weather clear → rain → storm
→ cloudy; `Ambience.currentWeather()` is the single source of truth and
both the backdrop (`bgSky()` in `main.js`) and `Windows.js` read it.
Rain streaks and the lightning flash draw live on top — across the
screen (`Ambience.drawOverlay`) and inside each window (`Windows.js`).
A window is drawn in three layers: the sky frame, the live rain/flash,
then its **frame + ledge** PNG (`assets/sprites/window_<id>_frame.png`)
— paint that to redraw the woodwork; the glass stays a viewport. Add a
weather by adding a `sky.png` frame + a `WEATHER` entry in `Ambience.js`
and listing it in the windows' `cycle_weather`.

**Ambience** layers (`rain`, `fire`, `birds`, `thunder`) are
synthesized in `Ambience.js`. Each is a swap-point: drop in a real
audio file later behind the same on/off call.

---

## Libraries (CDN)

js-yaml 4.1.0 · marked 11.1.1. Everything else is local.
