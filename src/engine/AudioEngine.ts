/**
 * Centralized AudioEngine module optimized for mobile hardware constraints (itel A70).
 * Features:
 * - Dynamic WebAudio Volume Normalization & DynamicsCompressor limiter to prevent speaker distortion.
 * - Master, BGM, and SFX volume controls.
 * - Procedural synthesized chiptune & ambient BGM loops (0kb network download, zero RAM waste).
 * - WebAudio sound effect triggers with instant response.
 * - User interaction AudioContext auto-unlock for mobile browsers.
 */
import { AudioAsset } from '../types/engine';

export interface CustomSynthConfig {
  waveType?: OscillatorType;
  startFreq?: number;
  endFreq?: number;
  durationMs?: number;
  volume?: number;
  pitchRamp?: 'none' | 'exponential' | 'linear';
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;

  private currentBgmAudio: HTMLAudioElement | null = null;
  private bgmIntervalId: number | null = null;
  private audioCache = new Map<string, HTMLAudioElement>();

  // Volume Normalization Controls
  private masterVolume: number = 0.8;
  private bgmVolume: number = 0.6;
  private sfxVolume: number = 1.0;
  private isUnlocked: boolean = false;

  constructor() {
    this.setupAutoUnlock();
  }

  /**
   * Auto-unlock WebAudio context on first user touch or click
   */
  private setupAutoUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      } else {
        this.isUnlocked = true;
      }
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('touchend', unlock);
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('touchend', unlock, { passive: true });
    window.addEventListener('mousedown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  /**
   * Initialize WebAudio Context with Hardware-Optimized DynamicsCompressor Normalizer
   */
  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      // Master Gain Node
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      // Hardware Limiter & Dynamics Compressor for Speaker Volume Normalization (itel A70 Protection)
      this.compressorNode = this.ctx.createDynamicsCompressor();
      this.compressorNode.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressorNode.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressorNode.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressorNode.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.compressorNode.release.setValueAtTime(0.1, this.ctx.currentTime);

      // Route: Source -> Master Gain -> Compressor -> Destination
      this.masterGainNode.connect(this.compressorNode);
      this.compressorNode.connect(this.ctx.destination);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Volume Normalization helper (Perceptual logarithmic curve)
   */
  public normalizeVolume(rawVolume: number): number {
    const clamped = Math.max(0, Math.min(1, rawVolume));
    // Logarithmic perceptual curve for speaker response
    return Math.pow(clamped, 1.5);
  }

  // Volume Getters & Setters
  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
    if (this.currentBgmAudio) {
      this.currentBgmAudio.volume = this.normalizeVolume(this.bgmVolume * this.masterVolume);
    }
  }

  public setBgmVolume(vol: number) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.currentBgmAudio) {
      this.currentBgmAudio.volume = this.normalizeVolume(this.bgmVolume * this.masterVolume);
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  public getVolumes() {
    return {
      master: this.masterVolume,
      bgm: this.bgmVolume,
      sfx: this.sfxVolume,
    };
  }

  /**
   * Unified Entrypoint for playing audio across the engine
   * Handles string keys, audio assets, and synth fallbacks safely
   */
  public playAudioUnified(
    target: string | AudioAsset | undefined,
    options?: { volume?: number; isBgm?: boolean; audioAssets?: AudioAsset[] }
  ): void {
    if (!target) return;

    const volume = options?.volume ?? 1.0;
    const isBgm = options?.isBgm ?? false;

    if (typeof target === 'object') {
      if (isBgm || target.type === 'bgm') {
        this.playBGM(target, volume);
      } else {
        this.playAsset(target);
      }
      return;
    }

    const cleanKey = String(target).trim();
    if (!cleanKey) return;

    // Check project assets pool first
    if (options?.audioAssets && options.audioAssets.length > 0) {
      const match = options.audioAssets.find((a) => a.id === cleanKey || a.name === cleanKey);
      if (match) {
        if (isBgm || match.type === 'bgm') {
          this.playBGM(match, volume);
        } else {
          this.playAsset(match);
        }
        return;
      }
    }

    // Fallback to synth preset
    if (isBgm) {
      this.playBGM(cleanKey, volume);
    } else {
      this.playSynthPreset(cleanKey, volume);
    }
  }

  /**
   * Main entry point to play sound by asset ID, preset name, or type
   */
  public play(typeOrId: string | undefined, audioAssets?: AudioAsset[]) {
    this.playAudioUnified(typeOrId, { audioAssets });
  }

  public playSfx(typeOrId: string, volume: number = 1.0) {
    this.playSynthPreset(typeOrId, volume);
  }

  public playBgm(assetOrKey: string | AudioAsset, volume: number = 0.6, loop: boolean = true) {
    this.playBGM(assetOrKey, volume, loop);
  }

  /**
   * Play a specific AudioAsset (custom URL, base64 data URL, or synth preset)
   */
  public playAsset(asset: AudioAsset) {
    if (asset.type === 'bgm') {
      this.playBGM(asset);
      return;
    }

    if (asset.format === 'custom_url' || asset.format === 'data_url') {
      if (!asset.url) return;
      try {
        let audioEl = this.audioCache.get(asset.id);
        if (!audioEl) {
          audioEl = new Audio(asset.url);
          this.audioCache.set(asset.id, audioEl);
        }
        audioEl.currentTime = 0;
        const normalizedVol = this.normalizeVolume((asset.volume ?? 0.8) * this.sfxVolume * this.masterVolume);
        audioEl.volume = normalizedVol;
        audioEl.play().catch(() => {});
      } catch {
        // Fallback or muted
      }
    } else if (asset.presetKey) {
      this.playSynthPreset(asset.presetKey, asset.volume ?? 1);
    }
  }

  /**
   * Play Background Music (either custom audio file or synthesized chiptune loop)
   */
  public playBGM(assetOrKey: string | AudioAsset, volume: number = 0.6, loop: boolean = true) {
    this.stopBGM();
    this.initContext();

    let asset: AudioAsset | null = null;
    let key = '';

    if (typeof assetOrKey === 'string') {
      key = assetOrKey;
    } else {
      asset = assetOrKey;
      key = asset.presetKey || asset.id;
      volume = asset.volume ?? volume;
    }

    const normalizedBgmVol = this.normalizeVolume(volume * this.bgmVolume * this.masterVolume);

    // Custom audio file BGM
    if (asset && (asset.format === 'custom_url' || asset.format === 'data_url') && asset.url) {
      try {
        const audio = new Audio(asset.url);
        audio.loop = loop;
        audio.volume = normalizedBgmVol;
        audio.play().catch(() => {});
        this.currentBgmAudio = audio;
      } catch {
        // Audio error
      }
      return;
    }

    // Procedural synthesized ambient BGM loop (100% lightweight, 0kb network)
    this.playProceduralBgmLoop(key, volume);
  }

  /**
   * Stop any playing background music
   */
  public stopBGM() {
    if (this.currentBgmAudio) {
      this.currentBgmAudio.pause();
      this.currentBgmAudio.currentTime = 0;
      this.currentBgmAudio = null;
    }
    if (this.bgmIntervalId !== null) {
      window.clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  /**
   * Trigger synthesized sound effect with WebAudio API oscillators & dynamic normalization
   */
  public playSynthPreset(type: string, volumeScale: number = 1) {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Route through Master Gain if available
      if (this.masterGainNode) {
        osc.connect(gain);
        gain.connect(this.masterGainNode);
      } else {
        osc.connect(gain);
        gain.connect(this.ctx.destination);
      }

      const effectiveVolume = this.normalizeVolume(0.18 * volumeScale * this.sfxVolume);

      switch (type) {
        case 'jump':
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
          gain.gain.setValueAtTime(effectiveVolume, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
          break;

        case 'coin':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(987.77, now); // B5
          osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
          gain.gain.setValueAtTime(effectiveVolume * 1.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
          break;

        case 'hit':
        case 'spike':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
          gain.gain.setValueAtTime(effectiveVolume * 1.4, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;

        case 'laser':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
          gain.gain.setValueAtTime(effectiveVolume, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;

        case 'explosion':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
          gain.gain.setValueAtTime(effectiveVolume * 1.5, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;

        case 'powerup':
        case 'win':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(554.37, now + 0.08);
          osc.frequency.setValueAtTime(659.25, now + 0.16);
          osc.frequency.setValueAtTime(880, now + 0.24);
          gain.gain.setValueAtTime(effectiveVolume * 1.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
          break;

        case 'step':
        case 'bounce':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.06);
          gain.gain.setValueAtTime(effectiveVolume * 0.8, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
          osc.start(now);
          osc.stop(now + 0.06);
          break;

        default:
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(effectiveVolume * 0.8, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
      }
    } catch {
      // Audio block muted
    }
  }

  /**
   * Play custom synthesized sound effect via Web Audio API with frequency ramps and wave customizers
   */
  public playCustomSynthSound(config: CustomSynthConfig) {
    try {
      this.initContext();
      if (!this.ctx) return;

      const waveType = config.waveType || 'sine';
      const startFreq = config.startFreq ?? 440;
      const endFreq = config.endFreq ?? startFreq;
      const durationSec = (config.durationMs ?? 180) / 1000;
      const volScale = config.volume ?? 1;
      const ramp = config.pitchRamp || (startFreq !== endFreq ? 'exponential' : 'none');

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = waveType;
      osc.frequency.setValueAtTime(startFreq, now);

      if (ramp === 'exponential' && endFreq > 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + durationSec);
      } else if (ramp === 'linear') {
        osc.frequency.linearRampToValueAtTime(endFreq, now + durationSec);
      }

      if (this.masterGainNode) {
        osc.connect(gain);
        gain.connect(this.masterGainNode);
      } else {
        osc.connect(gain);
        gain.connect(this.ctx.destination);
      }

      const effectiveVolume = this.normalizeVolume(0.2 * volScale * this.sfxVolume);
      gain.gain.setValueAtTime(effectiveVolume, now);
      gain.gain.linearRampToValueAtTime(0.001, now + durationSec);

      osc.start(now);
      osc.stop(now + durationSec);
    } catch {
      // ignore
    }
  }

  /**
   * Procedural WebAudio Ambient Chiptune Arpeggiator BGM generator
   */
  private playProceduralBgmLoop(themeKey: string, volume: number) {
    try {
      this.initContext();
      if (!this.ctx) return;

      let notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5 (Cyber runner)
      let tempoMs = 180;
      let waveType: OscillatorType = 'triangle';

      if (themeKey === 'space_patrol' || themeKey === 'laser_tune') {
        notes = [220.0, 277.18, 329.63, 440.0, 329.63, 277.18]; // A3 minor arpeggio
        tempoMs = 150;
        waveType = 'sawtooth';
      } else if (themeKey === 'pixel_bounce' || themeKey === 'flappy_tune') {
        notes = [349.23, 440.0, 523.25, 659.25, 523.25, 440.0]; // F major cheerful
        tempoMs = 140;
        waveType = 'sine';
      } else if (themeKey === 'ambient_zen') {
        notes = [196.0, 246.94, 293.66, 392.0]; // G3 ambient calm
        tempoMs = 320;
        waveType = 'sine';
      } else if (themeKey === 'dungeon_synth') {
        notes = [146.83, 174.61, 220.0, 261.63, 220.0, 174.61]; // D3 minor misterius
        tempoMs = 210;
        waveType = 'square';
      }

      let step = 0;
      const normalizedVol = this.normalizeVolume(0.08 * volume * this.bgmVolume);

      this.bgmIntervalId = window.setInterval(() => {
        if (!this.ctx) return;
        try {
          const freq = notes[step % notes.length];
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = waveType;
          osc.frequency.setValueAtTime(freq, now);

          if (this.masterGainNode) {
            osc.connect(gain);
            gain.connect(this.masterGainNode);
          } else {
            osc.connect(gain);
            gain.connect(this.ctx.destination);
          }

          gain.gain.setValueAtTime(normalizedVol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + (tempoMs / 1000) * 0.85);

          osc.start(now);
          osc.stop(now + (tempoMs / 1000) * 0.85);

          step++;
        } catch {
          // loop catch
        }
      }, tempoMs);
    } catch {
      // Audio init error
    }
  }

  /**
   * Clear cached audio instances & release memory buffers for low-spec device optimization (itel A70)
   */
  public clearCache(): number {
    const clearedCount = this.audioCache.size;
    this.audioCache.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    this.audioCache.clear();
    return clearedCount;
  }
}

export const audioEngine = new AudioEngine();
export const soundEngine = audioEngine; // Backward compatibility alias
