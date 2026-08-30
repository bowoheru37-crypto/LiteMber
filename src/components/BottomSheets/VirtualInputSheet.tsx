import React, { useState } from 'react';
import { GameProject, VirtualInputControl, VirtualInputLayout } from '../../types/engine';
import { InputMappingEngine, DEFAULT_INPUT_PRESETS } from '../../engine/InputMappingEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';
import {
  Gamepad2,
  Sliders,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Zap,
  Activity,
  ShieldCheck,
  Smartphone,
  Flame,
  Crosshair,
  Layers,
  Sparkles,
} from 'lucide-react';

interface VirtualInputSheetProps {
  project: GameProject;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

const AVAILABLE_KEYS = [
  { code: 'Space', name: 'SPACEBAR (Lompat / Aksi)' },
  { code: 'ArrowUp', name: 'Panah Atas / Up' },
  { code: 'ArrowDown', name: 'Panah Bawah / Down' },
  { code: 'ArrowLeft', name: 'Panah Kiri / Left' },
  { code: 'ArrowRight', name: 'Panah Kanan / Right' },
  { code: 'KeyZ', name: 'Tombol Z (Dash / Dash Skill)' },
  { code: 'KeyX', name: 'Tombol X (Serang / Attack)' },
  { code: 'KeyC', name: 'Tombol C (Special / Ultimate)' },
  { code: 'KeyA', name: 'Tombol A (Kiri WASD)' },
  { code: 'KeyD', name: 'Tombol D (Kanan WASD)' },
  { code: 'KeyW', name: 'Tombol W (Atas WASD)' },
  { code: 'KeyS', name: 'Tombol S (Bawah WASD)' },
  { code: 'ShiftLeft', name: 'SHIFT Kiri (Lari Cepat)' },
];

const AVAILABLE_GAMEPAD_BUTTONS = [
  'Button0 (A)',
  'Button1 (B)',
  'Button2 (X)',
  'Button3 (Y)',
  'Button4 (L1)',
  'Button5 (R1)',
  'Button6 (L2)',
  'Button7 (R2)',
  'DPadUp',
  'DPadDown',
  'DPadLeft',
  'DPadRight',
  'LeftStickLeft',
  'LeftStickRight',
];

export const VirtualInputSheet: React.FC<VirtualInputSheetProps> = ({
  project,
  onUpdateProject,
  onClose,
}) => {
  const currentLayout: VirtualInputLayout = project.world.inputLayout || DEFAULT_INPUT_PRESETS.platformer_classic;

  const [selectedControlId, setSelectedControlId] = useState<string | null>(
    currentLayout.controls[0]?.id || null
  );

  const selectedControl = currentLayout.controls.find((c) => c.id === selectedControlId) || null;

  const updateLayoutInProject = (updatedLayout: VirtualInputLayout) => {
    InputMappingEngine.setLayout(updatedLayout);
    onUpdateProject({
      ...project,
      world: {
        ...project.world,
        inputLayout: updatedLayout,
      },
    });
  };

  const handleSelectPreset = (presetKey: string) => {
    const preset = DEFAULT_INPUT_PRESETS[presetKey];
    if (preset) {
      updateLayoutInProject({ ...preset });
      setSelectedControlId(preset.controls[0]?.id || null);
      AndroidEngine.triggerHaptic(20);
    }
  };

  const handleAddControl = () => {
    const newControl: VirtualInputControl = {
      id: `btn_${Date.now().toString(36)}`,
      name: `Tombol Aksi #${currentLayout.controls.length + 1}`,
      type: 'button',
      mappedKey: 'Space',
      gamepadButton: 'Button0 (A)',
      posX: 80,
      posY: 80,
      sizePx: 56,
      shape: 'circle',
      color: '#06b6d4',
      hapticFeedback: true,
      rapidFire: false,
      holdBehavior: 'press',
      touchAccuracyRadiusPx: 25,
    };

    const updatedControls = [...currentLayout.controls, newControl];
    updateLayoutInProject({ ...currentLayout, controls: updatedControls });
    setSelectedControlId(newControl.id);
    AndroidEngine.triggerHaptic(15);
  };

  const handleUpdateControl = (updated: VirtualInputControl) => {
    const updatedControls = currentLayout.controls.map((c) => (c.id === updated.id ? updated : c));
    updateLayoutInProject({ ...currentLayout, controls: updatedControls });
  };

  const handleDeleteControl = (id: string) => {
    const updatedControls = currentLayout.controls.filter((c) => c.id !== id);
    updateLayoutInProject({ ...currentLayout, controls: updatedControls });
    if (selectedControlId === id) {
      setSelectedControlId(updatedControls[0]?.id || null);
    }
    AndroidEngine.triggerHaptic(20);
  };

  return (
    <div className="p-3 h-full flex flex-col text-slate-100 select-none bg-slate-900 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wide">Manager & Mapper Virtual Input Mobile</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono font-bold">
            itel A70 Latency &lt; 4ms
          </span>
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* Preset Selector */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 block">Preset Pemetaan Kontroler:</span>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(DEFAULT_INPUT_PRESETS).map((key) => {
              const preset = DEFAULT_INPUT_PRESETS[key];
              const isSelected = currentLayout.id === preset.id;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectPreset(key)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500 ring-1 ring-cyan-500/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold text-white block truncate">{preset.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono mt-1">{preset.controls.length} Tombol</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List of Mapped Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Daftar Tombol Sentuh On-Screen:</span>
            <button
              onClick={handleAddControl}
              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tombol</span>
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {currentLayout.controls.map((ctrl) => {
              const isSelected = ctrl.id === selectedControlId;
              return (
                <button
                  key={ctrl.id}
                  onClick={() => {
                    setSelectedControlId(ctrl.id);
                    AndroidEngine.triggerHaptic(10);
                  }}
                  className={`px-3 py-2 rounded-xl border text-left whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                    style={{ backgroundColor: ctrl.color }}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold leading-tight">{ctrl.name}</span>
                    <span className="text-[9px] opacity-80 font-mono">[{ctrl.mappedKey}]</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Control Detail Config Editor */}
        {selectedControl && (
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> Edit Tombol: {selectedControl.name}
              </span>
              <button
                onClick={() => handleDeleteControl(selectedControl.id)}
                className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs flex items-center gap-1 cursor-pointer"
                title="Hapus Tombol"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[10px]">Hapus</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name & Mapped Keyboard Key */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block">Nama Tombol Visual:</label>
                <input
                  type="text"
                  value={selectedControl.name}
                  onChange={(e) => handleUpdateControl({ ...selectedControl, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block">Mapping Keyboard Action Key:</label>
                <select
                  value={selectedControl.mappedKey}
                  onChange={(e) => handleUpdateControl({ ...selectedControl, mappedKey: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                >
                  {AVAILABLE_KEYS.map((k) => (
                    <option key={k.code} value={k.code}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gamepad Physical Button Mapping */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block">Mapping Gamepad Bluetooth/USB:</label>
                <select
                  value={selectedControl.gamepadButton || 'Button0 (A)'}
                  onChange={(e) => handleUpdateControl({ ...selectedControl, gamepadButton: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                >
                  {AVAILABLE_GAMEPAD_BUTTONS.map((gb) => (
                    <option key={gb} value={gb}>
                      {gb}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Picker */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block">Warna UI Tombol:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedControl.color}
                    onChange={(e) => handleUpdateControl({ ...selectedControl, color: e.target.value })}
                    className="w-8 h-8 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{selectedControl.color}</span>
                </div>
              </div>
            </div>

            {/* Position X / Y and Size Sliders */}
            <div className="space-y-2 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-300">Posisi Horizontal X (%):</span>
                  <span className="font-mono text-cyan-400 font-bold">{selectedControl.posX}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={selectedControl.posX}
                  onChange={(e) => handleUpdateControl({ ...selectedControl, posX: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-300">Posisi Vertikal Y (%):</span>
                  <span className="font-mono text-cyan-400 font-bold">{selectedControl.posY}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={selectedControl.posY}
                  onChange={(e) => handleUpdateControl({ ...selectedControl, posY: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-300">Ukuran Diameter Tombol (px):</span>
                  <span className="font-mono text-cyan-400 font-bold">{selectedControl.sizePx}px</span>
                </div>
                <input
                  type="range"
                  min="36"
                  max="100"
                  step="2"
                  value={selectedControl.sizePx}
                  onChange={(e) => handleUpdateControl({ ...selectedControl, sizePx: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Hardware Latency & Accuracy Optimizer (itel A70 Profile) */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Profil Hardware Touch: itel A70 Unisoc T603</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
              Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Touch Response Rate:</span>
              <span className="font-bold text-cyan-300 font-mono">120 Hz Touch Sampling</span>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Haptic Pulse Feedback:</span>
              <span className="font-bold text-emerald-300 font-mono">
                {currentLayout.vibrationIntensityMs}ms Ultra-Short Pulse
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
