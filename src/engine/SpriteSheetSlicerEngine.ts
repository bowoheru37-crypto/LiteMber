/**
 * SpriteSheetSlicerEngine.ts
 * Automated Sprite Sheet Slicer & Memory Footprint Optimizer Engine
 * Designed for game assets on low-end mobile & web runtimes.
 *
 * Features:
 * - Automated Island Detection (2D Pixel Alpha Connected Components)
 * - Grid-Based Slicing (Rows/Cols or Frame Width/Height with Padding & Margins)
 * - Automatic Alpha Trimming & Crop
 * - Real-time Memory Footprint & VRAM Savings Metrics
 * - Automatic Export to Game Project (ImageAsset, SpritesheetAtlas, Animated Sprite Entity)
 */

import { GameProject, ImageAsset, SpritesheetAtlas, Entity } from '../types/engine';
import { SpriteAtlasCompressorEngine } from './SpriteAtlasCompressorEngine';

export interface SlicedFrameBounds {
  id: string;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  trimmedLeft: number;
  trimmedTop: number;
  originalW: number;
  originalH: number;
  selected: boolean;
  dataUrl?: string;
  byteSizeEstimate: number;
}

export interface SlicerOptions {
  mode: 'auto' | 'grid';
  // Grid parameters
  rows?: number;
  cols?: number;
  frameWidth?: number;
  frameHeight?: number;
  offsetX?: number;
  offsetY?: number;
  paddingX?: number;
  paddingY?: number;
  // Auto-detect parameters
  alphaThreshold?: number; // 0..255 (default 10)
  minFrameSize?: number; // Minimum width/height in px to filter noise (default 8)
  mergeDistance?: number; // Distance in px to merge adjacent bounding islands (default 2)
  // Shared options
  trimAlpha?: boolean; // Trim transparent padding around each sliced frame
  skipEmptyFrames?: boolean; // Filter out 100% transparent frames
}

export interface SliceResult {
  sourceImageWidth: number;
  sourceImageHeight: number;
  sourceVramBytes: number;
  sourceEstimatedFileSizeKb: number;
  frames: SlicedFrameBounds[];
  totalSlicedVramBytes: number;
  memorySavedBytes: number;
  memorySavedPercent: number;
  memorySavedMbText: string;
}

export class SpriteSheetSlicerEngine {
  /**
   * Helper to load an image source (File, DataURL, or HTMLImageElement)
   */
  public static async loadImage(source: File | string | HTMLImageElement): Promise<HTMLImageElement> {
    if (source instanceof HTMLImageElement) return source;
    return SpriteAtlasCompressorEngine.loadImage(source);
  }

  /**
   * Main entry point to slice an image with specified mode and options
   */
  public static async sliceSpriteSheet(
    source: File | string | HTMLImageElement,
    options: SlicerOptions
  ): Promise<SliceResult> {
    const img = await this.loadImage(source);
    const width = img.width;
    const height = img.height;

    const sourceVramBytes = width * height * 4;
    const sourceEstimatedFileSizeKb = Math.round(sourceVramBytes / 1024);

    // Render source image to canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Gagal mengalokasikan 2D Context untuk Slicer');
    }
    ctx.drawImage(img, 0, 0);

    let rawBoxes: { x: number; y: number; w: number; h: number }[] = [];

    if (options.mode === 'auto') {
      rawBoxes = this.detectIslands(ctx, width, height, options);
    } else {
      rawBoxes = this.calculateGridBoxes(width, height, options);
    }

    // Process & refine each detected frame
    const processedFrames: SlicedFrameBounds[] = [];
    const trimAlpha = options.trimAlpha !== false;
    const skipEmpty = options.skipEmptyFrames !== false;

    let frameIdx = 0;
    for (const box of rawBoxes) {
      if (box.w <= 0 || box.h <= 0) continue;

      // Extract frame image data from main canvas
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = box.w;
      frameCanvas.height = box.h;
      const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
      if (!frameCtx) continue;

      frameCtx.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);

      let finalX = box.x;
      let finalY = box.y;
      let finalW = box.w;
      let finalH = box.h;
      let trimmedLeft = 0;
      let trimmedTop = 0;

      if (trimAlpha) {
        const trim = SpriteAtlasCompressorEngine.calculateAlphaTrimBounds(frameCtx, box.w, box.h);
        if (trim.width <= 0 || trim.height <= 0) {
          if (skipEmpty) continue; // Skip empty frame
        } else {
          finalX = box.x + trim.left;
          finalY = box.y + trim.top;
          finalW = trim.width;
          finalH = trim.height;
          trimmedLeft = trim.left;
          trimmedTop = trim.top;
        }
      } else {
        // Check if empty
        if (skipEmpty && this.isFrameEmpty(frameCtx, box.w, box.h)) {
          continue;
        }
      }

      // Generate frame data URL
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = Math.max(1, finalW);
      croppedCanvas.height = Math.max(1, finalH);
      const croppedCtx = croppedCanvas.getContext('2d');
      if (croppedCtx) {
        croppedCtx.drawImage(
          canvas,
          finalX,
          finalY,
          finalW,
          finalH,
          0,
          0,
          finalW,
          finalH
        );
      }

      const dataUrl = croppedCanvas.toDataURL('image/webp', 0.85);
      const vramBytes = finalW * finalH * 4;

      processedFrames.push({
        id: `frame_${frameIdx + 1}_${Date.now()}`,
        index: frameIdx + 1,
        x: finalX,
        y: finalY,
        w: finalW,
        h: finalH,
        trimmedLeft,
        trimmedTop,
        originalW: box.w,
        originalH: box.h,
        selected: true,
        dataUrl,
        byteSizeEstimate: vramBytes,
      });

      frameIdx++;
    }

    // Calculate memory footprint statistics
    const totalSlicedVramBytes = processedFrames.reduce((acc, f) => acc + (f.selected ? f.byteSizeEstimate : 0), 0);
    const memorySavedBytes = Math.max(0, sourceVramBytes - totalSlicedVramBytes);
    const memorySavedPercent = sourceVramBytes > 0
      ? Math.min(99, Math.round((memorySavedBytes / sourceVramBytes) * 100))
      : 0;
    const memorySavedMbText = (memorySavedBytes / (1024 * 1024)).toFixed(2);

    return {
      sourceImageWidth: width,
      sourceImageHeight: height,
      sourceVramBytes,
      sourceEstimatedFileSizeKb,
      frames: processedFrames,
      totalSlicedVramBytes,
      memorySavedBytes,
      memorySavedPercent,
      memorySavedMbText,
    };
  }

  /**
   * Island / Connected Component detection using 2D alpha pixel analysis
   */
  private static detectIslands(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    options: SlicerOptions
  ): { x: number; y: number; w: number; h: number }[] {
    const alphaThresh = options.alphaThreshold !== undefined ? options.alphaThreshold : 10;
    const minSize = options.minFrameSize || 8;
    const mergeDist = options.mergeDistance !== undefined ? options.mergeDistance : 2;

    const imgData = ctx.getImageData(0, 0, width, height).data;
    const visited = new Uint8Array(width * height);

    const rawIslands: { minX: number; minY: number; maxX: number; maxY: number }[] = [];

    // Queue for BFS traversal
    const queue = new Int32Array(width * height);

    // Downsampled step for ultra-fast scan on large images
    const step = width * height > 1024 * 1024 ? 2 : 1;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = y * width + x;
        if (visited[idx]) continue;

        const alpha = imgData[idx * 4 + 3];
        if (alpha > alphaThresh) {
          // Found new island seed! Start BFS
          let minX = x;
          let minY = y;
          let maxX = x;
          let maxY = y;

          let qHead = 0;
          let qTail = 0;

          queue[qTail++] = idx;
          visited[idx] = 1;

          while (qHead < qTail) {
            const currIdx = queue[qHead++];
            const cx = currIdx % width;
            const cy = Math.floor(currIdx / width);

            if (cx < minX) minX = cx;
            if (cy < minY) minY = cy;
            if (cx > maxX) maxX = cx;
            if (cy > maxY) maxY = cy;

            // Check 4-connected neighbors
            const neighbors = [
              currIdx - 1, // Left
              currIdx + 1, // Right
              currIdx - width, // Up
              currIdx + width, // Down
            ];

            for (let i = 0; i < 4; i++) {
              const nIdx = neighbors[i];
              if (nIdx >= 0 && nIdx < width * height && !visited[nIdx]) {
                const nx = nIdx % width;
                const ny = Math.floor(nIdx / width);

                // Ensure neighbor is valid adjacent pixel
                if (Math.abs(nx - cx) <= 1 && Math.abs(ny - cy) <= 1) {
                  const nAlpha = imgData[nIdx * 4 + 3];
                  if (nAlpha > alphaThresh) {
                    visited[nIdx] = 1;
                    queue[qTail++] = nIdx;
                  }
                }
              }
            }
          }

          const w = maxX - minX + 1;
          const h = maxY - minY + 1;

          if (w >= minSize && h >= minSize) {
            rawIslands.push({ minX, minY, maxX, maxY });
          }
        }
      }
    }

    // Merge close or overlapping islands
    const merged = this.mergeAdjacentIslands(rawIslands, mergeDist);

    return merged.map((i) => ({
      x: i.minX,
      y: i.minY,
      w: i.maxX - i.minX + 1,
      h: i.maxY - i.minY + 1,
    }));
  }

  /**
   * Merges adjacent or overlapping bounding boxes within distance threshold
   */
  private static mergeAdjacentIslands(
    islands: { minX: number; minY: number; maxX: number; maxY: number }[],
    dist: number
  ): { minX: number; minY: number; maxX: number; maxY: number }[] {
    if (islands.length <= 1) return islands;

    let changed = true;
    let list = [...islands];

    while (changed) {
      changed = false;
      const nextList: typeof list = [];
      const mergedIndices = new Set<number>();

      for (let i = 0; i < list.length; i++) {
        if (mergedIndices.has(i)) continue;

        let cur = { ...list[i] };

        for (let j = i + 1; j < list.length; j++) {
          if (mergedIndices.has(j)) continue;

          const other = list[j];

          // Check bounding box intersection with expanded threshold
          const overlapsX = !(cur.maxX + dist < other.minX || cur.minX - dist > other.maxX);
          const overlapsY = !(cur.maxY + dist < other.minY || cur.minY - dist > other.maxY);

          if (overlapsX && overlapsY) {
            cur.minX = Math.min(cur.minX, other.minX);
            cur.minY = Math.min(cur.minY, other.minY);
            cur.maxX = Math.max(cur.maxX, other.maxX);
            cur.maxY = Math.max(cur.maxY, other.maxY);

            mergedIndices.add(j);
            changed = true;
          }
        }

        nextList.push(cur);
      }

      list = nextList;
    }

    return list;
  }

  /**
   * Grid-based bounding box generation
   */
  private static calculateGridBoxes(
    width: number,
    height: number,
    options: SlicerOptions
  ): { x: number; y: number; w: number; h: number }[] {
    const boxes: { x: number; y: number; w: number; h: number }[] = [];

    const offsetX = options.offsetX || 0;
    const offsetY = options.offsetY || 0;
    const paddingX = options.paddingX || 0;
    const paddingY = options.paddingY || 0;

    let cols = options.cols || 1;
    let rows = options.rows || 1;

    let frameW = options.frameWidth || Math.floor((width - offsetX) / cols);
    let frameH = options.frameHeight || Math.floor((height - offsetY) / rows);

    if (options.frameWidth && !options.cols) {
      cols = Math.floor((width - offsetX) / (options.frameWidth + paddingX));
    }
    if (options.frameHeight && !options.rows) {
      rows = Math.floor((height - offsetY) / (options.frameHeight + paddingY));
    }

    cols = Math.max(1, cols);
    rows = Math.max(1, rows);
    frameW = Math.max(1, frameW);
    frameH = Math.max(1, frameH);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * (frameW + paddingX);
        const y = offsetY + r * (frameH + paddingY);

        if (x + frameW <= width + frameW / 2 && y + frameH <= height + frameH / 2) {
          boxes.push({
            x: Math.min(width - 1, x),
            y: Math.min(height - 1, y),
            w: Math.min(width - x, frameW),
            h: Math.min(height - y, frameH),
          });
        }
      }
    }

    return boxes;
  }

  /**
   * Checks if a frame canvas is 100% transparent
   */
  private static isFrameEmpty(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
    try {
      const data = ctx.getImageData(0, 0, w, h).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 10) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Utility to commit sliced frames into GameProject as individual ImageAssets or Spritesheet Atlas
   */
  public static commitSlicedAssetsToProject(
    project: GameProject,
    frames: SlicedFrameBounds[],
    assetNamePrefix: string = 'frame',
    options: {
      saveAsIndividualImages?: boolean;
      saveAsSpritesheetAtlas?: boolean;
      createAnimatedEntity?: boolean;
      removeOriginalAssetId?: string;
    } = {}
  ): { updatedProject: GameProject; createdImageIds: string[]; createdAtlasId?: string; createdEntityId?: string } {
    const updatedProject: GameProject = JSON.parse(JSON.stringify(project));
    if (!updatedProject.assets) {
      updatedProject.assets = { audio: [] };
    }
    if (!updatedProject.assets.images) {
      updatedProject.assets.images = [];
    }
    if (!updatedProject.assets.atlases) {
      updatedProject.assets.atlases = [];
    }

    const createdImageIds: string[] = [];
    const selectedFrames = frames.filter((f) => f.selected);

    if (selectedFrames.length === 0) {
      return { updatedProject, createdImageIds };
    }

    // 1. Save as Individual Image Assets
    if (options.saveAsIndividualImages !== false) {
      selectedFrames.forEach((frame, idx) => {
        const imgId = `img_sliced_${Date.now()}_${idx + 1}`;
        const name = `${assetNamePrefix}_${idx + 1}`;
        const imgAsset: ImageAsset = {
          id: imgId,
          name,
          type: 'sprite',
          format: 'data_url',
          url: frame.dataUrl,
          fileSizeKb: Math.round(frame.byteSizeEstimate / 1024),
          isOptimized: true,
        };

        updatedProject.assets!.images!.push(imgAsset);
        createdImageIds.push(imgId);
      });
    }

    // 2. Save as Spritesheet Atlas
    let createdAtlasId: string | undefined = undefined;
    if (options.saveAsSpritesheetAtlas) {
      const atlasId = `atlas_sliced_${Date.now()}`;
      createdAtlasId = atlasId;

      const atlasMeta = {
        id: atlasId,
        name: `Atlas ${assetNamePrefix}`,
        format: 'webp',
        width: 1024,
        height: 1024,
        frames: selectedFrames.map((f, idx) => ({
          id: `frame_${idx + 1}`,
          name: `${assetNamePrefix}_${idx + 1}`,
          x: f.x,
          y: f.y,
          w: f.w,
          h: f.h,
          originalW: f.originalW,
          originalH: f.originalH,
          trimmedLeft: f.trimmedLeft,
          trimmedTop: f.trimmedTop,
          hash: `hash_${idx}`,
        })),
        dataUrl: selectedFrames[0]?.dataUrl || '',
      };

      updatedProject.assets!.atlases!.push(atlasMeta as any);
    }

    // 3. Optionally Remove Heavy Original Asset
    if (options.removeOriginalAssetId) {
      updatedProject.assets!.images = updatedProject.assets!.images!.filter(
        (img) => img.id !== options.removeOriginalAssetId
      );
    }

    // 4. Optionally Create Animated Sprite Entity
    let createdEntityId: string | undefined = undefined;
    if (options.createAnimatedEntity && createdImageIds.length > 0) {
      const entityId = `entity_anim_${Date.now()}`;
      createdEntityId = entityId;

      const newEntity: Entity = {
        id: entityId,
        name: `Anim ${assetNamePrefix}`,
        type: 'player',
        visible: true,
        locked: false,
        transform: {
          x: 400,
          y: 300,
          width: selectedFrames[0].w || 64,
          height: selectedFrames[0].h || 64,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 10,
        },
        sprite: {
          type: 'preset',
          color: '#ffffff',
          presetIcon: 'hero',
          imageAssetId: createdImageIds[0],
          opacity: 1,
          animationFps: 12,
        },
      };

      updatedProject.entities.push(newEntity);
    }

    return { updatedProject, createdImageIds, createdAtlasId, createdEntityId };
  }

  /**
   * Demo Sprite Sheet Data Generators for Instant Testing
   */
  public static generateDemoSpriteSheet(type: 'pixel_hero' | 'coin_spin' | 'fireball'): string {
    const canvas = document.createElement('canvas');

    if (type === 'coin_spin') {
      // 8 frames of a rotating 3D golden coin
      const frameW = 32;
      const frameH = 32;
      canvas.width = frameW * 8;
      canvas.height = frameH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      for (let i = 0; i < 8; i++) {
        const cx = i * frameW + frameW / 2;
        const cy = frameH / 2;
        const widthFactor = Math.abs(Math.cos((i / 8) * Math.PI));

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(2, 12 * widthFactor), 12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, 8 * widthFactor), 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'fireball') {
      // 6 frames of animated glowing fireball
      const frameW = 40;
      const frameH = 40;
      canvas.width = frameW * 6;
      canvas.height = frameH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      for (let i = 0; i < 6; i++) {
        const cx = i * frameW + frameW / 2;
        const cy = frameH / 2;
        const radius = 10 + (i % 3) * 2;

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx - i, cy, radius + 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx + 2, cy, radius - 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // pixel_hero: 4-frame running hero
      const frameW = 32;
      const frameH = 32;
      canvas.width = frameW * 4;
      canvas.height = frameH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      const colors = ['#38bdf8', '#818cf8', '#a855f7', '#ec4899'];
      for (let i = 0; i < 4; i++) {
        const ox = i * frameW;
        // Head
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(ox + 10, 4, 12, 10);
        // Body
        ctx.fillStyle = colors[i];
        ctx.fillRect(ox + 8, 14, 16, 10);
        // Legs (moving)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(ox + (i % 2 === 0 ? 8 : 12), 24, 6, 8);
        ctx.fillRect(ox + (i % 2 === 0 ? 18 : 14), 24, 6, 8);
      }
    }

    return canvas.toDataURL('image/png');
  }
}
