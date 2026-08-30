/**
 * SceneEngine.ts
 * Advanced Multi-Scene Manager & Transition FX Engine
 * Supports Scene switching (MainMenu, Level_1, GameOver, Victory), animated transitions, and scene hierarchy cloning.
 */

import { Scene, SceneTransitionType, Entity, WorldSettings } from '../types/engine';
import { soundEngine } from './AudioEngine';
import { AndroidEngine } from './AndroidEngine';

export class SceneEngine {
  private scenes: Map<string, Scene> = new Map();
  private activeSceneId: string = 'scene_default';

  // Transition State
  private isTransitioning: boolean = false;
  private transitionType: SceneTransitionType = 'fade_black';
  private transitionProgress: number = 0; // 0 to 1
  private transitionDurationMs: number = 600;
  private targetSceneId: string | null = null;

  public onSceneChanged?: (scene: Scene) => void;

  /**
   * Initializes scenes from project data
   */
  public initializeScenes(scenesList?: Scene[], activeId?: string): void {
    this.scenes.clear();

    if (scenesList && scenesList.length > 0) {
      scenesList.forEach((s) => this.scenes.set(s.id, s));
      this.activeSceneId = activeId || scenesList[0].id;
    } else {
      // Create default initial scene
      const defaultScene = this.createDefaultScene('Level 1 Utama');
      this.scenes.set(defaultScene.id, defaultScene);
      this.activeSceneId = defaultScene.id;
    }
  }

  public getActiveScene(): Scene | null {
    return this.scenes.get(this.activeSceneId) || null;
  }

  public getAllScenes(): Scene[] {
    return Array.from(this.scenes.values());
  }

  /**
   * Initiates animated transition to target scene
   */
  public switchScene(sceneId: string, transition: SceneTransitionType = 'fade_black'): void {
    if (!this.scenes.has(sceneId) || this.isTransitioning) return;

    this.targetSceneId = sceneId;
    this.transitionType = transition;
    this.transitionProgress = 0;
    this.isTransitioning = true;

    AndroidEngine.triggerHaptic(20);
    soundEngine.play('powerup');
  }

  /**
   * Updates transition animation frame by frame
   */
  public update(dtMs: number): void {
    if (!this.isTransitioning) return;

    this.transitionProgress += dtMs / this.transitionDurationMs;

    // Midpoint switch scene
    if (this.transitionProgress >= 0.5 && this.targetSceneId && this.activeSceneId !== this.targetSceneId) {
      this.activeSceneId = this.targetSceneId;
      const active = this.getActiveScene();
      if (active && this.onSceneChanged) {
        this.onSceneChanged(active);
      }
    }

    if (this.transitionProgress >= 1.0) {
      this.transitionProgress = 1.0;
      this.isTransitioning = false;
      this.targetSceneId = null;
    }
  }

  /**
   * Renders Transition FX on Canvas
   */
  public renderTransition(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.isTransitioning) return;

    ctx.save();

    // Alpha peaks at progress 0.5
    const alpha = Math.sin(this.transitionProgress * Math.PI);

    switch (this.transitionType) {
      case 'fade_black':
        ctx.fillStyle = `rgba(2, 6, 23, ${alpha})`;
        ctx.fillRect(0, 0, width, height);
        break;

      case 'wipe_left': {
        const wipeX = (1 - alpha) * width;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(wipeX, 0, width, height);
        break;
      }

      case 'slide_up': {
        const slideY = (1 - alpha) * height;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, slideY, width, height);
        break;
      }

      case 'zoom_in': {
        ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, (1 - alpha) * Math.hypot(width, height), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      default:
        ctx.fillStyle = `rgba(2, 6, 23, ${alpha})`;
        ctx.fillRect(0, 0, width, height);
        break;
    }

    ctx.restore();
  }

  /**
   * Creates a new blank scene
   */
  public static createScene(name: string, entities: Entity[], world: WorldSettings): Scene {
    const newScene: Scene = {
      id: `scene_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name,
      entities: JSON.parse(JSON.stringify(entities)),
      world: JSON.parse(JSON.stringify(world)),
    };

    return newScene;
  }

  public createScene(name: string, entities: Entity[], world: WorldSettings): Scene {
    const newScene = SceneEngine.createScene(name, entities, world);
    this.scenes.set(newScene.id, newScene);
    return newScene;
  }

  /**
   * Duplicates an existing scene
   */
  public duplicateScene(sceneId: string, newName?: string): Scene | null {
    const existing = this.scenes.get(sceneId);
    if (!existing) return null;

    const copy: Scene = {
      ...JSON.parse(JSON.stringify(existing)),
      id: `scene_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: newName || `${existing.name} (Salinan)`,
    };

    this.scenes.set(copy.id, copy);
    return copy;
  }

  public deleteScene(sceneId: string): boolean {
    if (this.scenes.size <= 1) return false; // Prevent deleting the only scene
    return this.scenes.delete(sceneId);
  }

  private createDefaultScene(name: string): Scene {
    return {
      id: 'scene_level_1',
      name,
      entities: [],
      world: {
        gravityX: 0,
        gravityY: 800,
        backgroundColor: '#0f172a',
        viewportWidth: 800,
        viewportHeight: 450,
        cameraSmoothing: 0.1,
        targetFPS: 60,
        deviceProfile: 'itel_a70_optimized',
        maxActiveParticles: 300,
        useTypedArrayBuffer: true,
      },
    };
  }

  public reset(): void {
    this.isTransitioning = false;
    this.transitionProgress = 0;
    this.targetSceneId = null;
  }
}

export const sceneEngine = new SceneEngine();
