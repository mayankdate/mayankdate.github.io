# Elsewhere — cabin engine

The pixel room beside the portfolio, rebuilt on the **CabinEngine**
reconstruction of Mayank's Procreate sketch. Served at
`mayankdate.github.io/Elsewhere/`, embedded into the site at
`mayankdate.github.io/elsewhere.html` (unchanged wrapper).

This replaces the earlier Phaser tilemap. The world is now a
pre-projected 2.5D scene with per-object heights, narrow ground
footprints, mounted overhang (monitors, chimney, steam), multiple
floor levels + stairs, and foot-depth occlusion.

---

## Running locally

```bash
cd Elsewhere
python -m http.server 8000     # then open http://localhost:8000
```

Phaser is gone. The only CDN scripts are js-yaml and marked (for the
content configs and modal markdown). The world itself needs no
libraries and no image assets — it's drawn by `engine.js`.

---

## The experience

Splash → **Load clone** → the blank clone drops onto the spawn tile →
the bioprinter dialog (**E / Space** to advance) → you're walking.

- **WASD / arrows** move, using the engine's foot collision, floor
  levels, and stair interpolation.
- **E / Space** interacts with the nearest station (same key as
  dialog). Walk up to a station and a `E <name>` prompt appears.
  **There is no mouse interaction.**
- **+ / − / scroll** zoom.

Stations → content: bookshelf → books, gaming desk → games, turntable
→ music, gallery → art; coffee / fireplace / sushi speak a short line.

---

## Architecture

```
Elsewhere/
├── index.html        Splash + <canvas id=game> + dialog/modal/HUD roots
├── styles.css        All DOM chrome
├── engine.js         CabinEngine — geometry, collision, levels, occlusion,
│                       mounted parts, drawScene  (the reconstruction; unmodified)
├── scene.js          window.CABIN_SCENE — the authored cabin map
├── config/
│   ├── intro.yaml         splash greeting + bioprinter dialog
│   ├── interactions.yaml  scene station id → content modal or dialog
│   ├── books.yaml, music.yaml, games.yaml, art.yaml
├── assets/
│   ├── covers/, art/      images shown inside the modals
│   └── mayank_portrait.png  splash only
└── src/
    ├── main.js       game loop: camera, movement, proximity-E, splash/drop
    └── systems/
        ├── Config.js     loads the content YAML
        ├── Dialog.js     DOM dialog box, E/Space advance (capture phase)
        └── Modal.js      content popups (books/music/games/art, Spotify, covers, frames)
```

`main.js` is the only glue: it drives a follow-camera (`ctx` translate
+ scale centred on the player), calls `CabinEngine.movePlayer`,
`drawScene`, and `nearestInteraction`, and opens the right modal. The
geometry contract lives entirely in `engine.js` + `scene.js` — don't
fork them; edit the scene.

---

## Editing the map

The map is `scene.js` (`window.CABIN_SCENE`) — authored 2D projected
coordinates in 32 px tile units. See `CLAUDE_HANDOFF.md` from the
reconstruction for the full contract. The source of truth is
`scene.json`; regenerate `scene.js` with the reconstruction's
`sync_scene.cjs`. Key points:

- A wall's tall face is **artwork**; its `collisionRect` is the narrow
  strip at its foot. Don't widen the footprint to match the drawing.
- Overhang (monitors, chimney, steam) are `parts` with
  `collision:false` — they draw above the parent and add no collision.
- `sortY` is the object's foot depth; the player sorts by feet. Front
  walls ghost-fade while you're behind them (`cutaway`, on by default
  in `drawScene`).
- Floor `level` + `stairs` gate movement between heights.

To move a whole set piece (and its mounted children + collision)
together, use `CabinEngine.relocateObject(scene, id, dx, dy)`.

---

## Replacing the block-in with hand-drawn art

Right now `drawScene` paints each object from its coloured `shapes`
and primitive `parts`. To use finished Procreate art:

1. Export each object (or layer) as a transparent PNG. The
   reconstruction's `render_assets.cjs` already emits one template per
   object plus a `manifest.json` with each one's **ground anchor**,
   pixel size, collision rect, and parent — draw over those templates
   so the anchors line up.
2. In the renderer, swap the per-object shape loop for an image draw
   keyed by object id, positioned at `visualBounds` (its top-left ×
   32 px). Keep `collisionRect`, `sortY`, and the `parent` grouping
   exactly as they are, so collision and occlusion don't change.
3. Animated details (flames, steam, spinning record) stay as separate
   `parts` so they can keep moving over the static art.

That's the whole point of the layered model: you redraw the *look*
without touching the *geometry*.

---

## Libraries (CDN)

js-yaml 4.1.0 · marked 11.1.1. Everything else is local.
