/**
 * DesktopEngine.ts
 * Desktop Engine: PC Gamepad API Mapping, Multi-Window Desktop Layouts & Electron / Tauri Packager
 */

export class DesktopEngine {
  private gamepadConnected = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('gamepadconnected', () => {
        this.gamepadConnected = true;
      });
      window.addEventListener('gamepaddisconnected', () => {
        this.gamepadConnected = false;
      });
    }
  }

  /**
   * Polls physical PC Gamepad inputs (Xbox/PlayStation/USB Gamepad)
   */
  public pollGamepad(): { dx: number; dy: number; jump: boolean; dash: boolean } {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return { dx: 0, dy: 0, jump: false, dash: false };
    }

    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    if (!gp) return { dx: 0, dy: 0, jump: false, dash: false };

    // Axis 0 = Left Stick X, Axis 1 = Left Stick Y
    let dx = gp.axes[0] || 0;
    let dy = gp.axes[1] || 0;

    // Apply deadzone
    if (Math.abs(dx) < 0.15) dx = 0;
    if (Math.abs(dy) < 0.15) dy = 0;

    // Button 0 = A / Cross (Jump), Button 2 = X / Square (Dash)
    const jump = gp.buttons[0]?.pressed || false;
    const dash = gp.buttons[2]?.pressed || false;

    return { dx, dy, jump, dash };
  }

  /**
   * Generates Electron main.js entry point for desktop executables (.exe / .dmg / .AppImage)
   */
  public static generateElectronMainJS(projectName: string): string {
    return `const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "${projectName}",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});`;
  }
}
