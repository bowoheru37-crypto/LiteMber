import { Entity, WorldSettings } from '../types/engine';
import { AndroidEngine } from './AndroidEngine';

export interface SnapGuideLine {
  id: string;
  type: 'vertical' | 'horizontal';
  position: number; // Coordinate (X for vertical line, Y for horizontal line)
  start: number;    // Line start position
  end: number;      // Line end position
  color: string;
  label?: string;   // e.g., "X: 160", "Center Align", "Top Edge"
  kind?: 'grid' | 'object_center' | 'object_edge';
}

export interface SnapConfig {
  enabled: boolean;
  gridSnap: boolean;
  gridSize: number; // e.g. 8, 16, 32, 64
  objectSnap: boolean;
  snapThreshold: number; // Distance in pixels to snap
  angleSnap: boolean;
  angleStep: number; // Degrees e.g. 15, 45
  showGridLines: boolean;
  showGuideLines: boolean;
  hapticFeedback: boolean;
}

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guides: SnapGuideLine[];
}

export class SnappingEngine {
  private static instance: SnappingEngine;

  private config: SnapConfig = {
    enabled: true,
    gridSnap: true,
    gridSize: 32,
    objectSnap: true,
    snapThreshold: 10,
    angleSnap: true,
    angleStep: 15,
    showGridLines: true,
    showGuideLines: true,
    hapticFeedback: true,
  };

  private activeGuides: SnapGuideLine[] = [];
  private wasSnappedX: boolean = false;
  private wasSnappedY: boolean = false;

  public static getInstance(): SnappingEngine {
    if (!SnappingEngine.instance) {
      SnappingEngine.instance = new SnappingEngine();
    }
    return SnappingEngine.instance;
  }

  public getConfig(): SnapConfig {
    return { ...this.config };
  }

  public setConfig(newConfig: Partial<SnapConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public clearGuides() {
    this.activeGuides = [];
    this.wasSnappedX = false;
    this.wasSnappedY = false;
  }

  public getActiveGuides(): SnapGuideLine[] {
    return this.activeGuides;
  }

  /**
   * Snap position of an entity being dragged based on grid and object boundaries
   */
  public snapPosition(
    targetX: number,
    targetY: number,
    width: number,
    height: number,
    otherEntities: Entity[],
    currentEntityId?: string,
    world?: WorldSettings
  ): SnapResult {
    if (!this.config.enabled) {
      this.clearGuides();
      return { x: targetX, y: targetY, snappedX: false, snappedY: false, guides: [] };
    }

    const gridSize = this.config.gridSize || world?.gridSize || 32;
    const threshold = this.config.snapThreshold;
    const guides: SnapGuideLine[] = [];

    let finalX = targetX;
    let finalY = targetY;
    let snappedX = false;
    let snappedY = false;

    const halfW = width / 2;
    const halfH = height / 2;

    const left = targetX - halfW;
    const right = targetX + halfW;
    const top = targetY - halfH;
    const bottom = targetY + halfH;

    // --- 1. OBJECT ALIGNMENT SNAPPING (Smart Guides) ---
    if (this.config.objectSnap && otherEntities.length > 0) {
      const candidates = otherEntities.filter((e) => e.id !== currentEntityId && e.visible);

      for (const other of candidates) {
        const oW = other.transform.width;
        const oH = other.transform.height;
        const oHalfW = oW / 2;
        const oHalfH = oH / 2;

        const oX = other.transform.x;
        const oY = other.transform.y;
        const oLeft = oX - oHalfW;
        const oRight = oX + oHalfW;
        const oTop = oY - oHalfH;
        const oBottom = oY + oHalfH;

        // --- X ALIGNMENTS ---
        if (!snappedX) {
          // Center X alignment
          if (Math.abs(targetX - oX) <= threshold) {
            finalX = oX;
            snappedX = true;
            guides.push({
              id: `obj-cx-${other.id}`,
              type: 'vertical',
              position: oX,
              start: Math.min(top, oTop) - 20,
              end: Math.max(bottom, oBottom) + 20,
              color: '#f59e0b', // Amber
              label: `🎯 Center (${other.name})`,
              kind: 'object_center',
            });
          }
          // Left to Left
          else if (Math.abs(left - oLeft) <= threshold) {
            finalX = oLeft + halfW;
            snappedX = true;
            guides.push({
              id: `obj-ll-${other.id}`,
              type: 'vertical',
              position: oLeft,
              start: Math.min(top, oTop) - 15,
              end: Math.max(bottom, oBottom) + 15,
              color: '#10b981', // Emerald
              label: `⬅️ Rata Kiri`,
              kind: 'object_edge',
            });
          }
          // Right to Right
          else if (Math.abs(right - oRight) <= threshold) {
            finalX = oRight - halfW;
            snappedX = true;
            guides.push({
              id: `obj-rr-${other.id}`,
              type: 'vertical',
              position: oRight,
              start: Math.min(top, oTop) - 15,
              end: Math.max(bottom, oBottom) + 15,
              color: '#10b981',
              label: `➡️ Rata Kanan`,
              kind: 'object_edge',
            });
          }
          // Left to Right (Side Snapping)
          else if (Math.abs(left - oRight) <= threshold) {
            finalX = oRight + halfW;
            snappedX = true;
            guides.push({
              id: `obj-lr-${other.id}`,
              type: 'vertical',
              position: oRight,
              start: Math.min(top, oTop) - 15,
              end: Math.max(bottom, oBottom) + 15,
              color: '#38bdf8', // Cyan
              label: `🧩 Samping Kanan`,
              kind: 'object_edge',
            });
          }
          // Right to Left (Side Snapping)
          else if (Math.abs(right - oLeft) <= threshold) {
            finalX = oLeft - halfW;
            snappedX = true;
            guides.push({
              id: `obj-rl-${other.id}`,
              type: 'vertical',
              position: oLeft,
              start: Math.min(top, oTop) - 15,
              end: Math.max(bottom, oBottom) + 15,
              color: '#38bdf8',
              label: `🧩 Samping Kiri`,
              kind: 'object_edge',
            });
          }
        }

        // --- Y ALIGNMENTS ---
        if (!snappedY) {
          // Center Y alignment
          if (Math.abs(targetY - oY) <= threshold) {
            finalY = oY;
            snappedY = true;
            guides.push({
              id: `obj-cy-${other.id}`,
              type: 'horizontal',
              position: oY,
              start: Math.min(left, oLeft) - 20,
              end: Math.max(right, oRight) + 20,
              color: '#f59e0b',
              label: `🎯 Center Y (${other.name})`,
              kind: 'object_center',
            });
          }
          // Top to Top
          else if (Math.abs(top - oTop) <= threshold) {
            finalY = oTop + halfH;
            snappedY = true;
            guides.push({
              id: `obj-tt-${other.id}`,
              type: 'horizontal',
              position: oTop,
              start: Math.min(left, oLeft) - 15,
              end: Math.max(right, oRight) + 15,
              color: '#10b981',
              label: `⬆️ Rata Atas`,
              kind: 'object_edge',
            });
          }
          // Bottom to Bottom
          else if (Math.abs(bottom - oBottom) <= threshold) {
            finalY = oBottom - halfH;
            snappedY = true;
            guides.push({
              id: `obj-bb-${other.id}`,
              type: 'horizontal',
              position: oBottom,
              start: Math.min(left, oLeft) - 15,
              end: Math.max(right, oRight) + 15,
              color: '#10b981',
              label: `⬇️ Rata Bawah`,
              kind: 'object_edge',
            });
          }
          // Top to Bottom (Stacking)
          else if (Math.abs(top - oBottom) <= threshold) {
            finalY = oBottom + halfH;
            snappedY = true;
            guides.push({
              id: `obj-tb-${other.id}`,
              type: 'horizontal',
              position: oBottom,
              start: Math.min(left, oLeft) - 15,
              end: Math.max(right, oRight) + 15,
              color: '#38bdf8',
              label: `🥞 Menumpuk di Atas`,
              kind: 'object_edge',
            });
          }
          // Bottom to Top (Stacking)
          else if (Math.abs(bottom - oTop) <= threshold) {
            finalY = oTop - halfH;
            snappedY = true;
            guides.push({
              id: `obj-bt-${other.id}`,
              type: 'horizontal',
              position: oTop,
              start: Math.min(left, oLeft) - 15,
              end: Math.max(right, oRight) + 15,
              color: '#38bdf8',
              label: `🥞 Menumpuk di Bawah`,
              kind: 'object_edge',
            });
          }
        }

        if (snappedX && snappedY) break;
      }
    }

    // --- 2. GRID SNAPPING (FALLBACK IF NOT SNAPPED TO OBJECT) ---
    if (this.config.gridSnap) {
      if (!snappedX) {
        const nearestGridX = Math.round(targetX / gridSize) * gridSize;
        if (Math.abs(targetX - nearestGridX) <= threshold) {
          finalX = nearestGridX;
          snappedX = true;
          guides.push({
            id: `grid-x-${nearestGridX}`,
            type: 'vertical',
            position: nearestGridX,
            start: top - 20,
            end: bottom + 20,
            color: 'rgba(56, 189, 248, 0.8)', // Cyan
            label: `Grid X: ${nearestGridX}`,
            kind: 'grid',
          });
        }
      }

      if (!snappedY) {
        const nearestGridY = Math.round(targetY / gridSize) * gridSize;
        if (Math.abs(targetY - nearestGridY) <= threshold) {
          finalY = nearestGridY;
          snappedY = true;
          guides.push({
            id: `grid-y-${nearestGridY}`,
            type: 'horizontal',
            position: nearestGridY,
            start: left - 20,
            end: right + 20,
            color: 'rgba(56, 189, 248, 0.8)',
            label: `Grid Y: ${nearestGridY}`,
            kind: 'grid',
          });
        }
      }
    }

    // --- 3. HAPTIC FEEDBACK TRIGGER ---
    if (this.config.hapticFeedback && (snappedX || snappedY)) {
      if (!this.wasSnappedX && snappedX) {
        AndroidEngine.triggerHaptic(20);
      } else if (!this.wasSnappedY && snappedY) {
        AndroidEngine.triggerHaptic(20);
      }
    }

    this.wasSnappedX = snappedX;
    this.wasSnappedY = snappedY;
    this.activeGuides = guides;

    return {
      x: finalX,
      y: finalY,
      snappedX,
      snappedY,
      guides,
    };
  }

  /**
   * Snap rotation angle to step multiples
   */
  public snapRotation(degrees: number): { rotation: number; snapped: boolean } {
    if (!this.config.enabled || !this.config.angleSnap) {
      return { rotation: degrees, snapped: false };
    }

    const step = this.config.angleStep || 15;
    const nearest = Math.round(degrees / step) * step;
    const diff = Math.abs(degrees - nearest);

    if (diff <= 4) {
      if (this.config.hapticFeedback) {
        AndroidEngine.triggerHaptic(15);
      }
      return { rotation: (nearest + 360) % 360, snapped: true };
    }

    return { rotation: degrees, snapped: false };
  }

  /**
   * Render Editor Grid Background on Canvas Context
   */
  public renderGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    worldGridSize?: number,
    color: string = 'rgba(255, 255, 255, 0.08)'
  ) {
    if (!this.config.showGridLines) return;

    const size = this.config.gridSize || worldGridSize || 32;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    // Render Grid Lines
    ctx.beginPath();
    for (let x = 0; x <= width; x += size) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += size) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Render Axis Highlight Lines (Origin X=0, Y=0 if visible or center axes)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)'; // Soft cyan accent
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render Smart Alignment Guide Lines on Canvas
   */
  public renderGuides(ctx: CanvasRenderingContext2D) {
    if (!this.config.showGuideLines || this.activeGuides.length === 0) return;

    ctx.save();

    for (const guide of this.activeGuides) {
      ctx.strokeStyle = guide.color;
      ctx.fillStyle = guide.color;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      if (guide.kind === 'grid') {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }

      if (guide.type === 'vertical') {
        ctx.moveTo(guide.position, guide.start);
        ctx.lineTo(guide.position, guide.end);
        ctx.stroke();

        // Endpoint circles
        ctx.beginPath();
        ctx.arc(guide.position, guide.start, 3, 0, Math.PI * 2);
        ctx.arc(guide.position, guide.end, 3, 0, Math.PI * 2);
        ctx.fill();

        // Label Badge
        if (guide.label) {
          ctx.setLineDash([]);
          ctx.font = 'bold 9px sans-serif';
          const textWidth = ctx.measureText(guide.label).width;
          const px = guide.position + 6;
          const py = (guide.start + guide.end) / 2;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(px - 2, py - 8, textWidth + 8, 14);
          ctx.strokeStyle = guide.color;
          ctx.strokeRect(px - 2, py - 8, textWidth + 8, 14);

          ctx.fillStyle = guide.color;
          ctx.textBaseline = 'middle';
          ctx.fillText(guide.label, px + 2, py);
        }
      } else {
        ctx.moveTo(guide.start, guide.position);
        ctx.lineTo(guide.end, guide.position);
        ctx.stroke();

        // Endpoint circles
        ctx.beginPath();
        ctx.arc(guide.start, guide.position, 3, 0, Math.PI * 2);
        ctx.arc(guide.end, guide.position, 3, 0, Math.PI * 2);
        ctx.fill();

        // Label Badge
        if (guide.label) {
          ctx.setLineDash([]);
          ctx.font = 'bold 9px sans-serif';
          const textWidth = ctx.measureText(guide.label).width;
          const px = (guide.start + guide.end) / 2;
          const py = guide.position - 12;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(px - textWidth / 2 - 4, py - 7, textWidth + 8, 14);
          ctx.strokeStyle = guide.color;
          ctx.strokeRect(px - textWidth / 2 - 4, py - 7, textWidth + 8, 14);

          ctx.fillStyle = guide.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(guide.label, px, py);
        }
      }
    }

    ctx.restore();
  }
}

export const snappingEngine = SnappingEngine.getInstance();
