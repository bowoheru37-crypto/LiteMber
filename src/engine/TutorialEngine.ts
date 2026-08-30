/**
 * TutorialEngine.ts
 * High-performance Interactive Tutorial & Onboarding Engine for Mobile Game Dev
 * Features spotlight masking, animated gesture pointers, haptic triggers, sound cues, and step manager.
 * Optimized for low-spec Android devices (itel A70).
 */

import { TutorialSequence, TutorialStep, GestureHintType } from '../types/engine';
import { soundEngine } from './AudioEngine';
import { AndroidEngine } from './AndroidEngine';

export class TutorialEngine {
  private activeSequence: TutorialSequence | null = null;
  private currentStepIndex: number = 0;
  private active: boolean = false;
  private timerMs: number = 0;
  private gesturePulseTimer: number = 0;

  // Callback on completion
  public onStepChanged?: (step: TutorialStep, index: number) => void;
  public onSequenceCompleted?: (sequenceId: string) => void;

  /**
   * Starts a tutorial sequence
   */
  public startTutorial(sequence: TutorialSequence, startStepIndex: number = 0): void {
    if (!sequence || !sequence.steps || sequence.steps.length === 0) return;

    this.activeSequence = sequence;
    this.currentStepIndex = Math.min(startStepIndex, sequence.steps.length - 1);
    this.active = true;
    this.timerMs = 0;
    this.gesturePulseTimer = 0;

    const currentStep = this.getCurrentStep();
    if (currentStep) {
      this.triggerStepFeedback(currentStep);
      if (this.onStepChanged) this.onStepChanged(currentStep, this.currentStepIndex);
    }
  }

  public getCurrentStep(): TutorialStep | null {
    if (!this.active || !this.activeSequence) return null;
    return this.activeSequence.steps[this.currentStepIndex] || null;
  }

  public getActiveSequence(): TutorialSequence | null {
    return this.activeSequence;
  }

  public isActive(): boolean {
    return this.active;
  }

  /**
   * Updates tutorial pulse timer and auto-advance
   */
  public update(dtMs: number): void {
    if (!this.active || !this.activeSequence) return;

    this.gesturePulseTimer += dtMs * 0.003; // Smooth pulse angle
    this.timerMs += dtMs;

    const currentStep = this.getCurrentStep();
    if (currentStep && currentStep.autoAdvanceMs && currentStep.autoAdvanceMs > 0) {
      if (this.timerMs >= currentStep.autoAdvanceMs) {
        this.nextStep();
      }
    }
  }

  /**
   * Advances to next step in active tutorial sequence
   */
  public nextStep(): void {
    if (!this.active || !this.activeSequence) return;

    if (this.currentStepIndex < this.activeSequence.steps.length - 1) {
      this.currentStepIndex++;
      this.timerMs = 0;
      const currentStep = this.getCurrentStep();
      if (currentStep) {
        this.triggerStepFeedback(currentStep);
        if (this.onStepChanged) this.onStepChanged(currentStep, this.currentStepIndex);
      }
    } else {
      this.completeTutorial();
    }
  }

  /**
   * Goes back to previous step
   */
  public prevStep(): void {
    if (!this.active || !this.activeSequence || this.currentStepIndex <= 0) return;

    this.currentStepIndex--;
    this.timerMs = 0;
    const currentStep = this.getCurrentStep();
    if (currentStep) {
      this.triggerStepFeedback(currentStep);
      if (this.onStepChanged) this.onStepChanged(currentStep, this.currentStepIndex);
    }
  }

  public stopTutorial(): void {
    this.active = false;
    this.activeSequence = null;
    this.currentStepIndex = 0;
  }

  public completeTutorial(): void {
    if (this.activeSequence) {
      this.activeSequence.completed = true;
      if (this.onSequenceCompleted) this.onSequenceCompleted(this.activeSequence.id);
    }
    soundEngine.play('powerup');
    AndroidEngine.triggerHaptic(25);
    this.stopTutorial();
  }

  private triggerStepFeedback(step: TutorialStep): void {
    soundEngine.play(step.audioHint || 'coin');

    switch (step.hapticPattern) {
      case 'medium':
        AndroidEngine.triggerHaptic(15);
        break;
      case 'heavy':
        AndroidEngine.triggerHaptic(25);
        break;
      case 'double':
        AndroidEngine.triggerHaptic(10);
        setTimeout(() => AndroidEngine.triggerHaptic(10), 100);
        break;
      case 'light':
      default:
        AndroidEngine.triggerHaptic(8);
        break;
    }
  }

  /**
   * Renders Spotlight Mask, Hand Gesture, and Tooltip Box on Canvas HUD
   */
  public renderOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.active) return;

    const step = this.getCurrentStep();
    if (!step) return;

    ctx.save();

    // 1. Draw Spotlight Dark Overlay
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';

    if (step.highlightRect) {
      const { x, y, width: w, height: h } = step.highlightRect;
      const pad = 8;
      const rx = x - pad;
      const ry = y - pad;
      const rw = w + pad * 2;
      const rh = h + pad * 2;

      // Draw dark overlay with a hole cut out for target
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.rect(rx, ry, rw, rh);
      ctx.fill('evenodd');

      // Glowing border around target
      const pulseScale = 1 + Math.sin(this.gesturePulseTimer * 4) * 0.05;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        rx - (pulseScale - 1) * 10,
        ry - (pulseScale - 1) * 10,
        rw + (pulseScale - 1) * 20,
        rh + (pulseScale - 1) * 20
      );

      // Render Gesture Icon Indicator
      if (step.gestureHint) {
        this.renderGestureHint(ctx, x + w / 2, y + h / 2, step.gestureHint);
      }
    } else {
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Render Card Tooltip Box at bottom
    const boxWidth = Math.min(360, width - 24);
    const boxHeight = 110;
    const boxX = (width - boxWidth) / 2;
    const boxY = height - boxHeight - 16;

    // Card background
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 14);
    ctx.fill();
    ctx.stroke();

    // Step Progress Badge
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    const totalSteps = this.activeSequence?.steps.length || 1;
    ctx.fillText(`PANDUAN ${this.currentStepIndex + 1}/${totalSteps}`, boxX + 14, boxY + 22);

    // Step Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(step.title, boxX + 14, boxY + 42);

    // Step Description
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    this.wrapText(ctx, step.description, boxX + 14, boxY + 60, boxWidth - 28, 16);

    // Buttons (Lewati / Lanjut)
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    const nextText = this.currentStepIndex === totalSteps - 1 ? '▶ Selesai' : '▶ Lanjut';
    ctx.fillText(nextText, boxX + boxWidth - 14, boxY + boxHeight - 12);

    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText('✕ Tutup', boxX + 14, boxY + boxHeight - 12);

    ctx.restore();
  }

  private renderGestureHint(ctx: CanvasRenderingContext2D, x: number, y: number, gesture: GestureHintType): void {
    ctx.save();
    const pulse = Math.sin(this.gesturePulseTimer * 6) * 6;
    let icon = '👆';

    switch (gesture) {
      case 'double_tap':
        icon = '✌️';
        break;
      case 'swipe_left':
      case 'swipe_right':
        icon = '👉';
        break;
      case 'drag':
        icon = '✊';
        break;
      case 'pinch':
        icon = '🤏';
        break;
      case 'tap':
      default:
        icon = '👆';
        break;
    }

    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y + pulse);
    ctx.restore();
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(' ');
    let line = '';
    let currY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, currY);
        line = words[i] + ' ';
        currY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currY);
  }

  /**
   * Pre-built Default Starter Tutorials
   */
  public static getDefaultTutorialSequences(): TutorialSequence[] {
    return [
      {
        id: 'tut_quickstart',
        title: 'Panduan Cepat Membuat Game 2D',
        category: 'basics',
        steps: [
          {
            id: 's1',
            title: '1. Tambahkan Karakter',
            description: 'Buka menu Tambah Objek di toolbar bawah untuk memasukkan Player, Musuh, atau Platform.',
            gestureHint: 'tap',
            hapticPattern: 'light',
            audioHint: 'coin',
          },
          {
            id: 's2',
            title: '2. Atur Fisika & Logika',
            description: 'Pilih objek di layar canvas lalu buka Inspector untuk mengaktifkan Gravitasi dan Kontrol Lompat.',
            gestureHint: 'tap',
            hapticPattern: 'medium',
            audioHint: 'powerup',
          },
          {
            id: 's3',
            title: '3. Tambah Efek & Suara',
            description: 'Gunakan tab Efek Partikel dan Audio untuk menambahkan ledakan kembang api dan efek suara retro.',
            gestureHint: 'tap',
            hapticPattern: 'light',
            audioHint: 'laser',
          },
          {
            id: 's4',
            title: '4. Ekspor untuk Android (itel A70)',
            description: 'Uji game di 60 FPS dan ekspor proyek sebagai HTML5 APK Android instan!',
            gestureHint: 'tap',
            hapticPattern: 'heavy',
            audioHint: 'powerup',
          },
        ],
      },
    ];
  }
}
