/**
 * ParticleEngine.ts
 * Lightweight, zero-GC Float32Array Particle System Utility
 * Optimized for low-end mobile devices and high frame-rate Android runtimes.
 *
 * Supports temporary visual effects: explosions, dust, sparks, fire, smoke,
 * starbursts, coin sparkles, shockwaves, and motion trails.
 */

import { ParticleComponent, ParticleEmitterShape } from '../types/engine';
import { AndroidEngine } from './AndroidEngine';

export type ParticlePresetType =
  | 'explosion'
  | 'dust'
  | 'fire'
  | 'smoke'
  | 'starburst'
  | 'snow'
  | 'magic_sparks'
  | 'cyber_grid'
  | 'coin_sparkle'
  | 'shockwave'
  | 'sparks';

export type QualityLevel = 'low' | 'medium' | 'high' | 'auto';

export interface ParticleEffectOptions {
  count?: number;
  color1?: string;
  color2?: string;
  speed?: number;
  scale?: number;
  lifetime?: number;
}

export class ParticleEngine {
  private static MAX_PARTICLES_HIGH = 800;
  private static MAX_PARTICLES_MEDIUM = 400;
  private static MAX_PARTICLES_LOW = 200;

  private static currentCap = ParticleEngine.MAX_PARTICLES_MEDIUM;
  private static qualityMode: QualityLevel = 'auto';
  private static spawnMultiplier = 1.0;

  private static STRIDE = 16;
  // Layout: [x, y, vx, vy, life, maxLife, size, shapeId, r1, g1, b1, r2, g2, b2, gx, gy]

  private static buffer: Float32Array = new Float32Array(
    ParticleEngine.MAX_PARTICLES_HIGH * ParticleEngine.STRIDE
  );
  private static activeCount = 0;

  private static colorPalette: [number, number, number][] = [
    [56, 189, 248],   // Sky Blue
    [245, 158, 11],   // Amber Gold
    [239, 68, 68],    // Crimson Red
    [16, 185, 129],   // Emerald Green
    [168, 85, 247],   // Purple Magic
    [236, 72, 153],   // Pink Neon
    [255, 255, 255],  // White Sparkle
    [100, 116, 139],  // Slate Smoke
  ];

  /**
   * Sets the quality level or adapts to device capabilities
   */
  public static setQualityLevel(level: QualityLevel): void {
    ParticleEngine.qualityMode = level;
    if (level === 'low') {
      ParticleEngine.currentCap = ParticleEngine.MAX_PARTICLES_LOW;
      ParticleEngine.spawnMultiplier = 0.5;
    } else if (level === 'medium') {
      ParticleEngine.currentCap = ParticleEngine.MAX_PARTICLES_MEDIUM;
      ParticleEngine.spawnMultiplier = 0.75;
    } else if (level === 'high') {
      ParticleEngine.currentCap = ParticleEngine.MAX_PARTICLES_HIGH;
      ParticleEngine.spawnMultiplier = 1.0;
    } else {
      // Auto-detect mobile device tier
      const isLowEnd = AndroidEngine.isLowEndDevice();
      if (isLowEnd) {
        ParticleEngine.currentCap = ParticleEngine.MAX_PARTICLES_LOW;
        ParticleEngine.spawnMultiplier = 0.5;
      } else {
        ParticleEngine.currentCap = ParticleEngine.MAX_PARTICLES_MEDIUM;
        ParticleEngine.spawnMultiplier = 0.85;
      }
    }
  }

  /**
   * Adjusts particle spawn counts based on current quality & mobile tier
   */
  public static getEffectiveCount(requestedCount: number): number {
    if (ParticleEngine.qualityMode === 'auto' && AndroidEngine.isLowEndDevice()) {
      return Math.max(2, Math.round(requestedCount * 0.45));
    }
    return Math.max(1, Math.round(requestedCount * ParticleEngine.spawnMultiplier));
  }

  public static hexToRgb(hex: string): [number, number, number] {
    if (!hex) return [255, 255, 255];
    let cleaned = hex.replace('#', '');
    if (cleaned.length === 3) {
      cleaned = cleaned.split('').map((c) => c + c).join('');
    }
    const num = parseInt(cleaned, 16);
    if (isNaN(num)) return [255, 255, 255];
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  /**
   * Emit particles from an Entity's ParticleComponent definition
   */
  public static emitFromComponent(
    originX: number,
    originY: number,
    comp: ParticleComponent,
    overrideCount?: number
  ): void {
    if (!comp || !comp.enabled) return;

    const baseCount = overrideCount || Math.max(1, Math.round(comp.burstRate || comp.rate || 1));
    const effectiveCount = ParticleEngine.getEffectiveCount(baseCount);
    const toSpawn = Math.min(
      effectiveCount,
      ParticleEngine.currentCap - ParticleEngine.activeCount
    );
    if (toSpawn <= 0) return;

    const shapeId =
      comp.shape === 'circle' ? 1 :
      comp.shape === 'spark' ? 2 :
      comp.shape === 'star' ? 3 :
      comp.shape === 'ring' ? 4 : 0; // 0 = square

    let r1 = 255, g1 = 255, b1 = 255;
    let r2 = 255, g2 = 255, b2 = 255;

    if (comp.colorGradient && comp.colorGradient.length > 0) {
      [r1, g1, b1] = ParticleEngine.hexToRgb(comp.colorGradient[0]);
      const lastColor = comp.colorGradient[comp.colorGradient.length - 1];
      [r2, g2, b2] = ParticleEngine.hexToRgb(lastColor);
    } else if (comp.color) {
      [r1, g1, b1] = ParticleEngine.hexToRgb(comp.color);
      [r2, g2, b2] = [r1, g1, b1];
    }

    const emitterShape: ParticleEmitterShape = comp.emitterShape || 'point';
    const ew = comp.emitterWidth || 30;
    const eh = comp.emitterHeight || 30;
    const er = comp.emitterRadius || 20;

    const minSpd = comp.minSpeed !== undefined ? comp.minSpeed : (comp.speed !== undefined ? comp.speed * 0.5 : 20);
    const maxSpd = comp.maxSpeed !== undefined ? comp.maxSpeed : (comp.speed !== undefined ? comp.speed * 1.2 : 80);

    const minLife = comp.minLifetime !== undefined ? comp.minLifetime : (comp.lifetime !== undefined ? comp.lifetime * 0.6 : 0.3);
    const maxLife = comp.maxLifetime !== undefined ? comp.maxLifetime : (comp.lifetime !== undefined ? comp.lifetime * 1.2 : 0.8);

    const minSz = comp.minSize !== undefined ? comp.minSize : (comp.size !== undefined ? comp.size * 0.7 : 3);
    const maxSz = comp.maxSize !== undefined ? comp.maxSize : (comp.size !== undefined ? comp.size * 1.3 : 6);

    const baseAngleRad = ((comp.angle || 0) * Math.PI) / 180;
    const spreadRad = ((comp.spread !== undefined ? comp.spread : 360) * Math.PI) / 180;

    const gx = comp.gravityX || 0;
    const gy = comp.gravityY || 0;

    for (let i = 0; i < toSpawn; i++) {
      const idx = (ParticleEngine.activeCount + i) * ParticleEngine.STRIDE;

      let px = originX;
      let py = originY;

      switch (emitterShape) {
        case 'box':
          px = originX + (Math.random() - 0.5) * ew;
          py = originY + (Math.random() - 0.5) * eh;
          break;
        case 'circle': {
          const randR = Math.random() * er;
          const randA = Math.random() * Math.PI * 2;
          px = originX + Math.cos(randA) * randR;
          py = originY + Math.sin(randA) * randR;
          break;
        }
        case 'ring': {
          const randA = Math.random() * Math.PI * 2;
          px = originX + Math.cos(randA) * er;
          py = originY + Math.sin(randA) * er;
          break;
        }
        case 'line':
          px = originX + (Math.random() - 0.5) * ew;
          break;
        case 'cone':
        case 'point':
        default:
          px = originX;
          py = originY;
          break;
      }

      const emitAngle = baseAngleRad + (Math.random() - 0.5) * spreadRad;
      const speed = minSpd + Math.random() * (maxSpd - minSpd);
      const vx = Math.cos(emitAngle) * speed;
      const vy = Math.sin(emitAngle) * speed;

      const life = minLife + Math.random() * (maxLife - minLife);
      const size = minSz + Math.random() * (maxSz - minSz);

      let pr1 = r1, pg1 = g1, pb1 = b1;
      let pr2 = r2, pg2 = g2, pb2 = b2;
      if (comp.colorGradient && comp.colorGradient.length > 2) {
        const randIdx = Math.floor(Math.random() * (comp.colorGradient.length - 1));
        [pr1, pg1, pb1] = ParticleEngine.hexToRgb(comp.colorGradient[randIdx]);
        [pr2, pg2, pb2] = ParticleEngine.hexToRgb(comp.colorGradient[randIdx + 1]);
      }

      ParticleEngine.buffer[idx + 0] = px;
      ParticleEngine.buffer[idx + 1] = py;
      ParticleEngine.buffer[idx + 2] = vx;
      ParticleEngine.buffer[idx + 3] = vy;
      ParticleEngine.buffer[idx + 4] = life;
      ParticleEngine.buffer[idx + 5] = life;
      ParticleEngine.buffer[idx + 6] = size;
      ParticleEngine.buffer[idx + 7] = shapeId;
      ParticleEngine.buffer[idx + 8] = pr1;
      ParticleEngine.buffer[idx + 9] = pg1;
      ParticleEngine.buffer[idx + 10] = pb1;
      ParticleEngine.buffer[idx + 11] = pr2;
      ParticleEngine.buffer[idx + 12] = pg2;
      ParticleEngine.buffer[idx + 13] = pb2;
      ParticleEngine.buffer[idx + 14] = gx;
      ParticleEngine.buffer[idx + 15] = gy;
    }

    ParticleEngine.activeCount += toSpawn;
  }

  /**
   * Generic preset emission
   */
  public static emit(
    x: number,
    y: number,
    count: number = 15,
    preset: ParticlePresetType = 'explosion'
  ): void {
    const effectiveCount = ParticleEngine.getEffectiveCount(count);
    const toSpawn = Math.min(
      effectiveCount,
      ParticleEngine.currentCap - ParticleEngine.activeCount
    );
    if (toSpawn <= 0) return;

    for (let i = 0; i < toSpawn; i++) {
      const idx = (ParticleEngine.activeCount + i) * ParticleEngine.STRIDE;

      let angle = Math.random() * Math.PI * 2;
      let speed = Math.random() * 150 + 50;
      let life = Math.random() * 0.6 + 0.3;
      let size = Math.random() * 6 + 2;
      let shapeId = 0; // 0 square, 1 circle, 2 spark, 3 star, 4 ring
      let c1: [number, number, number] = [255, 255, 255];
      let c2: [number, number, number] = [255, 255, 255];
      let gy = 0;

      switch (preset) {
        case 'explosion':
          speed = Math.random() * 260 + 80;
          c1 = [245, 158, 11]; // Amber
          c2 = [239, 68, 68];  // Red
          shapeId = Math.random() > 0.4 ? 2 : 0;
          break;
        case 'sparks':
          speed = Math.random() * 200 + 100;
          c1 = [254, 240, 138];
          c2 = [245, 158, 11];
          size = Math.random() * 4 + 2;
          life = Math.random() * 0.4 + 0.15;
          shapeId = 2; // Spark streak
          break;
        case 'fire':
          angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
          speed = Math.random() * 120 + 40;
          c1 = [245, 158, 11];
          c2 = [239, 68, 68];
          life = Math.random() * 0.5 + 0.2;
          shapeId = 1;
          gy = -50;
          break;
        case 'dust':
          speed = Math.random() * 40 + 10;
          c1 = [148, 163, 184];
          c2 = [71, 85, 105];
          size = Math.random() * 4 + 2;
          shapeId = 1;
          break;
        case 'smoke':
          angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
          speed = Math.random() * 30 + 10;
          c1 = [148, 163, 184];
          c2 = [100, 116, 139];
          size = Math.random() * 8 + 4;
          life = Math.random() * 0.8 + 0.4;
          shapeId = 1;
          gy = -20;
          break;
        case 'starburst':
          speed = Math.random() * 180 + 60;
          c1 = [56, 189, 248];
          c2 = [236, 72, 153];
          shapeId = 3;
          break;
        case 'coin_sparkle':
          speed = Math.random() * 90 + 20;
          c1 = [254, 240, 138];
          c2 = [245, 158, 11];
          size = Math.random() * 5 + 3;
          shapeId = 3;
          break;
        case 'shockwave':
          speed = Math.random() * 180 + 120;
          c1 = [56, 189, 248];
          c2 = [168, 85, 247];
          size = Math.random() * 12 + 6;
          life = Math.random() * 0.35 + 0.15;
          shapeId = 4; // Ring
          break;
        case 'magic_sparks':
          speed = Math.random() * 140 + 50;
          c1 = [168, 85, 247];
          c2 = [236, 72, 153];
          shapeId = 2;
          break;
        case 'snow':
          angle = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
          speed = Math.random() * 50 + 20;
          c1 = [255, 255, 255];
          c2 = [224, 242, 254];
          size = Math.random() * 3 + 2;
          life = Math.random() * 1.5 + 0.8;
          shapeId = 1;
          gy = 30;
          break;
        default:
          c1 = ParticleEngine.colorPalette[Math.floor(Math.random() * ParticleEngine.colorPalette.length)];
          c2 = c1;
          break;
      }

      ParticleEngine.buffer[idx + 0] = x;
      ParticleEngine.buffer[idx + 1] = y;
      ParticleEngine.buffer[idx + 2] = Math.cos(angle) * speed;
      ParticleEngine.buffer[idx + 3] = Math.sin(angle) * speed;
      ParticleEngine.buffer[idx + 4] = life;
      ParticleEngine.buffer[idx + 5] = life;
      ParticleEngine.buffer[idx + 6] = size;
      ParticleEngine.buffer[idx + 7] = shapeId;
      ParticleEngine.buffer[idx + 8] = c1[0];
      ParticleEngine.buffer[idx + 9] = c1[1];
      ParticleEngine.buffer[idx + 10] = c1[2];
      ParticleEngine.buffer[idx + 11] = c2[0];
      ParticleEngine.buffer[idx + 12] = c2[1];
      ParticleEngine.buffer[idx + 13] = c2[2];
      ParticleEngine.buffer[idx + 14] = 0;
      ParticleEngine.buffer[idx + 15] = gy;
    }

    ParticleEngine.activeCount += toSpawn;
  }

  // --- Convenience Helper Utility Functions for Instant Visual Effects ---

  /**
   * Spawns an explosion effect (combining core flash + orange/red sparks)
   */
  public static spawnExplosion(x: number, y: number, options?: ParticleEffectOptions): void {
    const count = options?.count ?? 25;
    ParticleEngine.emit(x, y, count, 'explosion');
    ParticleEngine.emit(x, y, Math.round(count * 0.5), 'sparks');
  }

  /**
   * Spawns a dust poof effect (e.g. landing, jumping, breaking block)
   */
  public static spawnDust(x: number, y: number, options?: ParticleEffectOptions): void {
    const count = options?.count ?? 12;
    ParticleEngine.emit(x, y, count, 'dust');
  }

  /**
   * Spawns bright spark streaks (e.g. projectile impact, sword hit)
   */
  public static spawnSparks(x: number, y: number, options?: ParticleEffectOptions): void {
    const count = options?.count ?? 18;
    ParticleEngine.emit(x, y, count, 'sparks');
  }

  /**
   * Spawns fire / flame burst
   */
  public static spawnFire(x: number, y: number, options?: ParticleEffectOptions): void {
    const count = options?.count ?? 15;
    ParticleEngine.emit(x, y, count, 'fire');
  }

  /**
   * Spawns smoke plume
   */
  public static spawnSmoke(x: number, y: number, options?: ParticleEffectOptions): void {
    const count = options?.count ?? 10;
    ParticleEngine.emit(x, y, count, 'smoke');
  }

  /**
   * Spawns gold coin sparkles / pickup star FX
   */
  public static spawnCoinSparkle(x: number, y: number, options?: ParticleEffectOptions): void {
    const count = options?.count ?? 12;
    ParticleEngine.emit(x, y, count, 'coin_sparkle');
  }

  /**
   * Spawns starburst flare
   */
  public static spawnStarburst(x: number, y: number, options?: ParticleEffectOptions): void {
    const count = options?.count ?? 16;
    ParticleEngine.emit(x, y, count, 'starburst');
  }

  /**
   * Spawns shockwave ring blast
   */
  public static spawnShockwave(x: number, y: number, options?: ParticleEffectOptions): void {
    const count = options?.count ?? 12;
    ParticleEngine.emit(x, y, count, 'shockwave');
  }

  /**
   * Spawns a motion trail spark behind a fast-moving object
   */
  public static spawnTrail(
    x: number,
    y: number,
    vx: number,
    vy: number,
    options?: { color?: string; size?: number }
  ): void {
    if (ParticleEngine.activeCount >= ParticleEngine.currentCap) return;
    const idx = ParticleEngine.activeCount * ParticleEngine.STRIDE;

    const [r, g, b] = options?.color ? ParticleEngine.hexToRgb(options.color) : [56, 189, 248];
    const size = options?.size ?? 3;

    ParticleEngine.buffer[idx + 0] = x;
    ParticleEngine.buffer[idx + 1] = y;
    ParticleEngine.buffer[idx + 2] = -vx * 0.15;
    ParticleEngine.buffer[idx + 3] = -vy * 0.15;
    ParticleEngine.buffer[idx + 4] = 0.25; // life
    ParticleEngine.buffer[idx + 5] = 0.25; // maxLife
    ParticleEngine.buffer[idx + 6] = size;
    ParticleEngine.buffer[idx + 7] = 1; // Circle
    ParticleEngine.buffer[idx + 8] = r;
    ParticleEngine.buffer[idx + 9] = g;
    ParticleEngine.buffer[idx + 10] = b;
    ParticleEngine.buffer[idx + 11] = r;
    ParticleEngine.buffer[idx + 12] = g;
    ParticleEngine.buffer[idx + 13] = b;
    ParticleEngine.buffer[idx + 14] = 0;
    ParticleEngine.buffer[idx + 15] = 0;

    ParticleEngine.activeCount++;
  }

  /**
   * In-place update of particle positions and lifetimes
   */
  public static update(dtSeconds: number): void {
    let alive = 0;

    for (let i = 0; i < ParticleEngine.activeCount; i++) {
      const idx = i * ParticleEngine.STRIDE;

      let life = ParticleEngine.buffer[idx + 4] - dtSeconds;

      if (life > 0) {
        const gx = ParticleEngine.buffer[idx + 14];
        const gy = ParticleEngine.buffer[idx + 15];

        ParticleEngine.buffer[idx + 2] += gx * dtSeconds;
        ParticleEngine.buffer[idx + 3] += gy * dtSeconds;

        ParticleEngine.buffer[idx + 0] += ParticleEngine.buffer[idx + 2] * dtSeconds;
        ParticleEngine.buffer[idx + 1] += ParticleEngine.buffer[idx + 3] * dtSeconds;
        ParticleEngine.buffer[idx + 4] = life;

        if (alive !== i) {
          const destIdx = alive * ParticleEngine.STRIDE;
          for (let k = 0; k < ParticleEngine.STRIDE; k++) {
            ParticleEngine.buffer[destIdx + k] = ParticleEngine.buffer[idx + k];
          }
        }
        alive++;
      }
    }

    ParticleEngine.activeCount = alive;
  }

  /**
   * Fast Canvas rendering of active particles
   */
  public static render(ctx: CanvasRenderingContext2D): void {
    if (ParticleEngine.activeCount === 0) return;

    ctx.save();

    const isLowEnd = AndroidEngine.isLowEndDevice();

    for (let i = 0; i < ParticleEngine.activeCount; i++) {
      const idx = i * ParticleEngine.STRIDE;

      const x = ParticleEngine.buffer[idx + 0];
      const y = ParticleEngine.buffer[idx + 1];
      const vx = ParticleEngine.buffer[idx + 2];
      const vy = ParticleEngine.buffer[idx + 3];
      const life = ParticleEngine.buffer[idx + 4];
      const maxLife = ParticleEngine.buffer[idx + 5];
      const size = ParticleEngine.buffer[idx + 6];
      const shapeId = ParticleEngine.buffer[idx + 7] | 0;

      const r1 = ParticleEngine.buffer[idx + 8];
      const g1 = ParticleEngine.buffer[idx + 9];
      const b1 = ParticleEngine.buffer[idx + 10];
      const r2 = ParticleEngine.buffer[idx + 11];
      const g2 = ParticleEngine.buffer[idx + 12];
      const b2 = ParticleEngine.buffer[idx + 13];

      const progress = 1 - Math.max(0, life / maxLife);
      const alpha = Math.max(0, life / maxLife);

      const curR = Math.round(r1 + (r2 - r1) * progress);
      const curG = Math.round(g1 + (g2 - g1) * progress);
      const curB = Math.round(b1 + (b2 - b1) * progress);

      ctx.fillStyle = `rgba(${curR}, ${curG}, ${curB}, ${alpha})`;
      ctx.strokeStyle = `rgba(${curR}, ${curG}, ${curB}, ${alpha})`;

      if (shapeId === 1) {
        // Circle
        if (isLowEnd) {
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1, size / 2), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (shapeId === 2) {
        // Spark line
        ctx.lineWidth = Math.max(1, size / 2);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - vx * 0.04, y - vy * 0.04);
        ctx.stroke();
      } else if (shapeId === 3) {
        // Star cross
        ctx.lineWidth = 1.2;
        const half = size / 2;
        ctx.beginPath();
        ctx.moveTo(x - half, y);
        ctx.lineTo(x + half, y);
        ctx.moveTo(x, y - half);
        ctx.lineTo(x, y + half);
        ctx.stroke();
      } else if (shapeId === 4) {
        // Ring
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, size / 2), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Square
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    }

    ctx.restore();
  }

  public static getActiveParticleCount(): number {
    return ParticleEngine.activeCount;
  }

  public static clear(): void {
    ParticleEngine.activeCount = 0;
  }
}
