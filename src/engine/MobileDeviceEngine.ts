/**
 * MobileDeviceEngine.ts
 * Mobile Device Performance Governor & Touch Input Handler
 * Manages thermal throttling prevention, Screen WakeLock, and Touch Gesture Recognition for Smartphones.
 * Specialized profile for low-RAM smartphones like the itel A70 (Unisoc T603/T606, Mali-G57 GPU).
 */

export class MobileDeviceEngine {
  private wakeLock: any = null;
  private batterySaverMode = false;
  private frameBudgetMs = 16.6; // 60 FPS = 16.6ms per frame
  private lowFpsCounter = 0;
  private adaptiveQualityLevel = 2; // 2 = High (60 FPS), 1 = Balanced, 0 = Low-Power (30 FPS)

  /**
   * Requests Screen WakeLock so screen doesn't dim during gameplay
   */
  public async requestWakeLock(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        return true;
      } catch (err) {
        console.warn('WakeLock not available:', err);
      }
    }
    return false;
  }

  /**
   * Calculates optimal Device Pixel Ratio (DPR) cap for budget GPUs (Mali-G57 / itel A70)
   */
  public getOptimalDpr(): number {
    if (typeof window === 'undefined') return 1;
    const rawDpr = window.devicePixelRatio || 1;
    if (this.adaptiveQualityLevel === 0 || this.batterySaverMode) {
      return 1.0; // 1.0x DPR for battery saver or low FPS
    }
    return Math.min(rawDpr, 1.5); // Cap at 1.5x max for smooth 60 FPS fillrate on Mali-G57 GPU
  }

  /**
   * Triggers haptic tactile vibration on touch
   */
  public triggerHaptic(durationMs: number = 10): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Ignored if unsupported
      }
    }
  }

  public releaseWakeLock(): void {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {
        // Silent ignore
      }
      this.wakeLock = null;
    }
  }

  /**
   * Enables or disables Battery Saver FPS throttling
   */
  public setBatterySaverMode(enabled: boolean): void {
    this.batterySaverMode = enabled;
    this.frameBudgetMs = enabled ? 33.3 : 16.6; // 30 FPS vs 60 FPS
  }

  public isBatterySaverActive(): boolean {
    return this.batterySaverMode;
  }

  public getFrameBudgetMs(): number {
    return this.frameBudgetMs;
  }

  /**
   * Adaptive Performance Monitor: Adjusts quality if device drops frames
   */
  public recordFrameTime(frameTimeMs: number): void {
    if (frameTimeMs > 28) {
      this.lowFpsCounter++;
      if (this.lowFpsCounter > 60) {
        // Persistent low frame rate on budget GPU - drop quality tier
        if (this.adaptiveQualityLevel > 0) {
          this.adaptiveQualityLevel--;
        }
        this.lowFpsCounter = 0;
      }
    } else {
      if (this.lowFpsCounter > 0) this.lowFpsCounter--;
    }
  }

  public getQualityLevel(): number {
    return this.adaptiveQualityLevel;
  }

  public shouldSkipParticleEffects(): boolean {
    return this.batterySaverMode || this.adaptiveQualityLevel === 0;
  }
}

