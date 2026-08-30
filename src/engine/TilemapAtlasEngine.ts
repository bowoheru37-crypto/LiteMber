/**
 * TilemapAtlasEngine.ts
 * Advanced 2D Tilemap, Tileset, Spritesheet, & Texture Atlas Engine
 * Optimized for high performance and low GC overhead on Android devices (itel A70).
 */

import {
  TileType,
  TilemapComponent,
  TilemapLayer,
  TilesetDefinition,
  TilesetTile,
  SpriteAtlas,
  AtlasFrame,
  SpritesheetAtlas,
  SpriteClip,
  TileCollisionType,
} from '../types/engine';
import { generateTilePixelData, createEmptyGrid } from './AutoTileEngine';
import { assetManager } from './AssetManager';

export class TilemapAtlasEngine {
  private static instance: TilemapAtlasEngine;

  public static getInstance(): TilemapAtlasEngine {
    if (!TilemapAtlasEngine.instance) {
      TilemapAtlasEngine.instance = new TilemapAtlasEngine();
    }
    return TilemapAtlasEngine.instance;
  }

  // Cache of offscreen rendered tile canvases for ultra-fast blitting
  private tileCanvasCache: Map<string, HTMLCanvasElement> = new Map();

  /**
   * Helper: Get or render a 16x16 tile pixel data into an offscreen canvas for fast blitting
   */
  public getCachedTileCanvas(tileGrid: string[][], key: string, size = 16): HTMLCanvasElement {
    if (this.tileCanvasCache.has(key)) {
      return this.tileCanvasCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rows = tileGrid.length;
      const cols = tileGrid[0]?.length || rows;
      const cellW = size / cols;
      const cellH = size / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const color = tileGrid[r][c];
          if (color && color !== 'transparent') {
            ctx.fillStyle = color;
            ctx.fillRect(c * cellW, r * cellH, cellW + 0.2, cellH + 0.2);
          }
        }
      }
    }

    this.tileCanvasCache.set(key, canvas);
    assetManager.registerCanvasBuffer(`tile_cvs_${key}`, size, size, canvas);
    return canvas;
  }

  public clearCanvasCache(): void {
    this.tileCanvasCache.forEach((cvs, key) => {
      assetManager.unload(`tile_cvs_${key}`);
    });
    this.tileCanvasCache.clear();
  }

  /**
   * Render Multi-layer Tilemap to target Canvas Context
   */
  public renderTilemap(
    ctx: CanvasRenderingContext2D,
    tilemap: TilemapComponent,
    width: number,
    height: number,
    timeMs: number = performance.now()
  ): number {
    if (!tilemap) return 0;

    let drawCalls = 0;
    const rows = tilemap.rows || 10;
    const cols = tilemap.cols || 16;
    const cellW = width / cols;
    const cellH = height / rows;
    const startX = -width / 2;
    const startY = -height / 2;

    // Check if tilemap has multi-layers
    const layersToRender: TilemapLayer[] = tilemap.layers && tilemap.layers.length > 0
      ? [...tilemap.layers].sort((a, b) => a.zIndex - b.zIndex)
      : [
          {
            id: 'default_main',
            name: 'Main Layer',
            visible: true,
            locked: false,
            opacity: 1,
            zIndex: 0,
            data: tilemap.data || Array(rows).fill(null).map(() => Array(cols).fill('empty')),
          },
        ];

    const customTileset = tilemap.customTileset;

    // Render each visible layer
    for (const layer of layersToRender) {
      if (!layer.visible || layer.opacity <= 0) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tileVal = layer.data[r]?.[c];
          if (!tileVal || tileVal === 'empty') continue;

          // Check if custom tileset tile exists
          let tileGrid: string[][] | null = null;
          let animatedFrames: string[][][] | undefined = undefined;

          if (customTileset) {
            const customTile = customTileset.tiles.find((t) => t.id === tileVal || t.type === tileVal);
            if (customTile) {
              tileGrid = customTile.pixelData;
              animatedFrames = customTile.animatedFrames;
            }
          }

          // Handle Animated Tiles (e.g. water, lava, glowing portals)
          if (animatedFrames && animatedFrames.length > 0) {
            const fps = 6;
            const frameIdx = Math.floor((timeMs / 1000) * fps) % animatedFrames.length;
            tileGrid = animatedFrames[frameIdx];
          }

          // Fallback to AutoTileEngine procedural generator
          if (!tileGrid) {
            const neighbors = {
              top: r > 0 && layer.data[r - 1]?.[c] !== 'empty',
              bottom: r < rows - 1 && layer.data[r + 1]?.[c] !== 'empty',
              left: c > 0 && layer.data[r]?.[c - 1] !== 'empty',
              right: c < cols - 1 && layer.data[r]?.[c + 1] !== 'empty',
            };
            tileGrid = generateTilePixelData(tileVal as TileType, tilemap.theme || 'grass_dirt', neighbors);
          }

          if (tileGrid) {
            const cacheKey = `${tileVal}_${layer.id}_${r}_${c}_${tilemap.theme}`;
            const tileCanvas = this.getCachedTileCanvas(tileGrid, cacheKey, 16);
            ctx.drawImage(tileCanvas, startX + c * cellW, startY + r * cellH, cellW + 0.3, cellH + 0.3);
            drawCalls++;
          }
        }
      }

      ctx.restore();
    }

    return drawCalls;
  }

  /**
   * Tile Collision Detection: Check collision type at world coordinate
   */
  public getTileCollisionAt(
    tilemap: TilemapComponent,
    worldX: number,
    worldY: number,
    entityWidth: number,
    entityHeight: number
  ): TileCollisionType {
    if (!tilemap) return 'empty';

    const rows = tilemap.rows || 10;
    const cols = tilemap.cols || 16;
    const cellW = entityWidth / cols;
    const cellH = entityHeight / rows;

    const col = Math.floor((worldX + entityWidth / 2) / cellW);
    const row = Math.floor((worldY + entityHeight / 2) / cellH);

    if (row < 0 || row >= rows || col < 0 || col >= cols) return 'empty';

    const layers = tilemap.layers || [
      { id: 'default', name: 'Main', visible: true, locked: false, opacity: 1, zIndex: 0, data: tilemap.data },
    ];

    for (const layer of layers) {
      if (!layer.visible) continue;
      const tileVal = layer.data[row]?.[col];
      if (!tileVal || tileVal === 'empty') continue;

      if (tilemap.customTileset) {
        const customTile = tilemap.customTileset.tiles.find((t) => t.id === tileVal || t.type === tileVal);
        if (customTile) return customTile.collisionType;
      }

      if (tileVal === 'spike') return 'hazard';
      if (tileVal === 'water' || tileVal === 'lava') return 'water';
      if (tileVal === 'grass_top' || tileVal === 'grass_center' || tileVal === 'dirt_center' || tileVal === 'stone_wall' || tileVal === 'brick') {
        return 'solid';
      }
    }

    return 'empty';
  }

  /**
   * Tool Method: Flood Fill (Bucket) for Tilemap Layer
   */
  public floodFillLayer(
    layerData: (string | TileType)[][],
    startRow: number,
    startCol: number,
    fillTile: TileType | string
  ): (string | TileType)[][] {
    const rows = layerData.length;
    const cols = layerData[0]?.length || 0;
    if (startRow < 0 || startRow >= rows || startCol < 0 || startCol >= cols) return layerData;

    const targetTile = layerData[startRow][startCol];
    if (targetTile === fillTile) return layerData;

    const newData = layerData.map((row) => [...row]);
    const queue: [number, number][] = [[startRow, startCol]];

    while (queue.length > 0) {
      const [r, c] = queue.pop()!;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      if (newData[r][c] !== targetTile) continue;

      newData[r][c] = fillTile;

      queue.push([r + 1, c]);
      queue.push([r - 1, c]);
      queue.push([r, c + 1]);
      queue.push([r, c - 1]);
    }

    return newData;
  }

  /**
   * Tool Method: Rectangle Fill for Tilemap Layer
   */
  public drawRectLayer(
    layerData: (string | TileType)[][],
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    fillTile: TileType | string
  ): (string | TileType)[][] {
    const newData = layerData.map((row) => [...row]);
    const minR = Math.max(0, Math.min(r1, r2));
    const maxR = Math.min(layerData.length - 1, Math.max(r1, r2));
    const minC = Math.max(0, Math.min(c1, c2));
    const maxC = Math.min((layerData[0]?.length || 1) - 1, Math.max(c1, c2));

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        newData[r][c] = fillTile;
      }
    }

    return newData;
  }

  /**
   * Texture Atlas Packer: Bin-packs multiple frames into a single composite pixel grid
   */
  public packTextureAtlas(
    name: string,
    frames: { name: string; pixelData: string[][] }[]
  ): SpriteAtlas {
    if (frames.length === 0) {
      return { id: `atlas_${Date.now()}`, name, width: 32, height: 32, frames: [] };
    }

    const frameWidth = frames[0].pixelData[0]?.length || 16;
    const frameHeight = frames[0].pixelData.length || 16;
    const cols = Math.ceil(Math.sqrt(frames.length));
    const rows = Math.ceil(frames.length / cols);

    const atlasWidth = cols * frameWidth;
    const atlasHeight = rows * frameHeight;

    const atlasGrid: string[][] = Array(atlasHeight)
      .fill(null)
      .map(() => Array(atlasWidth).fill('transparent'));

    const atlasFrames: AtlasFrame[] = [];

    frames.forEach((frame, idx) => {
      const colIdx = idx % cols;
      const rowIdx = Math.floor(idx / cols);
      const startX = colIdx * frameWidth;
      const startY = rowIdx * frameHeight;

      for (let r = 0; r < frameHeight; r++) {
        for (let c = 0; c < frameWidth; c++) {
          const px = frame.pixelData[r]?.[c];
          if (px && px !== 'transparent') {
            atlasGrid[startY + r][startX + c] = px;
          }
        }
      }

      atlasFrames.push({
        id: `frame_${idx}_${Date.now()}`,
        name: frame.name,
        x: startX,
        y: startY,
        width: frameWidth,
        height: frameHeight,
        pixelData: frame.pixelData,
        pivotX: frameWidth / 2,
        pivotY: frameHeight / 2,
      });
    });

    return {
      id: `atlas_${Date.now()}`,
      name,
      width: atlasWidth,
      height: atlasHeight,
      frames: atlasFrames,
      pixelAtlasGrid: atlasGrid,
    };
  }

  /**
   * Spritesheet Slicer: Slices a pixel grid into grid clips
   */
  public createSpritesheetFromGrid(
    name: string,
    pixelGrid: string[][],
    frameWidth = 16,
    frameHeight = 16
  ): SpritesheetAtlas {
    const totalRows = pixelGrid.length;
    const totalCols = pixelGrid[0]?.length || 0;
    const columns = Math.floor(totalCols / frameWidth);
    const rows = Math.floor(totalRows / frameHeight);

    const extractedFrames: string[][][] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const frame: string[][] = createEmptyGrid(frameHeight);
        for (let fr = 0; fr < frameHeight; fr++) {
          for (let fc = 0; fc < frameWidth; fc++) {
            frame[fr][fc] = pixelGrid[r * frameHeight + fr]?.[c * frameWidth + fc] || 'transparent';
          }
        }
        extractedFrames.push(frame);
      }
    }

    const defaultClip: SpriteClip = {
      name: 'idle',
      frames: extractedFrames.slice(0, Math.min(4, extractedFrames.length)),
      fps: 6,
      loop: true,
    };

    return {
      id: `sheet_${Date.now()}`,
      name,
      frameWidth,
      frameHeight,
      columns,
      rows,
      clips: { idle: defaultClip },
      pixelAtlasGrid: pixelGrid,
    };
  }
}

export const tilemapAtlasEngine = TilemapAtlasEngine.getInstance();
