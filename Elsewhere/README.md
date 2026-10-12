# Elsewhere

A small pixel island that sits beside the main portfolio — the
off-hours cut of me: books, music, games, art, the cats.

Served at `mayankdate.github.io/Elsewhere/`, embedded into the
main site (windowed, with an instructions column) at
`mayankdate.github.io/elsewhere.html`.

---

## Running locally

```bash
cd Elsewhere
python -m http.server 8000
```

Open <http://localhost:8000>. (Phaser, js-yaml and marked load
from CDN, so you need to be online the first time.)

---

## The experience

1. A **splash** greets the visitor with a pixel portrait and a
   `Load clone` button.
2. On click, the game loads and a blank **clone** drops onto the
   spawn tile with a bounce.
3. A **dialog** plays (the bioprinter gag). **E** or **Space**
   advances it; the prompt is shown on the box.
4. Dialog dismissed → you're controllable. **WASD / arrows** to
   walk, **click** shelves, frames and cats to open them,
   **+ / − / scroll** to zoom.

Interactions are mouse-only; **E / Space are just for dialog.**

---

## How it's put together

```
Elsewhere/
├── index.html          Splash + canvas + dialog/modal/HUD roots
├── styles.css          All DOM chrome
├── config/             Everything editable — YAML, no code
│   ├── world.yaml          The map: two character grids + legend
│   ├── interactables.yaml  Clickable furniture + what it opens
│   ├── cats.yaml           Wandering cats
│   ├── intro.yaml          Splash greeting + bioprinter dialog
│   ├── books.yaml          Reading list
│   ├── music.yaml          Spotify embeds
│   ├── games.yaml          Games + cover filenames
│   └── art.yaml            Paintings + image filenames
├── assets/
│   ├── tiles/              Floor tiles + wall blocks (32×48)
│   ├── sprites/            Player sheet, cats, furniture, portrait
│   ├── covers/             Game cover art (120×160)
│   └── art/                Paintings (180×130)
└── src/
    ├── main.js             Loads config, drives the splash, boots Phaser
    ├── scenes/
    │   ├── Boot.js             Preloads every texture from the config
    │   └── Island.js           Builds the world, camera, zoom, intro
    ├── entities/
    │   ├── Player.js           WASD walk cycle + collision
    │   ├── Cat.js              Wandering NPC
    │   └── Interactable.js     Clickable furniture (indicator + label)
    └── systems/
        ├── Config.js           Loads all YAML
        ├── TileMap.js          Char grids → floor + walls + walkable grid
        ├── Dialog.js           DOM dialog box, E/Space advance
        └── Modal.js            Content popups (books/music/games/art/cats)
```

---

## Editing the world

`config/world.yaml` holds **two character grids**. `floor` is the
ground you stand on; `objects` is what sits on top. The `legend`
maps each character to a tile/sprite and whether it's walkable.
A **door is just a blank** in the `objects` grid over a walkable
floor — edit the grids like ASCII art and the map changes.

```
legend:
  floor:
    '~': { tile: water,  walk: false }
    '.': { tile: grass,  walk: true  }
    'R': { tile: floor_wood_dark, walk: true }   # reading room
    ...
  objects:
    '#': { sprite: wall_stone,  walk: false, tall: true }
    'T': { sprite: tree,        walk: false, tall: true }
```

To add a room: paint its floor chars into a rectangle, ring it
with `#`/`=` in the objects grid, and leave a blank for the door.

---

## Adding content

**A new clickable thing** — add to `interactables.yaml`:

```yaml
- id: my_thing
  sprite: bookshelf        # a PNG in assets/sprites/
  tile: { x: 17, y: 5 }    # grid position (its tile is auto-blocked)
  label: Books             # shown on hover
  content: books           # which YAML file's modal to open
```

**Music** — paste Spotify embed URLs into `music.yaml`
(Share → Embed → copy the `src`).
**Games** — drop covers into `assets/covers/`, list them in
`games.yaml`.
**Art** — drop scans into `assets/art/`, list them in `art.yaml`.

---

## Replacing the placeholder art

Swap any PNG at the same path and size:

| File | Size |
|------|------|
| `tiles/*.png` (floors) | 32×32 |
| `tiles/wall_*.png` | 32×48 (top 16px = capstone) |
| `sprites/player.png` | 72×128 sheet (3 cols × 4 rows of 24×32) |
| `sprites/cat_*.png` | 32×24 |
| `sprites/bookshelf.png`, `game_shelf.png` | 32×40 |
| `sprites/record_player.png` | 32×32 |
| `sprites/frame_*.png` | 26×30 |
| `sprites/mayank_portrait.png` | 64×64 (splash) |
| `covers/*.png` | 120×160 |
| `art/*.png` | 180×130 |

---

## Libraries (CDN)

Phaser 3.70.0 · js-yaml 4.1.0 · marked 11.1.1. Everything else is
plain ES modules.
