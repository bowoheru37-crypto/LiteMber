/**
 * MemoryGuardianEngine.ts
 * Memory Guardian Utility for Low-End Android Devices (e.g., itel A70 / Unisoc T606).
 *
 * Automatically monitors JS Heap and GPU Texture Buffer memory consumption.
 * Triggers emergency multi-stage garbage collection and cache evictions when RAM usage
 * exceeds the 80% threshold, maintaining smooth frame rates and zero-crash execution.
 */

import { assetManager } from './AssetManager';
import { canvasCacheEngine } from './CanvasCacheEngine';
import { LiteOptimizationEngine } from './LiteOptimizationEngine';

export interface MemoryGuardianStatus {
  usedMemoryBytes: number;
  totalBudgetBytes: number;
  memoryPercent: number;
  isHighMemoryStress: boolean; // > 80%
  isCriticalStress: boolean;   // > 90%
  heapUsedMB: number;
  heapLimitMB: number;
  evictionCount: number;
  freedMemoryBytes: number;
  lastPurgeTimestamp: number;
  guardianActive: boolean;
  textureScale: number;
}

export interface GuardianEventLog {
  id: string;
  timestamp: number;
  reason: string;
  memoryBeforeMB: number;
  memoryAfterMB: number;
  freedBytes: number;
  purgedTextures: number;
}

export class MemoryGuardianEngine {
  private static instance: MemoryGuardianEngine;

  private targetThresholdPercent: number = 80; // 80% trigger threshold
  private totalBudgetBytes: number = 32 * 1024 * 1024; // 32MB default budget for itel A70
  private showDebugOverlay: boolean = false;
  private evictionCount: number = 0;
  private totalFreedBytes: number = 0;
  private lastPurgeTimestamp: number = 0;
  private eventLogs: GuardianEventLog[] = [];
  private guardianActive: boolean = false;

  public static getInstance(): MemoryGuardianEngine {
    if (!MemoryGuardianEngine.instance) {
      MemoryGuardianEngine.instance = new MemoryGuardianEngine();
    }
    return MemoryGuardianEngine.instance;
  }

  constructor() {
    this.checkMemoryBudgetSupport();
  }

  private checkMemoryBudgetSupport(): void {
    if (typeof window !== 'undefined' && 'performance' in window && (performance as any).memory) {
      const mem = (performance as any).memory;
      if (mem.jsHeapSizeLimit && mem.jsHeapSizeLimit > 0) {
        // Cap budget to a realistic fraction for web view on 3GB/4GB RAM Android Go devices
        this.totalBudgetBytes = Math.min(mem.jsHeapSizeLimit, 64 * 1024 * 1024);
      }
    }
  }

  /**
   * Toggles the real-time Memory Guardian debug overlay on the canvas HUD
   */
  public setDebugOverlayVisible(visible: boolean): void {
    this.showDebugOverlay = visible;
  }

  public setThreshold(percent: number): void {
    this.targetThresholdPercent = Math.max(50, Math.min(95, percent));
  }

  public setThresholdPercent(percent: number): void {
    this.setThreshold(percent);
  }

  public getThresholdPercent(): number {
    return this.targetThresholdPercent;
  }

  public isDebugOverlayVisible(): boolean {
    return this.showDebugOverlay;
  }

  /**
   * Evaluates memory consumption in real time (JS Heap + Asset Texture Buffers)
   */
  public getStatus(): MemoryGuardianStatus {
    const assetMemoryBytes = assetManager.getTotalMemoryBytes();
    let heapUsedBytes = 0;
    let heapLimitBytes = this.totalBudgetBytes;

    if (typeof window !== 'undefined' && 'performance' in window && (performance as any).memory) {
      const mem = (performance as any).memory;
      heapUsedBytes = mem.usedJSHeapSize || 0;
      if (mem.jsHeapSizeLimit) {
        heapLimitBytes = mem.jsHeapSizeLimit;
      }
    }

    const totalUsedBytes = Math.max(assetMemoryBytes, heapUsedBytes);
    const memoryPercent = Math.min(100, Math.round((totalUsedBytes / heapLimitBytes) * 100));

    const isHighMemoryStress = memoryPercent >= this.targetThresholdPercent;
    const isCriticalStress = memoryPercent >= 90;

    return {
      usedMemoryBytes: totalUsedBytes,
      totalBudgetBytes: heapLimitBytes,
      memoryPercent,
      isHighMemoryStress,
      isCriticalStress,
      heapUsedMB: parseFloat((totalUsedBytes / (1024 * 1024)).toFixed(1)),
      heapLimitMB: parseFloat((heapLimitBytes / (1024 * 1024)).toFixed(1)),
      evictionCount: this.evictionCount,
      freedMemoryBytes: this.totalFreedBytes,
      lastPurgeTimestamp: this.lastPurgeTimestamp,
      guardianActive: this.guardianActive || isHighMemoryStress,
      textureScale: LiteOptimizationEngine.getTextureResolutionScale(),
    };
  }

  /**
   * Evaluates memory consumption per frame or second.
   * If memory exceeds 80%, automatically clears unused texture buffers & entity caches.
   */
  public checkAndEnforceGuardian(fps: number = 60): MemoryGuardianStatus {
    const status = this.getStatus();
    const now = Date.now();

    // Trigger auto-GC if memory exceeds 80% threshold OR if critical stress is met
    if (status.isHighMemoryStress || status.memoryPercent >= this.targetThresholdPercent) {
      this.guardianActive = true;

      // Throttle purges to at least 3 seconds apart unless under critical stress (>90%)
      if (now - this.lastPurgeTimestamp > (status.isCriticalStress ? 1500 : 3500)) {
        this.executeEmergencyPurge(status, 'RAM Consumption > 80%');
      }

      // If memory remains high (>85%), dynamically lower texture resolution to reduce GPU pressure
      if (status.memoryPercent > 85 && LiteOptimizationEngine.getTextureResolutionScale() > 0.5) {
        LiteOptimizationEngine.setTextureResolutionScale(0.5);
        canvasCacheEngine.invalidate();
      } else if (status.memoryPercent > 80 && LiteOptimizationEngine.getTextureResolutionScale() > 0.75) {
        LiteOptimizationEngine.setTextureResolutionScale(0.75);
        canvasCacheEngine.invalidate();
      }
    } else {
      // Memory level normal (< 80%)
      this.guardianActive = false;

      // Slowly recover texture resolution if frame rate is stable
      if (fps >= 55 && status.memoryPercent < 65 && LiteOptimizationEngine.getTextureResolutionScale() < 1.0) {
        if (now - this.lastPurgeTimestamp > 10000) {
          LiteOptimizationEngine.setTextureResolutionScale(1.0);
        }
      }
    }

    return this.getStatus();
  }

  /**
   * Manually or automatically executes emergency cache eviction
   */
  public executeEmergencyPurge(status?: MemoryGuardianStatus, reason: string = 'Manual / Low RAM'): void {
    const currentStatus = status || this.getStatus();
    const memBefore = currentStatus.usedMemoryBytes;

    // 1. Purge unused texture buffers and image assets
    const purgedAssets = assetManager.purgeUnusedAssets();

    // 2. Purge redundant duplicates
    const redundantFreed = assetManager.purgeRedundantAssets();

    // 3. Invalidate offscreen static canvas caches
    canvasCacheEngine.invalidate();

    // 4. Reset Zero-GC pools
    LiteOptimizationEngine.resetFramePools();

    const memAfter = assetManager.getTotalMemoryBytes();
    const freed = Math.max(0, memBefore - memAfter);

    this.evictionCount += purgedAssets + redundantFreed;
    this.totalFreedBytes += freed;
    this.lastPurgeTimestamp = Date.now();

    const logEntry: GuardianEventLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: this.lastPurgeTimestamp,
      reason,
      memoryBeforeMB: currentStatus.heapUsedMB,
      memoryAfterMB: parseFloat((memAfter / (1024 * 1024)).toFixed(1)),
      freedBytes: freed,
      purgedTextures: purgedAssets + redundantFreed,
    };

    this.eventLogs.unshift(logEntry);
    if (this.eventLogs.length > 10) {
      this.eventLogs.pop();
    }
  }

  public getLogs(): GuardianEventLog[] {
    return this.eventLogs;
  }

  /**
   * Render real-time Memory Guardian debug overlay directly on the canvas context
   */
  public renderDebugOverlay(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.showDebugOverlay) return;

    const status = this.getStatus();
    ctx.save();

    // HUD Container Dimensions (Top-Right Canvas Overlay)
    const hudWidth = 240;
    const hudHeight = 110;
    const padding = 10;
    const x = canvasWidth - hudWidth - 12;
    const y = 12;

    // Background Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = status.isHighMemoryStress ? 'rgba(244, 63, 94, 0.8)' : 'rgba(14, 165, 233, 0.5)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, hudWidth, hudHeight, 10);
    } else {
      ctx.rect(x, y, hudWidth, hudHeight);
    }
    ctx.fill();
    ctx.stroke();

    // Header Title
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = status.isHighMemoryStress ? '#f43f5e' : '#38bdf8';
    ctx.fillText('🛡️ MEMORY GUARDIAN', x + padding, y + 18);

    // Status Badge
    const badgeText = status.isHighMemoryStress ? 'EXCEEDS 80% (PURGING)' : 'PROTECTED';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillStyle = status.isHighMemoryStress ? '#ffe4e6' : '#e0f2fe';
    ctx.textAlign = 'right';
    ctx.fillText(badgeText, x + hudWidth - padding, y + 18);
    ctx.textAlign = 'left';

    // Progress Bar Outer
    const barX = x + padding;
    const barY = y + 26;
    const barW = hudWidth - padding * 2;
    const barH = 8;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.fillRect(barX, barY, barW, barH);

    // Progress Bar Fill
    const fillW = Math.max(0, Math.min(barW, (barW * status.memoryPercent) / 100));
    if (status.memoryPercent > 80) {
      ctx.fillStyle = '#f43f5e'; // Crimson Red
    } else if (status.memoryPercent > 60) {
      ctx.fillStyle = '#f59e0b'; // Amber
    } else {
      ctx.fillStyle = '#10b981'; // Emerald Green
    }
    ctx.fillRect(barX, barY, fillW, barH);

    // Memory Usage Text
    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(
      `RAM: ${status.heapUsedMB}MB / ${status.heapLimitMB}MB (${status.memoryPercent}%)`,
      x + padding,
      y + 48
    );

    // Texture Scale & Eviction Stats
    ctx.fillText(
      `Tekstur Skala: ${Math.round(status.textureScale * 100)}% | Eviksi: ${status.evictionCount}`,
      x + padding,
      y + 63
    );

    const freedKb = (status.freedMemoryBytes / 1024).toFixed(0);
    ctx.fillText(`Memori Dibebaskan: ${freedKb} KB`, x + padding, y + 78);

    // Hardware Target Label
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Optimasi: itel A70 (Unisoc T606)', x + padding, y + 95);

    ctx.restore();
  }
}

export const memoryGuardian = MemoryGuardianEngine.getInstance();
