/**
 * SmartAtlasEngine.ts
 * SmartAtlasBuilder v3.0, TileMap, TileSetEditor v2.0, TileSlicer v1.0, TilePickerView
 * Ported & Enhanced for HTML5 Canvas & WebGL in TypeScript
 * Optimized for Android Smartphones (itel A70 - Mali-G57 GPU)
 */

export interface RectBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface SmartAtlasTile {
  id: number;
  srcX: number;
  srcY: number;
  w: number;
  h: number;
  category: number; // category = row index
  name: string;
  trimmed: RectBounds;
  selected: boolean;
  hash: string;
  pixelData?: string[][]; // 2D grid of hex colors
}

export class SmartAtlasBuilder {
  public sourceCtx: CanvasRenderingContext2D | null = null;
  public sourceCanvas: HTMLCanvasElement | null = null;
  public sourceWidth: number = 0;
  public sourceHeight: number = 0;
  public tileSize: number = 32;
  public tiles: SmartAtlasTile[] = [];
  private hashToIndex: Map<string, number> = new Map();

  constructor(sourceCanvas?: HTMLCanvasElement) {
    if (sourceCanvas) {
      this.loadFromCanvas(sourceCanvas);
    }
  }

  public loadFromCanvas(canvas: HTMLCanvasElement): void {
    this.sourceCanvas = canvas;
    this.sourceWidth = canvas.width;
    this.sourceHeight = canvas.height;
    this.sourceCtx = canvas.getContext('2d', { willReadFrequently: true });
    
    this.tiles = [];
    this.hashToIndex.clear();

    this.autoDetectTileSize();
    this.sliceAndDeduplicate();
  }

  // 1. AUTO DETECT TILESIZE (16, 32, 48, 64)
  public autoDetectTileSize(): void {
    if (!this.sourceCanvas || this.sourceWidth === 0 || this.sourceHeight === 0) return;
    
    const w = this.sourceWidth;
    const h = this.sourceHeight;

    for (let s = 16; s <= 128; s += 16) {
      if (w % s === 0 && h % s === 0) {
        // Cek 3 baris pertama, kalau gridnya rapi berarti itu
        let valid = true;
        for (let y = 0; y < s * 3 && y < h; y += s) {
          if (this.isRowEmpty(y, s)) {
            valid = false;
            break;
          }
        }
        if (valid) {
          this.tileSize = s;
          break;
        }
      }
    }
  }

  private isRowEmpty(y: number, s: number): boolean {
    if (!this.sourceCtx) return true;
    try {
      const imgData = this.sourceCtx.getImageData(0, y, this.sourceWidth, 1).data;
      for (let x = 0; x < this.sourceWidth; x++) {
        const alpha = imgData[x * 4 + 3];
        if (alpha > 10) return false;
      }
    } catch {
      return false;
    }
    return true;
  }

  // 2. SLICE + DUPLIKAT CHECK + AUTO TRIM
  public sliceAndDeduplicate(): void {
    if (!this.sourceCanvas || !this.sourceCtx) return;

    const cols = Math.floor(this.sourceWidth / this.tileSize);
    const rows = Math.floor(this.sourceHeight / this.tileSize);
    let id = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * this.tileSize;
        const y = row * this.tileSize;

        const trimmed = this.trimTransparent(x, y, this.tileSize, this.tileSize);
        if (trimmed.width === 0 || trimmed.height === 0) continue; // skip tile kosong

        const hash = this.getTileHash(x, y, this.tileSize);
        if (this.hashToIndex.has(hash)) continue; // DUPLIKAT SKIP!

        const tilePixelGrid = this.extractPixelGrid(x, y, this.tileSize, this.tileSize);

        const t: SmartAtlasTile = {
          id: id++,
          srcX: x,
          srcY: y,
          w: this.tileSize,
          h: this.tileSize,
          category: row, // KATEGORI = BARIS
          name: `tile_${id}`,
          trimmed,
          selected: true,
          hash,
          pixelData: tilePixelGrid,
        };

        this.tiles.push(t);
        this.hashToIndex.set(hash, t.id);
      }
    }
  }

  public trimTransparent(x: number, y: number, w: number, h: number): RectBounds {
    if (!this.sourceCtx) {
      return { left: 0, top: 0, right: w, bottom: h, width: w, height: h };
    }

    let minX = w, minY = h, maxX = -1, maxY = -1;

    try {
      const imgData = this.sourceCtx.getImageData(x, y, w, h).data;
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const alpha = imgData[(j * w + i) * 4 + 3];
          if (alpha > 10) {
            if (i < minX) minX = i;
            if (j < minY) minY = j;
            if (i > maxX) maxX = i;
            if (j > maxY) maxY = j;
          }
        }
      }
    } catch {
      return { left: 0, top: 0, right: w, bottom: h, width: w, height: h };
    }

    if (maxX < minX || maxY < minY) {
      return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; // kosong
    }

    return {
      left: minX,
      top: minY,
      right: maxX + 1,
      bottom: maxY + 1,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  public getTileHash(x: number, y: number, s: number): string {
    if (!this.sourceCtx) return `${x}_${y}`;
    let hash = 0;
    try {
      const imgData = this.sourceCtx.getImageData(x, y, s, s).data;
      for (let j = 0; j < s; j += 2) {
        for (let i = 0; i < s; i += 2) {
          const idx = (j * s + i) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const a = imgData[idx + 3];
          const pixelVal = (a << 24) | (r << 16) | (g << 8) | b;
          hash = (hash * 31 + pixelVal) | 0;
        }
      }
    } catch {
      hash = x * 1000 + y;
    }
    return String(hash);
  }

  private extractPixelGrid(x: number, y: number, w: number, h: number): string[][] {
    const grid: string[][] = Array(h).fill(null).map(() => Array(w).fill('transparent'));
    if (!this.sourceCtx) return grid;

    try {
      const imgData = this.sourceCtx.getImageData(x, y, w, h).data;
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const idx = (j * w + i) * 4;
          const a = imgData[idx + 3];
          if (a > 10) {
            const r = imgData[idx].toString(16).padStart(2, '0');
            const g = imgData[idx + 1].toString(16).padStart(2, '0');
            const b = imgData[idx + 2].toString(16).padStart(2, '0');
            grid[j][i] = `#${r}${g}${b}`;
          }
        }
      }
    } catch {
      // fallback
    }

    return grid;
  }

  // 3. EASY PICKER: BARIS, KOLOM, MANUAL
  public selectRow(row: number): void {
    for (const t of this.tiles) {
      t.selected = (t.category === row);
    }
  }

  public selectCol(col: number): void {
    for (const t of this.tiles) {
      t.selected = (Math.floor(t.srcX / this.tileSize) === col);
    }
  }

  public selectRect(x1: number, y1: number, x2: number, y2: number): void {
    for (const t of this.tiles) {
      t.selected = t.srcX >= x1 && t.srcX < x2 && t.srcY >= y1 && t.srcY < y2;
    }
  }

  public setCategory(tileId: number, category: number): void {
    const t = this.tiles.find((tile) => tile.id === tileId);
    if (t) t.category = category;
  }

  // 4. EXPORT JSON + ATLAS BARU
  public exportJson(): string {
    const selectedTiles = this.tiles.filter((t) => t.selected);
    const root = {
      tileSize: this.tileSize,
      sourceWidth: this.sourceWidth,
      sourceHeight: this.sourceHeight,
      tiles: selectedTiles.map((t) => ({
        id: t.id,
        name: t.name || `tile_${t.id}`,
        x: t.srcX + t.trimmed.left,
        y: t.srcY + t.trimmed.top,
        w: t.trimmed.width,
        h: t.trimmed.height,
        category: t.category,
      })),
    };
    return JSON.stringify(root, null, 2);
  }

  public buildAtlas(padding: number = 2): HTMLCanvasElement {
    const selected = this.tiles.filter((t) => t.selected);
    let totalW = 0;
    let maxH = 0;

    for (const t of selected) {
      totalW += t.trimmed.width + padding;
      maxH = Math.max(maxH, t.trimmed.height);
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.max(16, totalW);
    outCanvas.height = Math.max(16, maxH);
    const ctx = outCanvas.getContext('2d');

    if (ctx && this.sourceCanvas) {
      let curX = 0;
      for (const t of selected) {
        const srcX = t.srcX + t.trimmed.left;
        const srcY = t.srcY + t.trimmed.top;
        const srcW = t.trimmed.width;
        const srcH = t.trimmed.height;

        ctx.drawImage(
          this.sourceCanvas,
          srcX, srcY, srcW, srcH,
          curX, 0, srcW, srcH
        );

        t.srcX = curX;
        t.srcY = 0; // update posisi baru
        curX += srcW + padding;
      }
    }

    return outCanvas;
  }

  public getTiles(): SmartAtlasTile[] {
    return this.tiles;
  }

  public getTileSize(): number {
    return this.tileSize;
  }
}

// =========================================================================
// TILEMAP CLASS
// =========================================================================

export class TileMap {
  private tiles: number[][];
  private width: number;
  private height: number;
  private tileSize: number;
  private tileNames: string[];

  // FIX BUG 1: nama region PER-CELL untuk auto-tile variant.
  private regionOverride: (string | null)[][];

  constructor(w: number, h: number, tileSize: number) {
    this.width = w;
    this.height = h;
    this.tileSize = tileSize;
    this.tiles = Array(h).fill(null).map(() => Array(w).fill(0));
    this.tileNames = Array(64).fill('');
    this.regionOverride = Array(h).fill(null).map(() => Array(w).fill(null));
  }

  public registerTile(id: number, name: string): void {
    if (id >= 0 && id < this.tileNames.length) {
      this.tileNames[id] = name;
    }
  }

  // FIX BUG 1: setter per-cell untuk auto-tile variant
  public setTileRegion(x: number, y: number, regionName: string): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.regionOverride[y][x] = regionName;
    }
  }

  public getTileRegion(x: number, y: number): string | null {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.regionOverride[y][x];
    }
    return null;
  }

  public setTile(x: number, y: number, id: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.tiles[y][x] = id;
    }
  }

  public getTile(x: number, y: number): number {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.tiles[y][x];
    }
    return 0;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    camPos: { x: number; y: number },
    zoom: number,
    screenW: number,
    screenH: number,
    tileRenderCallback?: (regionName: string, px: number, py: number, zoom: number) => void
  ): void {
    // FIX BUG 3: cegah divide-by-zero / NaN
    if (this.tileSize <= 0 || zoom <= 0) return;

    const startX = Math.floor(camPos.x / (this.tileSize * zoom));
    const startY = Math.floor(camPos.y / (this.tileSize * zoom));
    const endX = startX + Math.floor(screenW / (this.tileSize * zoom)) + 2;
    const endY = startY + Math.floor(screenH / (this.tileSize * zoom)) + 2;

    const minY = Math.max(0, startY);
    const maxY = Math.min(this.height, endY);
    const minX = Math.max(0, startX);
    const maxX = Math.min(this.width, endX);

    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const tile = this.tiles[y][x];
        if (tile > 0 && this.tileNames[tile]) {
          const px = x * this.tileSize * zoom - camPos.x;
          const py = y * this.tileSize * zoom - camPos.y;

          // FIX BUG 1: pakai regionOverride per-cell kalau ada (auto-tile variant),
          // fallback ke tileNames[tile] seperti implementasi asli.
          const regionName = this.regionOverride[y][x] || this.tileNames[tile];
          if (tileRenderCallback) {
            tileRenderCallback(regionName, px, py, zoom);
          }
        }
      }
    }
  }

  public getWidth(): number { return this.width; }
  public getHeight(): number { return this.height; }
  public getTileSize(): number { return this.tileSize; }
  public getPixelWidth(): number { return this.width * this.tileSize; }
  public getPixelHeight(): number { return this.height * this.tileSize; }
}

// =========================================================================
// TILESET EDITOR V2.0
// =========================================================================

export class TileSetEditor {
  public static readonly TILE_VOID = 0;
  public static readonly TILE_GROUND = 1;
  public static readonly TILE_GRASS = 2;
  public static readonly TILE_WATER = 3;
  public static readonly TILE_STONE = 4;
  public static readonly TILE_DIRT = 5;
  public static readonly TILE_SAND = 6;
  public static readonly TILE_LAVA = 7;
  public static readonly TILE_ICE = 8;
  public static readonly TILE_MOSS = 9;
  public static readonly TILE_BRICK = 10;
  public static readonly TILE_WOOD = 11;
  public static readonly TILE_ROOF = 12;
  public static readonly TILE_METAL = 13;
  public static readonly TILE_COUNT = 14;

  private static readonly AUTO_TILE_VARIANTS = 16; // 4-bit auto-tile
  private static readonly TILE_NAMES: string[] = [
    'void', 'ground', 'grass', 'water', 'stone', 'dirt', 'sand',
    'lava', 'ice', 'moss', 'brick', 'wood', 'roof', 'metal'
  ];

  public readonly tileSize: number;
  public readonly tileColors: number[];
  public readonly tileAnimated: boolean[];
  public readonly tileFrames: number[];

  constructor(tileSize: number) {
    this.tileSize = Math.max(16, tileSize);
    this.tileColors = Array(TileSetEditor.TILE_COUNT).fill(0);
    this.tileAnimated = Array(TileSetEditor.TILE_COUNT).fill(false);
    this.tileFrames = Array(TileSetEditor.TILE_COUNT).fill(1);

    for (let t = 0; t < TileSetEditor.TILE_COUNT; t++) {
      this.tileColors[t] = this.getTileBaseColor(t);
      // FIX BUG 2: tileAnimated untuk water & lava
      if (t === TileSetEditor.TILE_WATER || t === TileSetEditor.TILE_LAVA) {
        this.tileAnimated[t] = true;
        this.tileFrames[t] = 4;
      }
    }
  }

  public getTileBaseColor(type: number): number {
    switch (type) {
      case TileSetEditor.TILE_VOID: return 0xFF0D0D15;
      case TileSetEditor.TILE_GROUND: return 0xFF3E2723;
      case TileSetEditor.TILE_GRASS: return 0xFF2E7D32;
      case TileSetEditor.TILE_WATER: return 0xFF1565C0;
      case TileSetEditor.TILE_STONE: return 0xFF616161;
      case TileSetEditor.TILE_DIRT: return 0xFF5D4037;
      case TileSetEditor.TILE_SAND: return 0xFFFFF59D;
      case TileSetEditor.TILE_LAVA: return 0xFFBF360C;
      case TileSetEditor.TILE_ICE: return 0xFFE0F7FA;
      case TileSetEditor.TILE_MOSS: return 0xFF33691E;
      case TileSetEditor.TILE_BRICK: return 0xFF8D6E63;
      case TileSetEditor.TILE_WOOD: return 0xFF5D4037;
      case TileSetEditor.TILE_ROOF: return 0xFFB71C1C;
      case TileSetEditor.TILE_METAL: return 0xFF78909C;
      default: return 0xFF000000;
    }
  }

  public getRegionName(type: number, variant: number): string {
    const clampedType = Math.max(0, Math.min(type, TileSetEditor.TILE_COUNT - 1));
    const clampedVariant = Math.max(0, Math.min(variant, TileSetEditor.AUTO_TILE_VARIANTS - 1));
    return `${TileSetEditor.TILE_NAMES[clampedType]}_${clampedVariant}`;
  }

  public calculateAutoTileVariant(data: number[][], x: number, y: number, type: number): number {
    let variant = 0;
    if (y > 0 && data[y - 1]?.[x] === type) variant |= 1;       // N
    if (x < (data[0]?.length || 0) - 1 && data[y]?.[x + 1] === type) variant |= 2; // E
    if (y < data.length - 1 && data[y + 1]?.[x] === type) variant |= 4; // S
    if (x > 0 && data[y]?.[x - 1] === type) variant |= 8;       // W
    return variant;
  }

  public applyToTileMap(tileMap: TileMap, data: number[][]): void {
    if (!tileMap || !data) return;
    for (let y = 0; y < data.length && y < tileMap.getHeight(); y++) {
      for (let x = 0; x < (data[y]?.length || 0) && x < tileMap.getWidth(); x++) {
        const type = Math.max(0, Math.min(data[y][x], TileSetEditor.TILE_COUNT - 1));
        const variant = this.calculateAutoTileVariant(data, x, y, type);
        const regionName = this.getRegionName(type, variant);
        tileMap.setTile(x, y, type);
        tileMap.registerTile(type, regionName);
        tileMap.setTileRegion(x, y, regionName); // FIX BUG 1: simpan variant PER-CELL
      }
    }
  }
}

// =========================================================================
// TILE SLICER V1.0
// =========================================================================

export class TileSlicer {
  public tileSize: number;
  public cols: number;
  public rows: number;
  public totalTiles: number;
  public tiles: RectBounds[] = [];

  constructor(sourceWidth: number, sourceHeight: number, tileSize: number) {
    this.tileSize = tileSize;
    this.cols = Math.floor(sourceWidth / tileSize);
    this.rows = Math.floor(sourceHeight / tileSize);
    this.totalTiles = this.cols * this.rows;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.tiles.push({
          left: x * tileSize,
          top: y * tileSize,
          right: x * tileSize + tileSize,
          bottom: y * tileSize + tileSize,
          width: tileSize,
          height: tileSize,
        });
      }
    }
  }

  public getTileId(x: number, y: number): number {
    return y * this.cols + x;
  }

  public getTileRect(tileId: number): RectBounds | null {
    if (tileId < 0 || tileId >= this.totalTiles) return null;
    return this.tiles[tileId];
  }
}
