/**
 * IsometricEngine.ts
 * High-Performance 2.5D Isometric World Engine, Procedural Terrain, & Depth Sort Manager
 * Optimized for 60 FPS mobile rendering on Android devices (e.g. itel A70).
 */

import {
  IsometricMapConfig,
  IsometricTile,
  ProceduralIsoTerrainParams,
  TileType,
} from '../types/engine';

export class IsometricEngine {
  private static instance: IsometricEngine;

  public static getInstance(): IsometricEngine {
    if (!IsometricEngine.instance) {
      IsometricEngine.instance = new IsometricEngine();
    }
    return IsometricEngine.instance;
  }

  // Pre-calculated palette shades for isometric block sides
  private paletteMap: Record<
    string,
    { top: string; left: string; right: string; stroke: string }
  > = {
    grass: { top: '#22c55e', left: '#15803d', right: '#166534', stroke: '#14532d' },
    dirt: { top: '#b45309', left: '#78350f', right: '#451a03', stroke: '#290f02' },
    stone: { top: '#94a3b8', left: '#64748b', right: '#475569', stroke: '#334155' },
    sand: { top: '#fde047', left: '#eab308', right: '#ca8a04', stroke: '#a16207' },
    water: { top: '#38bdf8', left: '#0284c7', right: '#0369a1', stroke: '#075985' },
    snow: { top: '#f8fafc', left: '#e2e8f0', right: '#cbd5e1', stroke: '#94a3b8' },
    lava: { top: '#f97316', left: '#ea580c', right: '#c2410c', stroke: '#9a3412' },
    cyber: { top: '#06b6d4', left: '#0891b2', right: '#0e7490', stroke: '#155e75' },
    brick: { top: '#ef4444', left: '#dc2626', right: '#b91c1c', stroke: '#991b1b' },
  };

  /**
   * Converts 2D Grid Column, Row, & Height into Screen (X, Y) Coordinates
   */
  public gridToIsoScreen(
    col: number,
    row: number,
    height: number,
    originX: number,
    originY: number,
    tileWidth: number = 64,
    tileHeight: number = 32,
    blockHeight: number = 16
  ): { x: number; y: number } {
    // Standard 2:1 ratio Isometric Projection
    const x = originX + (col - row) * (tileWidth / 2);
    const y = originY + (col + row) * (tileHeight / 2) - height * blockHeight;
    return { x, y };
  }

  /**
   * Raycast / Screen Pick: Converts Screen (X, Y) into Isometric Grid (Col, Row)
   */
  public isoScreenToGrid(
    screenX: number,
    screenY: number,
    originX: number,
    originY: number,
    tileWidth: number = 64,
    tileHeight: number = 32
  ): { col: number; row: number } {
    const relX = screenX - originX;
    const relY = screenY - originY;

    const col = Math.floor((relY / (tileHeight / 2) + relX / (tileWidth / 2)) / 2);
    const row = Math.floor((relY / (tileHeight / 2) - relX / (tileWidth / 2)) / 2);

    return { col, row };
  }

  /**
   * Painter's Algorithm Depth Comparator for Isometric Entities & Blocks
   */
  public sortIsometricDepth(tiles: IsometricTile[]): IsometricTile[] {
    return [...tiles].sort((a, b) => {
      const depthA = a.col + a.row + a.height * 0.1;
      const depthB = b.col + b.row + b.height * 0.1;
      return depthA - depthB;
    });
  }

  /**
   * Render a Single 2.5D Isometric Block (Top, Left, Right Faces with Ambient Occlusion)
   */
  public renderIsoBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tileWidth: number = 64,
    tileHeight: number = 32,
    blockHeight: number = 16,
    materialType: string = 'grass',
    ambientOcclusion = true
  ): void {
    const palette = this.paletteMap[materialType] || this.paletteMap['grass'];
    const hw = tileWidth / 2;
    const hh = tileHeight / 2;

    ctx.save();

    // 1. TOP FACE (Diamond)
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fillStyle = palette.top;
    ctx.fill();
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 2. LEFT FACE
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x, y + hh + blockHeight);
    ctx.lineTo(x - hw, y + blockHeight);
    ctx.closePath();
    ctx.fillStyle = palette.left;
    ctx.fill();
    ctx.stroke();

    // 3. RIGHT FACE
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + hw, y + blockHeight);
    ctx.lineTo(x, y + hh + blockHeight);
    ctx.closePath();
    ctx.fillStyle = palette.right;
    ctx.fill();
    ctx.stroke();

    // 4. Ambient Occlusion / Shadow Highlight Corner
    if (ambientOcclusion) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.beginPath();
      ctx.moveTo(x, y + hh);
      ctx.lineTo(x + hw, y);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Render Complete Isometric Heightmap World Map
   */
  public renderIsometricMap(
    ctx: CanvasRenderingContext2D,
    config: IsometricMapConfig,
    originX: number,
    originY: number
  ): number {
    if (!config || !config.heightmap) return 0;

    let drawCount = 0;
    const rows = config.rows || config.heightmap.length;
    const cols = config.cols || config.heightmap[0]?.length || 0;
    const tileW = config.tileWidth || 64;
    const tileH = config.tileHeight || 32;
    const blockH = config.blockHeight || 16;

    // Collect all tiles into depth array
    const tilesToDraw: IsometricTile[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const heightLevel = config.heightmap[r]?.[c] || 0;
        const mat = config.tileTypes?.[r]?.[c] || 'grass';

        // Draw stacked blocks up to height level
        for (let h = 0; h <= heightLevel; h++) {
          const isTop = h === heightLevel;
          const material = isTop ? mat : 'dirt';

          tilesToDraw.push({
            col: c,
            row: r,
            height: h,
            type: material,
          });
        }
      }
    }

    // Sort back-to-front (Painter's algorithm)
    const sortedTiles = this.sortIsometricDepth(tilesToDraw);

    for (const tile of sortedTiles) {
      const { x, y } = this.gridToIsoScreen(
        tile.col,
        tile.row,
        tile.height,
        originX,
        originY,
        tileW,
        tileH,
        blockH
      );

      this.renderIsoBlock(
        ctx,
        x,
        y,
        tileW,
        tileH,
        blockH,
        tile.type || 'grass',
        config.ambientOcclusion ?? true
      );
      drawCount++;
    }

    return drawCount;
  }

  /**
   * Pseudo-Random Simplex / Perlin Noise Generator for Terrain
   */
  private pseudoNoise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  /**
   * Procedural Isometric Terrain World Generator
   */
  public generateProceduralTerrain(
    rows: number,
    cols: number,
    params: ProceduralIsoTerrainParams
  ): IsometricMapConfig {
    const heightmap: number[][] = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(0));
    const tileTypes: string[][] = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill('grass'));

    const { seed, roughness, waterLevel, mountainHeight, preset } = params;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let elevation = 0;
        let type = 'grass';

        if (preset === 'hills') {
          const noise1 = this.pseudoNoise(r * 0.15, c * 0.15, seed);
          const noise2 = this.pseudoNoise(r * 0.3, c * 0.3, seed + 1);
          elevation = Math.floor((noise1 * 0.7 + noise2 * 0.3) * mountainHeight * roughness);

          if (elevation <= waterLevel) {
            type = 'water';
            elevation = waterLevel;
          } else if (elevation === waterLevel + 1) {
            type = 'sand';
          } else if (elevation > mountainHeight * 0.7) {
            type = 'snow';
          } else if (elevation > mountainHeight * 0.4) {
            type = 'stone';
          } else {
            type = 'grass';
          }
        } else if (preset === 'island') {
          const centerR = rows / 2;
          const centerC = cols / 2;
          const distToCenter = Math.sqrt(Math.pow(r - centerR, 2) + Math.pow(c - centerC, 2));
          const maxDist = Math.min(rows, cols) / 2;

          const noise = this.pseudoNoise(r * 0.2, c * 0.2, seed);
          const islandFactor = Math.max(0, 1 - distToCenter / maxDist);

          elevation = Math.floor(noise * mountainHeight * islandFactor * roughness);

          if (distToCenter >= maxDist - 1 || elevation <= waterLevel) {
            type = 'water';
            elevation = 0;
          } else if (elevation === waterLevel + 1) {
            type = 'sand';
          } else {
            type = 'grass';
          }
        } else if (preset === 'pyramid') {
          const distFromBorder = Math.min(r, rows - 1 - r, c, cols - 1 - c);
          elevation = Math.min(distFromBorder, mountainHeight);
          type = elevation > 2 ? 'sand' : 'stone';
        } else if (preset === 'canyon') {
          const centerLine = Math.floor(cols / 2);
          const distToCanyon = Math.abs(c - centerLine);

          if (distToCanyon <= 2) {
            elevation = 0;
            type = 'water';
          } else {
            elevation = Math.floor(distToCanyon * 0.8 * roughness);
            type = 'dirt';
          }
        } else if (preset === 'dungeon') {
          const noise = this.pseudoNoise(r * 0.4, c * 0.4, seed);
          elevation = noise > 0.6 ? 2 : 0;
          type = elevation > 0 ? 'brick' : 'stone';
        }

        heightmap[r][c] = Math.max(0, elevation);
        tileTypes[r][c] = type;
      }
    }

    return {
      tileWidth: 64,
      tileHeight: 32,
      blockHeight: 16,
      rows,
      cols,
      heightmap,
      tileTypes,
      projectionMode: 'isometric_2_1',
      ambientOcclusion: true,
      shadows: true,
    };
  }
}

export const isometricEngine = IsometricEngine.getInstance();
