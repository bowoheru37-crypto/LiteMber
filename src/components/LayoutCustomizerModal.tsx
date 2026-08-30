import React from 'react';
import {
  Layout,
  Smartphone,
  Sliders,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
  Zap,
  Check,
  X,
  RotateCcw,
  Monitor,
  Move,
  Grid,
  Shield,
} from 'lucide-react';
import { LayoutMode, AspectPreset, WorkspaceLayoutConfig, ToolbarPosition } from '../hooks/useWorkspaceLayout';
import { AndroidEngine } from '../engine/AndroidEngine';

interface LayoutCustomizerModalProps {
  config: WorkspaceLayoutConfig;
  onUpdateConfig: (patch: Partial<WorkspaceLayoutConfig>) => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export const LayoutCustomizerModal: React.FC<LayoutCustomizerModalProps> = ({
  config,
  onUpdateConfig,
  onResetDefault,
  onClose,
}) => {
  const layoutModes: {
    id: LayoutMode;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
  }[] = [
    {
      id: 'bottom_dock',
      name: 'Bottom Dock (Standar Canva)',
      description: 'Panel drawer di bagian bawah layar dengan handle geser tinggi yang responsif.',
      icon: Layout,
      badge: 'Populer',
    },
    {
      id: 'ultra_canvas',
      name: 'Ultra Canvas (Layar Penuh Maksimal)',
      description: 'Workspace canvas 100% luas tanpa halangan. Toolbar mengecil ke pill mengambang.',
      icon: Maximize2,
      badge: 'Rekomendasi HP',
    },
    {
      id: 'floating_pip',
      name: 'Jendela Mengambang (Floating PiP)',
      description: 'Panel menjadi jendela bebas yang bisa digeser dan dipindahkan ke mana saja.',
      icon: Move,
      badge: 'Fleksibel',
    },
    {
      id: 'side_studio',
      name: 'Side Studio Dock (Panel Samping)',
      description: 'Panel terpasang di samping layar, sangat ideal untuk tablet & layar lebar.',
      icon: Layers,
      badge: 'Pro Mode',
    },
  ];

  const aspectPresets: {
    id: AspectPreset;
    name: string;
    resolution: string;
    ratio: string;
    note: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'itel_a70',
      name: 'itel A70 / HP Layar Panjang',
      resolution: '400 x 800',
      ratio: '20:9 Portrait',
      note: 'Optimal untuk itel A70, Infinix, Samsung A-series',
      icon: Smartphone,
    },
    {
      id: 'android_portrait',
      name: 'Android Portrait Standar',
      resolution: '360 x 640',
      ratio: '16:9 Portrait',
      note: 'Standar kompatibilitas Android 5.0 ke atas',
      icon: Smartphone,
    },
    {
      id: 'android_hd',
      name: 'Android HD Display',
      resolution: '720 x 1280',
      ratio: '16:9 HD',
      note: 'Resolusi tajam untuk layar IPS HD+',
      icon: Smartphone,
    },
    {
      id: 'landscape_16_9',
      name: 'Landscape Studio',
      resolution: '640 x 360',
      ratio: '16:9 Mendatar',
      note: 'Cocok untuk game platformer & balap horizontal',
      icon: Monitor,
    },
    {
      id: 'square_1_1',
      name: 'Square Pixel Box',
      resolution: '480 x 480',
      ratio: '1:1 Persegi',
      note: 'Cocok untuk puzzle game & retro arcade',
      icon: Grid,
    },
  ];

  return (
    <div
      id="layout-customizer-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200"
    >
      <div
        id="layout-customizer-dialog"
        className="w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-950/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Layout className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm sm:text-base font-extrabold text-cyan-300 leading-tight">
                Kustomisasi Tata Letak & Workspace
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Optimasi Layar HP, itel A70, & Android 5+
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto no-scrollbar flex flex-col gap-4">
          {/* Section 1: Mode Tata Letak (Layout Preset) */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              1. Pilih Gaya Tata Letak Panel Workspace
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {layoutModes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = config.layoutMode === mode.id;
                return (
                  <div
                    key={mode.id}
                    onClick={() => {
                      onUpdateConfig({ layoutMode: mode.id, isPanelMinimized: false });
                      AndroidEngine.triggerHaptic(20);
                    }}
                    className={`p-3 rounded-2xl border-2 flex flex-col justify-between gap-1.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white">{mode.name}</span>
                      </div>
                      <span className="text-[9px] font-mono bg-slate-800 text-cyan-300 px-2 py-0.5 rounded-full border border-slate-700">
                        {mode.badge}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed pl-9">
                      {mode.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Preset Layar & Aspek Rasio */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              2. Aspek Rasio Layar Game (Resolusi Canvas)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {aspectPresets.map((preset) => {
                const Icon = preset.icon;
                const isSelected = config.aspectPreset === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      onUpdateConfig({ aspectPreset: preset.id });
                      AndroidEngine.triggerHaptic(20);
                    }}
                    className={`p-2.5 rounded-2xl border-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white leading-tight">
                          {preset.name}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-mono">
                          {preset.ratio} • <span className="text-cyan-300 font-bold">{preset.resolution}</span>
                        </span>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Posisi Toolbar & Blok Navigasi */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              3. Posisi Bilah Toolbar & Panel Navigasi
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bottom', label: 'Bawah (Standar HP)', desc: 'Mudah dijangkau ibu jari' },
                { id: 'top', label: 'Atas (Header)', desc: 'Di bawah navbar' },
                { id: 'floating_pill', label: 'Pill Mengambang', desc: 'Minimalis & bebas digeser' },
              ].map((pos) => {
                const isSelected = config.toolbarPosition === pos.id;
                return (
                  <button
                    key={pos.id}
                    onClick={() => {
                      onUpdateConfig({ toolbarPosition: pos.id as ToolbarPosition });
                      AndroidEngine.triggerHaptic(20);
                    }}
                    className={`p-2 rounded-2xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold">{pos.label}</span>
                    <span className="text-[8.5px] text-slate-400 leading-tight">{pos.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Optimasi Perangkat Low Entry (itel A70, Android 5+) */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              4. Mode Optimasi Khusus (itel A70 & Entry-Level Device)
            </span>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Akselerasi GPU Ringan & Efisiensi RAM
                </span>
                <span className="text-[10px] text-slate-400">
                  Menonaktifkan backdrop-filter berat untuk menjaga 60 FPS mulus di prosesor Unisoc / Android 5+.
                </span>
              </div>

              <button
                onClick={() => {
                  onUpdateConfig({ lowEndDeviceOptimized: !config.lowEndDeviceOptimized });
                  AndroidEngine.triggerHaptic(25);
                }}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  config.lowEndDeviceOptimized ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    config.lowEndDeviceOptimized ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950/90 px-4 py-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              onResetDefault();
              AndroidEngine.triggerHaptic(30);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Default</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs cursor-pointer transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan Tata Letak</span>
          </button>
        </div>
      </div>
    </div>
  );
};
