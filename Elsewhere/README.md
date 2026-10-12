# Elsewhere

A small pixel room that sits beside the main portfolio.
The off-hours cut of me — books, music, games, art, the cat.

Served at `mayankdate.github.io/Elsewhere/`, embedded into the main
site via an iframe at `mayankdate.github.io/elsewhere.html`.

---

## Running locally

```bash
cd Elsewhere
python -m http.server 8000
```

Then open <http://localhost:8000>. (Or from the repo root run
`python -m http.server 8000` and open <http://localhost:8000/Elsewhere/>.)

---

## How it's put together

```
Elsewhere/
├── index.html              Phaser bootstrap page
├── styles.css              Modal overlay + page chrome
├── config/                 Everything editable — YAML, no code
│   ├── world.yaml              Tile grid: rooms, floors, walls
│   ├── interactables.yaml      Clickable sprites (bookshelf, record player, …)
│   ├── cats.yaml               Wandering cat NPCs
│   ├── books.yaml              Reading-nook content
│   ├── music.yaml              Listening-lounge content
│   ├── games.yaml              Game-corner content
│   ├── art.yaml                Gallery content (watercolours, drawings)
│   └── mayank.yaml             What the pixel-Mayank NPC says
├── assets/
│   ├── tiles/                  32×32 floor tiles + 32×48 wall sprites
│   ├── sprites/                Firefly cursor, cat, bookshelf, NPC
│   ├── art/                    Images referenced from art.yaml
│   └── sounds/                 (reserved — ambient audio can go here later)
└── src/
    ├── main.js             Phaser config, scene registration
    ├── scenes/
    │   ├── Boot.js             Loads images + YAML
    │   ├── Welcome.js          "Spirit transfer only" intro
    │   └── Island.js           The explorable room
    ├── entities/
    │   ├── Firefly.js          The cursor-following player sprite
    │   ├── Cat.js              Wandering cat NPC
    │   └── Interactable.js     Clickable sprite → modal
    └── systems/
        ├── Config.js           YAML loader
        ├── Modal.js            DOM overlay for content pages
        └── Walkable.js         Where the firefly is allowed to be
```

---

## Replacing the placeholder art

The `assets/tiles/` and `assets/sprites/` folders ship with coded
placeholder PNGs. Replace any file at the same path and dimensions
and it'll show up on next refresh. Dimensions:

| File                       | Size   |
|----------------------------|--------|
| `tiles/floor_*.png`        | 32×32  |
| `tiles/wall_horizontal.png`| 32×48  |
| `tiles/wall_vertical.png`  | 32×48  |
| `tiles/wall_corner_tl.png` | 32×48  |
| `tiles/wall_doorway.png`   | 32×48  |
| `sprites/firefly.png`      | 24×24  |
| `sprites/cat_apollo.png`   | 32×24  |
| `sprites/bookshelf.png`    | 48×56  |
| `sprites/mayank_npc.png`   | 24×32  |

For walls the top ~16px is the "capstone" that pokes up above the
tile row; the bottom 32×32 sits on the floor. Phaser offsets each
wall sprite by –8px so the capstone overlaps the row above.

---

## Adding a new room or interactable

1. In `config/world.yaml`, add a `rooms:` entry with its tile bounds
   and floor type, and lay walls around it in the `walls:` list.
2. In `config/interactables.yaml`, add a new entry pointing at a
   sprite key, a tile position, and a `content:` key that matches
   the filename of a YAML file in `config/` (minus `.yaml`).
3. If the content key is new, drop a matching YAML file next to the
   others. The modal reads `title`, `intro`, and whichever of
   `shelf`, `tracks`, `pieces`, `bio` is present.

---

## Libraries

Loaded from CDN in `index.html`:

- **Phaser 3** (`3.70.0`) — the game engine.
- **js-yaml** (`4.1.0`) — parses the config files at runtime.
- **marked** (`11.1.1`) — renders markdown inside modal content.

Everything else is plain ES modules.
