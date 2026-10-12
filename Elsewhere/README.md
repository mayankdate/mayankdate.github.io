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
(on/off + crackle); **window** (cycles weather: clear → rain →
birds → storm); four **cats** (pet with E).

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

Change a frame size? Update it in `sprites.yaml` and redraw at that
size. Missing sheet? The engine falls back to the code-drawn shape,
so nothing breaks while you work.

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

**Ambience** layers (`rain`, `fire`, `birds`, `thunder`) are
synthesized in `Ambience.js`. Each is a swap-point: drop in a real
audio file later behind the same on/off call.

---

## Libraries (CDN)

js-yaml 4.1.0 · marked 11.1.1. Everything else is local.
