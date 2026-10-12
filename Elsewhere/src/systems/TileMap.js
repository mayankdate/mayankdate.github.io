// ---------------------------------------------------------------
// Elsewhere · TileMap.js
// ---------------------------------------------------------------
// Parses the two character grids in world.yaml into:
//   · a floor layer (stamped into one RenderTexture for speed)
//   · object sprites (walls, windows, trees) that y-sort with
//     the player so you walk "behind" the tops of walls
//   · a walkable grid the player and cats collide against
//
// A door is just a blank cell in the objects grid over a
// walkable floor — no special-casing needed.
// ---------------------------------------------------------------

export class TileMap {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.T = world.grid.tile;
    this.W = world.grid.width;
    this.H = world.grid.height;
    this.floorRows = world.floor.split('\n').filter(r => r.length);
    this.objRows = world.objects.split('\n').filter(r => r.length);
    this.floorLegend = world.legend.floor;
    this.objLegend = world.legend.objects;
    this.walk = [];
  }

  get pixelWidth()  { return this.W * this.T; }
  get pixelHeight() { return this.H * this.T; }

  build() {
    const T = this.T;

    // --- floor: one RenderTexture, stamped tile by tile
    const rt = this.scene.add.renderTexture(0, 0, this.pixelWidth, this.pixelHeight)
      .setOrigin(0, 0).setDepth(-100);
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const ch = this.floorRows[y][x];
        const def = this.floorLegend[ch];
        if (def) rt.draw(def.tile, x * T, y * T);
      }
    }
    this.floorRT = rt;

    // --- walkable grid from floor
    this.walk = Array.from({ length: this.H }, (_, y) =>
      Array.from({ length: this.W }, (_, x) => {
        const def = this.floorLegend[this.floorRows[y][x]];
        return !!(def && def.walk);
      })
    );

    // --- objects (walls / windows / trees): individual, y-sorted
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const ch = this.objRows[y][x];
        if (ch === ' ') continue;
        const def = this.objLegend[ch];
        if (!def) continue;
        const img = this.scene.add.image(0, 0, def.sprite);
        // Anchor the sprite's bottom to the bottom of its tile so a
        // tall (32x48) wall/tree rises up into the row above it.
        img.setOrigin(0.5, 1);
        img.setPosition((x + 0.5) * T, (y + 1) * T);
        img.setDepth((y + 1) * T);
        if (!def.walk) this.walk[y][x] = false;
      }
    }
  }

  isWalkable(tx, ty) {
    const row = this.walk[ty];
    if (!row) return false;
    return !!row[tx];
  }

  block(tx, ty) {
    if (this.walk[ty]) this.walk[ty][tx] = false;
  }
}
