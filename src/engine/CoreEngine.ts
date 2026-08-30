import {
  Entity,
  WorldSettings,
  ProfilerStats,
  LogicRule,
  AudioAsset,
  TilemapComponent,
  GameVariable,
  DialogueTree,
  TutorialSequence,
  PhysicsJoint,
  GameProject,
} from '../types/engine';
import { VariableManager } from './VariableManager';
import { soundEngine } from './AudioEngine';
import { generateTilePixelData } from './AutoTileEngine';
import { AndroidEngine } from './AndroidEngine';
import { DesktopEngine } from './DesktopEngine';
import { PhysicsEngine } from './PhysicsEngine';
import { SpatialHashGrid } from './AlgorithmEngine';
import { TweenEngine } from './TweenEngine';
import { ParticleEngine } from './ParticleEngine';
import { AnimationEngine } from './AnimationEngine';
import { DialogueEngine } from './DialogueEngine';
import { SceneEngine } from './SceneEngine';
import { TutorialEngine } from './TutorialEngine';
import { canvasCacheEngine } from './CanvasCacheEngine';
import { tilemapAtlasEngine } from './TilemapAtlasEngine';
import { isometricEngine } from './IsometricEngine';
import { MobileDeviceEngine } from './MobileDeviceEngine';
import { assetManager } from './AssetManager';
import { ShaderEngine } from './ShaderEngine';
import { snappingEngine } from './SnappingEngine';
import { MathEngine } from './MathEngine';
import { SaveLoadEngine } from './SaveLoadEngine';
import { LiteOptimizationEngine } from './LiteOptimizationEngine';
import { memoryGuardian } from './MemoryGuardianEngine';
import { unifiedGameContext } from './UnifiedGameContext';
import { LightingEngine } from './LightingEngine';
import { Pseudo3DAnimationEngine } from './Pseudo3DAnimationEngine';
import { SpringPhysicsEngine } from './SpringPhysicsEngine';
import { ultraRealityEngine } from './UltraRealityEngine';

export class CoreEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private entities: Entity[] = [];
  private world: WorldSettings;
  private audioAssets: AudioAsset[] = [];
  private gameVariables: GameVariable[] = VariableManager.getDefaultVariables();
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private physicsEngine: PhysicsEngine = new PhysicsEngine();
  private desktopEngine: DesktopEngine = new DesktopEngine();
  private animationEngine: AnimationEngine = new AnimationEngine();
  private dialogueEngine: DialogueEngine = new DialogueEngine();
  private sceneEngine: SceneEngine = new SceneEngine();
  private tutorialEngine: TutorialEngine = new TutorialEngine();
  private mobileEngine: MobileDeviceEngine = new MobileDeviceEngine();
  private projectDialogues: DialogueTree[] = [];
  private projectTutorials: TutorialSequence[] = [];
  private constraints: PhysicsJoint[] = [];
  private entityLookupMap: Map<string, Entity> = new Map();
  private ruleTimerMap: Map<string, number> = new Map();
  private firedScoreTriggers: Set<string> = new Set();


  // Camera & Viewport State
  private cameraX: number = 0;
  private cameraY: number = 0;
  private zoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private shakeIntensity: number = 0;
  private shakeDurationMs: number = 0;
  private entityParticleTimers: Map<string, number> = new Map();

  // Selection / Gizmo / Dragging State in Editor
  private selectedEntityId: string | null = null;
  private selectedEntityIds: Set<string> = new Set();
  private draggingEntityId: string | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private lastDragCoords: { x: number; y: number } = { x: 0, y: 0 };
  private longPressTimer: number | null = null;
  private longPressTriggered: boolean = false;

  // Performance Profiler Metrics
  public stats: ProfilerStats = {
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 0,
    activeEntities: 0,
    activeParticles: 0,
    bufferMemoryKb: 64,
    gcCallsPrevented: 1240,
  };

  // TypedArray Buffers for Physics Allocation Guard (Zero Garbage Collection overhead)
  private physicsBuffer: Float32Array; // [posX, posY, velX, velY, mass, invMass, rest, friction] * MAX_ENTITIES
  private particleBuffer: Float32Array; // [x, y, vx, vy, life, maxLife, size, colorIndex] * MAX_PARTICLES
  private maxEntities = 256;
  private maxParticles = 300;

  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  // Runtime Score State
  public currentScore: number = 0;
  public onScoreChange?: (score: number) => void;
  public onSelectEntity?: (entityId: string | null) => void;
  public onSelectMultiEntities?: (ids: string[]) => void;
  public onUpdateEntity?: (updated: Entity) => void;
  public onDragStart?: (entityId: string) => void;
  public onDragEnd?: (entityId: string) => void;

  // Touch / Input State
  private touchInputs: {
    touching: boolean;
    x: number;
    y: number;
    touchDownThisFrame: boolean;
    startX?: number;
    startY?: number;
    startTime?: number;
  } = {
    touching: false,
    x: 0,
    y: 0,
    touchDownThisFrame: false,
    startX: 0,
    startY: 0,
    startTime: 0,
  };
  private activeKeys = new Set<string>();

  constructor(canvas: HTMLCanvasElement, world: WorldSettings) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) throw new Error('Cannot get 2D canvas context');
    this.ctx = context;
    this.world = world;

    MathEngine.init();

    // Allocate contiguous TypedArray buffers for itel A70 binary performance
    this.physicsBuffer = new Float32Array(this.maxEntities * 8);
    this.particleBuffer = new Float32Array(this.maxParticles * 8);
    this.stats.bufferMemoryKb = Math.round((this.physicsBuffer.byteLength + this.particleBuffer.byteLength) / 1024);

    this.bindInputs();
  }

  public loadProject(project: GameProject) {
    this.world = JSON.parse(JSON.stringify(project.world));
    this.entities = JSON.parse(JSON.stringify(project.entities || []));
    this.audioAssets = project.assets?.audio ? JSON.parse(JSON.stringify(project.assets.audio)) : [];
    this.gameVariables = project.variables ? JSON.parse(JSON.stringify(project.variables)) : VariableManager.getDefaultVariables();
    this.projectDialogues = project.dialogues ? JSON.parse(JSON.stringify(project.dialogues)) : [];
    this.projectTutorials = project.tutorials ? JSON.parse(JSON.stringify(project.tutorials)) : [];
    this.constraints = (project.constraints || project.joints) ? JSON.parse(JSON.stringify(project.constraints || project.joints)) : [];

    this.isPlaying = false;
    this.isPaused = false;
    this.currentScore = 0;
    this.cameraX = 0;
    this.cameraY = 0;
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.shakeDurationMs = 0;
    this.shakeIntensity = 0;
    this.particles = [];
    ParticleEngine.clear();
    this.ruleTimerMap.clear();
    this.firedScoreTriggers.clear();
    this.entityParticleTimers.clear();

    const firstId = this.entities.length > 0 ? this.entities[0].id : null;
    this.selectedEntityId = firstId;
    this.selectedEntityIds = new Set(firstId ? [firstId] : []);

    this.syncPhysicsBuffer();
    unifiedGameContext.reindexEntities(this.entities);
    unifiedGameContext.syncVariables(this.gameVariables);
    canvasCacheEngine.invalidate();

    soundEngine.stopBGM();
    this.dialogueEngine.closeDialogue();
    this.tutorialEngine.stopTutorial();
    this.sceneEngine.reset();
  }

  public resetView() {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.cameraX = 0;
    this.cameraY = 0;
    this.shakeDurationMs = 0;
    this.shakeIntensity = 0;
    canvasCacheEngine.invalidate();
  }

  public resetCamera() {
    this.cameraX = 0;
    this.cameraY = 0;
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
  }

  public setEntities(entities: Entity[]) {
    // Clone entities for runtime physics simulation reset
    this.entities = JSON.parse(JSON.stringify(entities));
    this.syncPhysicsBuffer();
    unifiedGameContext.reindexEntities(this.entities);
    canvasCacheEngine.invalidate();
  }

  public setWorldSettings(world: WorldSettings) {
    this.world = world;
    canvasCacheEngine.invalidate();
  }

  public setAudioAssets(assets: AudioAsset[]) {
    this.audioAssets = assets || [];
  }

  public setGameVariables(variables: GameVariable[]) {
    this.gameVariables = variables || [];
    unifiedGameContext.syncVariables(this.gameVariables);
  }

  public setDialogues(dialogues?: DialogueTree[]) {
    this.projectDialogues = dialogues || [];
  }

  public setTutorials(tutorials?: TutorialSequence[]) {
    this.projectTutorials = tutorials || [];
  }

  public setConstraints(constraints?: PhysicsJoint[]) {
    this.constraints = constraints || [];
    canvasCacheEngine.invalidate();
  }

  public getGameVariables(): GameVariable[] {
    return this.gameVariables;
  }

  public setSelectedEntityId(id: string | null) {
    this.selectedEntityId = id;
    if (id === null) {
      this.selectedEntityIds.clear();
    } else {
      this.selectedEntityIds = new Set([id]);
    }
    canvasCacheEngine.invalidate();
  }

  public setSelectedEntityIds(ids: string[]) {
    this.selectedEntityIds = new Set(ids);
    this.selectedEntityId = ids.length > 0 ? ids[ids.length - 1] : null;
    canvasCacheEngine.invalidate();
  }

  public toggleSelectEntityId(id: string) {
    if (this.selectedEntityIds.has(id)) {
      this.selectedEntityIds.delete(id);
    } else {
      this.selectedEntityIds.add(id);
    }
    this.selectedEntityId =
      this.selectedEntityIds.size > 0
        ? Array.from(this.selectedEntityIds)[this.selectedEntityIds.size - 1]
        : null;
    canvasCacheEngine.invalidate();
  }

  public getSelectedEntityIds(): string[] {
    return Array.from(this.selectedEntityIds);
  }

  public clearMultiSelection() {
    this.selectedEntityId = null;
    this.selectedEntityIds.clear();
    canvasCacheEngine.invalidate();
  }

  public bringToFront(targetEntityId?: string | null): Entity | null {
    const id = targetEntityId || this.selectedEntityId;
    if (!id) return null;

    const target = this.entities.find((e) => e.id === id);
    if (!target) return null;

    const maxZ = Math.max(...this.entities.map((e) => e.transform.zIndex || 0), 0);
    const newZ = maxZ + 1;

    const updated: Entity = {
      ...target,
      transform: { ...target.transform, zIndex: newZ },
    };

    this.entities = this.entities.map((e) => (e.id === id ? updated : e));
    canvasCacheEngine.invalidate();
    if (this.onUpdateEntity) this.onUpdateEntity(updated);
    AndroidEngine.triggerHaptic(25);
    return updated;
  }

  public sendToBack(targetEntityId?: string | null): Entity | null {
    const id = targetEntityId || this.selectedEntityId;
    if (!id) return null;

    const target = this.entities.find((e) => e.id === id);
    if (!target) return null;

    const minZ = Math.min(...this.entities.map((e) => e.transform.zIndex || 0), 0);
    const newZ = minZ - 1;

    const updated: Entity = {
      ...target,
      transform: { ...target.transform, zIndex: newZ },
    };

    this.entities = this.entities.map((e) => (e.id === id ? updated : e));
    canvasCacheEngine.invalidate();
    if (this.onUpdateEntity) this.onUpdateEntity(updated);
    AndroidEngine.triggerHaptic(25);
    return updated;
  }

  public shiftZIndex(delta: number, targetEntityId?: string | null): Entity | null {
    const id = targetEntityId || this.selectedEntityId;
    if (!id) return null;

    const target = this.entities.find((e) => e.id === id);
    if (!target) return null;

    const curZ = target.transform.zIndex || 0;
    const newZ = Math.max(-100, Math.min(999, curZ + delta));

    const updated: Entity = {
      ...target,
      transform: { ...target.transform, zIndex: newZ },
    };

    this.entities = this.entities.map((e) => (e.id === id ? updated : e));
    canvasCacheEngine.invalidate();
    if (this.onUpdateEntity) this.onUpdateEntity(updated);
    AndroidEngine.triggerHaptic(15);
    return updated;
  }

  public setEntityZIndex(newZ: number, targetEntityId?: string | null): Entity | null {
    const id = targetEntityId || this.selectedEntityId;
    if (!id) return null;

    const target = this.entities.find((e) => e.id === id);
    if (!target) return null;

    const clampedZ = Math.max(-100, Math.min(999, Math.round(newZ)));
    const updated: Entity = {
      ...target,
      transform: { ...target.transform, zIndex: clampedZ },
    };

    this.entities = this.entities.map((e) => (e.id === id ? updated : e));
    canvasCacheEngine.invalidate();
    if (this.onUpdateEntity) this.onUpdateEntity(updated);
    return updated;
  }

  public worldToCanvasCoords(worldX: number, worldY: number): { rawX: number; rawY: number } {
    const centerX = this.world.viewportWidth / 2;
    const centerY = this.world.viewportHeight / 2;
    const rawX = (worldX - centerX + this.panX) * this.zoom + centerX;
    const rawY = (worldY - centerY + this.panY) * this.zoom + centerY;
    return { rawX, rawY };
  }

  public clearSelection() {
    this.clearMultiSelection();
  }

  public startPlayMode() {
    this.isPlaying = true;
    this.isPaused = false;
    this.currentScore = 0;
    if (this.onScoreChange) this.onScoreChange(0);

    this.ruleTimerMap.clear();
    this.firedScoreTriggers.clear();

    // Reset game variables to default values
    this.gameVariables = VariableManager.resetVariablesToDefaults(this.gameVariables);

    // Request Android Screen WakeLock to prevent screen dimming during play
    this.mobileEngine.requestWakeLock();

    // Snap Camera to Player entity target at beginning of play mode
    this.snapCameraToTarget();

    // Play Background Music if configured
    if (this.world.bgmAssetId) {
      const bgmAsset = this.audioAssets.find((a) => a.id === this.world.bgmAssetId);
      if (bgmAsset) {
        soundEngine.playBGM(bgmAsset);
      } else {
        soundEngine.playBGM(this.world.bgmAssetId);
      }
    }

    // Trigger ON_START logic rules
    this.entities.forEach((entity) => {
      if (entity.script && entity.script.rules) {
        entity.script.rules.forEach((rule) => {
          if (rule.enabled && rule.trigger === 'ON_START') {
            this.executeRule(entity, rule, null);
          }
        });
      }
    });
  }

  public stopPlayMode(originalEntities: Entity[]) {
    this.isPlaying = false;
    this.isPaused = false;
    this.mobileEngine.releaseWakeLock();
    soundEngine.stopBGM();
    assetManager.purgeUnusedAssets();
    this.setEntities(originalEntities);
  }

  public togglePause() {
    this.isPaused = !this.isPaused;
  }

  // --- INPUT BINDINGS ---
  private bindInputs() {
    const handleKeyDown = (e: KeyboardEvent) => {
      this.activeKeys.add(e.code);
      if (this.isPlaying && !this.isPaused) {
        this.checkInputTriggers('ON_KEY_PRESS', e.code);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      this.activeKeys.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Canvas Touch / Mouse Handlers
    const getCanvasCoords = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const scaleX = this.world.viewportWidth / rect.width;
      const scaleY = this.world.viewportHeight / rect.height;

      const rawX = (clientX - rect.left) * scaleX;
      const rawY = (clientY - rect.top) * scaleY;

      // Inverse scene zoom & pan transformation
      const centerX = this.world.viewportWidth / 2;
      const centerY = this.world.viewportHeight / 2;
      const worldX = (rawX - centerX) / this.zoom + centerX - this.panX;
      const worldY = (rawY - centerY) / this.zoom + centerY - this.panY;

      return {
        x: worldX,
        y: worldY,
        rawX,
        rawY,
      };
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length >= 2) {
        // Suppress single-touch selection when performing 2-finger gestures
        return;
      }
      const coords = getCanvasCoords(e);
      this.touchInputs.touching = true;
      this.touchInputs.x = coords.x;
      this.touchInputs.y = coords.y;
      this.touchInputs.startX = coords.x;
      this.touchInputs.startY = coords.y;
      this.touchInputs.startTime = performance.now();
      this.touchInputs.touchDownThisFrame = true;

      if (this.longPressTimer !== null) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.longPressTriggered = false;

      if (this.tutorialEngine.isActive()) {
        this.tutorialEngine.nextStep();
        return;
      }

      if (this.dialogueEngine.isActive()) {
        this.dialogueEngine.handleInteraction();
        return;
      }

      if (!this.isPlaying) {
        // Selection & Dragging in Editor
        const clicked = this.getEntityAtPoint(coords.x, coords.y);
        if (clicked) {
          this.draggingEntityId = clicked.id;
          this.lastDragCoords = { x: coords.x, y: coords.y };
          this.dragOffset = {
            x: coords.x - clicked.transform.x,
            y: coords.y - clicked.transform.y,
          };

          if (!this.selectedEntityIds.has(clicked.id)) {
            this.setSelectedEntityId(clicked.id);
            if (this.onSelectEntity) this.onSelectEntity(clicked.id);
            if (this.onSelectMultiEntities) this.onSelectMultiEntities([clicked.id]);
          } else {
            this.selectedEntityId = clicked.id;
          }

          if (this.onDragStart) this.onDragStart(clicked.id);

          // Long Press Timer for Multi-Selection
          this.longPressTimer = window.setTimeout(() => {
            this.longPressTriggered = true;
            this.mobileEngine.triggerHaptic(40);
            soundEngine.play('click');
            this.toggleSelectEntityId(clicked.id);
            if (this.onSelectMultiEntities) {
              this.onSelectMultiEntities(Array.from(this.selectedEntityIds));
            }
          }, 380);
        } else {
          this.setSelectedEntityId(null);
          this.draggingEntityId = null;
          snappingEngine.clearGuides();
          if (this.onSelectEntity) this.onSelectEntity(null);
          if (this.onSelectMultiEntities) this.onSelectMultiEntities([]);
        }
      } else if (!this.isPaused) {
        this.checkInputTriggers('ON_TOUCH_DOWN', 'Touch');
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (this.touchInputs.touching) {
        const coords = getCanvasCoords(e);
        this.touchInputs.x = coords.x;
        this.touchInputs.y = coords.y;

        const moveDist = Math.hypot(
          coords.x - (this.touchInputs.startX ?? 0),
          coords.y - (this.touchInputs.startY ?? 0)
        );
        if (moveDist > 8 && this.longPressTimer !== null) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }

        if (!this.isPlaying && this.draggingEntityId) {
          if (
            this.selectedEntityIds.size > 1 &&
            this.selectedEntityIds.has(this.draggingEntityId)
          ) {
            // Multi-Entity Drag
            const deltaX = coords.x - this.lastDragCoords.x;
            const deltaY = coords.y - this.lastDragCoords.y;
            this.lastDragCoords = { x: coords.x, y: coords.y };

            if (deltaX !== 0 || deltaY !== 0) {
              this.selectedEntityIds.forEach((id) => {
                const ent = this.entities.find((e) => e.id === id);
                if (ent && !ent.locked) {
                  ent.transform.x = Math.round((ent.transform.x + deltaX) * 10) / 10;
                  ent.transform.y = Math.round((ent.transform.y + deltaY) * 10) / 10;
                  if (this.onUpdateEntity) {
                    this.onUpdateEntity({ ...ent });
                  }
                }
              });
            }
          } else {
            // Single-Entity Drag
            const entity = this.entities.find((ent) => ent.id === this.draggingEntityId);
            if (entity && !entity.locked) {
              const rawTargetX = coords.x - this.dragOffset.x;
              const rawTargetY = coords.y - this.dragOffset.y;

              const snapResult = snappingEngine.snapPosition(
                rawTargetX,
                rawTargetY,
                entity.transform.width * (entity.transform.scaleX ?? 1),
                entity.transform.height * (entity.transform.scaleY ?? 1),
                this.entities,
                entity.id,
                this.world
              );

              entity.transform.x = Math.round(snapResult.x * 10) / 10;
              entity.transform.y = Math.round(snapResult.y * 10) / 10;

              if (this.onUpdateEntity) {
                this.onUpdateEntity({ ...entity });
              }
            }
          }
        }
      }
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      if (!this.touchInputs.touching) return;
      this.touchInputs.touching = false;

      if (this.longPressTimer !== null) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      const finishedDragId = this.draggingEntityId;
      this.draggingEntityId = null;
      snappingEngine.clearGuides();

      if (finishedDragId && this.onDragEnd) {
        this.onDragEnd(finishedDragId);
      }

      if (this.longPressTriggered) {
        return;
      }

      const endX = this.touchInputs.x;
      const endY = this.touchInputs.y;
      const dx = endX - this.touchInputs.startX;
      const dy = endY - this.touchInputs.startY;
      const dist = Math.hypot(dx, dy);
      const duration = performance.now() - this.touchInputs.startTime;

      if (this.isPlaying && !this.isPaused) {
        this.checkInputTriggers('ON_TOUCH_UP', 'Touch');

        if (dist < 18 && duration < 350) {
          this.checkInputTriggers('ON_TAP', 'Touch');
        } else if (dist >= 25) {
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) this.checkInputTriggers('ON_SWIPE_RIGHT', 'SwipeRight');
            else this.checkInputTriggers('ON_SWIPE_LEFT', 'SwipeLeft');
          } else {
            if (dy > 0) this.checkInputTriggers('ON_SWIPE_DOWN', 'SwipeDown');
            else this.checkInputTriggers('ON_SWIPE_UP', 'SwipeUp');
          }
        }
      }
    };

    this.canvas.addEventListener('mousedown', handleStart);
    this.canvas.addEventListener('mousemove', handleMove);
    this.canvas.addEventListener('touchstart', handleStart, { passive: true });
    this.canvas.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
  }

  private getEntityAtPoint(x: number, y: number): Entity | null {
    // Reverse check so topmost entities are clicked first
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      if (!ent.visible) continue;
      const hw = ent.transform.width / 2;
      const hh = ent.transform.height / 2;
      if (
        x >= ent.transform.x - hw &&
        x <= ent.transform.x + hw &&
        y >= ent.transform.y - hh &&
        y <= ent.transform.y + hh
      ) {
        return ent;
      }
    }
    return null;
  }

  // Sync state to contiguous buffer memory
  private syncPhysicsBuffer() {
    for (let i = 0; i < Math.min(this.entities.length, this.maxEntities); i++) {
      const ent = this.entities[i];
      const offset = i * 8;
      this.physicsBuffer[offset + 0] = ent.transform.x;
      this.physicsBuffer[offset + 1] = ent.transform.y;
      this.physicsBuffer[offset + 2] = ent.rigidbody?.velocityX || 0;
      this.physicsBuffer[offset + 3] = ent.rigidbody?.velocityY || 0;
      this.physicsBuffer[offset + 4] = ent.rigidbody?.mass || 1;
      this.physicsBuffer[offset + 5] = ent.rigidbody?.mass ? 1 / ent.rigidbody.mass : 0;
      this.physicsBuffer[offset + 6] = ent.rigidbody?.restitution || 0;
      this.physicsBuffer[offset + 7] = ent.rigidbody?.friction || 0.9;
    }
  }

  // --- MAIN LOOP ---
  public run() {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      // Reset zero-GC object pools per frame
      LiteOptimizationEngine.resetFramePools();

      // Check background render throttling when UI sheets are open
      if (LiteOptimizationEngine.shouldThrottleBackgroundFrame(now)) {
        this.touchInputs.touchDownThisFrame = false;
        this.animFrameId = requestAnimationFrame(loop);
        return;
      }

      const frameDeltaMs = now - this.lastTime;
      const dt = Math.min(frameDeltaMs / 1000, 0.033); // Max dt cap at 30fps
      this.lastTime = now;

      // Feed frame time to Mobile Adaptive Performance Governor
      this.mobileEngine.recordFrameTime(frameDeltaMs);

      // Stats tracking
      this.frameCount++;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 1.0) {
        this.stats.fps = Math.round(this.frameCount / this.fpsTimer);
        this.stats.frameTimeMs = parseFloat((dt * 1000).toFixed(1));

        // Auto-Garbage Collection & Dynamic Texture Resolution Monitor for Low-RAM devices
        LiteOptimizationEngine.monitorPerformanceAndAutoGc(this.stats.fps, frameDeltaMs, this.world);
        
        // Memory Guardian Enforcement (> 80% RAM Consumption Protection)
        memoryGuardian.checkAndEnforceGuardian(this.stats.fps);
        
        this.stats.gcCallsPrevented = LiteOptimizationEngine.getGcCountSaved();

        this.frameCount = 0;
        this.fpsTimer = 0;
      }

      // Always update Tweens, Springs, Particles, Dialogue, Scene Transitions, and Tutorial
      TweenEngine.update(dt * 1000);
      SpringPhysicsEngine.update(dt * 1000);

      // Skip particle processing if device thermal throttling is detected
      if (!this.mobileEngine.shouldSkipParticleEffects()) {
        ParticleEngine.update(dt);
      }

      this.dialogueEngine.update(dt * 1000);
      this.sceneEngine.update(dt * 1000);
      this.tutorialEngine.update(dt * 1000);

      // Tick Ultra Reality Engine 12-Layer Multithreaded/Fiber Simulation
      ultraRealityEngine.tick(dt);

      if (this.isPlaying && !this.isPaused) {
        // Update entity particle emitters
        if (!this.mobileEngine.shouldSkipParticleEffects()) {
          for (let i = 0; i < this.entities.length; i++) {
            const ent = this.entities[i];
            if (ent.visible && ent.particles && ent.particles.enabled) {
              const rate = Math.max(0.5, ent.particles.burstRate || ent.particles.rate || 15);
              const interval = 1.0 / rate;
              let timer = (this.entityParticleTimers.get(ent.id) || 0) + dt;
              if (timer >= interval) {
                const centerX = ent.transform.x + ent.transform.width / 2;
                const centerY = ent.transform.y + ent.transform.height / 2;
                ParticleEngine.emitFromComponent(centerX, centerY, ent.particles);
                timer %= interval;
              }
              this.entityParticleTimers.set(ent.id, timer);
            }
          }
        }

        // Update entity animations
        for (let i = 0; i < this.entities.length; i++) {
          this.animationEngine.updateEntityAnimation(this.entities[i], dt * 1000);
        }

        // Trigger ON_KEY_HOLD logic rules for active keys
        if (this.activeKeys.size > 0) {
          this.activeKeys.forEach((key) => {
            this.checkInputTriggers('ON_KEY_HOLD', key);
          });
        }
        this.checkInputTriggers('ON_UPDATE');
        this.updateTimerTriggers(dt);
        this.checkScoreTriggers();
        this.updatePhysics(dt);
        this.updateCamera();
      }

      this.render();

      this.touchInputs.touchDownThisFrame = false;
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.mobileEngine.releaseWakeLock();
    soundEngine.stopBGM();
    assetManager.purgeUnusedAssets();
  }

  public setUiSheetActive(isOpen: boolean) {
    LiteOptimizationEngine.setUiSheetActive(isOpen);
  }

  public setLiteOptimizationMode(enabled: boolean) {
    this.world.liteOptimizationMode = enabled;
    if (enabled) {
      this.world.deviceProfile = 'itel_a70_optimized';
      this.world.maxActiveParticles = 150;
      ParticleEngine.setQualityLevel('low');
      this.mobileEngine.setBatterySaverMode(true);
    } else {
      this.world.deviceProfile = 'standard';
      this.world.maxActiveParticles = 300;
      ParticleEngine.setQualityLevel('auto');
      this.mobileEngine.setBatterySaverMode(false);
    }
  }

  public autoGarbageCollect() {
    return LiteOptimizationEngine.performAutoGarbageCollection(true);
  }

  public setMemoryGuardianOverlay(visible: boolean) {
    memoryGuardian.setDebugOverlayVisible(visible);
  }

  public toggleMemoryGuardianOverlay(): boolean {
    const nextState = !memoryGuardian.isDebugOverlayVisible();
    memoryGuardian.setDebugOverlayVisible(nextState);
    return nextState;
  }

  public getMemoryGuardianStatus() {
    return memoryGuardian.getStatus();
  }

  public triggerMemoryGuardianPurge() {
    memoryGuardian.executeEmergencyPurge(undefined, 'Manual Purge');
    return memoryGuardian.getStatus();
  }

  public getTextureResolutionScale(): number {
    return LiteOptimizationEngine.getTextureResolutionScale();
  }

  public setTextureResolutionScale(scale: number) {
    LiteOptimizationEngine.setTextureResolutionScale(scale);
  }

  // --- UNIFIED ENTITY & VARIABLE STATE ACCESS API ---
  public getEntityState(id: string): Entity | undefined {
    return unifiedGameContext.getEntityById(id) || this.entities.find((e) => e.id === id);
  }

  public getEntitiesByTag(tag: string): Entity[] {
    return unifiedGameContext.getEntitiesByTag(tag);
  }

  public getEntitiesByType(type: string): Entity[] {
    return unifiedGameContext.getEntitiesByType(type);
  }

  public getVariableValue(nameOrId: string, entity?: Entity | null) {
    return unifiedGameContext.getVariableValue(nameOrId, entity);
  }

  public getUltraRealityEngine() {
    return ultraRealityEngine;
  }

  public setVariableValue(nameOrId: string, value: any, entity?: Entity | null): boolean {
    const success = unifiedGameContext.setVariableValue(nameOrId, value, entity);
    if (success) {
      this.gameVariables = unifiedGameContext.exportVariables();
    }
    return success;
  }

  public modifyVariable(
    nameOrId: string,
    action: 'SET_VARIABLE' | 'ADD_VARIABLE' | 'TOGGLE_VARIABLE',
    operand: any,
    entity?: Entity | null
  ): boolean {
    const success = unifiedGameContext.modifyVariable(nameOrId, action, operand, entity);
    if (success) {
      this.gameVariables = unifiedGameContext.exportVariables();
    }
    return success;
  }

  // --- PHYSICS ENGINE (Optimized SAT / AABB for itel A70) ---
  private updatePhysics(dt: number) {
    // Step 0: Solve Mechanical Constraints / Joints
    if (this.constraints && this.constraints.length > 0) {
      this.physicsEngine.solveConstraints(this.entities, this.constraints, dt);
    }

    const gravityY = this.world.gravityY;
    const gravityX = this.world.gravityX;

    // Step 1: Velocity & Gravity Update
    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      if (!ent.visible || !ent.rigidbody) continue;

      if (ent.rigidbody.bodyType === 'dynamic') {
        ent.rigidbody.velocityY += gravityY * ent.rigidbody.gravityScale * dt;
        ent.rigidbody.velocityX += gravityX * ent.rigidbody.gravityScale * dt;

        // Apply velocities
        ent.transform.x += ent.rigidbody.velocityX * dt;
        ent.transform.y += ent.rigidbody.velocityY * dt;

        // Check Out Of Bounds
        if (
          ent.transform.y > this.world.viewportHeight + 100 ||
          ent.transform.x < -100 ||
          ent.transform.x > this.world.viewportWidth + 100
        ) {
          this.checkEntityTriggers(ent, 'ON_OUT_OF_BOUNDS');
        }
      }
    }

    // Step 2: Collisions & Triggers
    for (let i = 0; i < this.entities.length; i++) {
      const a = this.entities[i];
      if (!a.visible || !a.collider || !a.collider.enabled) continue;

      for (let j = i + 1; j < this.entities.length; j++) {
        const b = this.entities[j];
        if (!b.visible || !b.collider || !b.collider.enabled) continue;

        if (this.checkCollision(a, b)) {
          // Fire collision scripts
          this.handleCollisionResponse(a, b);
        }
      }
    }
  }

  private checkCollision(a: Entity, b: Entity): boolean {
    const hwA = a.transform.width / 2;
    const hhA = a.transform.height / 2;
    const hwB = b.transform.width / 2;
    const hhB = b.transform.height / 2;

    const dx = a.transform.x - b.transform.x;
    const dy = a.transform.y - b.transform.y;

    if (a.collider?.type === 'circle' && b.collider?.type === 'circle') {
      const distSq = dx * dx + dy * dy;
      const radiusSum = (a.collider.radius || hwA) + (b.collider.radius || hwB);
      return distSq <= radiusSum * radiusSum;
    }

    // AABB Box collision
    return (
      Math.abs(dx) < hwA + hwB &&
      Math.abs(dy) < hhA + hhB
    );
  }

  private handleCollisionResponse(a: Entity, b: Entity) {
    // Trigger Collision Scripts
    this.checkEntityTriggers(a, 'ON_COLLISION_ENTER', b);
    this.checkEntityTriggers(b, 'ON_COLLISION_ENTER', a);

    // Resolve physical bounce / platform stopping if not triggers
    const aIsTrigger = a.collider?.isTrigger || false;
    const bIsTrigger = b.collider?.isTrigger || false;

    if (aIsTrigger || bIsTrigger) return;

    if (a.rigidbody?.bodyType === 'dynamic' && b.rigidbody?.bodyType === 'static') {
      // Push A out of B
      const hwA = a.transform.width / 2;
      const hhA = a.transform.height / 2;
      const hwB = b.transform.width / 2;
      const hhB = b.transform.height / 2;

      const overlapX = hwA + hwB - Math.abs(a.transform.x - b.transform.x);
      const overlapY = hhA + hhB - Math.abs(a.transform.y - b.transform.y);

      if (overlapX < overlapY) {
        if (a.transform.x < b.transform.x) a.transform.x -= overlapX;
        else a.transform.x += overlapX;
        a.rigidbody.velocityX = 0;
      } else {
        if (a.transform.y < b.transform.y) {
          a.transform.y -= overlapY;
          a.rigidbody.isGrounded = true;
        } else {
          a.transform.y += overlapY;
        }
        a.rigidbody.velocityY = 0;
      }
    }
  }

  // --- TRIGGER & RULE ENGINE ---
  private isKeyMatching(ruleKey?: string, activeKey?: string): boolean {
    if (!ruleKey || !activeKey) return true;
    const r = ruleKey.toLowerCase();
    const a = activeKey.toLowerCase();
    if (r === a) return true;

    if ((r === 'left' || r === 'arrowleft' || r === 'keya') && (a === 'arrowleft' || a === 'keya' || a === 'left')) return true;
    if ((r === 'right' || r === 'arrowright' || r === 'keyd') && (a === 'arrowright' || a === 'keyd' || a === 'right')) return true;
    if ((r === 'up' || r === 'arrowup' || r === 'keyw' || r === 'space') && (a === 'arrowup' || a === 'keyw' || a === 'space' || a === 'up')) return true;
    if ((r === 'down' || r === 'arrowdown' || r === 'keys') && (a === 'arrowdown' || a === 'keys' || a === 'down')) return true;
    if ((r === 'jump' || r === 'space') && (a === 'space' || a === 'arrowup' || a === 'keyw')) return true;
    if ((r === 'dash' || r === 'keyz' || r === 'shiftleft') && (a === 'keyz' || a === 'shiftleft' || a === 'dash')) return true;

    return false;
  }

  private checkInputTriggers(triggerType: string, keyOrTouch?: string) {
    this.entities.forEach((ent) => {
      if (ent.script && ent.script.rules) {
        ent.script.rules.forEach((rule) => {
          if (rule.enabled && rule.trigger === triggerType) {
            if ((triggerType === 'ON_KEY_PRESS' || triggerType === 'ON_KEY_HOLD') && rule.triggerKey && keyOrTouch) {
              if (!this.isKeyMatching(rule.triggerKey, keyOrTouch)) {
                return;
              }
            }
            this.executeRule(ent, rule, null);
          }
        });
      }
    });
  }

  private updateTimerTriggers(dt: number) {
    this.entities.forEach((ent) => {
      if (!ent.visible || !ent.script || !ent.script.rules) return;
      ent.script.rules.forEach((rule, idx) => {
        if (!rule.enabled || rule.trigger !== 'ON_TIMER') return;
        const key = `${ent.id}_rule_${idx}`;
        const interval = rule.timerMs ? rule.timerMs / 1000 : (rule.paramNumber && rule.paramNumber > 0 ? rule.paramNumber : 1.5);
        const accumulated = (this.ruleTimerMap.get(key) || 0) + dt;
        if (accumulated >= interval) {
          this.executeRule(ent, rule, null);
          this.ruleTimerMap.set(key, accumulated % interval);
        } else {
          this.ruleTimerMap.set(key, accumulated);
        }
      });
    });
  }

  private checkScoreTriggers() {
    this.entities.forEach((ent) => {
      if (!ent.visible || !ent.script || !ent.script.rules) return;
      ent.script.rules.forEach((rule, idx) => {
        if (!rule.enabled || rule.trigger !== 'ON_SCORE_REACH') return;
        const key = `${ent.id}_score_rule_${idx}`;
        const targetScore = rule.paramNumber || 100;
        if (this.currentScore >= targetScore && !this.firedScoreTriggers.has(key)) {
          this.firedScoreTriggers.add(key);
          this.executeRule(ent, rule, null);
        }
      });
    });
  }

  private checkEntityTriggers(ent: Entity, triggerType: string, otherEntity: Entity | null = null) {
    if (!ent.script || !ent.script.rules) return;

    ent.script.rules.forEach((rule) => {
      if (!rule.enabled || rule.trigger !== triggerType) return;

      if (rule.triggerTargetTag && otherEntity) {
        const otherTag = otherEntity.script?.tag || otherEntity.type;
        if (otherTag !== rule.triggerTargetTag) return;
      }

      this.executeRule(ent, rule, otherEntity);
    });
  }

  private executeRule(ent: Entity, rule: LogicRule, otherEntity: Entity | null) {
    // Variable Condition Guard (e.g. IF coinsCount >= 5)
    if (rule.varName && rule.varOperator) {
      const curVal = unifiedGameContext.getVariableValue(rule.varName, ent);
      const isMet = VariableManager.evaluateCondition(curVal, rule.varOperator, rule.varValue);
      if (!isMet) return;
    }

    switch (rule.action) {
      case 'SET_VARIABLE':
      case 'ADD_VARIABLE':
      case 'TOGGLE_VARIABLE': {
        const targetVarName = rule.varName || 'coinsCount';
        const operand =
          rule.varValue !== undefined
            ? rule.varValue
            : rule.paramNumber !== undefined
            ? rule.paramNumber
            : rule.paramString;
        unifiedGameContext.modifyVariable(targetVarName, rule.action, operand, ent);
        this.gameVariables = unifiedGameContext.exportVariables();
        soundEngine.play(rule.paramString || 'powerup', this.audioAssets);
        AndroidEngine.triggerHaptic(10);
        break;
      }
      case 'JUMP':
        if (ent.rigidbody) {
          ent.rigidbody.velocityY = rule.paramNumber || -400;
          soundEngine.play(rule.paramString || 'jump', this.audioAssets);
          AndroidEngine.triggerHaptic(12);
        }
        break;

      case 'MOVE_LEFT':
        if (ent.rigidbody) {
          ent.rigidbody.velocityX = -(rule.paramNumber || 240);
        } else {
          ent.transform.x -= (rule.paramNumber || 240) * 0.016;
        }
        break;

      case 'MOVE_RIGHT':
        if (ent.rigidbody) {
          ent.rigidbody.velocityX = rule.paramNumber || 240;
        } else {
          ent.transform.x += (rule.paramNumber || 240) * 0.016;
        }
        break;

      case 'MOVE_UP':
        if (ent.rigidbody) {
          ent.rigidbody.velocityY = -(rule.paramNumber || 240);
        } else {
          ent.transform.y -= (rule.paramNumber || 240) * 0.016;
        }
        break;

      case 'MOVE_DOWN':
        if (ent.rigidbody) {
          ent.rigidbody.velocityY = rule.paramNumber || 240;
        } else {
          ent.transform.y += (rule.paramNumber || 240) * 0.016;
        }
        break;

      case 'SET_VELOCITY_X':
        if (ent.rigidbody) {
          ent.rigidbody.velocityX = rule.paramNumber || 0;
        }
        break;

      case 'SET_VELOCITY_Y':
        if (ent.rigidbody) {
          ent.rigidbody.velocityY = rule.paramNumber || 0;
        }
        break;

      case 'DASH':
        if (ent.rigidbody) {
          const dashSpeed = rule.paramNumber || 500;
          const dir = ent.rigidbody.velocityX >= 0 ? 1 : -1;
          ent.rigidbody.velocityX = dir * dashSpeed;
          soundEngine.play(rule.paramString || 'laser', this.audioAssets);
          AndroidEngine.triggerHaptic(25);
        }
        break;

      case 'TELEPORT':
        ent.transform.x += rule.paramNumber || 100;
        soundEngine.play(rule.paramString || 'powerup', this.audioAssets);
        AndroidEngine.triggerHaptic(15);
        break;

      case 'TOGGLE_VISIBILITY':
        ent.visible = !ent.visible;
        break;

      case 'CHANGE_COLOR':
        if (rule.paramString) {
          ent.sprite.color = rule.paramString;
        }
        break;

      case 'APPLY_FORCE':
        if (ent.rigidbody) {
          ent.rigidbody.velocityY += rule.paramNumber || -200;
        }
        break;

      case 'ADD_SCORE':
        this.currentScore += rule.paramNumber || 10;
        if (this.onScoreChange) this.onScoreChange(this.currentScore);
        unifiedGameContext.modifyVariable('coinsCount', 'ADD_VARIABLE', rule.paramNumber || 10, ent);
        this.gameVariables = unifiedGameContext.exportVariables();
        soundEngine.play(rule.paramString || 'coin', this.audioAssets);
        AndroidEngine.triggerHaptic(10);
        if (otherEntity) {
          // e.g. destroy coin
          otherEntity.visible = false;
        }
        break;

      case 'DESTROY_SELF':
        ent.visible = false;
        AndroidEngine.triggerHaptic(20);
        break;

      case 'DESTROY_OTHER':
        if (otherEntity) {
          otherEntity.visible = false;
          AndroidEngine.triggerHaptic(20);
        }
        break;

      case 'PLAY_SOUND':
        soundEngine.play(rule.paramString || 'coin', this.audioAssets);
        break;

      case 'RESTART_LEVEL':
        soundEngine.play('hit', this.audioAssets);
        this.startPlayMode(); // Restart scene
        break;

      case 'EMIT_PARTICLES':
        soundEngine.play(rule.paramString || 'laser', this.audioAssets);
        if (ent.particles && ent.particles.enabled) {
          const centerX = ent.transform.x + ent.transform.width / 2;
          const centerY = ent.transform.y + ent.transform.height / 2;
          ParticleEngine.emitFromComponent(centerX, centerY, ent.particles, 20);
        } else {
          ParticleEngine.emit(ent.transform.x, ent.transform.y, 20, 'explosion');
        }
        this.spawnParticleBurst(ent.transform.x, ent.transform.y, ent.sprite.color);
        break;

      case 'SHOW_DIALOGUE': {
        const treeId = rule.paramString;
        let matchedTree: DialogueTree | undefined;
        if (treeId && this.projectDialogues.length > 0) {
          matchedTree = this.projectDialogues.find((d) => d.id === treeId);
        }
        if (matchedTree) {
          this.dialogueEngine.startDialogue(matchedTree);
        } else {
          this.dialogueEngine.startDialogue(DialogueEngine.getPresetDialogueTree());
        }
        break;
      }

      case 'CHANGE_SCENE':
        this.sceneEngine.switchScene(rule.paramString || 'scene_level_1', 'fade_black');
        break;

      case 'TRIGGER_TUTORIAL': {
        const seqId = rule.paramString;
        let matchedSeq: TutorialSequence | undefined;
        if (seqId && this.projectTutorials.length > 0) {
          matchedSeq = this.projectTutorials.find((t) => t.id === seqId);
        }
        if (matchedSeq) {
          this.tutorialEngine.startTutorial(matchedSeq);
        } else {
          this.tutorialEngine.startTutorial(TutorialEngine.getDefaultTutorialSequences()[0]);
        }
        break;
      }

      case 'SAVE_GAME':
        this.saveStateToSlot(rule.paramString || 'quicksave');
        soundEngine.play('powerup', this.audioAssets);
        AndroidEngine.triggerHaptic(20);
        break;

      case 'LOAD_GAME':
        this.loadStateFromSlot(rule.paramString || 'quicksave');
        soundEngine.play('coin', this.audioAssets);
        AndroidEngine.triggerHaptic(20);
        break;
    }
  }

  // --- SAVE / LOAD SYSTEM METHODS ---
  public saveStateToSlot(slotId: string = 'quicksave') {
    SaveLoadEngine.saveToSlot(
      slotId,
      slotId === 'quicksave' ? '⏱️ Quick Save' : `Slot ${slotId}`,
      this.entities,
      this.currentScore,
      'Sekte Pagoda Level 1'
    );
  }

  public loadStateFromSlot(slotId: string = 'quicksave') {
    try {
      const { saveData } = SaveLoadEngine.loadFromSlot(slotId);
      this.entities = SaveLoadEngine.applySaveStateToEntities(this.entities, saveData);
      this.currentScore = saveData.s;
      if (this.onScoreChange) this.onScoreChange(this.currentScore);
      this.syncPhysicsBuffer();
      canvasCacheEngine.invalidate();
    } catch (err: any) {
      console.warn('Failed to load state from slot:', err?.message);
    }
  }

  // --- PARTICLE EMITTER ---
  private spawnParticleBurst(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 80 + 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.4,
        maxLife: 0.4,
        size: Math.random() * 4 + 2,
        color,
      });
    }
  }

  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string }> = [];

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.stats.activeParticles = this.particles.length;
  }

  // --- CAMERA SYSTEM ---
  public findPlayerEntity(): Entity | null {
    // 1. Check explicit setting ID
    if (this.world.cameraFollowEntityId) {
      const ent = this.entities.find((e) => e.id === this.world.cameraFollowEntityId);
      if (ent) return ent;
    }

    // 2. Fallback to Player type
    let player = this.entities.find((e) => e.type === 'player');
    if (player) return player;

    // 3. Fallback to name or tag matching player/hero
    player = this.entities.find(
      (e) =>
        e.name.toLowerCase().includes('player') ||
        e.name.toLowerCase().includes('hero') ||
        e.script?.tag?.toLowerCase() === 'player'
    );
    if (player) return player;

    // 4. Fallback to preset icon 'hero'
    player = this.entities.find((e) => e.sprite?.presetIcon === 'hero');
    return player || null;
  }

  public snapCameraToTarget() {
    const target = this.findPlayerEntity();
    if (target) {
      this.cameraX = target.transform.x - this.world.viewportWidth / 2;
      this.cameraY = target.transform.y - this.world.viewportHeight / 2;
    } else {
      this.cameraX = 0;
      this.cameraY = 0;
    }
  }

  public shakeCamera(intensity: number = 8, durationMs: number = 300) {
    this.shakeIntensity = intensity;
    this.shakeDurationMs = durationMs;
  }

  private updateCamera() {
    const target = this.findPlayerEntity();
    if (!target) return;

    // Calculate lead velocity look-ahead
    const velX = target.rigidbody?.velocityX || 0;
    const velY = target.rigidbody?.velocityY || 0;
    const lookAheadX = velX * 0.12;
    const lookAheadY = velY * 0.08;

    const desiredX = target.transform.x + lookAheadX - this.world.viewportWidth / 2;
    const desiredY = target.transform.y + lookAheadY - this.world.viewportHeight / 2;

    const smoothing = Math.max(0.01, Math.min(1.0, this.world.cameraSmoothing || 0.12));

    // Smooth Lerp Interpolation
    this.cameraX += (desiredX - this.cameraX) * smoothing;
    this.cameraY += (desiredY - this.cameraY) * smoothing;
  }

  // --- RENDERER ---
  public render() {
    const { width, height } = this.canvas;
    let drawCount = 0;

    // Clear Screen
    this.ctx.fillStyle = this.world.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);
    drawCount++;

    // Calculate Camera Shake Offset
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeDurationMs > 0) {
      shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeDurationMs -= 16.6;
    }

    this.ctx.save();

    // Apply Viewport Zoom & Two-Finger Pan
    const centerX = width / 2;
    const centerY = height / 2;
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(-centerX + this.panX + shakeX, -centerY + this.panY + shakeY);

    // Apply Camera Follow in Play Mode
    if (this.isPlaying) {
      this.ctx.translate(-this.cameraX, -this.cameraY);
    }

    // Grid Background in Editor Mode
    if (!this.isPlaying) {
      snappingEngine.renderGrid(this.ctx, width, height, this.world.gridSize);
      drawCount += 2;
    }

    // Render Entities (Sorted by Z-Index)
    const sortedEntities = [...this.entities].sort((a, b) => a.transform.zIndex - b.transform.zIndex);

    // Render Entity Shadows if Global Lighting & Shadows are active
    if (this.world.lighting?.enabled && this.world.lighting?.shadowsEnabled) {
      sortedEntities.forEach((ent) => {
        LightingEngine.renderEntityShadow(this.ctx, ent, this.world.lighting);
      });
    }

    // Separate static background entities for offscreen canvas layer caching
    const staticEntities = sortedEntities.filter((ent) => canvasCacheEngine.isStaticEntity(ent));
    const dynamicEntities = sortedEntities.filter((ent) => !canvasCacheEngine.isStaticEntity(ent));

    // Update canvas cache buffer size if canvas resized
    canvasCacheEngine.resize(width, height);

    // Re-render offscreen static buffer if cache is dirty
    canvasCacheEngine.updateCacheIfNeeded((offCtx, staticEnts) => {
      let staticDraws = 0;
      staticEnts.forEach((ent) => {
        staticDraws += this.renderSingleEntity(offCtx, ent);
      });
      return staticDraws;
    }, staticEntities);

    // Draw cached static layer to main canvas
    const cacheRendered = canvasCacheEngine.renderToMain(this.ctx);
    if (cacheRendered) {
      drawCount += 1; // 1 composited draw call for all static entities!
    } else {
      // Fallback if cache disabled or updating
      staticEntities.forEach((ent) => {
        drawCount += this.renderSingleEntity(this.ctx, ent);
      });
    }

    // Render dynamic entities on top
    dynamicEntities.forEach((ent) => {
      drawCount += this.renderSingleEntity(this.ctx, ent);
    });

    // Render Particle Engine Typed Array Particles
    ParticleEngine.render(this.ctx);

    // Render Legacy Particles
    this.particles.forEach((p) => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      drawCount++;
    });

    // Render Global Scene Ambient & Sunlight Lighting Overlay
    if (this.world.lighting?.enabled) {
      LightingEngine.renderGlobalLightingOverlay(this.ctx, width, height, this.world.lighting);
    }

    // Apply Global Camera World Shader Filter
    if (this.world.worldShader?.enabled) {
      ShaderEngine.applyWorldShader(this.ctx, width, height, performance.now(), this.world.worldShader);
    }

    // Render Ultra Reality Atmospheric & Ocean Simulation Overlays
    ultraRealityEngine.renderRealityOverlays(this.ctx, width, height);

    // Render Physics Mechanical Constraints (Distance / Hinge Joints)
    this.renderConstraints(this.ctx);

    // Render Smart Alignment Snapping Guides in Editor Mode
    if (!this.isPlaying) {
      snappingEngine.renderGuides(this.ctx);
    }

    this.ctx.restore();

    // Render Dialogue Box HUD, Tutorial Overlay & Scene Transition Overlays
    this.dialogueEngine.renderOverlay(this.ctx, this.canvas.width, this.canvas.height);
    this.tutorialEngine.renderOverlay(this.ctx, this.canvas.width, this.canvas.height);
    this.sceneEngine.renderTransition(this.ctx, this.canvas.width, this.canvas.height);

    // Render Memory Guardian Debug Overlay HUD if enabled
    memoryGuardian.renderDebugOverlay(this.ctx, this.canvas.width, this.canvas.height);

    // Stats updates
    this.stats.drawCalls = drawCount;
    this.stats.activeEntities = this.entities.filter((e) => e.visible).length;
    this.stats.activeParticles = ParticleEngine.getActiveParticleCount() + this.particles.length;
  }

  private renderSingleEntity(targetCtx: CanvasRenderingContext2D, ent: Entity): number {
    if (!ent.visible) return 0;
    let draws = 0;

    targetCtx.save();
    targetCtx.translate(ent.transform.x, ent.transform.y);

    if (
      ent.transform.rotationX ||
      ent.transform.rotationY ||
      ent.transform.rotationZ ||
      ent.transform.depthZ ||
      ent.transform.skewX ||
      ent.transform.skewY
    ) {
      Pseudo3DAnimationEngine.apply3DCanvasTransform(targetCtx, ent.transform);
    } else if (ent.transform.rotation !== 0) {
      targetCtx.rotate((ent.transform.rotation * Math.PI) / 180);
    }

    const w = ent.transform.width;
    const h = ent.transform.height;

    // Apply Entity Shader Filter if active
    if (ent.shader?.enabled) {
      ShaderEngine.applyEntityShader(targetCtx, 0, 0, w, h, performance.now(), ent.shader);
    }

    // Draw Sprite / Object Shape
    const imgElement = ent.sprite.imageAssetId ? assetManager.getImageElement(ent.sprite.imageAssetId) : null;

    if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
      targetCtx.drawImage(imgElement, -w / 2, -h / 2, w, h);
      draws++;
    } else if (ent.type === 'ui_text' && ent.text) {
      // Styled UI Button / HUD Text Box
      targetCtx.fillStyle = ent.sprite.color || '#1e293b';
      targetCtx.globalAlpha = ent.sprite.opacity || 1;
      const r = ent.sprite.borderRadius || 6;
      targetCtx.beginPath();
      targetCtx.roundRect(-w / 2, -h / 2, w, h, r);
      targetCtx.fill();

      targetCtx.fillStyle = ent.text.color || '#ffffff';
      targetCtx.font = `bold ${ent.text.fontSize || 14}px sans-serif`;
      targetCtx.textAlign = ent.text.align || 'center';
      targetCtx.textBaseline = 'middle';
      const displayStr = VariableManager.interpolateVariables(
        ent.text.content,
        this.gameVariables,
        ent,
        this.currentScore
      );
      targetCtx.fillText(displayStr, 0, 0);
      draws++;
    } else if (ent.sprite.type === 'pixel' && ent.sprite.pixelData) {
      this.renderPixelGrid(ent.sprite.pixelData, w, h, targetCtx);
      draws++;
    } else if (ent.sprite.type === 'animated' && ent.sprite.animatedFrames && ent.sprite.animatedFrames.length > 0) {
      const fps = ent.sprite.animationFps || 6;
      const frameIdx = Math.floor((performance.now() / 1000) * fps) % ent.sprite.animatedFrames.length;
      this.renderPixelGrid(ent.sprite.animatedFrames[frameIdx], w, h, targetCtx);
      draws++;
    } else if (ent.sprite.type === 'spritesheet' && ent.sprite.clips) {
      const clipKey = ent.sprite.currentClip || 'idle';
      const clip = ent.sprite.clips[clipKey] || Object.values(ent.sprite.clips)[0];
      if (clip && clip.frames && clip.frames.length > 0) {
        const fps = clip.fps || 8;
        const frameIdx = Math.floor((performance.now() / 1000) * fps) % clip.frames.length;
        this.renderPixelGrid(clip.frames[frameIdx], w, h, targetCtx);
      } else {
        targetCtx.fillStyle = ent.sprite.color;
        targetCtx.fillRect(-w / 2, -h / 2, w, h);
      }
      draws++;
    } else if (ent.sprite.type === 'tilemap' && ent.sprite.tilemap) {
      this.renderTilemap(ent.sprite.tilemap, w, h, targetCtx);
      draws++;
    } else if (ent.sprite.type === 'circle' || ent.collider?.type === 'circle') {
      targetCtx.fillStyle = ent.sprite.color;
      targetCtx.beginPath();
      targetCtx.arc(0, 0, w / 2, 0, Math.PI * 2);
      targetCtx.fill();
      draws++;
    } else if (ent.sprite.type === 'preset') {
      this.renderPresetIcon(ent, w, h, targetCtx);
      draws++;
    } else {
      // Rounded Rect Box
      targetCtx.fillStyle = ent.sprite.color;
      targetCtx.globalAlpha = ent.sprite.opacity;
      const r = ent.sprite.borderRadius || 0;

      if (r > 0) {
        targetCtx.beginPath();
        targetCtx.roundRect(-w / 2, -h / 2, w, h, r);
        targetCtx.fill();
      } else {
        targetCtx.fillRect(-w / 2, -h / 2, w, h);
      }
      draws++;
    }

    // Render Selection Gizmo outline & Camera Focus Target Indicator in Editor Mode
    if (!this.isPlaying) {
      if (ent.audioSource) {
        targetCtx.fillStyle = '#a855f7';
        targetCtx.font = '12px sans-serif';
        targetCtx.fillText('🔊', w / 2 - 10, -h / 2 + 10);
      }

      const isCameraTarget = ent.id === this.world.cameraFollowEntityId || (this.world.cameraFollowEntityId === undefined && this.findPlayerEntity()?.id === ent.id);
      const isPrimarySelected = ent.id === this.selectedEntityId;
      const isMultiSelected = this.selectedEntityIds.has(ent.id);

      if (isPrimarySelected) {
        targetCtx.strokeStyle = isCameraTarget ? '#f59e0b' : '#38bdf8'; // Amber if camera focus target, cyan if normal selection
        targetCtx.lineWidth = 2;
        targetCtx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);

        // Corner handles
        targetCtx.fillStyle = '#ffffff';
        targetCtx.fillRect(-w / 2 - 8, -h / 2 - 8, 8, 8);
        targetCtx.fillRect(w / 2, -h / 2 - 8, 8, 8);
        targetCtx.fillRect(-w / 2 - 8, h / 2, 8, 8);
        targetCtx.fillRect(w / 2, h / 2, 8, 8);
        draws++;
      } else if (isMultiSelected) {
        // Multi-Selection outline (Indigo / Purple)
        targetCtx.strokeStyle = '#818cf8';
        targetCtx.lineWidth = 2;
        targetCtx.setLineDash([4, 3]);
        targetCtx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);
        targetCtx.setLineDash([]);

        // Corner handle dots
        targetCtx.fillStyle = '#818cf8';
        targetCtx.beginPath();
        targetCtx.arc(-w / 2 - 4, -h / 2 - 4, 4, 0, Math.PI * 2);
        targetCtx.arc(w / 2 + 4, -h / 2 - 4, 4, 0, Math.PI * 2);
        targetCtx.arc(-w / 2 - 4, h / 2 + 4, 4, 0, Math.PI * 2);
        targetCtx.arc(w / 2 + 4, h / 2 + 4, 4, 0, Math.PI * 2);
        targetCtx.fill();

        // "MULTI" badge
        targetCtx.fillStyle = '#6366f1';
        targetCtx.fillRect(-w / 2 - 4, -h / 2 - 20, 36, 14);
        targetCtx.fillStyle = '#ffffff';
        targetCtx.font = 'bold 8px sans-serif';
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText('MULTI', -w / 2 + 14, -h / 2 - 13);
        draws++;
      } else if (isCameraTarget) {
        // Dashed Amber outline for unselected Camera Focus target
        targetCtx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
        targetCtx.setLineDash([4, 4]);
        targetCtx.lineWidth = 1.5;
        targetCtx.strokeRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);
        targetCtx.setLineDash([]);
        draws++;
      }

      if (isCameraTarget) {
        // Camera Badge on Top-Right Corner
        targetCtx.fillStyle = '#f59e0b';
        targetCtx.beginPath();
        targetCtx.arc(w / 2 + 6, -h / 2 - 6, 8, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillStyle = '#0f172a';
        targetCtx.font = 'bold 9px sans-serif';
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText('📷', w / 2 + 6, -h / 2 - 6);
      }
    }

    targetCtx.restore();
    return draws;
  }

  private renderPresetIcon(ent: Entity, w: number, h: number, targetCtx?: CanvasRenderingContext2D) {
    const ctx = targetCtx || this.ctx;
    const icon = ent.sprite.presetIcon;
    ctx.fillStyle = ent.sprite.color;

    if (icon === 'cultivator' || icon === 'wuxia_hero') {
      // Cultivator Boy Hero (3D Cultivation Martial Artist in Red Robes)
      // Head & Topknot Hair
      ctx.fillStyle = '#262626'; // Dark hair
      ctx.beginPath();
      ctx.arc(0, -h * 0.28, w * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Topknot Bun
      ctx.beginPath();
      ctx.arc(0, -h * 0.46, w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      // Red hair ribbon
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-w * 0.08, -h * 0.42, w * 0.16, h * 0.05);

      // Face skin
      ctx.fillStyle = '#fde047'; // Soft peach skin
      ctx.beginPath();
      ctx.arc(0, -h * 0.22, w * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Rosy Cheeks
      ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.beginPath();
      ctx.arc(-w * 0.12, -h * 0.20, w * 0.06, 0, Math.PI * 2);
      ctx.arc(w * 0.12, -h * 0.20, w * 0.06, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(-w * 0.08, -h * 0.24, w * 0.04, 0, Math.PI * 2);
      ctx.arc(w * 0.08, -h * 0.24, w * 0.04, 0, Math.PI * 2);
      ctx.fill();

      // Red Cultivation Robe Body
      ctx.fillStyle = '#dc2626'; // Deep Red Robe
      ctx.beginPath();
      ctx.moveTo(-w * 0.28, -h * 0.05);
      ctx.lineTo(w * 0.28, -h * 0.05);
      ctx.lineTo(w * 0.35, h * 0.30);
      ctx.lineTo(-w * 0.35, h * 0.30);
      ctx.closePath();
      ctx.fill();

      // Golden Embroidery Pattern
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-w * 0.12, -h * 0.02, w * 0.24, h * 0.06);

      // Black Trousers & Boots
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-w * 0.22, h * 0.28, w * 0.18, h * 0.18);
      ctx.fillRect(w * 0.04, h * 0.28, w * 0.18, h * 0.18);
      // Leather Boots
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-w * 0.25, h * 0.38, w * 0.22, h * 0.12);
      ctx.fillRect(w * 0.03, h * 0.38, w * 0.22, h * 0.12);

      // Hanging Crimson Belt Sash
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-w * 0.05, h * 0.08, w * 0.10, h * 0.26);

    } else if (icon === 'pagoda' || icon === 'sect_temple' || icon === 'temple') {
      // Mountain Pagoda Sect Building
      // Mountain Rocks Base
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(-w * 0.35, h * 0.25, w * 0.25, 0, Math.PI * 2);
      ctx.arc(w * 0.35, h * 0.25, w * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Red Main Pagoda Walls
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(-w * 0.30, -h * 0.15, w * 0.60, h * 0.55);

      // Lower Curved Roof
      ctx.fillStyle = '#0f766e'; // Teal tiles
      ctx.beginPath();
      ctx.moveTo(-w * 0.45, 0);
      ctx.quadraticCurveTo(0, -h * 0.12, w * 0.45, 0);
      ctx.lineTo(w * 0.38, -h * 0.08);
      ctx.lineTo(-w * 0.38, -h * 0.08);
      ctx.closePath();
      ctx.fill();

      // Upper Tier Walls
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-w * 0.22, -h * 0.35, w * 0.44, h * 0.28);

      // Upper Curved Roof
      ctx.fillStyle = '#0f766e';
      ctx.beginPath();
      ctx.moveTo(-w * 0.38, -h * 0.32);
      ctx.quadraticCurveTo(0, -h * 0.45, w * 0.38, -h * 0.32);
      ctx.lineTo(w * 0.28, -h * 0.38);
      ctx.lineTo(-w * 0.28, -h * 0.38);
      ctx.closePath();
      ctx.fill();

      // Gold Spire
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.52);
      ctx.lineTo(w * 0.06, -h * 0.38);
      ctx.lineTo(-w * 0.06, -h * 0.38);
      ctx.closePath();
      ctx.fill();

      // Red Gate Portal Entrance
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, h * 0.20, w * 0.18, Math.PI, 0, false);
      ctx.fill();

    } else if (icon === 'red_portal' || icon === 'realm_gate' || icon === 'portal') {
      // Mystic Red Ring Portal Gate
      // Cloud Base
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(-w * 0.25, h * 0.35, w * 0.22, 0, Math.PI * 2);
      ctx.arc(0, h * 0.38, w * 0.25, 0, Math.PI * 2);
      ctx.arc(w * 0.25, h * 0.35, w * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Outer Red Ring Portal
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, -h * 0.05, w * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // Inner Swirling Core
      ctx.fillStyle = '#fef2f2';
      ctx.beginPath();
      ctx.arc(0, -h * 0.05, w * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Red Cherry Blossoms / Foliage
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-w * 0.38, -h * 0.18, w * 0.12, 0, Math.PI * 2);
      ctx.arc(w * 0.38, -h * 0.18, w * 0.12, 0, Math.PI * 2);
      ctx.arc(-w * 0.32, -h * 0.32, w * 0.10, 0, Math.PI * 2);
      ctx.arc(w * 0.32, -h * 0.32, w * 0.10, 0, Math.PI * 2);
      ctx.fill();

      // Energy Glow Core
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, -h * 0.05, w * 0.12, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'rpg_sword' || icon === 'sword') {
      // Spirit Blade Sword Icon
      ctx.save();
      ctx.rotate(Math.PI / 4);
      // Blade
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-w * 0.06, -h * 0.45, w * 0.12, h * 0.65);
      // Edge shine
      ctx.fillStyle = '#a5f3fc';
      ctx.fillRect(-w * 0.02, -h * 0.45, w * 0.04, h * 0.65);
      // Gold Hilt
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-w * 0.22, h * 0.15, w * 0.44, h * 0.08);
      // Handle
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-w * 0.05, h * 0.22, w * 0.10, h * 0.20);
      // Pommel gem
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, h * 0.42, w * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

    } else if (icon === 'rpg_potion' || icon === 'potion') {
      // Health / Mana Elixir Potion Flask
      // Cork
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-w * 0.10, -h * 0.42, w * 0.20, h * 0.10);
      // Bottle Neck
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-w * 0.14, -h * 0.32, w * 0.28, h * 0.12);
      // Round Flask Body
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, h * 0.08, w * 0.36, 0, Math.PI * 2);
      ctx.fill();
      // Liquid Fill
      ctx.fillStyle = ent.sprite.color || '#ef4444';
      ctx.beginPath();
      ctx.arc(0, h * 0.12, w * 0.30, 0, Math.PI);
      ctx.fill();
      // Bottle Shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(-w * 0.14, -h * 0.08, w * 0.08, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'rpg_scroll' || icon === 'scroll') {
      // Magic Spell Scroll
      ctx.fillStyle = '#fef08a'; // Parchment
      ctx.fillRect(-w * 0.30, -h * 0.35, w * 0.60, h * 0.70);
      // Rolled Edges
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-w * 0.38, -h * 0.40, w * 0.10, h * 0.80);
      ctx.fillRect(w * 0.28, -h * 0.40, w * 0.10, h * 0.80);
      // Red Ribbon & Wax Seal
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-w * 0.30, -h * 0.05, w * 0.60, h * 0.10);
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.12, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'rpg_gem' || icon === 'gem') {
      // Faceted Element Crystal Gem
      ctx.fillStyle = ent.sprite.color || '#a855f7';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.45);
      ctx.lineTo(w * 0.38, -h * 0.15);
      ctx.lineTo(0, h * 0.45);
      ctx.lineTo(-w * 0.38, -h * 0.15);
      ctx.closePath();
      ctx.fill();

      // Facet Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.45);
      ctx.lineTo(w * 0.38, -h * 0.15);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

    } else if (icon === 'rpg_chest' || icon === 'chest') {
      // Ornate Golden Treasure Chest
      ctx.fillStyle = '#78350f'; // Wood
      ctx.fillRect(-w * 0.40, -h * 0.20, w * 0.80, h * 0.55);
      // Gold trim
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-w * 0.42, -h * 0.22, w * 0.84, h * 0.10);
      ctx.fillRect(-w * 0.42, h * 0.25, w * 0.84, h * 0.10);
      // Lock
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.10, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'rpg_shield' || icon === 'shield') {
      // Crest Shield
      ctx.fillStyle = ent.sprite.color || '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(-w * 0.35, -h * 0.40);
      ctx.lineTo(w * 0.35, -h * 0.40);
      ctx.lineTo(w * 0.35, h * 0.05);
      ctx.quadraticCurveTo(0, h * 0.48, 0, h * 0.48);
      ctx.quadraticCurveTo(-w * 0.35, h * 0.05, -w * 0.35, -h * 0.40);
      ctx.closePath();
      ctx.fill();
      // Gold Rim
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.stroke();

    } else if (icon === 'mount_horse') {
      // White Spirit Stallion Mount
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.38, h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      // Horse Head & Neck
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, -h * 0.1);
      ctx.lineTo(-w * 0.35, -h * 0.45);
      ctx.lineTo(-w * 0.15, -h * 0.42);
      ctx.lineTo(-w * 0.05, -h * 0.15);
      ctx.closePath();
      ctx.fill();
      // Golden Saddle
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-w * 0.1, -h * 0.15, w * 0.2, h * 0.18);
      // Legs
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-w * 0.25, h * 0.15, w * 0.08, h * 0.32);
      ctx.fillRect(-w * 0.1, h * 0.15, w * 0.08, h * 0.32);
      ctx.fillRect(w * 0.1, h * 0.15, w * 0.08, h * 0.32);
      ctx.fillRect(w * 0.22, h * 0.15, w * 0.08, h * 0.32);

    } else if (icon === 'campfire') {
      // Rest Campfire Checkpoint
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(-w * 0.35, h * 0.3);
      ctx.lineTo(w * 0.35, h * 0.3);
      ctx.lineTo(w * 0.2, h * 0.45);
      ctx.lineTo(-w * 0.2, h * 0.45);
      ctx.closePath();
      ctx.fill();
      // Stones
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(-w * 0.3, h * 0.35, w * 0.1, 0, Math.PI * 2);
      ctx.arc(w * 0.3, h * 0.35, w * 0.1, 0, Math.PI * 2);
      ctx.arc(0, h * 0.38, w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      // Fire Flames
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(-w * 0.25, h * 0.25);
      ctx.quadraticCurveTo(-w * 0.3, -h * 0.1, 0, -h * 0.45);
      ctx.quadraticCurveTo(w * 0.3, -h * 0.1, w * 0.25, h * 0.25);
      ctx.closePath();
      ctx.fill();
      // Inner Yellow Flame
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-w * 0.15, h * 0.25);
      ctx.quadraticCurveTo(-w * 0.15, 0, 0, -h * 0.3);
      ctx.quadraticCurveTo(w * 0.15, 0, w * 0.15, h * 0.25);
      ctx.closePath();
      ctx.fill();

    } else if (icon === 'waypoint_shrine') {
      // Ancient Teleport Waypoint Shrine
      ctx.fillStyle = '#334155';
      ctx.fillRect(-w * 0.35, h * 0.25, w * 0.7, h * 0.2);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-w * 0.25, -h * 0.1, w * 0.5, h * 0.35);
      // Floating Cyan Energy Crystal
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.45);
      ctx.lineTo(w * 0.22, -h * 0.2);
      ctx.lineTo(0, h * 0.05);
      ctx.lineTo(-w * 0.22, -h * 0.2);
      ctx.closePath();
      ctx.fill();
      // Core Glow
      ctx.fillStyle = '#a5f3fc';
      ctx.beginPath();
      ctx.arc(0, -h * 0.2, w * 0.08, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'ancient_ruin') {
      // Ancient Stone Ruin Archway
      ctx.fillStyle = '#64748b';
      // Left Pillar
      ctx.fillRect(-w * 0.4, -h * 0.35, w * 0.22, h * 0.75);
      // Right Pillar
      ctx.fillRect(w * 0.18, -h * 0.35, w * 0.22, h * 0.75);
      // Arch Roof
      ctx.fillStyle = '#475569';
      ctx.fillRect(-w * 0.48, -h * 0.48, w * 0.96, h * 0.18);

    } else if (icon === 'ore_node') {
      // Crystal Ore Node
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, h * 0.1, w * 0.38, 0, Math.PI * 2);
      ctx.fill();
      // Purple Crystals
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.moveTo(-w * 0.15, h * 0.1);
      ctx.lineTo(-w * 0.05, -h * 0.35);
      ctx.lineTo(w * 0.05, h * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, h * 0.1);
      ctx.lineTo(w * 0.2, -h * 0.25);
      ctx.lineTo(w * 0.25, h * 0.1);
      ctx.closePath();
      ctx.fill();

    } else if (icon === 'magic_tree') {
      // Mystical Wood Tree
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-w * 0.1, 0, w * 0.2, h * 0.45);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, -h * 0.15, w * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-w * 0.12, -h * 0.22, w * 0.22, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'boss_dragon') {
      // Elder Dragon Boss
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.38, h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.1);
      ctx.lineTo(-w * 0.45, -h * 0.45);
      ctx.lineTo(-w * 0.15, -h * 0.1);
      ctx.lineTo(w * 0.15, -h * 0.1);
      ctx.lineTo(w * 0.45, -h * 0.45);
      ctx.closePath();
      ctx.fill();
      // Horned Head
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(0, -h * 0.25, w * 0.18, 0, Math.PI * 2);
      ctx.fill();
      // Golden Eyes
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-w * 0.08, -h * 0.25, w * 0.04, 0, Math.PI * 2);
      ctx.arc(w * 0.08, -h * 0.25, w * 0.04, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'hex_citadel') {
      // SLG Capital Citadel
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-w * 0.3, -h * 0.2, w * 0.6, h * 0.5);
      // Castle Battlement Towers
      ctx.fillRect(-w * 0.35, -h * 0.38, w * 0.2, h * 0.3);
      ctx.fillRect(w * 0.15, -h * 0.38, w * 0.2, h * 0.3);
      ctx.fillStyle = '#dc2626'; // Red Roof
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.48);
      ctx.lineTo(-w * 0.25, -h * 0.2);
      ctx.lineTo(w * 0.25, -h * 0.2);
      ctx.closePath();
      ctx.fill();

    } else if (icon === 'hex_mine') {
      // Gold Mine Hex Tile
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.42, 0, Math.PI * 2);
      ctx.fill();
      // Mine Entrance
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, h * 0.1, w * 0.24, Math.PI, 0, false);
      ctx.fill();
      // Gold Nugget
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, h * 0.05, w * 0.12, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'hex_farm') {
      // Wheat Farm Hex Tile
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.42, 0, Math.PI * 2);
      ctx.fill();
      // Golden Wheat Fields
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-w * 0.25, -h * 0.2, w * 0.5, h * 0.12);
      ctx.fillRect(-w * 0.3, 0, w * 0.6, h * 0.12);
      ctx.fillRect(-w * 0.25, h * 0.2, w * 0.5, h * 0.12);

    } else if (icon === 'hex_academy') {
      // Science Academy Hex Tile
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.42, 0, Math.PI * 2);
      ctx.fill();
      // Observatory Dome & Telescope
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.25, Math.PI, 0, false);
      ctx.fill();
      ctx.fillStyle = '#a5f3fc';
      ctx.fillRect(-w * 0.05, -h * 0.25, w * 0.1, h * 0.2);

    } else if (icon === 'legionnaire') {
      // Roman Legionnaire Soldier
      ctx.fillStyle = '#dc2626'; // Red Armor
      ctx.fillRect(-w * 0.2, -h * 0.1, w * 0.4, h * 0.4);
      // Silver Helmet
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, -h * 0.25, w * 0.18, 0, Math.PI * 2);
      ctx.fill();
      // Red Crest
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-w * 0.05, -h * 0.45, w * 0.1, h * 0.2);
      // Scutum Shield
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-w * 0.35, -h * 0.15, w * 0.18, h * 0.45);

    } else if (icon === 'catapult') {
      // Siege Catapult Engine
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-w * 0.35, h * 0.1, w * 0.7, h * 0.15);
      // Throwing Arm
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, h * 0.1);
      ctx.lineTo(w * 0.25, -h * 0.35);
      ctx.lineTo(w * 0.32, -h * 0.3);
      ctx.lineTo(-w * 0.15, h * 0.15);
      ctx.closePath();
      ctx.fill();
      // Wheels
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(-w * 0.22, h * 0.28, w * 0.12, 0, Math.PI * 2);
      ctx.arc(w * 0.22, h * 0.28, w * 0.12, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'barbarian_camp') {
      // Barbarian Encampment
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.4);
      ctx.lineTo(-w * 0.35, h * 0.3);
      ctx.lineTo(w * 0.35, h * 0.3);
      ctx.closePath();
      ctx.fill();
      // Skull Emblem
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.1, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'wonder_pyramid') {
      // Wonder Pyramid
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.45);
      ctx.lineTo(-w * 0.42, h * 0.35);
      ctx.lineTo(w * 0.42, h * 0.35);
      ctx.closePath();
      ctx.fill();
      // Golden Capstone
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.45);
      ctx.lineTo(-w * 0.15, -h * 0.2);
      ctx.lineTo(w * 0.15, -h * 0.2);
      ctx.closePath();
      ctx.fill();

    } else if (icon === 'moba_hero_mage') {
      // MOBA Mage / Assassin Hero
      ctx.fillStyle = '#06b6d4'; // Robe
      ctx.beginPath();
      ctx.arc(0, -h * 0.22, w * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(-w * 0.25, -h * 0.05, w * 0.5, h * 0.45);
      // Magic Staff
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(w * 0.25, -h * 0.45, w * 0.08, h * 0.85);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(w * 0.29, -h * 0.45, w * 0.12, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'moba_nexus') {
      // MOBA Base Core Nexus Crystal
      ctx.fillStyle = ent.sprite.color || '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.45);
      ctx.lineTo(w * 0.38, 0);
      ctx.lineTo(0, h * 0.45);
      ctx.lineTo(-w * 0.38, 0);
      ctx.closePath();
      ctx.fill();
      // Orbiting Energy Ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.45, h * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();

    } else if (icon === 'moba_turret') {
      // MOBA Defense Turret
      ctx.fillStyle = '#334155';
      ctx.fillRect(-w * 0.3, h * 0.1, w * 0.6, h * 0.35);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-w * 0.2, -h * 0.25, w * 0.4, h * 0.4);
      // Laser Crystal Head
      ctx.fillStyle = ent.sprite.color || '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -h * 0.3, w * 0.18, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'moba_minion') {
      // MOBA Minion
      ctx.fillStyle = ent.sprite.color || '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // Shield
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-w * 0.3, -h * 0.1, w * 0.15, h * 0.3);

    } else if (icon === 'moba_drake') {
      // Abyssal Drake Dragon Pit
      ctx.fillStyle = '#7e22ce';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Horns & Purple Eyes
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(-w * 0.12, -h * 0.1, w * 0.06, 0, Math.PI * 2);
      ctx.arc(w * 0.12, -h * 0.1, w * 0.06, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'moba_shop') {
      // MOBA Item Shop Stall
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-w * 0.35, -h * 0.1, w * 0.7, h * 0.45);
      // Canopy Tent
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-w * 0.45, -h * 0.1);
      ctx.lineTo(0, -h * 0.45);
      ctx.lineTo(w * 0.45, -h * 0.1);
      ctx.closePath();
      ctx.fill();

    } else if (icon === 'fps_storm_emitter') {
      // Battle Royale Safe Zone Circle
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.45, 0, Math.PI * 2);
      ctx.stroke();

    } else if (icon === 'fps_airdrop') {
      // Airdrop Crate
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-w * 0.35, -h * 0.25, w * 0.7, h * 0.6);
      ctx.fillStyle = '#1e3a8a'; // Blue Top
      ctx.fillRect(-w * 0.38, -h * 0.35, w * 0.76, h * 0.15);
      // Smoke Flare Signal
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(0, -h * 0.42, w * 0.1, 0, Math.PI * 2);
      ctx.fill();

    } else if (icon === 'fps_gun_m4') {
      // M416 Gun
      ctx.fillStyle = '#334155';
      ctx.fillRect(-w * 0.4, -h * 0.1, w * 0.75, h * 0.2);
      ctx.fillRect(-w * 0.1, h * 0.1, w * 0.12, h * 0.25); // Mag
      ctx.fillRect(-w * 0.35, h * 0.1, w * 0.1, h * 0.2); // Grip

    } else if (icon === 'fps_gun_awm') {
      // AWM Sniper Rifle
      ctx.fillStyle = '#15803d'; // Green Stock
      ctx.fillRect(-w * 0.45, -h * 0.08, w * 0.85, h * 0.16);
      ctx.fillStyle = '#0f172a'; // Long Barrel & Scope
      ctx.fillRect(w * 0.15, -h * 0.05, w * 0.3, h * 0.1);
      ctx.fillRect(-w * 0.1, -h * 0.25, w * 0.3, h * 0.15); // Scope

    } else if (icon === 'fps_medkit') {
      // Medical Medkit
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-w * 0.35, -h * 0.35, w * 0.7, h * 0.7);
      // Red Cross
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-w * 0.08, -h * 0.25, w * 0.16, h * 0.5);
      ctx.fillRect(-w * 0.25, -h * 0.08, w * 0.5, h * 0.16);

    } else if (icon === 'fps_armor_vest') {
      // Level 3 Armor Vest
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-w * 0.35, -h * 0.35, w * 0.7, h * 0.7);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-w * 0.25, -h * 0.2, w * 0.5, h * 0.4);

    } else if (icon === 'fps_enemy_soldier') {
      // Enemy Soldier
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, -h * 0.22, w * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-w * 0.25, -h * 0.05, w * 0.5, h * 0.45);

    } else if (icon === 'race_car_player' || icon === 'race_car_rival') {
      // 3D Sports Supercar
      ctx.fillStyle = ent.sprite.color || '#06b6d4';
      // Body chassis
      ctx.beginPath();
      ctx.roundRect(-w * 0.32, -h * 0.45, w * 0.64, h * 0.9, 10);
      ctx.fill();
      // Black Windshield & Windows
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-w * 0.24, -h * 0.2, w * 0.48, h * 0.4, 6);
      ctx.fill();
      // Headlights / Taillights
      if (icon === 'race_car_player') {
        ctx.fillStyle = '#38bdf8'; // Front lights
        ctx.fillRect(-w * 0.26, -h * 0.44, w * 0.14, h * 0.08);
        ctx.fillRect(w * 0.12, -h * 0.44, w * 0.14, h * 0.08);
      } else {
        ctx.fillStyle = '#ef4444'; // Rear brake lights
        ctx.fillRect(-w * 0.26, h * 0.36, w * 0.14, h * 0.08);
        ctx.fillRect(w * 0.12, h * 0.36, w * 0.14, h * 0.08);
      }
      // Wheels
      ctx.fillStyle = '#020617';
      ctx.fillRect(-w * 0.38, -h * 0.32, w * 0.1, h * 0.2);
      ctx.fillRect(w * 0.28, -h * 0.32, w * 0.1, h * 0.2);
      ctx.fillRect(-w * 0.38, h * 0.12, w * 0.1, h * 0.2);
      ctx.fillRect(w * 0.28, h * 0.12, w * 0.1, h * 0.2);

    } else if (icon === 'nitro_boost_can') {
      // Nitrous Oxide Tank
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-w * 0.22, -h * 0.35, w * 0.44, h * 0.7, 8);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-w * 0.1, -h * 0.45, w * 0.2, h * 0.12);

    } else if (icon === 'speed_checkpoint') {
      // Checkpoint Gate
      ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.fillRect(-w * 0.48, -h * 0.3, w * 0.96, h * 0.6);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(-w * 0.48, -h * 0.3, w * 0.96, h * 0.6);

    } else if (icon === 'finish_banner') {
      // Checkered Finish Banner
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-w * 0.48, -h * 0.35, w * 0.96, h * 0.7);
      // Checkers
      ctx.fillStyle = '#0f172a';
      const cell = w * 0.12;
      for (let x = -w * 0.48; x < w * 0.48; x += cell * 2) {
        ctx.fillRect(x, -h * 0.35, cell, h * 0.35);
        ctx.fillRect(x + cell, 0, cell, h * 0.35);
      }

    } else if (icon === 'hero') {
      // Cute robot / hero box with eye visor
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 8);
      ctx.fill();

      // Visor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-w / 4, -h / 4, w / 2, h / 3);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-w / 8, -h / 6, w / 4, h / 6);
    } else if (icon === 'coin') {
      ctx.beginPath();
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
      ctx.fill();

      // Inner star / shine
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, w / 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === 'spike') {
      // Triangle Hazard Spike
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
    } else if (icon === 'monster') {
      // Space creature / alien ship
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(0, h / 4);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
  }

  private renderPixelGrid(grid: string[][], w: number, h: number, targetCtx?: CanvasRenderingContext2D) {
    if (!grid || grid.length === 0) return;
    const ctx = targetCtx || this.ctx;
    const rows = grid.length;
    const cols = grid[0].length;
    const cellW = w / cols;
    const cellH = h / rows;
    const startX = -w / 2;
    const startY = -h / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = grid[r][c];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(startX + c * cellW, startY + r * cellH, cellW + 0.3, cellH + 0.3);
        }
      }
    }
  }

  private renderTilemap(tilemap: TilemapComponent, w: number, h: number, targetCtx?: CanvasRenderingContext2D) {
    if (!tilemap) return;
    const ctx = targetCtx || this.ctx;

    if (tilemap.isIsometric && tilemap.isometricConfig) {
      isometricEngine.renderIsometricMap(ctx, tilemap.isometricConfig, 0, -h / 4);
    } else {
      tilemapAtlasEngine.renderTilemap(ctx, tilemap, w, h);
    }
  }

  private renderConstraints(ctx: CanvasRenderingContext2D) {
    if (!this.constraints || this.constraints.length === 0 || !this.entities || this.entities.length === 0) return;

    this.entityLookupMap.clear();
    for (let i = 0; i < this.entities.length; i++) {
      this.entityLookupMap.set(this.entities[i].id, this.entities[i]);
    }

    ctx.save();
    for (let i = 0; i < this.constraints.length; i++) {
      const joint = this.constraints[i];
      if (joint.enabled === false) continue;

      const entA = this.entityLookupMap.get(joint.entityAId);
      const entB = this.entityLookupMap.get(joint.entityBId);
      if (!entA || !entB || !entA.visible || !entB.visible) continue;

      const anchorA = joint.anchorA || { x: 0, y: 0 };
      const anchorB = joint.anchorB || { x: 0, y: 0 };

      const pAx = entA.transform.x + entA.transform.width / 2 + anchorA.x;
      const pAy = entA.transform.y + entA.transform.height / 2 + anchorA.y;

      const pBx = entB.transform.x + entB.transform.width / 2 + anchorB.x;
      const pBy = entB.transform.y + entB.transform.height / 2 + anchorB.y;

      const isSelected =
        this.selectedEntityId === entA.id ||
        this.selectedEntityId === entB.id ||
        this.selectedEntityIds.has(entA.id) ||
        this.selectedEntityIds.has(entB.id);

      const jointColor = joint.color || (isSelected ? '#06b6d4' : '#64748b');

      if (joint.type === 'distance' || joint.type === 'spring' || joint.type === 'rope') {
        // Draw constraint connecting line
        ctx.beginPath();
        ctx.moveTo(pAx, pAy);
        ctx.lineTo(pBx, pBy);
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = jointColor;
        if (joint.type === 'spring') {
          ctx.setLineDash([4, 4]);
        } else if (joint.type === 'rope') {
          ctx.setLineDash([6, 3]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();

        // Draw anchor dots
        ctx.fillStyle = jointColor;
        ctx.beginPath();
        ctx.arc(pAx, pAy, 4, 0, Math.PI * 2);
        ctx.arc(pBx, pBy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw Distance Badge
        const midX = (pAx + pBx) / 2;
        const midY = (pAy + pBy) / 2;
        const dist = Math.round(Math.hypot(pBx - pAx, pBy - pAy));

        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(midX - 18, midY - 8, 36, 14);
        ctx.fillStyle = jointColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${dist}px`, midX, midY);
      } else if (joint.type === 'hinge') {
        // Draw Hinge pivot line
        ctx.beginPath();
        ctx.moveTo(pAx, pAy);
        ctx.lineTo(pBx, pBy);
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = jointColor;
        ctx.setLineDash([2, 2]);
        ctx.stroke();

        // Pivot Pin Circle
        const pivotX = (pAx + pBx) / 2;
        const pivotY = (pAy + pBy) / 2;

        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = jointColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = jointColor;
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- CAMERA ZOOM & PAN CONTROL ---
  public getZoom(): number {
    return this.zoom;
  }

  public setZoom(zoom: number) {
    this.zoom = Math.max(0.25, Math.min(4.0, zoom));
  }

  public zoomBy(deltaFactor: number, focalX?: number, focalY?: number) {
    const oldZoom = this.zoom;
    const newZoom = Math.max(0.25, Math.min(4.0, this.zoom * deltaFactor));
    if (newZoom === oldZoom) return;

    if (focalX !== undefined && focalY !== undefined) {
      const centerX = this.world.viewportWidth / 2;
      const centerY = this.world.viewportHeight / 2;
      const factor = 1 - newZoom / oldZoom;
      this.panX += (focalX - centerX - this.panX) * factor;
      this.panY += (focalY - centerY - this.panY) * factor;
    }

    this.zoom = newZoom;
  }

  public panBy(dx: number, dy: number) {
    this.panX += dx / this.zoom;
    this.panY += dy / this.zoom;
  }

  public getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }

  public setPan(x: number, y: number) {
    this.panX = x;
    this.panY = y;
  }
}
