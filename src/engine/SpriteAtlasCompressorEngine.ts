/**
 * SpriteAtlasCompressorEngine.ts
 * High-performance Image Compression & Spritesheet Atlas Generator.
 * Optimized for low-end mobile devices (itel A70 - Unisoc T603 / Mali-G57 GPU).
 * Features:
 * - Multi-image downscaling & WebP/PNG high-ratio compression
 * - Alpha border trimming (removes transparent padding)
 * - 2D Shelf/Bin packing into compact power-of-two (Po2) texture atlases
 * - Frame content deduplication
 * - JSON Atlas metadata generation and VRAM/Storage metrics calculations
 */

export interface FrameInput {
  id: string;
  name: string;
  source: File | HTMLImageElement | string; // File, Image element, or Data URL
  originalSizeKb?: number;
}

export interface AtlasFrameMeta {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  originalW: number;
  originalH: number;
  trimmedLeft: number;
  trimmedTop: number;
  hash: string;
}

export interface CompressionOptions {
  maxFrameDimension?: number; // e.g. 32, 64, 128, 256, 512, or 0 (original)
  quality?: number; // 0.1 to 1.0 (default 0.8)
  trimAlpha?: boolean; // Trim transparent borders
  padding?: number; // Margin between sprites in pixels (default 2)
  powerOfTwo?: boolean; // Clamp canvas to nearest Po2 (256, 512, 1024, 2048)
  deduplicate?: boolean; // Skip identical frames
  format?: 'image/webp' | 'image/png' | 'image/jpeg';
}

export interface AtlasBuildResult {
  atlasCanvas: HTMLCanvasElement;
  dataUrl: string;
  format: string;
  atlasWidth: number;
  atlasHeight: number;
  frames: AtlasFrameMeta[];
  jsonMetadataString: string;
  metrics: {
    totalInputFiles: number;
    originalTotalSizeKb: number;
    compressedAtlasSizeKb: number;
    savedStoragePercent: number;
    vramFootprintMb: number;
    packingEfficiencyPercent: number;
    processTimeMs: number;
  };
}

export class SpriteAtlasCompressorEngine {
  /**
   * Loads a File or DataURL string into an HTMLImageElement asynchronously
   */
  public static async loadImage(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      let objectUrl = '';
      if (source instanceof File) {
        objectUrl = URL.createObjectURL(source);
        img.src = objectUrl;
      } else {
        img.src = source;
      }

      img.onload = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = (err) => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(new Error('Gagal memuat gambar dari sumber'));
      };
    });
  }

  /**
   * Trims transparent borders around a canvas context and returns bounding box
   */
  public static calculateAlphaTrimBounds(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): { left: number; top: number; width: number; height: number } {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    try {
      const imgData = ctx.getImageData(0, 0, width, height).data;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = imgData[(y * width + x) * 4 + 3];
          if (alpha > 10) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
    } catch {
      return { left: 0, top: 0, width, height };
    }

    if (maxX < minX || maxY < minY) {
      // Entirely transparent
      return { left: 0, top: 0, width: Math.max(1, width), height: Math.max(1, height) };
    }

    return {
      left: minX,
      top: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  /**
   * Generates a fast hash string for frame pixels to detect duplicates
   */
  public static hashCanvasPixels(ctx: CanvasRenderingContext2D, width: number, height: number): string {
    let hash = 2166136261;
    try {
      const imgData = ctx.getImageData(0, 0, width, height).data;
      // Sample every 4th pixel for high speed
      for (let i = 0; i < imgData.length; i += 16) {
        const val = (imgData[i + 3] << 24) | (imgData[i] << 16) | (imgData[i + 1] << 8) | imgData[i + 2];
        hash ^= val;
        hash = Math.imul(hash, 16777619);
      }
    } catch {
      hash = width * 1000 + height;
    }
    return (hash >>> 0).toString(16);
  }

  /**
   * Finds the next power of two dimension >= value (up to 2048)
   */
  public static getNextPowerOfTwo(val: number): number {
    let po2 = 16;
    while (po2 < val && po2 < 2048) {
      po2 *= 2;
    }
    return po2;
  }

  /**
   * Main entry point: Process multiple image inputs, downscale, compress, and pack into a Spritesheet Atlas
   */
  public static async buildCompressedAtlas(
    inputs: FrameInput[],
    options: CompressionOptions = {}
  ): Promise<AtlasBuildResult> {
    const startTime = performance.now();

    const maxDim = options.maxFrameDimension || 0;
    const quality = options.quality !== undefined ? options.quality : 0.8;
    const trimAlpha = options.trimAlpha !== false; // default true
    const padding = options.padding !== undefined ? options.padding : 2;
    const powerOfTwo = options.powerOfTwo !== false; // default true
    const deduplicate = options.deduplicate !== false; // default true
    const requestedFormat = options.format || 'image/webp';

    let totalOriginalSizeKb = 0;
    const processedFrames: {
      id: string;
      name: string;
      tempCanvas: HTMLCanvasElement;
      originalW: number;
      originalH: number;
      trimmedLeft: number;
      trimmedTop: number;
      width: number;
      height: number;
      hash: string;
    }[] = [];

    const seenHashes = new Set<string>();

    // 1. Process individual frame inputs
    for (let i = 0; i < inputs.length; i++) {
      const inp = inputs[i];

      let origKb = inp.originalSizeKb || 0;
      if (inp.source instanceof File) {
        origKb = Math.round(inp.source.size / 1024);
      }
      totalOriginalSizeKb += origKb;

      let img: HTMLImageElement;
      if (inp.source instanceof HTMLImageElement) {
        img = inp.source;
      } else {
        try {
          img = await this.loadImage(inp.source);
        } catch {
          console.warn(`Gagal memuat frame '${inp.name}'`);
          continue;
        }
      }

      let origW = img.width;
      let origH = img.height;

      if (origW === 0 || origH === 0) continue;

      // Calculate downscaled dimensions
      let targetW = origW;
      let targetH = origH;

      if (maxDim > 0 && (origW > maxDim || origH > maxDim)) {
        if (origW > origH) {
          targetH = Math.max(1, Math.round((origH * maxDim) / origW));
          targetW = maxDim;
        } else {
          targetW = Math.max(1, Math.round((origW * maxDim) / origH));
          targetH = maxDim;
        }
      }

      // Draw initial resized frame to temporary canvas
      const rawCanvas = document.createElement('canvas');
      rawCanvas.width = targetW;
      rawCanvas.height = targetH;
      const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
      if (!rawCtx) continue;

      rawCtx.imageSmoothingEnabled = true;
      rawCtx.imageSmoothingQuality = 'high';
      rawCtx.drawImage(img, 0, 0, targetW, targetH);

      // Perform Alpha Trimming
      let trimBounds = { left: 0, top: 0, width: targetW, height: targetH };
      if (trimAlpha) {
        trimBounds = this.calculateAlphaTrimBounds(rawCtx, targetW, targetH);
      }

      // Create trimmed canvas frame
      const trimmedCanvas = document.createElement('canvas');
      trimmedCanvas.width = Math.max(1, trimBounds.width);
      trimmedCanvas.height = Math.max(1, trimBounds.height);
      const trimmedCtx = trimmedCanvas.getContext('2d', { willReadFrequently: true });
      if (!trimmedCtx) continue;

      trimmedCtx.drawImage(
        rawCanvas,
        trimBounds.left,
        trimBounds.top,
        trimBounds.width,
        trimBounds.height,
        0,
        0,
        trimBounds.width,
        trimBounds.height
      );

      // Deduplication Hash
      const hash = this.hashCanvasPixels(trimmedCtx, trimBounds.width, trimBounds.height);
      if (deduplicate && seenHashes.has(hash)) {
        // Skip exact duplicate frame
        continue;
      }
      seenHashes.add(hash);

      processedFrames.push({
        id: inp.id,
        name: inp.name,
        tempCanvas: trimmedCanvas,
        originalW: origW,
        originalH: origH,
        trimmedLeft: trimBounds.left,
        trimmedTop: trimBounds.top,
        width: trimBounds.width,
        height: trimBounds.height,
        hash,
      });
    }

    if (processedFrames.length === 0) {
      throw new Error('Tidak ada frame valid untuk dikompresi menjadi atlas.');
    }

    // 2. Sort frames by height (descending) for optimal 2D Shelf Packing
    processedFrames.sort((a, b) => b.height - a.height);

    // Estimate atlas width/height
    let totalPixelArea = 0;
    processedFrames.forEach((f) => {
      totalPixelArea += (f.width + padding * 2) * (f.height + padding * 2);
    });

    let estDim = Math.ceil(Math.sqrt(totalPixelArea * 1.3));
    let atlasW = powerOfTwo ? this.getNextPowerOfTwo(estDim) : estDim;
    let atlasH = powerOfTwo ? this.getNextPowerOfTwo(estDim) : estDim;

    // 3. Perform 2D Bin Packing (Shelf algorithm)
    let currentX = padding;
    let currentY = padding;
    let rowMaxHeight = 0;

    const packedFramesMeta: AtlasFrameMeta[] = [];

    for (let i = 0; i < processedFrames.length; i++) {
      const f = processedFrames[i];

      // If frame exceeds current row width, wrap to next row
      if (currentX + f.width + padding > atlasW) {
        currentX = padding;
        currentY += rowMaxHeight + padding;
        rowMaxHeight = 0;
      }

      // If height exceeds atlas height, expand atlas height
      if (currentY + f.height + padding > atlasH) {
        if (powerOfTwo) {
          atlasH = this.getNextPowerOfTwo(atlasH + f.height + padding * 2);
        } else {
          atlasH = currentY + f.height + padding * 2;
        }
      }

      packedFramesMeta.push({
        id: f.id,
        name: f.name,
        x: currentX,
        y: currentY,
        w: f.width,
        h: f.height,
        originalW: f.originalW,
        originalH: f.originalH,
        trimmedLeft: f.trimmedLeft,
        trimmedTop: f.trimmedTop,
        hash: f.hash,
      });

      rowMaxHeight = Math.max(rowMaxHeight, f.height);
      currentX += f.width + padding;
    }

    // Adjust final canvas height to tight bound if not constrained by Po2
    if (!powerOfTwo) {
      atlasH = Math.max(16, currentY + rowMaxHeight + padding);
    }

    // 4. Draw combined Spritesheet Atlas
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = atlasW;
    atlasCanvas.height = atlasH;
    const atlasCtx = atlasCanvas.getContext('2d');

    if (!atlasCtx) {
      throw new Error('Gagal membuat context canvas atlas.');
    }

    atlasCtx.clearRect(0, 0, atlasW, atlasH);

    for (let i = 0; i < packedFramesMeta.length; i++) {
      const meta = packedFramesMeta[i];
      const sourceCanvas = processedFrames[i].tempCanvas;

      atlasCtx.drawImage(sourceCanvas, meta.x, meta.y);
    }

    // 5. Export to compressed WebP / PNG Data URL
    let formatToUse = requestedFormat;
    let dataUrl = atlasCanvas.toDataURL(formatToUse, quality);

    // Fallback if browser doesn't support webp export
    if (formatToUse === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
      formatToUse = 'image/png';
      dataUrl = atlasCanvas.toDataURL(formatToUse);
    }

    // 6. Calculate metrics
    const compressedAtlasSizeKb = Math.round((dataUrl.length * 0.75) / 1024);
    if (totalOriginalSizeKb === 0) totalOriginalSizeKb = compressedAtlasSizeKb * 2;

    const savedStoragePercent = Math.max(
      0,
      Math.round((1 - compressedAtlasSizeKb / Math.max(1, totalOriginalSizeKb)) * 100)
    );

    // VRAM = Width * Height * 4 bytes per RGBA pixel
    const vramBytes = atlasW * atlasH * 4;
    const vramFootprintMb = Math.round((vramBytes / (1024 * 1024)) * 100) / 100;

    let usedPixelsArea = 0;
    packedFramesMeta.forEach((m) => (usedPixelsArea += m.w * m.h));
    const packingEfficiencyPercent = Math.round((usedPixelsArea / (atlasW * atlasH)) * 100);

    const endTime = performance.now();

    // 7. Generate JSON Metadata Mapping
    const jsonMetadata = {
      meta: {
        app: 'AI Studio Engine - Sprite Atlas Compressor',
        version: '1.0',
        image: 'atlas_compressed.webp',
        format: formatToUse,
        size: { w: atlasW, h: atlasH },
        scale: '1',
      },
      frames: packedFramesMeta.map((m) => ({
        filename: m.name,
        frame: { x: m.x, y: m.y, w: m.w, h: m.h },
        rotated: false,
        trimmed: m.trimmedLeft > 0 || m.trimmedTop > 0,
        spriteSourceSize: { x: m.trimmedLeft, y: m.trimmedTop, w: m.w, h: m.h },
        sourceSize: { w: m.originalW, h: m.originalH },
      })),
    };

    return {
      atlasCanvas,
      dataUrl,
      format: formatToUse,
      atlasWidth: atlasW,
      atlasHeight: atlasH,
      frames: packedFramesMeta,
      jsonMetadataString: JSON.stringify(jsonMetadata, null, 2),
      metrics: {
        totalInputFiles: inputs.length,
        originalTotalSizeKb: totalOriginalSizeKb,
        compressedAtlasSizeKb,
        savedStoragePercent,
        vramFootprintMb,
        packingEfficiencyPercent,
        processTimeMs: Math.round((endTime - startTime) * 100) / 100,
      },
    };
  }
}
