/**
 * CanvasCacheEngine.ts
 * Offscreen Canvas Layer Caching Engine for 2D Mobile Game Performance
 * 
 * Renders static background layers, tilemaps, grid patterns, and static environment
 * entities into an offscreen canvas buffer. Drastically reduces draw calls and CPU/GPU load
 * on budget Android devices (e.g. itel A70).
 */

import { Entity } from '../types/engine';

export class CanvasCacheEngine {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private isDirty: boolean = true;
  private isEnabled: boolean = true;
  private width: number = 800;
  private height: number = 450;
  private cachedDrawCallsSaved: number = 0;

  constructor() {
    this.initBuffer();
  }

  private initBuffer() {
    if (typeof window === 'undefined') return;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
  }

  /**
   * Resizes offscreen buffer if canvas dimensions change
   */
  public resize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));

    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = this.width;
      this.offscreenCanvas.height = this.height;
      this.invalidate();
    }
  }

  /**
   * Marks the static layer buffer as dirty, forcing a re-render on next frame
   */
  public invalidate(): void {
    this.isDirty = true;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.invalidate();
    }
  }

  public isCacheEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Returns true if entity can be cached in the static background offscreen buffer
   */
  public isStaticEntity(ent: Entity): boolean {
    if (!ent.visible) return false;
    // Animated sprites or text or particle emitters should not be baked into static cache
    if (
      ent.sprite.type === 'animated' ||
      ent.sprite.type === 'spritesheet' ||
      ent.type === 'particle_emitter' ||
      ent.type === 'ui_text' ||
      ent.rigidbody?.bodyType === 'dynamic'
    ) {
      return false;
    }

    // Static platforms, tilemaps, or explicit static rigidity
    return (
      ent.type === 'platform' ||
      ent.sprite.type === 'tilemap' ||
      ent.rigidbody?.bodyType === 'static' ||
      ent.transform.zIndex < 0
    );
  }

  /**
   * Re-renders static entities onto offscreen buffer context if dirty
   */
  public updateCacheIfNeeded(
    renderFn: (ctx: CanvasRenderingContext2D, entities: Entity[]) => number,
    staticEntities: Entity[]
  ): void {
    if (!this.isEnabled || !this.isDirty || !this.offscreenCtx || !this.offscreenCanvas) return;

    // Clear buffer
    this.offscreenCtx.clearRect(0, 0, this.width, this.height);

    // Render static entities to offscreen context
    this.cachedDrawCallsSaved = renderFn(this.offscreenCtx, staticEntities);

    this.isDirty = false;
  }

  /**
   * Blits pre-rendered static layer buffer onto main canvas context
   */
  public renderToMain(mainCtx: CanvasRenderingContext2D): boolean {
    if (!this.isEnabled || this.isDirty || !this.offscreenCanvas) {
      return false;
    }

    mainCtx.drawImage(this.offscreenCanvas, 0, 0);
    return true;
  }

  public getDrawCallsSaved(): number {
    return this.cachedDrawCallsSaved;
  }
}

export const canvasCacheEngine = new CanvasCacheEngine();
