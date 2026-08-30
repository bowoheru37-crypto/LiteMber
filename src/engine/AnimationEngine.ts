/**
 * AnimationEngine.ts
 * High-performance 2D Animation Controller & Keyframe State Machine Engine
 * Optimized for sprite sheet clipping, frame events, and squash-and-stretch procedural animation on low-spec mobile devices.
 */

import { Entity, SpriteClip, AnimationTimelineTrack, AnimationKeyframe } from '../types/engine';
import { ParticleEngine } from './ParticleEngine';
import { soundEngine } from './AudioEngine';
import { TweenEngine } from './TweenEngine';

export class AnimationEngine {
  private activeClipMap: Map<string, { clipName: string; frameIndex: number; timerMs: number; lastSfxKeyframeId?: string }> = new Map();
  private sortedKeyframeCache: Map<string, { keyframes: AnimationKeyframe[]; rawLength: number }> = new Map();

  private getSortedKeyframes(track: AnimationTimelineTrack): AnimationKeyframe[] {
    const cached = this.sortedKeyframeCache.get(track.id);
    if (cached && cached.rawLength === track.keyframes.length) {
      return cached.keyframes;
    }
    const sorted = [...track.keyframes].sort((a, b) => a.timeMs - b.timeMs);
    this.sortedKeyframeCache.set(track.id, { keyframes: sorted, rawLength: track.keyframes.length });
    return sorted;
  }

  /**
   * Main animation loop method: handles timeline tracks, sprite clips, and legacy animated frames
   */
  public updateEntityAnimation(entity: Entity, dtMs: number): void {
    if (!entity.visible || !entity.sprite) return;

    // 1. Check if entity has an active timeline track
    if (entity.sprite.timelineTracks && entity.sprite.activeTimelineTrackId) {
      const track = entity.sprite.timelineTracks[entity.sprite.activeTimelineTrackId];
      if (track && track.keyframes && track.keyframes.length > 0) {
        this.updateTimelineTrack(entity, track, dtMs);
        return;
      }
    }

    if (entity.sprite.type !== 'animated') return;

    const clips = entity.sprite.clips;
    const currentClipName = entity.sprite.currentClip || 'idle';

    if (!clips || !clips[currentClipName]) {
      // Fallback to legacy animatedFrames array if present
      if (entity.sprite.animatedFrames && entity.sprite.animatedFrames.length > 0) {
        let animState = this.activeClipMap.get(entity.id);
        if (!animState) {
          animState = { clipName: 'default', frameIndex: 0, timerMs: 0 };
          this.activeClipMap.set(entity.id, animState);
        }

        const fps = entity.sprite.animationFps || 8;
        const frameInterval = 1000 / fps;
        animState.timerMs += dtMs;

        if (animState.timerMs >= frameInterval) {
          animState.timerMs -= frameInterval;
          animState.frameIndex = (animState.frameIndex + 1) % entity.sprite.animatedFrames.length;
          entity.sprite.pixelData = entity.sprite.animatedFrames[animState.frameIndex];
        }
      }
      return;
    }

    const clip: SpriteClip = clips[currentClipName];
    let animState = this.activeClipMap.get(entity.id);

    if (!animState || animState.clipName !== currentClipName) {
      animState = { clipName: currentClipName, frameIndex: 0, timerMs: 0 };
      this.activeClipMap.set(entity.id, animState);
    }

    const frameInterval = 1000 / (clip.fps || 10);
    animState.timerMs += dtMs;

    if (animState.timerMs >= frameInterval) {
      animState.timerMs -= frameInterval;

      if (animState.frameIndex < clip.frames.length - 1) {
        animState.frameIndex++;
      } else if (clip.loop !== false) {
        animState.frameIndex = 0;
      }

      entity.sprite.pixelData = clip.frames[animState.frameIndex];
    }
  }

  /**
   * Evaluates & samples an AnimationTimelineTrack at the current time
   */
  public updateTimelineTrack(entity: Entity, track: AnimationTimelineTrack, dtMs: number): void {
    let state = this.activeClipMap.get(entity.id);
    if (!state || state.clipName !== track.id) {
      state = { clipName: track.id, frameIndex: 0, timerMs: 0 };
      this.activeClipMap.set(entity.id, state);
    }

    state.timerMs += dtMs;
    const maxDuration = Math.max(100, track.durationMs || 1000);

    if (state.timerMs >= maxDuration) {
      if (track.loop !== false) {
        state.timerMs = state.timerMs % maxDuration;
        state.lastSfxKeyframeId = undefined;
      } else {
        state.timerMs = maxDuration;
      }
    }

    const currentTime = state.timerMs;
    const sortedKf = this.getSortedKeyframes(track);
    if (sortedKf.length === 0) return;

    // Find active keyframe & next keyframe
    let currKf = sortedKf[0];
    let nextKf = sortedKf[sortedKf.length - 1];

    for (let i = 0; i < sortedKf.length; i++) {
      if (sortedKf[i].timeMs <= currentTime) {
        currKf = sortedKf[i];
        nextKf = sortedKf[(i + 1) % sortedKf.length];
      }
    }

    // Trigger SFX event on keyframe crossing
    if (currKf.sfxPreset && currKf.id !== state.lastSfxKeyframeId) {
      soundEngine.playSynthPreset(currKf.sfxPreset);
      state.lastSfxKeyframeId = currKf.id;
    }

    // Update Pixel Frame
    if (currKf.pixelData) {
      entity.sprite.pixelData = currKf.pixelData;
    }

    // Interpolation factor between currKf and nextKf
    let t = 0;
    const duration = nextKf.timeMs > currKf.timeMs ? nextKf.timeMs - currKf.timeMs : maxDuration - currKf.timeMs;
    if (duration > 0) {
      t = Math.min(1, Math.max(0, (currentTime - currKf.timeMs) / duration));
    }

    if (currKf.easing) {
      t = TweenEngine.getEasedValue(t, currKf.easing);
    }

    // Interpolate transform properties
    if (entity.transform) {
      if (currKf.scaleX !== undefined && nextKf.scaleX !== undefined) {
        entity.transform.scaleX = currKf.scaleX + (nextKf.scaleX - currKf.scaleX) * t;
      } else if (currKf.scaleX !== undefined) {
        entity.transform.scaleX = currKf.scaleX;
      }

      if (currKf.scaleY !== undefined && nextKf.scaleY !== undefined) {
        entity.transform.scaleY = currKf.scaleY + (nextKf.scaleY - currKf.scaleY) * t;
      } else if (currKf.scaleY !== undefined) {
        entity.transform.scaleY = currKf.scaleY;
      }

      if (currKf.rotation !== undefined && nextKf.rotation !== undefined) {
        entity.transform.rotation = currKf.rotation + (nextKf.rotation - currKf.rotation) * t;
      } else if (currKf.rotation !== undefined) {
        entity.transform.rotation = currKf.rotation;
      }

      // 3D Euler Angles & Depth Interpolation
      if (currKf.rotationX !== undefined && nextKf.rotationX !== undefined) {
        entity.transform.rotationX = currKf.rotationX + (nextKf.rotationX - currKf.rotationX) * t;
      } else if (currKf.rotationX !== undefined) {
        entity.transform.rotationX = currKf.rotationX;
      }

      if (currKf.rotationY !== undefined && nextKf.rotationY !== undefined) {
        entity.transform.rotationY = currKf.rotationY + (nextKf.rotationY - currKf.rotationY) * t;
      } else if (currKf.rotationY !== undefined) {
        entity.transform.rotationY = currKf.rotationY;
      }

      if (currKf.rotationZ !== undefined && nextKf.rotationZ !== undefined) {
        entity.transform.rotationZ = currKf.rotationZ + (nextKf.rotationZ - currKf.rotationZ) * t;
      } else if (currKf.rotationZ !== undefined) {
        entity.transform.rotationZ = currKf.rotationZ;
      }

      if (currKf.depthZ !== undefined && nextKf.depthZ !== undefined) {
        entity.transform.depthZ = currKf.depthZ + (nextKf.depthZ - currKf.depthZ) * t;
      } else if (currKf.depthZ !== undefined) {
        entity.transform.depthZ = currKf.depthZ;
      }

      if (currKf.skewX !== undefined && nextKf.skewX !== undefined) {
        entity.transform.skewX = currKf.skewX + (nextKf.skewX - currKf.skewX) * t;
      } else if (currKf.skewX !== undefined) {
        entity.transform.skewX = currKf.skewX;
      }

      if (currKf.skewY !== undefined && nextKf.skewY !== undefined) {
        entity.transform.skewY = currKf.skewY + (nextKf.skewY - currKf.skewY) * t;
      } else if (currKf.skewY !== undefined) {
        entity.transform.skewY = currKf.skewY;
      }
    }

    if (currKf.opacity !== undefined && nextKf.opacity !== undefined) {
      entity.sprite.opacity = currKf.opacity + (nextKf.opacity - currKf.opacity) * t;
    } else if (currKf.opacity !== undefined) {
      entity.sprite.opacity = currKf.opacity;
    }
  }

  /**
   * Procedural Squash & Stretch Landing Animation
   */
  public triggerSquashAndStretch(entity: Entity): void {
    if (!entity.transform) return;

    // Apply quick squash pose
    entity.transform.scaleX = 1.25;
    entity.transform.scaleY = 0.75;

    // Trigger land particle burst
    ParticleEngine.emit(
      entity.transform.x + entity.transform.width / 2,
      entity.transform.y + entity.transform.height,
      8,
      'dust'
    );
  }

  /**
   * Resets and cleans up inactive entity animation states
   */
  public clearEntityState(entityId: string): void {
    this.activeClipMap.delete(entityId);
  }
}
