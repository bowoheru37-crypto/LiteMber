import { TileType, TilemapComponent, SpriteClip } from '../types/engine';

// Helper: 16x16 Empty Canvas Grid
export function createEmptyGrid(size = 16): string[][] {
  return Array(size)
    .fill(null)
    .map(() => Array(size).fill('transparent'));
}

// -------------------------------------------------------------
// 1. AUTO TILE TEXTURE RESOLVER & PROCEDURAL GENERATORS
// -------------------------------------------------------------

/**
 * Returns a 16x16 pixel grid for a specific tile type & bitmask context based on theme
 */
export function generateTilePixelData(
  type: TileType,
  theme: TilemapComponent['theme'],
  neighbors: { top: boolean; bottom: boolean; left: boolean; right: boolean }
): string[][] {
  const grid = createEmptyGrid(16);
  if (type === 'empty') return grid;

  // Theme Palette Definitions
  let cPrimary = '#22c55e'; // Grass Green
  let cSecondary = '#78350f'; // Dirt Brown
  let cAccent = '#4ade80';
  let cDark = '#3f1d0b';

  if (theme === 'cyber_neon') {
    cPrimary = '#06b6d4';
    cSecondary = '#0f172a';
    cAccent = '#38bdf8';
    cDark = '#0284c7';
  } else if (theme === 'retro_brick') {
    cPrimary = '#b91c1c';
    cSecondary = '#991b1b';
    cAccent = '#f87171';
    cDark = '#450a0a';
  } else if (theme === 'dungeon_stone') {
    cPrimary = '#64748b';
    cSecondary = '#334155';
    cAccent = '#94a3b8';
    cDark = '#1e293b';
  } else if (theme === 'water_zone') {
    cPrimary = '#0284c7';
    cSecondary = '#0369a1';
    cAccent = '#38bdf8';
    cDark = '#0c4a6e';
  }

  // Draw base fill
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      grid[r][c] = cSecondary;
    }
  }

  // Auto-tile Top Edge (Grass / Highlights / Bevel)
  if (!neighbors.top) {
    for (let c = 0; c < 16; c++) {
      grid[0][c] = cAccent;
      grid[1][c] = cPrimary;
      grid[2][c] = cPrimary;
      if (c % 3 === 0) grid[3][c] = cPrimary;
    }
  }

  // Auto-tile Left & Right Borders
  if (!neighbors.left) {
    for (let r = 0; r < 16; r++) {
      grid[r][0] = cDark;
    }
  }
  if (!neighbors.right) {
    for (let r = 0; r < 16; r++) {
      grid[r][15] = cDark;
    }
  }

  // Special Tile Types
  if (type === 'spike') {
    const spikeGrid = createEmptyGrid(16);
    // Draw 2 Spikes
    for (let r = 0; r < 16; r++) {
      const w = Math.floor((16 - r) / 2);
      for (let c = 4 - w; c <= 4 + w; c++) {
        if (c >= 0 && c < 16) spikeGrid[r][c] = '#ef4444';
      }
      for (let c = 12 - w; c <= 12 + w; c++) {
        if (c >= 0 && c < 16) spikeGrid[r][c] = '#ef4444';
      }
    }
    return spikeGrid;
  }

  if (type === 'coin') {
    const coinGrid = createEmptyGrid(16);
    for (let r = 3; r <= 12; r++) {
      for (let c = 3; c <= 12; c++) {
        const dist = Math.hypot(r - 7.5, c - 7.5);
        if (dist <= 4.5) coinGrid[r][c] = '#facc15';
        else if (dist <= 5.5) coinGrid[r][c] = '#ca8a04';
      }
    }
    return coinGrid;
  }

  return grid;
}

// -------------------------------------------------------------
// 2. SPRITESHEET CLIPS PRESETS GENERATOR
// -------------------------------------------------------------

/**
 * Generates multi-frame animated clips for Idle, Run, Jump, Attack
 */
export function generatePresetSpriteClips(
  presetName: string,
  primaryColor: string,
  secondaryColor: string
): Record<string, SpriteClip> {
  const cMain = primaryColor || '#06b6d4';
  const cSec = secondaryColor || '#3b82f6';
  const cHighlight = '#ffffff';

  // --- IDLE CLIP (4 frames) ---
  const idleFrames: string[][][] = [0, 1, 1, 0].map((bounceOffset) => {
    const grid = createEmptyGrid(16);
    const rStart = 3 + bounceOffset;
    const rEnd = 11 + bounceOffset;
    // Head & Body
    for (let r = rStart; r <= rEnd; r++) {
      for (let c = 4; c <= 11; c++) {
        if (grid[r]) grid[r][c] = cMain;
      }
    }
    // Eyes
    if (grid[rStart + 2]) {
      grid[rStart + 2][6] = cHighlight;
      grid[rStart + 2][9] = cHighlight;
    }
    // Legs
    if (grid[rEnd + 1]) {
      grid[rEnd + 1][5] = cSec;
      grid[rEnd + 1][10] = cSec;
    }
    return grid;
  });

  // --- RUN CLIP (4 frames) ---
  const runFrames: string[][][] = [0, 1, 2, 3].map((stepIdx) => {
    const grid = createEmptyGrid(16);
    // Body tilted forward
    for (let r = 4; r <= 12; r++) {
      for (let c = 4; c <= 11; c++) {
        grid[r][c] = cMain;
      }
    }
    // Running legs cycle
    if (stepIdx === 0) {
      grid[13][3] = cSec; grid[14][2] = cSec; // Leg Left back
      grid[13][11] = cSec; grid[14][12] = cSec; // Leg Right front
    } else if (stepIdx === 1) {
      grid[13][5] = cSec; grid[14][5] = cSec;
      grid[13][10] = cSec; grid[14][10] = cSec;
    } else if (stepIdx === 2) {
      grid[13][11] = cSec; grid[14][12] = cSec;
      grid[13][3] = cSec; grid[14][2] = cSec;
    } else {
      grid[13][6] = cSec; grid[14][6] = cSec;
      grid[13][9] = cSec; grid[14][9] = cSec;
    }
    // Eyes
    grid[6][8] = cHighlight; grid[6][10] = cHighlight;
    return grid;
  });

  // --- JUMP CLIP (2 frames) ---
  const jumpFrames: string[][][] = [0, 1].map((f) => {
    const grid = createEmptyGrid(16);
    const rStart = f === 0 ? 2 : 1;
    for (let r = rStart; r <= rStart + 8; r++) {
      for (let c = 4; c <= 11; c++) {
        grid[r][c] = cMain;
      }
    }
    // Tucked legs
    grid[rStart + 9][4] = cSec;
    grid[rStart + 9][11] = cSec;
    // Eyes looking up
    grid[rStart + 1][6] = cHighlight;
    grid[rStart + 1][9] = cHighlight;
    return grid;
  });

  return {
    idle: { name: 'idle', frames: idleFrames, fps: 6, loop: true },
    run: { name: 'run', frames: runFrames, fps: 10, loop: true },
    jump: { name: 'jump', frames: jumpFrames, fps: 8, loop: false },
  };
}

/**
 * Helper: Generate Level Tilemap preset data grid
 */
export function generatePresetLevelTilemap(
  preset: 'simple_platformer' | 'dungeon_maze' | 'cyber_run',
  cols = 16,
  rows = 10
): TileType[][] {
  const grid: TileType[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill('empty'));

  if (preset === 'simple_platformer') {
    // Bottom ground
    for (let c = 0; c < cols; c++) {
      grid[rows - 2][c] = 'grass_top';
      grid[rows - 1][c] = 'dirt_center';
    }
    // Middle Floating Platforms
    grid[5][3] = 'grass_top';
    grid[5][4] = 'grass_top';
    grid[5][5] = 'grass_top';

    grid[4][10] = 'grass_top';
    grid[4][11] = 'grass_top';
    grid[4][12] = 'grass_top';

    // Coins on top
    grid[3][4] = 'coin';
    grid[2][11] = 'coin';
    grid[rows - 3][8] = 'spike';
  } else if (preset === 'cyber_run') {
    for (let c = 0; c < cols; c++) {
      grid[rows - 1][c] = 'grass_center';
    }
    grid[6][2] = 'grass_top'; grid[6][3] = 'grass_top';
    grid[4][7] = 'grass_top'; grid[4][8] = 'grass_top';
    grid[5][13] = 'grass_top'; grid[5][14] = 'grass_top';

    grid[rows - 2][5] = 'spike';
    grid[rows - 2][10] = 'spike';
  }

  return grid;
}
