import { Vector2D } from '../types/engine';

export interface SpringConfig {
  stiffness: number; // K: Kekakuan pegas (e.g. 100 - 500)
  damping: number;   // C: Peredaman (e.g. 8 - 40)
  mass: number;      // M: Massa (e.g. 0.5 - 3.0)
  velocity?: number; // V: Kecepatan awal
  restThreshold?: number; // Batas dianggap diam (default 0.001)
}

export interface ActiveSpringSimulation {
  id: string;
  target: any;
  property: string;
  currentValue: number;
  targetValue: number;
  velocity: number;
  config: SpringConfig;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
}

export class SpringPhysicsEngine {
  // Preset konfigurasi pegas siap pakai untuk UI & Karakter
  public static readonly PRESETS: Record<string, SpringConfig> = {
    bouncyUI: { stiffness: 280, damping: 12, mass: 1.0 }, // Pop-up UI membal
    snappyUI: { stiffness: 350, damping: 25, mass: 0.8 }, // Tombol UI responsif & cepat
    looseUI: { stiffness: 120, damping: 8, mass: 1.2 },   // Menu melayang lambat
    characterLand: { stiffness: 220, damping: 14, mass: 1.8 }, // Impact karakter mendarat berat
    squashStretch: { stiffness: 300, damping: 10, mass: 0.9 }, // Deformation pegas elastis
    cameraFollow: { stiffness: 90, damping: 18, mass: 1.5 },   // Follow kamera halus
  };

  private static activeSimulations: Map<string, ActiveSpringSimulation> = new Map();
  private static isLiteModeActive: boolean = false;
  private static subsamplingFactor: number = 1;
  private static subsamplingFrameCount: number = 0;
  private static accumulatedDtMs: number = 0;

  /**
   * Sets Lite Mode for Spring Physics (reduces step frequency and relaxes rest thresholds)
   */
  public static setLiteMode(enabled: boolean, factor: number = 2): void {
    this.isLiteModeActive = enabled;
    this.subsamplingFactor = enabled ? Math.max(1, Math.min(4, factor)) : 1;
  }

  public static getSubsamplingFactor(): number {
    return this.subsamplingFactor;
  }

  public static isLiteModeEnabled(): boolean {
    return this.isLiteModeActive;
  }

  /**
   * Solusi Analitis Persamaan Diferensial Orde-2 untuk Pegas Terpampat (Damped Harmonic Oscillator)
   * Menghitung nilai terinterpolasi t pada rentang [0, 1] berbasis waktu riil.
   */
  public static evaluateSpringAnalytical(
    progressT: number,
    config: SpringConfig = SpringPhysicsEngine.PRESETS.bouncyUI
  ): number {
    const { stiffness: k, damping: c, mass: m, velocity: v0 = 0 } = config;

    // Frekuensi alami w0 dan rasio redaman zeta
    const w0 = Math.sqrt(k / m);
    const zeta = c / (2 * Math.sqrt(k * m));

    // Waktu disimulasikan dalam rentang 0 .. 1 detik efektif
    const t = progressT;

    if (zeta < 1.0) {
      // Underdamped (Membal / Bouncy / Oscillation)
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      const A = 1.0;
      const B = (zeta * w0 - v0) / wd;
      const envelope = Math.exp(-zeta * w0 * t);
      const oscillation = A * Math.cos(wd * t) + B * Math.sin(wd * t);
      return 1.0 - envelope * oscillation;
    } else if (Math.abs(zeta - 1.0) < 0.01) {
      // Critically Damped (Responsif Tanpa Membal Overshoot)
      const envelope = Math.exp(-w0 * t);
      return 1.0 - envelope * (1.0 + (w0 - v0) * t);
    } else {
      // Overdamped (Pergerakan Lambat Halus)
      const gamma1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
      const gamma2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
      const c1 = (v0 - gamma2) / (gamma1 - gamma2);
      const c2 = 1.0 - c1;
      return 1.0 - (c1 * Math.exp(gamma1 * t) + c2 * Math.exp(gamma2 * t));
    }
  }

  /**
   * Langkah Integrasi Numerik Hooke's Law (Euler-Cromer) untuk Simulasi Kontinu Frame-by-Frame
   */
  public static stepSpringState(
    current: number,
    target: number,
    velocity: number,
    dtSeconds: number,
    config: SpringConfig
  ): { value: number; velocity: number; isAtRest: boolean } {
    const { stiffness: k, damping: c, mass: m, restThreshold = 0.001 } = config;

    // Gaya Pegas F_spring = -k * (x - target)
    const displacement = current - target;
    const fSpring = -k * displacement;

    // Gaya Redaman F_damping = -c * v
    const fDamping = -c * velocity;

    // Total Percepatan a = F_total / m
    const acceleration = (fSpring + fDamping) / m;

    // Update Kecepatan & Posisi (Euler-Cromer)
    const newVelocity = velocity + acceleration * dtSeconds;
    const newValue = current + newVelocity * dtSeconds;

    const isAtRest =
      Math.abs(displacement) < restThreshold && Math.abs(newVelocity) < restThreshold * 10;

    return {
      value: isAtRest ? target : newValue,
      velocity: isAtRest ? 0 : newVelocity,
      isAtRest,
    };
  }

  /**
   * Mendaftarkan simulasi pegas kontinu pada properti objek
   */
  public static startSpring(
    id: string,
    targetObj: any,
    property: string,
    targetValue: number,
    config: SpringConfig = SpringPhysicsEngine.PRESETS.bouncyUI,
    onUpdate?: (val: number) => void,
    onComplete?: () => void
  ): string {
    const currentValue = typeof targetObj[property] === 'number' ? targetObj[property] : 0;
    const sim: ActiveSpringSimulation = {
      id,
      target: targetObj,
      property,
      currentValue,
      targetValue,
      velocity: config.velocity || 0,
      config,
      onUpdate,
      onComplete,
    };
    this.activeSimulations.set(id, sim);
    return id;
  }

  /**
   * Mengupdate semua simulasi pegas aktif pada siklus frame utama dtMs
   * Menerapkan Sub-sampling & Relaxed Rest Threshold saat Lite Mode aktif untuk menghemat CPU
   */
  public static update(dtMs: number): void {
    if (this.activeSimulations.size === 0) {
      this.accumulatedDtMs = 0;
      this.subsamplingFrameCount = 0;
      return;
    }

    let effectiveDtMs = dtMs;

    // Sub-sampling reduction in Lite Mode
    if (this.subsamplingFactor > 1) {
      this.subsamplingFrameCount++;
      this.accumulatedDtMs += dtMs;
      if (this.subsamplingFrameCount < this.subsamplingFactor) {
        // Skip calculation step on this frame to preserve frame rate
        return;
      }
      effectiveDtMs = this.accumulatedDtMs;
      this.accumulatedDtMs = 0;
      this.subsamplingFrameCount = 0;
    }

    const dtSec = Math.min(0.096, effectiveDtMs / 1000); // Guard Delta Time

    // Relax rest threshold in Lite mode so springs come to rest faster
    const restThresholdMultiplier = this.isLiteModeActive ? 15.0 : 1.0;

    this.activeSimulations.forEach((sim, id) => {
      if (!sim.target) {
        this.activeSimulations.delete(id);
        return;
      }

      const effectiveConfig = this.isLiteModeActive
        ? {
            ...sim.config,
            restThreshold: (sim.config.restThreshold || 0.001) * restThresholdMultiplier,
          }
        : sim.config;

      const res = this.stepSpringState(
        sim.currentValue,
        sim.targetValue,
        sim.velocity,
        dtSec,
        effectiveConfig
      );

      sim.currentValue = res.value;
      sim.velocity = res.velocity;

      if (typeof sim.target[sim.property] === 'number') {
        sim.target[sim.property] = sim.currentValue;
      }

      if (sim.onUpdate) {
        sim.onUpdate(sim.currentValue);
      }

      if (res.isAtRest) {
        if (typeof sim.target[sim.property] === 'number') {
          sim.target[sim.property] = sim.targetValue;
        }
        if (sim.onComplete) {
          sim.onComplete();
        }
        this.activeSimulations.delete(id);
      }
    });
  }

  /**
   * Menghentikan simulasi pegas tertentu
   */
  public static stopSpring(id: string): void {
    this.activeSimulations.delete(id);
  }

  /**
   * Membersihkan seluruh simulasi pegas
   */
  public static clearAll(): void {
    this.activeSimulations.clear();
  }

  /**
   * Menghasilkan Efek Squash & Stretch Pegas Karakter saat Mendarat / Melompat
   */
  public static applyCharacterSquashStretch(
    transform: { scaleX: number; scaleY: number },
    impactIntensity: number = 0.4
  ): { targetScaleX: number; targetScaleY: number } {
    return {
      targetScaleX: 1.0 + impactIntensity,
      targetScaleY: Math.max(0.3, 1.0 - impactIntensity * 0.8),
    };
  }
}
