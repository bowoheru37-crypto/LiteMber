/**
 * InputMappingEngine.ts
 * Virtual Input Manager & Ultra-Low-Latency Touch Mapper
 * Specially optimized for budget mobile hardware (itel A70 Unisoc T603/T606, Mali-G57 GPU)
 * Provides anti-ghosting multi-touch tracking, Gamepad API auto-polling, touch deadzone filtering,
 * rapid-fire hold mechanics, and custom keybinding mapping.
 */

import { VirtualInputControl, VirtualInputLayout, ControlInputType } from '../types/engine';
import { AndroidEngine } from './AndroidEngine';

export interface PinchGestureEvent {
  scale: number;
  deltaScale: number;
  centerX: number;
  centerY: number;
  distance: number;
}

export interface TwoFingerPanEvent {
  deltaX: number;
  deltaY: number;
  centerX: number;
  centerY: number;
}

export interface SwipeDeleteEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  velocity: number;
  distance: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  targetElement?: HTMLElement | null;
}

export interface TouchGestureConfig {
  pinchThreshold: number;
  panThreshold: number;
  swipeMinDistance: number;
  swipeMaxDurationMs: number;
  swipeMinVelocity: number;
  longPressDurationMs: number;
  longPressMaxMovePx: number;
}

export interface LongPressGestureEvent {
  clientX: number;
  clientY: number;
  targetElement?: HTMLElement | null;
  durationMs: number;
}

export const DEFAULT_INPUT_PRESETS: Record<string, VirtualInputLayout> = {
  platformer_classic: {
    id: 'preset_platformer',
    name: 'Platformer Retro (D-Pad + 3 Tombol Aksus)',
    touchLatencyMode: 'ultra_low_latency',
    deadzoneRadiusPx: 8,
    showInPlayMode: true,
    vibrationIntensityMs: 15,
    controls: [
      {
        id: 'btn_up',
        name: 'Lompat / Atas',
        type: 'button',
        mappedKey: 'ArrowUp',
        gamepadButton: 'Button0 (A)',
        posX: 18,
        posY: 72,
        sizePx: 48,
        shape: 'circle',
        color: '#06b6d4',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 25,
      },
      {
        id: 'btn_left',
        name: 'Jalan Kiri',
        type: 'button',
        mappedKey: 'ArrowLeft',
        gamepadButton: 'DPadLeft',
        posX: 8,
        posY: 82,
        sizePx: 48,
        shape: 'circle',
        color: '#06b6d4',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 25,
      },
      {
        id: 'btn_right',
        name: 'Jalan Kanan',
        type: 'button',
        mappedKey: 'ArrowRight',
        gamepadButton: 'DPadRight',
        posX: 28,
        posY: 82,
        sizePx: 48,
        shape: 'circle',
        color: '#06b6d4',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 25,
      },
      {
        id: 'btn_down',
        name: 'Jongkok / Bawah',
        type: 'button',
        mappedKey: 'ArrowDown',
        gamepadButton: 'DPadDown',
        posX: 18,
        posY: 92,
        sizePx: 48,
        shape: 'circle',
        color: '#06b6d4',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 25,
      },
      {
        id: 'btn_jump',
        name: 'LOMPAT (JUMP)',
        type: 'button',
        mappedKey: 'Space',
        gamepadButton: 'Button0 (A)',
        posX: 82,
        posY: 82,
        sizePx: 64,
        shape: 'circle',
        color: '#10b981',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 30,
      },
      {
        id: 'btn_dash',
        name: 'DASH / LARI',
        type: 'button',
        mappedKey: 'KeyZ',
        gamepadButton: 'Button1 (B)',
        posX: 68,
        posY: 88,
        sizePx: 52,
        shape: 'circle',
        color: '#a855f7',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 25,
      },
      {
        id: 'btn_attack',
        name: 'SERANG / HIT',
        type: 'button',
        mappedKey: 'KeyX',
        gamepadButton: 'Button2 (X)',
        posX: 88,
        posY: 68,
        sizePx: 52,
        shape: 'circle',
        color: '#f43f5e',
        hapticFeedback: true,
        rapidFire: true,
        rapidFireSpeedMs: 120,
        holdBehavior: 'repeat',
        touchAccuracyRadiusPx: 25,
      },
    ],
  },
  action_shooter: {
    id: 'preset_shooter',
    name: 'Dual-Stick Arcade Shooter (Auto Rapid Fire)',
    touchLatencyMode: 'ultra_low_latency',
    deadzoneRadiusPx: 10,
    showInPlayMode: true,
    vibrationIntensityMs: 20,
    controls: [
      {
        id: 'btn_shoot_up',
        name: 'Tembak Atas',
        type: 'button',
        mappedKey: 'ArrowUp',
        gamepadButton: 'Button5 (R1)',
        posX: 82,
        posY: 70,
        sizePx: 52,
        shape: 'circle',
        color: '#f97316',
        hapticFeedback: true,
        rapidFire: true,
        rapidFireSpeedMs: 90,
        holdBehavior: 'repeat',
        touchAccuracyRadiusPx: 25,
      },
      {
        id: 'btn_shoot_down',
        name: 'Tembak Bawah',
        type: 'button',
        mappedKey: 'ArrowDown',
        gamepadButton: 'Button4 (L1)',
        posX: 82,
        posY: 90,
        sizePx: 52,
        shape: 'circle',
        color: '#f97316',
        hapticFeedback: true,
        rapidFire: true,
        rapidFireSpeedMs: 90,
        holdBehavior: 'repeat',
        touchAccuracyRadiusPx: 25,
      },
      {
        id: 'btn_shoot_left',
        name: 'Tembak Kiri',
        type: 'button',
        mappedKey: 'ArrowLeft',
        gamepadButton: 'DPadLeft',
        posX: 72,
        posY: 80,
        sizePx: 52,
        shape: 'circle',
        color: '#f97316',
        hapticFeedback: true,
        rapidFire: true,
        rapidFireSpeedMs: 90,
        holdBehavior: 'repeat',
        touchAccuracyRadiusPx: 25,
      },
      {
        id: 'btn_shoot_right',
        name: 'Tembak Kanan',
        type: 'button',
        mappedKey: 'ArrowRight',
        gamepadButton: 'DPadRight',
        posX: 92,
        posY: 80,
        sizePx: 52,
        shape: 'circle',
        color: '#f97316',
        hapticFeedback: true,
        rapidFire: true,
        rapidFireSpeedMs: 90,
        holdBehavior: 'repeat',
        touchAccuracyRadiusPx: 25,
      },
      {
        id: 'btn_move_left',
        name: 'Gerak Kiri',
        type: 'button',
        mappedKey: 'KeyA',
        gamepadButton: 'LeftStickLeft',
        posX: 10,
        posY: 82,
        sizePx: 56,
        shape: 'circle',
        color: '#3b82f6',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 30,
      },
      {
        id: 'btn_move_right',
        name: 'Gerak Kanan',
        type: 'button',
        mappedKey: 'KeyD',
        gamepadButton: 'LeftStickRight',
        posX: 26,
        posY: 82,
        sizePx: 56,
        shape: 'circle',
        color: '#3b82f6',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 30,
      },
      {
        id: 'btn_bomb',
        name: 'BOM ULTIMATE',
        type: 'button',
        mappedKey: 'Space',
        gamepadButton: 'Button3 (Y)',
        posX: 50,
        posY: 88,
        sizePx: 60,
        shape: 'pill',
        color: '#eab308',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 35,
      },
    ],
  },
  racing_arcade: {
    id: 'preset_racing',
    name: 'Balap Mobil Arcade (Nitro + Pedal Gas)',
    touchLatencyMode: 'ultra_low_latency',
    deadzoneRadiusPx: 6,
    showInPlayMode: true,
    vibrationIntensityMs: 25,
    controls: [
      {
        id: 'btn_steer_left',
        name: 'Belok Kiri',
        type: 'button',
        mappedKey: 'ArrowLeft',
        gamepadButton: 'DPadLeft',
        posX: 12,
        posY: 82,
        sizePx: 64,
        shape: 'circle',
        color: '#06b6d4',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 30,
      },
      {
        id: 'btn_steer_right',
        name: 'Belok Kanan',
        type: 'button',
        mappedKey: 'ArrowRight',
        gamepadButton: 'DPadRight',
        posX: 32,
        posY: 82,
        sizePx: 64,
        shape: 'circle',
        color: '#06b6d4',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 30,
      },
      {
        id: 'btn_gas',
        name: 'GAS / AKSELERASI',
        type: 'button',
        mappedKey: 'ArrowUp',
        gamepadButton: 'Button7 (R2)',
        posX: 85,
        posY: 75,
        sizePx: 68,
        shape: 'pill',
        color: '#10b981',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 35,
      },
      {
        id: 'btn_brake',
        name: 'REM / MUNDUR',
        type: 'button',
        mappedKey: 'ArrowDown',
        gamepadButton: 'Button6 (L2)',
        posX: 68,
        posY: 85,
        sizePx: 56,
        shape: 'pill',
        color: '#f43f5e',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 30,
      },
      {
        id: 'btn_nitro',
        name: 'NITRO TURBO',
        type: 'button',
        mappedKey: 'Space',
        gamepadButton: 'Button0 (A)',
        posX: 88,
        posY: 52,
        sizePx: 56,
        shape: 'circle',
        color: '#3b82f6',
        hapticFeedback: true,
        rapidFire: false,
        holdBehavior: 'press',
        touchAccuracyRadiusPx: 30,
      },
    ],
  },
};

export class InputMappingEngineClass {
  private activeLayout: VirtualInputLayout = DEFAULT_INPUT_PRESETS.platformer_classic;
  private activePressedKeys: Set<string> = new Set();
  private rapidFireTimers: Map<string, number> = new Map();
  private gamepadConnected = false;
  private gamepadName = '';
  private pollingInterval: number | null = null;

  // Touch multi-point position tracker
  private activePointers: Map<number, { code: string; x: number; y: number }> = new Map();

  constructor() {
    this.initGamepadSupport();
  }

  public setLayout(layout: VirtualInputLayout): void {
    this.activeLayout = layout;
  }

  public getLayout(): VirtualInputLayout {
    return this.activeLayout;
  }

  public isKeyPressed(code: string): boolean {
    return this.activePressedKeys.has(code);
  }

  public getActiveKeys(): string[] {
    return Array.from(this.activePressedKeys);
  }

  public registerPointer(pointerId: number, code: string, x: number, y: number): void {
    this.activePointers.set(pointerId, { code, x, y });
    this.pressKey(code);
  }

  public unregisterPointer(pointerId: number): void {
    const ptr = this.activePointers.get(pointerId);
    if (ptr) {
      this.activePointers.delete(pointerId);
      // Only release if no other pointer is pressing the same key
      let otherHasKey = false;
      this.activePointers.forEach((p) => {
        if (p.code === ptr.code) otherHasKey = true;
      });
      if (!otherHasKey) {
        this.releaseKey(ptr.code);
      }
    }
  }

  /**
   * Initializes Gamepad API Auto-Polling for USB / Bluetooth controllers on Android itel A70
   */
  private initGamepadSupport(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('gamepadconnected', (e: any) => {
      this.gamepadConnected = true;
      this.gamepadName = e.gamepad.id || 'Wireless Joystick Terhubung';
      AndroidEngine.triggerHaptic(30);
      this.startGamepadPolling();
    });

    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadConnected = false;
      this.gamepadName = '';
      this.stopGamepadPolling();
    });
  }

  private startGamepadPolling(): void {
    if (this.pollingInterval) return;
    this.pollingInterval = window.setInterval(() => {
      this.pollGamepadState();
    }, 16) as any; // 60 FPS polling
  }

  private stopGamepadPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private pollGamepadState(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    // Find first active gamepad
    let gp: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gp = gamepads[i];
        break;
      }
    }
    if (!gp) return;

    if (!this.gamepadConnected) {
      this.gamepadConnected = true;
      this.gamepadName = gp.id || 'Wireless Joystick Terhubung';
    }

    // Check mapped controls against physical gamepad buttons and analog sticks
    this.activeLayout.controls.forEach((control) => {
      if (!control.gamepadButton) return;

      let isPressed = false;
      const gb = control.gamepadButton.toLowerCase();

      if (gb.includes('button0') || gb.includes('(a)')) isPressed = gp.buttons[0]?.pressed || false;
      else if (gb.includes('button1') || gb.includes('(b)')) isPressed = gp.buttons[1]?.pressed || false;
      else if (gb.includes('button2') || gb.includes('(x)')) isPressed = gp.buttons[2]?.pressed || false;
      else if (gb.includes('button3') || gb.includes('(y)')) isPressed = gp.buttons[3]?.pressed || false;
      else if (gb.includes('button4') || gb.includes('(l1)')) isPressed = gp.buttons[4]?.pressed || false;
      else if (gb.includes('button5') || gb.includes('(r1)')) isPressed = gp.buttons[5]?.pressed || false;
      else if (gb.includes('button6') || gb.includes('(l2)')) isPressed = gp.buttons[6]?.pressed || false;
      else if (gb.includes('button7') || gb.includes('(r2)')) isPressed = gp.buttons[7]?.pressed || false;
      else if (gb.includes('dpadup')) isPressed = gp.buttons[12]?.pressed || (gp.axes[1] && gp.axes[1] < -0.5);
      else if (gb.includes('dpaddown')) isPressed = gp.buttons[13]?.pressed || (gp.axes[1] && gp.axes[1] > 0.5);
      else if (gb.includes('dpadleft')) isPressed = gp.buttons[14]?.pressed || (gp.axes[0] && gp.axes[0] < -0.5);
      else if (gb.includes('dpadright')) isPressed = gp.buttons[15]?.pressed || (gp.axes[0] && gp.axes[0] > 0.5);
      else if (gb.includes('leftstickleft')) isPressed = gp.axes[0] ? gp.axes[0] < -0.3 : false;
      else if (gb.includes('leftstickright')) isPressed = gp.axes[0] ? gp.axes[0] > 0.3 : false;

      if (isPressed) {
        this.pressKey(control.mappedKey, control.hapticFeedback);
      } else {
        this.releaseKey(control.mappedKey);
      }
    });
  }

  /**
   * Ultra-Low-Latency Key Dispatcher
   */
  public pressKey(code: string, haptic = true): void {
    if (!this.activePressedKeys.has(code)) {
      this.activePressedKeys.add(code);
      if (haptic) {
        AndroidEngine.triggerHaptic(this.activeLayout.vibrationIntensityMs || 15);
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    }
  }

  public releaseKey(code: string): void {
    if (this.activePressedKeys.has(code)) {
      this.activePressedKeys.delete(code);
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    }
  }

  public isGamepadConnected(): boolean {
    return this.gamepadConnected;
  }

  public getGamepadName(): string {
    return this.gamepadName;
  }

  // Specialized Touch Gesture Recognizer (Itel A70 Touch Digitizer Sensitivity Calibration)
  private gestureConfig: TouchGestureConfig = {
    pinchThreshold: 2.5,
    panThreshold: 2.0,
    swipeMinDistance: 45,
    swipeMaxDurationMs: 350,
    swipeMinVelocity: 0.25,
    longPressDurationMs: 450,
    longPressMaxMovePx: 8,
  };

  private pinchListeners: Set<(e: PinchGestureEvent) => void> = new Set();
  private panListeners: Set<(e: TwoFingerPanEvent) => void> = new Set();
  private swipeDeleteListeners: Set<(e: SwipeDeleteEvent) => void> = new Set();
  private longPressListeners: Set<(e: LongPressGestureEvent) => void> = new Set();

  private initialPinchDistance = 0;
  private prevPinchDistance = 0;
  private prevPanCenter = { x: 0, y: 0 };
  private activeGestureTouches: Map<
    number,
    { startX: number; startY: number; currentX: number; currentY: number; time: number; target: HTMLElement | null; longPressTimer?: any }
  > = new Map();

  public onPinchZoom(callback: (e: PinchGestureEvent) => void): () => void {
    this.pinchListeners.add(callback);
    return () => this.pinchListeners.delete(callback);
  }

  public onTwoFingerPan(callback: (e: TwoFingerPanEvent) => void): () => void {
    this.panListeners.add(callback);
    return () => this.panListeners.delete(callback);
  }

  public onSwipeDelete(callback: (e: SwipeDeleteEvent) => void): () => void {
    this.swipeDeleteListeners.add(callback);
    return () => this.swipeDeleteListeners.delete(callback);
  }

  public onLongPress(callback: (e: LongPressGestureEvent) => void): () => void {
    this.longPressListeners.add(callback);
    return () => this.longPressListeners.delete(callback);
  }

  public setGestureConfig(config: Partial<TouchGestureConfig>): void {
    this.gestureConfig = { ...this.gestureConfig, ...config };
  }

  /**
   * Process Touch Start for Gestures
   */
  public handleTouchStart(e: TouchEvent | any, element?: HTMLElement): void {
    const touches = e.touches;
    const now = Date.now();

    for (let i = 0; i < touches.length; i++) {
      const t = touches[i];
      if (!this.activeGestureTouches.has(t.identifier)) {
        const touchTarget = (element || t.target) as HTMLElement | null;
        const clientX = t.clientX;
        const clientY = t.clientY;

        const timer = setTimeout(() => {
          // Long press triggered
          const touchData = this.activeGestureTouches.get(t.identifier);
          if (touchData) {
            const lpEvent: LongPressGestureEvent = {
              clientX,
              clientY,
              targetElement: touchTarget,
              durationMs: this.gestureConfig.longPressDurationMs,
            };
            this.longPressListeners.forEach((fn) => fn(lpEvent));
            window.dispatchEvent(new CustomEvent('itel-long-press', { detail: lpEvent }));
            AndroidEngine.triggerHaptic(50);
          }
        }, this.gestureConfig.longPressDurationMs);

        this.activeGestureTouches.set(t.identifier, {
          startX: clientX,
          startY: clientY,
          currentX: clientX,
          currentY: clientY,
          time: now,
          target: touchTarget,
          longPressTimer: timer,
        });
      }
    }

    if (touches.length >= 2) {
      // Cancel all long press timers when multi-touch occurs
      this.activeGestureTouches.forEach((touch) => {
        if (touch.longPressTimer) {
          clearTimeout(touch.longPressTimer);
          touch.longPressTimer = undefined;
        }
      });

      if (touches.length === 2) {
        const t1 = touches[0];
        const t2 = touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        this.initialPinchDistance = dist;
        this.prevPinchDistance = dist;
        this.prevPanCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
      }
    }
  }

  /**
   * Process Touch Move for Pinch-to-Zoom, Two-Finger Pan and Long Press movement check
   */
  public handleTouchMove(e: TouchEvent | any): void {
    const touches = e.touches;
    if (touches.length === 2) {
      const t1 = touches[0];
      const t2 = touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentCenterX = (t1.clientX + t2.clientX) / 2;
      const currentCenterY = (t1.clientY + t2.clientY) / 2;

      // Pinch-to-Zoom Gesture Recognition
      const deltaDist = currentDist - this.prevPinchDistance;
      if (Math.abs(deltaDist) >= this.gestureConfig.pinchThreshold && this.initialPinchDistance > 0) {
        const scale = currentDist / this.initialPinchDistance;
        const pinchEvent: PinchGestureEvent = {
          scale,
          deltaScale: deltaDist,
          centerX: currentCenterX,
          centerY: currentCenterY,
          distance: currentDist,
        };
        this.pinchListeners.forEach((fn) => fn(pinchEvent));
        window.dispatchEvent(new CustomEvent('itel-pinch-zoom', { detail: pinchEvent }));
        this.prevPinchDistance = currentDist;
      }

      // Two-Finger Pan Gesture Recognition
      const deltaX = currentCenterX - this.prevPanCenter.x;
      const deltaY = currentCenterY - this.prevPanCenter.y;
      if (Math.hypot(deltaX, deltaY) >= this.gestureConfig.panThreshold) {
        const panEvent: TwoFingerPanEvent = {
          deltaX,
          deltaY,
          centerX: currentCenterX,
          centerY: currentCenterY,
        };
        this.panListeners.forEach((fn) => fn(panEvent));
        window.dispatchEvent(new CustomEvent('itel-two-finger-pan', { detail: panEvent }));
        this.prevPanCenter = { x: currentCenterX, y: currentCenterY };
      }
    }

    for (let i = 0; i < touches.length; i++) {
      const t = touches[i];
      const existing = this.activeGestureTouches.get(t.identifier);
      if (existing) {
        existing.currentX = t.clientX;
        existing.currentY = t.clientY;

        // Check movement for long press cancellation
        const distMoved = Math.hypot(t.clientX - existing.startX, t.clientY - existing.startY);
        if (distMoved > this.gestureConfig.longPressMaxMovePx && existing.longPressTimer) {
          clearTimeout(existing.longPressTimer);
          existing.longPressTimer = undefined;
        }
      }
    }
  }

  /**
   * Process Touch End / Cancel for Swipe-to-Delete
   */
  public handleTouchEnd(e: TouchEvent | any): void {
    const now = Date.now();
    const changed = e.changedTouches;

    for (let i = 0; i < changed.length; i++) {
      const t = changed[i];
      const startData = this.activeGestureTouches.get(t.identifier);
      if (startData) {
        if (startData.longPressTimer) {
          clearTimeout(startData.longPressTimer);
          startData.longPressTimer = undefined;
        }

        const duration = now - startData.time;
        const dx = t.clientX - startData.startX;
        const dy = t.clientY - startData.startY;
        const distance = Math.hypot(dx, dy);
        const velocity = duration > 0 ? distance / duration : 0;

        if (
          distance >= this.gestureConfig.swipeMinDistance &&
          duration <= this.gestureConfig.swipeMaxDurationMs &&
          velocity >= this.gestureConfig.swipeMinVelocity
        ) {
          let direction: 'left' | 'right' | 'up' | 'down';
          if (Math.abs(dx) > Math.abs(dy)) {
            direction = dx < 0 ? 'left' : 'right';
          } else {
            direction = dy < 0 ? 'up' : 'down';
          }

          const swipeEvent: SwipeDeleteEvent = {
            direction,
            velocity,
            distance,
            startX: startData.startX,
            startY: startData.startY,
            endX: t.clientX,
            endY: t.clientY,
            targetElement: startData.target,
          };

          this.swipeDeleteListeners.forEach((fn) => fn(swipeEvent));
          window.dispatchEvent(new CustomEvent('itel-swipe-delete', { detail: swipeEvent }));
          AndroidEngine.triggerHaptic(25);
        }

        this.activeGestureTouches.delete(t.identifier);
      }
    }

    if (e.touches.length < 2) {
      this.initialPinchDistance = 0;
      this.prevPinchDistance = 0;
    }
  }

  /**
   * Attach gesture listeners directly to a DOM element
   */
  public attachGestureListeners(element: HTMLElement): () => void {
    const onStart = (e: TouchEvent) => this.handleTouchStart(e, element);
    const onMove = (e: TouchEvent) => this.handleTouchMove(e);
    const onEnd = (e: TouchEvent) => this.handleTouchEnd(e);

    element.addEventListener('touchstart', onStart, { passive: true });
    element.addEventListener('touchmove', onMove, { passive: true });
    element.addEventListener('touchend', onEnd, { passive: true });
    element.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', onStart);
      element.removeEventListener('touchmove', onMove);
      element.removeEventListener('touchend', onEnd);
      element.removeEventListener('touchcancel', onEnd);
    };
  }
}

export const InputMappingEngine = new InputMappingEngineClass();
