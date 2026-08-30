/**
 * CoreRegistry.ts
 * Master Unified Engine Registry & Data Normalization Pipeline
 * 
 * Unifies all Constants, Enums, Variable Definitions, Audio Specs, Physics Parameters,
 * Asset Schemas, Vector Pools, and Security Sanitizers into a Single Source of Truth.
 *
 * Optimized specifically for Android entry-level ARM Cortex-A55 CPUs (itel A70).
 */

import { Entity, TransformComponent, RigidbodyComponent, ColliderComponent, SpriteComponent, GameVariable, AudioAsset, ImageAsset } from '../types/engine';

// ============================================================================
// 1. UNIFIED SYSTEM CONSTANTS & LIMITS
// ============================================================================
export const SYSTEM_LIMITS = {
  MAX_ENTITIES: 256,
  MAX_PARTICLES: 300,
  MAX_DELTA_TIME_SEC: 0.1, // Clamp delta time to prevent physics tunneling
  DEFAULT_FPS: 60,
  TARGET_FRAME_TIME_MS: 16.666,
  MAX_DPR_MOBILE: 1.5,
  AUDIO_MAX_GAIN: 1.0,
  AUDIO_DEFAULT_VOLUME: 0.8,
  SPATIAL_HASH_CELL_SIZE: 64,
  MAX_VARIABLE_NAME_LENGTH: 32,
  MAX_STRING_VAR_LENGTH: 256,
  MATH_EPSILON: 1e-6,
} as const;

// ============================================================================
// 2. UNIFIED TYPE DEFINITIONS & CATEGORY REGISTRIES
// ============================================================================
export const ENTITY_TYPE_REGISTRY = {
  PLAYER: 'player',
  ENEMY: 'enemy',
  PLATFORM: 'platform',
  COIN: 'coin',
  HAZARD: 'hazard',
  UI_TEXT: 'ui_text',
  JOYSTICK: 'joystick',
  TRIGGER: 'trigger',
  PARTICLE_EMITTER: 'particle_emitter',
} as const;

export const PHYSICS_PRESET_REGISTRY = {
  STATIC_SOLID: { bodyType: 'static', gravityScale: 0, friction: 0.2, restitution: 0, isTrigger: false },
  DYNAMIC_ACTOR: { bodyType: 'dynamic', gravityScale: 1, friction: 0.1, restitution: 0.1, isTrigger: false },
  COLLECTIBLE_COIN: { bodyType: 'static', gravityScale: 0, friction: 0, restitution: 0.5, isTrigger: true },
  HAZARD_SPIKE: { bodyType: 'static', gravityScale: 0, friction: 0, restitution: 0, isTrigger: true },
  TRIGGER_SENSOR: { bodyType: 'static', gravityScale: 0, friction: 0, restitution: 0, isTrigger: true },
} as const;

export const AUDIO_PRESET_REGISTRY = {
  JUMP: 'jump',
  COIN: 'coin',
  HIT: 'hit',
  POWERUP: 'powerup',
  GAME_OVER: 'gameover',
  CLICK: 'click',
  EXPLOSION: 'explosion',
  STEP: 'step',
  VICTORY: 'victory',
} as const;

export const VARIABLE_TYPES = {
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  STRING: 'string',
} as const;

// ============================================================================
// 3. ZERO-ALLOCATION VECTOR & BOUNDS POOLS (Prevent GC Stutter on itel A70)
// ============================================================================
export interface PooledVector2D {
  x: number;
  y: number;
}

export interface PooledAABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

class VectorPoolEngine {
  private pool2D: PooledVector2D[] = Array.from({ length: 64 }, () => ({ x: 0, y: 0 }));
  private poolIdx = 0;

  private aabbPool: PooledAABB[] = Array.from({ length: 32 }, () => ({ minX: 0, minY: 0, maxX: 0, maxY: 0 }));
  private aabbIdx = 0;

  public getVector2D(x = 0, y = 0): PooledVector2D {
    const vec = this.pool2D[this.poolIdx];
    this.poolIdx = (this.poolIdx + 1) % this.pool2D.length;
    vec.x = x;
    vec.y = y;
    return vec;
  }

  public getAABB(minX = 0, minY = 0, maxX = 0, maxY = 0): PooledAABB {
    const box = this.aabbPool[this.aabbIdx];
    this.aabbIdx = (this.aabbIdx + 1) % this.aabbPool.length;
    box.minX = minX;
    box.minY = minY;
    box.maxX = maxX;
    box.maxY = maxY;
    return box;
  }
}

export const vectorPool = new VectorPoolEngine();

// ============================================================================
// 4. UNIFIED SANITIZERS & VALIDATORS (Security & Logic Stability)
// ============================================================================
export class CoreRegistryValidator {
  /**
   * Sanitize text input string (prevent XSS, injection, or illegal characters)
   */
  public static sanitizeString(input: string, maxLen = 256): string {
    if (!input) return '';
    return String(input)
      .replace(/[\langle\rangle]/g, '')
      .trim()
      .substring(0, maxLen);
  }

  /**
   * Validate and clamp numeric bounds cleanly
   */
  public static clampNumber(val: any, fallback = 0, min = -1e9, max = 1e9): number {
    const num = typeof val === 'number' && !isNaN(val) ? val : parseFloat(val);
    if (isNaN(num)) return fallback;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Validate boolean strictly
   */
  public static coerceBoolean(val: any, fallback = false): boolean {
    if (typeof val === 'boolean') return val;
    if (val === 'true' || val === 1 || val === '1') return true;
    if (val === 'false' || val === 0 || val === '0') return false;
    return fallback;
  }

  /**
   * Normalize transform properties safely
   */
  public static normalizeTransform(t?: Partial<TransformComponent>): TransformComponent {
    return {
      x: this.clampNumber(t?.x, 0),
      y: this.clampNumber(t?.y, 0),
      width: this.clampNumber(t?.width, 32, 1, 4096),
      height: this.clampNumber(t?.height, 32, 1, 4096),
      rotation: this.clampNumber(t?.rotation, 0, -360, 360),
      scaleX: this.clampNumber(t?.scaleX, 1, 0.01, 100),
      scaleY: this.clampNumber(t?.scaleY, 1, 0.01, 100),
      zIndex: Math.round(this.clampNumber(t?.zIndex, 1, -999, 9999)),
    };
  }

  /**
   * Normalize Rigidbody Component safely
   */
  public static normalizeRigidbody(rb?: Partial<RigidbodyComponent>): RigidbodyComponent {
    return {
      bodyType: rb?.bodyType === 'dynamic' || rb?.bodyType === 'kinematic' ? rb.bodyType : 'static',
      mass: this.clampNumber(rb?.mass, 1, 0.01, 1000),
      gravityScale: this.clampNumber(rb?.gravityScale, 1, -10, 10),
      velocityX: this.clampNumber(rb?.velocityX, 0, -2000, 2000),
      velocityY: this.clampNumber(rb?.velocityY, 0, -2000, 2000),
      friction: this.clampNumber(rb?.friction, 0.1, 0, 1),
      restitution: this.clampNumber(rb?.restitution, 0, 0, 1),
      isGrounded: this.coerceBoolean(rb?.isGrounded, false),
      fixedRotation: this.coerceBoolean(rb?.fixedRotation, true),
    };
  }

  /**
   * Normalize Collider Component safely
   */
  public static normalizeCollider(col?: Partial<ColliderComponent>, defaultW = 32, defaultH = 32): ColliderComponent {
    return {
      enabled: this.coerceBoolean(col?.enabled, true),
      type: col?.type === 'circle' ? 'circle' : 'box',
      isTrigger: this.coerceBoolean(col?.isTrigger, false),
      offsetX: this.clampNumber(col?.offsetX, 0, -512, 512),
      offsetY: this.clampNumber(col?.offsetY, 0, -512, 512),
      width: this.clampNumber(col?.width, defaultW, 1, 2048),
      height: this.clampNumber(col?.height, defaultH, 1, 2048),
      radius: this.clampNumber(col?.radius, Math.min(defaultW, defaultH) / 2, 1, 1024),
    };
  }

  /**
   * Complete Entity Sanitization & Validation Pipeline
   */
  public static sanitizeEntity(raw: Partial<Entity>, idx = 0): Entity {
    const id = raw.id ? this.sanitizeString(raw.id, 64) : `ent_${Date.now()}_${idx}`;
    const name = raw.name ? this.sanitizeString(raw.name, 48) : `Entity_${idx + 1}`;
    const type = raw.type || 'platform';

    const transform = this.normalizeTransform(raw.transform);
    const rigidbody = this.normalizeRigidbody(raw.rigidbody);
    const collider = this.normalizeCollider(raw.collider, transform.width, transform.height);

    const sprite: SpriteComponent = {
      type: raw.sprite?.type || 'preset',
      color: raw.sprite?.color || '#38bdf8',
      presetIcon: raw.sprite?.presetIcon || 'box',
      pixelData: raw.sprite?.pixelData,
      animatedFrames: raw.sprite?.animatedFrames,
      animationFps: this.clampNumber(raw.sprite?.animationFps, 8, 1, 60),
      imageAssetId: raw.sprite?.imageAssetId,
      videoAssetId: raw.sprite?.videoAssetId,
      opacity: this.clampNumber(raw.sprite?.opacity, 1, 0, 1),
      borderRadius: this.clampNumber(raw.sprite?.borderRadius, 0, 0, 100),
    };

    return {
      id,
      name,
      type,
      visible: this.coerceBoolean(raw.visible, true),
      locked: this.coerceBoolean(raw.locked, false),
      transform,
      sprite,
      rigidbody,
      collider,
      audioSource: raw.audioSource,
      script: {
        tag: raw.script?.tag ? this.sanitizeString(raw.script.tag, 32) : type,
        rules: Array.isArray(raw.script?.rules) ? raw.script!.rules : [],
      },
      health: this.clampNumber(raw.health, 100, 1, 9999),
      maxHealth: this.clampNumber(raw.maxHealth, 100, 1, 9999),
      customVariables: raw.customVariables || {},
      text: raw.text,
    };
  }
}
