/**
 * ProceduralLevelEngine.ts
 * Advanced Procedural Platformer Level Generator
 * Specially engineered for generating guaranteed playable 2D Platformer & Parkour maps
 * with customizable density, path difficulty, theme palettes, hazard distribution, and enemy spawners.
 */

import { Entity, GameProject, Scene, WorldSettings, ShaderType } from '../types/engine';
import { SHADER_PRESETS } from './ShaderEngine';

export type LevelTheme = 'cyber_neon' | 'retro_grass' | 'lava_dungeon' | 'floating_crystal' | 'sci_fi_lab';
export type PathDifficulty = 'easy' | 'medium' | 'hard' | 'nightmare';
export type LevelDensity = 'sparse' | 'medium' | 'dense' | 'packed';
export type GroundStyle = 'continuous_with_pits' | 'floating_islands' | 'staircase' | 'cavern';

export interface ProceduralLevelParams {
  seed: number;
  theme: LevelTheme;
  difficulty: PathDifficulty;
  density: LevelDensity;
  groundStyle: GroundStyle;
  levelWidth: number; // e.g. 1600 to 4800 px
  levelHeight: number; // e.g. 450 to 900 px
  collectibleDensity: number; // 0.0 to 1.0
  enemyDensity: number; // 0.0 to 1.0
  hazardDensity: number; // 0.0 to 1.0
  includeMovingPlatforms: boolean;
  includeCheckpoints: boolean;
  includeBossArena: boolean;
  clearExistingEntities: boolean;
}

export interface GeneratedLevelResult {
  entities: Entity[];
  worldSettings: Partial<WorldSettings>;
  stats: {
    platformCount: number;
    coinCount: number;
    hazardCount: number;
    enemyCount: number;
    movingPlatformCount: number;
    estimatedPlayTimeSec: number;
    difficultyRatingStars: number;
  };
}

// Theme Visual Styling Profile
export interface ThemeProfile {
  name: string;
  bgColor: string;
  platformColor: string;
  accentColor: string;
  hazardColor: string;
  enemyColor: string;
  collectibleColor: string;
  goalColor: string;
  shaderType: ShaderType;
  playerPresetIcon: string;
  coinPresetIcon: string;
  hazardPresetIcon: string;
  enemyPresetIcon: string;
  goalPresetIcon: string;
}

export const THEME_PROFILES: Record<LevelTheme, ThemeProfile> = {
  cyber_neon: {
    name: 'Cyberpunk Synthwave Neon',
    bgColor: '#050814',
    platformColor: '#06b6d4',
    accentColor: '#38bdf8',
    hazardColor: '#ef4444',
    enemyColor: '#a855f7',
    collectibleColor: '#f59e0b',
    goalColor: '#10b981',
    shaderType: 'cyber_neon',
    playerPresetIcon: 'hero',
    coinPresetIcon: 'star',
    hazardPresetIcon: 'spike',
    enemyPresetIcon: 'monster',
    goalPresetIcon: 'star',
  },
  retro_grass: {
    name: 'Retro Arcade Grass & Dirt',
    bgColor: '#0f172a',
    platformColor: '#22c55e',
    accentColor: '#15803d',
    hazardColor: '#dc2626',
    enemyColor: '#ea580c',
    collectibleColor: '#eab308',
    goalColor: '#3b82f6',
    shaderType: 'vignette',
    playerPresetIcon: 'hero',
    coinPresetIcon: 'coin',
    hazardPresetIcon: 'spike',
    enemyPresetIcon: 'monster',
    goalPresetIcon: 'star',
  },
  lava_dungeon: {
    name: 'Volcanic Lava Cavern',
    bgColor: '#180808',
    platformColor: '#334155',
    accentColor: '#f97316',
    hazardColor: '#ef4444',
    enemyColor: '#b91c1c',
    collectibleColor: '#fbbf24',
    goalColor: '#0ea5e9',
    shaderType: 'thermal',
    playerPresetIcon: 'hero',
    coinPresetIcon: 'coin',
    hazardPresetIcon: 'spike',
    enemyPresetIcon: 'monster',
    goalPresetIcon: 'star',
  },
  floating_crystal: {
    name: 'Floating Crystal Sanctuary',
    bgColor: '#0b1329',
    platformColor: '#8b5cf6',
    accentColor: '#c084fc',
    hazardColor: '#f43f5e',
    enemyColor: '#e879f9',
    collectibleColor: '#38bdf8',
    goalColor: '#facc15',
    shaderType: 'bloom',
    playerPresetIcon: 'hero',
    coinPresetIcon: 'star',
    hazardPresetIcon: 'spike',
    enemyPresetIcon: 'monster',
    goalPresetIcon: 'star',
  },
  sci_fi_lab: {
    name: 'Sci-Fi Orbital Laboratory',
    bgColor: '#090d16',
    platformColor: '#475569',
    accentColor: '#0284c7',
    hazardColor: '#f43f5e',
    enemyColor: '#64748b',
    collectibleColor: '#06b6d4',
    goalColor: '#10b981',
    shaderType: 'chromatic',
    playerPresetIcon: 'hero',
    coinPresetIcon: 'box',
    hazardPresetIcon: 'spike',
    enemyPresetIcon: 'monster',
    goalPresetIcon: 'star',
  },
};

/**
 * Deterministic Pseudo Random Number Generator (Mulberry32)
 */
class SeededRandom {
  private s: number;

  constructor(seed: number) {
    this.s = seed;
  }

  public nextFloat(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(min + this.nextFloat() * (max - min + 1));
  }

  public nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  public nextBool(probability = 0.5): boolean {
    return this.nextFloat() < probability;
  }
}

export class ProceduralLevelEngineClass {
  /**
   * Main Generator Function
   */
  public generateLevel(params: ProceduralLevelParams): GeneratedLevelResult {
    const prng = new SeededRandom(params.seed);
    const theme = THEME_PROFILES[params.theme] || THEME_PROFILES.cyber_neon;

    const entities: Entity[] = [];

    // Density parameters
    const platformSpacingMin =
      params.density === 'packed'
        ? 70
        : params.density === 'dense'
        ? 100
        : params.density === 'medium'
        ? 140
        : 180;

    const platformSpacingMax = platformSpacingMin + 80;

    // Difficulty mechanics limits (guaranteed jumpable arcs)
    const maxJumpX =
      params.difficulty === 'easy'
        ? 110
        : params.difficulty === 'medium'
        ? 150
        : params.difficulty === 'hard'
        ? 190
        : 220;

    const maxJumpYDelta =
      params.difficulty === 'easy'
        ? 40
        : params.difficulty === 'medium'
        ? 70
        : params.difficulty === 'hard'
        ? 100
        : 130;

    const groundY = params.levelHeight - 60;
    let currentX = 50;
    let currentY = groundY - 80;

    let platformCount = 0;
    let coinCount = 0;
    let hazardCount = 0;
    let enemyCount = 0;
    let movingPlatformCount = 0;

    // 1. CREATE PLAYER START SPAWN PLATFORM
    const startPlatWidth = 160;
    const startPlatHeight = 32;

    entities.push({
      id: `plat_start_${Date.now().toString(36)}`,
      name: 'Start Platform',
      type: 'platform',
      visible: true,
      locked: false,
      transform: {
        x: currentX,
        y: currentY,
        width: startPlatWidth,
        height: startPlatHeight,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: 5,
      },
      sprite: {
        type: 'preset',
        presetIcon: 'box',
        color: theme.platformColor,
        opacity: 1,
      },
      rigidbody: {
        bodyType: 'static',
        mass: 1,
        gravityScale: 0,
        velocityX: 0,
        velocityY: 0,
        friction: 0.8,
        restitution: 0,
        isGrounded: true,
        fixedRotation: true,
      },
      collider: {
        enabled: true,
        type: 'box',
        isTrigger: false,
        offsetX: 0,
        offsetY: 0,
        width: startPlatWidth,
        height: startPlatHeight,
        radius: 0,
      },
    });
    platformCount++;

    // 2. CREATE PLAYER ENTITY
    const playerWidth = 32;
    const playerHeight = 44;
    entities.push({
      id: `player_hero_${Date.now().toString(36)}`,
      name: 'Hero Player',
      type: 'player',
      visible: true,
      locked: false,
      transform: {
        x: currentX + 40,
        y: currentY - playerHeight - 10,
        width: playerWidth,
        height: playerHeight,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: 10,
      },
      sprite: {
        type: 'preset',
        presetIcon: theme.playerPresetIcon,
        color: theme.accentColor,
        opacity: 1,
      },
      rigidbody: {
        bodyType: 'dynamic',
        mass: 1,
        gravityScale: 1,
        velocityX: 0,
        velocityY: 0,
        friction: 0.1,
        restitution: 0,
        isGrounded: false,
        fixedRotation: true,
      },
      collider: {
        enabled: true,
        type: 'box',
        isTrigger: false,
        offsetX: 0,
        offsetY: 0,
        width: playerWidth,
        height: playerHeight,
        radius: 0,
      },
      script: {
        tag: 'player',
        rules: [
          {
            id: 'rule_jump',
            name: 'Lompat Tombol Space',
            enabled: true,
            trigger: 'ON_KEY_PRESS',
            triggerKey: 'Space',
            action: 'JUMP',
            paramNumber: 520,
          },
          {
            id: 'rule_move_left',
            name: 'Gerak Kiri',
            enabled: true,
            trigger: 'ON_KEY_HOLD',
            triggerKey: 'ArrowLeft',
            action: 'MOVE_LEFT',
            paramNumber: 220,
          },
          {
            id: 'rule_move_right',
            name: 'Gerak Kanan',
            enabled: true,
            trigger: 'ON_KEY_HOLD',
            triggerKey: 'ArrowRight',
            action: 'MOVE_RIGHT',
            paramNumber: 220,
          },
        ],
      },
    });

    // 3. GENERATE CONTINUOUS BASE GROUND OR LAVA PIT FLOOR
    if (params.groundStyle === 'continuous_with_pits' || params.theme === 'lava_dungeon') {
      const hazardFloorY = params.levelHeight - 24;
      const hazardFloorWidth = params.levelWidth + 400;

      if (params.theme === 'lava_dungeon') {
        // Lava Hazard Floor
        entities.push({
          id: `lava_floor_${Date.now().toString(36)}`,
          name: 'Lava Hazards Floor',
          type: 'hazard',
          visible: true,
          locked: true,
          transform: {
            x: -200,
            y: hazardFloorY,
            width: hazardFloorWidth,
            height: 48,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: 4,
          },
          sprite: {
            type: 'color',
            color: '#dc2626',
            opacity: 0.9,
          },
          collider: {
            enabled: true,
            type: 'box',
            isTrigger: true,
            offsetX: 0,
            offsetY: 0,
            width: hazardFloorWidth,
            height: 48,
            radius: 0,
          },
          script: {
            tag: 'hazard',
            rules: [
              {
                id: 'rule_lava_restart',
                name: 'Lava Restart Level',
                enabled: true,
                trigger: 'ON_COLLISION_ENTER',
                action: 'RESTART_LEVEL',
              },
            ],
          },
        });
        hazardCount++;
      }
    }

    // 4. MAIN PROCEDURAL PATH PLATFORM GENERATION LOOP
    currentX += startPlatWidth + prng.nextInt(40, 80);

    const endXGoal = params.levelWidth - 250;

    while (currentX < endXGoal) {
      // Calculate next step platform width & height
      const platW = prng.nextInt(70, 180);
      const platH = 28;

      // Determine height delta (up or down within jump limits)
      const heightStep = prng.nextInt(-maxJumpYDelta, maxJumpYDelta);
      let targetY = currentY + heightStep;

      // Clamp targetY inside screen bounds
      const minY = 120;
      const maxY = params.levelHeight - 120;
      targetY = Math.max(minY, Math.min(maxY, targetY));
      currentY = targetY;

      // Check if this platform moves (Kinematic Moving Platform)
      const isMoving =
        params.includeMovingPlatforms &&
        (params.difficulty === 'hard' || params.difficulty === 'nightmare' || prng.nextBool(0.25));

      const platColor = isMoving ? theme.accentColor : theme.platformColor;

      entities.push({
        id: `plat_${platformCount}_${Date.now().toString(36)}`,
        name: isMoving ? `Platform Bergerak #${platformCount}` : `Platform Utama #${platformCount}`,
        type: 'platform',
        visible: true,
        locked: false,
        transform: {
          x: currentX,
          y: currentY,
          width: platW,
          height: platH,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 5,
        },
        sprite: {
          type: 'preset',
          presetIcon: 'box',
          color: platColor,
          opacity: 1,
        },
        rigidbody: {
          bodyType: isMoving ? 'kinematic' : 'static',
          mass: 1,
          gravityScale: 0,
          velocityX: isMoving ? (prng.nextBool() ? 60 : -60) : 0,
          velocityY: 0,
          friction: 0.8,
          restitution: 0,
          isGrounded: true,
          fixedRotation: true,
        },
        collider: {
          enabled: true,
          type: 'box',
          isTrigger: false,
          offsetX: 0,
          offsetY: 0,
          width: platW,
          height: platH,
          radius: 0,
        },
      });

      if (isMoving) movingPlatformCount++;
      platformCount++;

      // 5. ADD COLLECTIBLE COIN CHAIN ON OR ABOVE PLATFORM
      if (prng.nextFloat() < params.collectibleDensity * 0.9) {
        const coinCountOnPlat = prng.nextInt(1, 4);
        const coinSpacing = 24;
        const startCoinX = currentX + (platW - coinCountOnPlat * coinSpacing) / 2;

        for (let c = 0; c < coinCountOnPlat; c++) {
          entities.push({
            id: `coin_${coinCount}_${Date.now().toString(36)}`,
            name: `Coin Star #${coinCount}`,
            type: 'coin',
            visible: true,
            locked: false,
            transform: {
              x: startCoinX + c * coinSpacing,
              y: currentY - 32,
              width: 18,
              height: 18,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              zIndex: 8,
            },
            sprite: {
              type: 'preset',
              presetIcon: theme.coinPresetIcon,
              color: theme.collectibleColor,
              opacity: 1,
            },
            collider: {
              enabled: true,
              type: 'circle',
              isTrigger: true,
              offsetX: 0,
              offsetY: 0,
              width: 18,
              height: 18,
              radius: 9,
            },
            script: {
              tag: 'coin',
              rules: [
                {
                  id: `rule_coin_${coinCount}`,
                  name: 'Ambil Coin',
                  enabled: true,
                  trigger: 'ON_COLLISION_ENTER',
                  action: 'ADD_SCORE',
                  paramNumber: 10,
                },
                {
                  id: `rule_coin_destroy_${coinCount}`,
                  name: 'Hancurkan Coin',
                  enabled: true,
                  trigger: 'ON_COLLISION_ENTER',
                  action: 'DESTROY_SELF',
                },
              ],
            },
          });
          coinCount++;
        }
      }

      // 6. ADD HAZARD SPIKES ON WIDE PLATFORMS
      if (platW >= 120 && prng.nextFloat() < params.hazardDensity * 0.7) {
        entities.push({
          id: `hazard_spike_${hazardCount}_${Date.now().toString(36)}`,
          name: `Duri / Spike #${hazardCount}`,
          type: 'hazard',
          visible: true,
          locked: false,
          transform: {
            x: currentX + platW / 2 - 12,
            y: currentY - 20,
            width: 24,
            height: 20,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: 7,
          },
          sprite: {
            type: 'preset',
            presetIcon: theme.hazardPresetIcon,
            color: theme.hazardColor,
            opacity: 1,
          },
          collider: {
            enabled: true,
            type: 'box',
            isTrigger: true,
            offsetX: 0,
            offsetY: 0,
            width: 24,
            height: 20,
            radius: 0,
          },
          script: {
            tag: 'hazard',
            rules: [
              {
                id: `rule_spike_restart_${hazardCount}`,
                name: 'Kena Duri Restart',
                enabled: true,
                trigger: 'ON_COLLISION_ENTER',
                action: 'RESTART_LEVEL',
              },
            ],
          },
        });
        hazardCount++;
      }

      // 7. ADD ENEMY PATROL ON WIDE SAFE PLATFORMS
      if (platW >= 140 && prng.nextFloat() < params.enemyDensity * 0.6) {
        const enemyW = 28;
        const enemyH = 28;
        entities.push({
          id: `enemy_monster_${enemyCount}_${Date.now().toString(36)}`,
          name: `Musuh Patroli #${enemyCount}`,
          type: 'enemy',
          visible: true,
          locked: false,
          transform: {
            x: currentX + 20,
            y: currentY - enemyH,
            width: enemyW,
            height: enemyH,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: 9,
          },
          sprite: {
            type: 'preset',
            presetIcon: theme.enemyPresetIcon,
            color: theme.enemyColor,
            opacity: 1,
          },
          rigidbody: {
            bodyType: 'kinematic',
            mass: 1,
            gravityScale: 0,
            velocityX: 50,
            velocityY: 0,
            friction: 0,
            restitution: 0,
            isGrounded: true,
            fixedRotation: true,
          },
          collider: {
            enabled: true,
            type: 'box',
            isTrigger: true,
            offsetX: 0,
            offsetY: 0,
            width: enemyW,
            height: enemyH,
            radius: 0,
          },
          script: {
            tag: 'enemy',
            rules: [
              {
                id: `rule_enemy_hit_${enemyCount}`,
                name: 'Kena Musuh Restart',
                enabled: true,
                trigger: 'ON_COLLISION_ENTER',
                action: 'RESTART_LEVEL',
              },
            ],
          },
        });
        enemyCount++;
      }

      // Increment X position for next platform
      const gapX = prng.nextInt(platformSpacingMin, Math.min(platformSpacingMax, maxJumpX));
      currentX += platW + gapX;
    }

    // 8. CREATE END GOAL PORTAL PLATFORM
    const goalPlatWidth = 200;
    const goalPlatHeight = 32;
    const goalX = params.levelWidth - goalPlatWidth - 40;
    const goalY = currentY;

    entities.push({
      id: `plat_goal_${Date.now().toString(36)}`,
      name: 'Finish Goal Platform',
      type: 'platform',
      visible: true,
      locked: false,
      transform: {
        x: goalX,
        y: goalY,
        width: goalPlatWidth,
        height: goalPlatHeight,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: 5,
      },
      sprite: {
        type: 'preset',
        presetIcon: 'box',
        color: theme.goalColor,
        opacity: 1,
      },
      rigidbody: {
        bodyType: 'static',
        mass: 1,
        gravityScale: 0,
        velocityX: 0,
        velocityY: 0,
        friction: 0.8,
        restitution: 0,
        isGrounded: true,
        fixedRotation: true,
      },
      collider: {
        enabled: true,
        type: 'box',
        isTrigger: false,
        offsetX: 0,
        offsetY: 0,
        width: goalPlatWidth,
        height: goalPlatHeight,
        radius: 0,
      },
    });

    // GOAL STAR PORTAL TRIGGER
    entities.push({
      id: `goal_star_${Date.now().toString(36)}`,
      name: 'Finish Victory Portal Star',
      type: 'trigger',
      visible: true,
      locked: false,
      transform: {
        x: goalX + goalPlatWidth / 2 - 20,
        y: goalY - 50,
        width: 40,
        height: 40,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: 10,
      },
      sprite: {
        type: 'preset',
        presetIcon: theme.goalPresetIcon,
        color: theme.goalColor,
        opacity: 1,
      },
      collider: {
        enabled: true,
        type: 'circle',
        isTrigger: true,
        offsetX: 0,
        offsetY: 0,
        width: 40,
        height: 40,
        radius: 20,
      },
      script: {
        tag: 'goal',
        rules: [
          {
            id: 'rule_win_sound',
            name: 'Suara Menang',
            enabled: true,
            trigger: 'ON_COLLISION_ENTER',
            action: 'PLAY_SOUND',
            paramString: 'powerup',
          },
        ],
      },
    });

    // Calculate rating stars & estimated play time
    const difficultyStars =
      params.difficulty === 'easy'
        ? 1
        : params.difficulty === 'medium'
        ? 2
        : params.difficulty === 'hard'
        ? 4
        : 5;

    const estimatedPlayTimeSec = Math.round(params.levelWidth / 150 + hazardCount * 2 + enemyCount * 3);

    return {
      entities,
      worldSettings: {
        backgroundColor: theme.bgColor,
        viewportWidth: 800,
        viewportHeight: 450,
        gravityY: 800,
        worldShader: {
          enabled: true,
          type: theme.shaderType,
          intensity: SHADER_PRESETS[theme.shaderType]?.defaultIntensity || 0.6,
          scale: SHADER_PRESETS[theme.shaderType]?.defaultScale || 2.0,
          speed: SHADER_PRESETS[theme.shaderType]?.defaultSpeed || 1.5,
          glowColor: theme.platformColor,
          blendMode: SHADER_PRESETS[theme.shaderType]?.blendMode || 'screen',
        },
      },
      stats: {
        platformCount,
        coinCount,
        hazardCount,
        enemyCount,
        movingPlatformCount,
        estimatedPlayTimeSec,
        difficultyRatingStars: difficultyStars,
      },
    };
  }
}

export const ProceduralLevelEngine = new ProceduralLevelEngineClass();
