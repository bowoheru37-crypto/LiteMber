/**
 * TweenEngine.ts
 * High-performance Object-Pooled 2D Tween Engine
 * Zero Garbage Collection (GC) overhead optimized for low-spec Android devices (itel A70).
 * Supports Linear, Quad, Cubic, Bounce, Elastic, Back, Sine, and Elastic easing functions.
 */

import { SpringPhysicsEngine } from './SpringPhysicsEngine';

export type EasingType =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInBounce'
  | 'easeOutBounce'
  | 'easeOutElastic'
  | 'easeOutBack'
  | 'easeInSine'
  | 'easeOutSine'
  | 'springBouncy'
  | 'springSnappy'
  | 'springLoose'
  | 'springCharacter';

export interface TweenOptions {
  target: any;
  property: string;
  from: number;
  to: number;
  durationMs: number;
  easing?: EasingType;
  yoyo?: boolean;
  loop?: boolean;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
}

export class Tween {
  public id: number = 0;
  public target: any = null;
  public property: string = '';
  public from: number = 0;
  public to: number = 0;
  public durationMs: number = 1000;
  public elapsedMs: number = 0;
  public easing: EasingType = 'linear';
  public yoyo: boolean = false;
  public loop: boolean = false;
  public active: boolean = false;
  private isReversing: boolean = false;
  public onUpdate?: (value: number) => void;
  public onComplete?: () => void;

  public reset(options: TweenOptions, id: number): void {
    this.id = id;
    this.target = options.target;
    this.property = options.property;
    this.from = options.from;
    this.to = options.to;
    this.durationMs = Math.max(1, options.durationMs);
    this.elapsedMs = 0;
    this.easing = options.easing || 'linear';
    this.yoyo = options.yoyo || false;
    this.loop = options.loop || false;
    this.active = true;
    this.isReversing = false;
    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;
  }

  public update(dtMs: number): boolean {
    if (!this.active || !this.target) return false;

    this.elapsedMs += dtMs;
    let progress = Math.min(1, this.elapsedMs / this.durationMs);

    if (this.isReversing) {
      progress = 1 - progress;
    }

    const easedT = TweenEngine.getEasedValue(progress, this.easing);
    const currentValue = this.from + (this.to - this.from) * easedT;

    // Apply property value to target object
    if (typeof this.target[this.property] === 'number') {
      this.target[this.property] = currentValue;
    }

    if (this.onUpdate) {
      this.onUpdate(currentValue);
    }

    if (this.elapsedMs >= this.durationMs) {
      if (this.yoyo) {
        this.isReversing = !this.isReversing;
        this.elapsedMs = 0;
      } else if (this.loop) {
        this.elapsedMs = 0;
      } else {
        this.active = false;
        if (this.onComplete) this.onComplete();
        return false;
      }
    }

    return true;
  }
}

export class TweenEngine {
  private static instancePool: Tween[] = [];
  private static activeTweens: Tween[] = [];
  private static nextTweenId = 1;

  constructor() {
    // Pre-allocate 32 tweens in pool to prevent runtime allocation
    for (let i = 0; i < 32; i++) {
      TweenEngine.instancePool.push(new Tween());
    }
  }

  /**
   * Creates or reuses a Tween from object pool
   */
  public static create(options: TweenOptions): number {
    let tween = this.instancePool.pop();
    if (!tween) {
      tween = new Tween();
    }
    const id = this.nextTweenId++;
    tween.reset(options, id);
    this.activeTweens.push(tween);
    return id;
  }

  /**
   * Advances all active tweens by dtMs (milliseconds)
   */
  public static update(dtMs: number): void {
    for (let i = this.activeTweens.length - 1; i >= 0; i--) {
      const tween = this.activeTweens[i];
      const running = tween.update(dtMs);
      if (!running) {
        this.activeTweens.splice(i, 1);
        this.instancePool.push(tween);
      }
    }
  }

  /**
   * Stops a specific tween by ID
   */
  public static kill(id: number): void {
    const idx = this.activeTweens.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const tween = this.activeTweens[idx];
      tween.active = false;
      this.activeTweens.splice(idx, 1);
      this.instancePool.push(tween);
    }
  }

  /**
   * Clears all active tweens
   */
  public static killAll(): void {
    while (this.activeTweens.length > 0) {
      const tween = this.activeTweens.pop()!;
      tween.active = false;
      this.instancePool.push(tween);
    }
  }

  /**
   * Evaluates Easing formula for normalized t in [0, 1]
   */
  public static getEasedValue(t: number, easing: EasingType): number {
    switch (easing) {
      case 'easeInQuad':
        return t * t;
      case 'easeOutQuad':
        return t * (2 - t);
      case 'easeInOutQuad':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'easeInCubic':
        return t * t * t;
      case 'easeOutCubic':
        return --t * t * t + 1;
      case 'easeInSine':
        return 1 - Math.cos((t * Math.PI) / 2);
      case 'easeOutSine':
        return Math.sin((t * Math.PI) / 2);
      case 'easeOutBack': {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      }
      case 'easeOutBounce': {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
          return n1 * t * t;
        } else if (t < 2 / d1) {
          return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
          return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
          return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
      }
      case 'easeOutElastic': {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      }
      case 'springBouncy':
        return SpringPhysicsEngine.evaluateSpringAnalytical(t, SpringPhysicsEngine.PRESETS.bouncyUI);
      case 'springSnappy':
        return SpringPhysicsEngine.evaluateSpringAnalytical(t, SpringPhysicsEngine.PRESETS.snappyUI);
      case 'springLoose':
        return SpringPhysicsEngine.evaluateSpringAnalytical(t, SpringPhysicsEngine.PRESETS.looseUI);
      case 'springCharacter':
        return SpringPhysicsEngine.evaluateSpringAnalytical(t, SpringPhysicsEngine.PRESETS.characterLand);
      case 'linear':
      default:
        return t;
    }
  }
}
