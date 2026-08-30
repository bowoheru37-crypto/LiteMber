import React, { useState } from 'react';
import { ProfilerStats } from '../types/engine';
import {
  Smartphone,
  Cpu,
  Gauge,
  ShieldCheck,
  Zap,
  X,
  Binary,
  Calculator,
  CpuIcon,
  Network,
  Flame,
  Globe,
  Tablet,
  Monitor,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sparkles,
  Sliders,
  Gamepad2,
  Box,
  Layers,
  Wrench,
  Activity,
  Check,
} from 'lucide-react';
import { AndroidEngine } from '../engine/AndroidEngine';
import { LiteOptimizationEngine, AutoGcReport } from '../engine/LiteOptimizationEngine';
import { memoryGuardian } from '../engine/MemoryGuardianEngine';
import { unifiedEngineHub, DeveloperEngineStyle, HardwareBenchmarkResult, UnifiedEngineHub } from '../engine/UnifiedEngineHub';

interface HardwareProfilerModalProps {
  stats: ProfilerStats;
  onClose: () => void;
}

export const HardwareProfilerModal: React.FC<HardwareProfilerModalProps> = ({
  stats,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'styles' | 'autotune' | 'engines' | 'metrics'>('styles');
  const [gcReport, setGcReport] = useState<AutoGcReport | null>(LiteOptimizationEngine.getLastGcReport());
  const [benchmarkResult, setBenchmarkResult] = useState<HardwareBenchmarkResult | null>(unifiedEngineHub.getLastBenchmark());
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<DeveloperEngineStyle>(unifiedEngineHub.getCurrentStyle());
  const [notification, setNotification] = useState<string | null>(null);

  const profile = AndroidEngine.getItelA70ProfileSettings();
  const resolutionScale = Math.round(LiteOptimizationEngine.getTextureResolutionScale() * 100);
  const currentConfig = unifiedEngineHub.getActiveConfig();

  const handleApplyStyle = (style: DeveloperEngineStyle) => {
    setSelectedStyle(style);
    const cfg = unifiedEngineHub.applyStylePreset(style);
    setNotification(`⚡ Berhasil menerapkan preset engine: "${cfg.name}"!`);
    AndroidEngine.triggerHaptic(35);
  };

  const handleRunAutoTune = () => {
    setIsBenchmarking(true);
    setTimeout(() => {
      const result = unifiedEngineHub.autoTuneHardware();
      setBenchmarkResult(result);
      setSelectedStyle(result.recommendedStyle);
      setIsBenchmarking(false);
      setNotification(`🚀 Auto-Tune Sukses! Terdeteksi Grade "${result.deviceGrade}" (Skor: ${result.score}/100). Preset "${UnifiedEngineHub.STYLE_PRESETS[result.recommendedStyle].name}" otomatis aktif.`);
      AndroidEngine.triggerHaptic(40);
    }, 400);
  };

  const engineModules = [
    {
      name: 'Math Engine',
      icon: <Calculator className="w-4 h-4 text-cyan-400" />,
      detail: 'Tabel Trigonometri LUT (1024 Step) & Fast Inverse Square Root (Q_rsqrt)',
      status: 'Aktif • O(1) Zero CPU Overhead',
    },
    {
      name: 'Binary Engine',
      icon: <Binary className="w-4 h-4 text-emerald-400" />,
      detail: 'Format Serialisasi ArrayBuffer DataView & Bitmask Entity State (32-bit)',
      status: 'Aktif • Zero JSON Parsing Lag',
    },
    {
      name: 'Assembly Engine',
      icon: <CpuIcon className="w-4 h-4 text-amber-400" />,
      detail: 'Virtual RISC Bytecode VM (Register R0-R7, Call Stack, Opcode Execution)',
      status: 'Aktif • Near-Native Bytecode',
    },
    {
      name: 'Algoritma Engine',
      icon: <Network className="w-4 h-4 text-purple-400" />,
      detail: 'Spatial Hashing Grid (64px) O(N) Collision & Object Pool Memory Guard',
      status: 'Aktif • Zero GC Lag',
    },
    {
      name: 'Physics & Joints Engine',
      icon: <Flame className="w-4 h-4 text-rose-400" />,
      detail: 'Integrasi Euler Sub-Stepping, Hinge/Distance Constraints & Spring Damping',
      status: 'Aktif • Stable CCD',
    },
    {
      name: 'Web & Canvas 2D Engine',
      icon: <Globe className="w-4 h-4 text-blue-400" />,
      detail: 'Double-Buffered Canvas 2D, Presets Offscreen Tilemap & DPR Adaptive Scaler',
      status: 'Aktif • Offscreen Pre-baked',
    },
    {
      name: 'Android Engine',
      icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
      detail: `Profil Unisoc T606 Octa-Core (${profile.ramCapacity}), Jembatan Getar Haptic`,
      status: 'Aktif • Teroptimasi itel A70',
    },
    {
      name: 'Mobile Device Engine',
      icon: <Tablet className="w-4 h-4 text-indigo-400" />,
      detail: 'Governor Penghemat Baterai Dynamic FPS, Multitouch D-Pad & Screen WakeLock',
      status: 'Aktif • Dynamic Throttle Guard',
    },
    {
      name: 'Desktop Engine',
      icon: <Monitor className="w-4 h-4 text-teal-400" />,
      detail: 'Navigasi Gamepad API (Xbox/DualShock), Multi-Window Desktop & Exporter',
      status: 'Aktif • Gamepad Ready',
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl text-white shadow-2xl space-y-3 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>Unified Engine Hub & Hardware Auto-Tuner</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                  v3.5 Multi-Style
                </span>
              </h3>
              <p className="text-[10.5px] text-slate-400 font-mono">
                Chipset {profile.chipset} • {profile.gpu} • RAM {profile.ramCapacity}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="mx-4 px-3 py-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-medium text-[11px]">{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="px-4">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('styles')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'styles' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Gaya Game Engine</span>
            </button>
            <button
              onClick={() => setActiveTab('autotune')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'autotune' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Auto-Tune Hardware</span>
            </button>
            <button
              onClick={() => setActiveTab('engines')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'engines' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>9 Sub-Engine</span>
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'metrics' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Metrik GPU / RAM</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
          {/* TAB 1: DEVELOPER ENGINE STYLES */}
          {activeTab === 'styles' && (
            <div className="space-y-3">
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Pilih Preset Arsitektur Engine Sesuai Gaya Proyek Anda</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Mesin otomatis menyesuaikan pipeline render, batasan memori, resolusi tekstur, dan algoritma fisika agar paling stabil dan ringan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {Object.values(UnifiedEngineHub.STYLE_PRESETS).map((styleConfig) => {
                  const isSelected = selectedStyle === styleConfig.id;
                  return (
                    <div
                      key={styleConfig.id}
                      onClick={() => handleApplyStyle(styleConfig.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-950/70 to-slate-900 border-cyan-500 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-800/80 border-slate-700/70 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-slate-950/80 border border-slate-800 text-cyan-300">
                            {styleConfig.category}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-500/50">
                              <Check className="w-3 h-3" /> AKTIF
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-white text-xs">{styleConfig.name}</h4>
                        <p className="text-[10.5px] text-slate-300 leading-snug">{styleConfig.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Target: {styleConfig.targetDevice}</span>
                        <span className="text-cyan-400 font-bold">DPR {styleConfig.settings.maxDpr}x</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: HARDWARE AUTO-TUNER */}
          {activeTab === 'autotune' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span>One-Click Smart Hardware Auto-Tuner</span>
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Uji performa CPU Math LUT, Virtual Assembly VM, GPU Canvas Fillrate, dan Buffer RAM secara instan.
                    </p>
                  </div>
                </div>

                <button
                  disabled={isBenchmarking}
                  onClick={handleRunAutoTune}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isBenchmarking ? 'animate-spin' : ''}`} />
                  <span>{isBenchmarking ? 'Menganalisis Hardware...' : '🚀 Otomatis Sesuaikan dengan Hardware Saya'}</span>
                </button>
              </div>

              {benchmarkResult && (
                <div className="bg-slate-800/90 border border-slate-700/80 p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Hasil Diagnostik Hardware</span>
                      <h4 className="font-bold text-sm text-cyan-300 capitalize">
                        Grade: {benchmarkResult.deviceGrade.replace(/_/g, ' ')}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Skor Efisiensi</span>
                      <p className="font-mono font-black text-lg text-emerald-400">{benchmarkResult.score} / 100</p>
                    </div>
                  </div>

                  {/* Hardware Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="space-y-1">
                      <p className="text-slate-400">Chipset: <span className="text-slate-200">{benchmarkResult.detectedHardware.chipset}</span></p>
                      <p className="text-slate-400">GPU: <span className="text-slate-200">{benchmarkResult.detectedHardware.gpu}</span></p>
                      <p className="text-slate-400">RAM: <span className="text-emerald-400 font-bold">{benchmarkResult.detectedHardware.ram}</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400">Layar: <span className="text-slate-200">{benchmarkResult.detectedHardware.screenResolution}</span></p>
                      <p className="text-slate-400">CPU Cores: <span className="text-slate-200">{benchmarkResult.detectedHardware.cores} Cores</span></p>
                      <p className="text-slate-400">Touch: <span className="text-cyan-400">{benchmarkResult.detectedHardware.touchSampling}</span></p>
                    </div>
                  </div>

                  {/* Applied Optimizations List */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-300">Optimasi yang Diterapkan Otomatis:</span>
                    <div className="space-y-1">
                      {benchmarkResult.appliedOptimizations.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[10.5px] text-slate-200 bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 9 SUB-ENGINES */}
          {activeTab === 'engines' && (
            <div className="space-y-2 text-xs">
              {engineModules.map((eng, idx) => (
                <div key={idx} className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/70 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 mt-0.5">
                      {eng.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                        {eng.name}
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-tight">{eng.detail}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md shrink-0">
                    {eng.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: GPU & RAM METRICS */}
          {activeTab === 'metrics' && (
            <div className="space-y-3">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-emerald-400" />
                    Frame Rate
                  </span>
                  <p className="font-mono font-black text-lg text-emerald-400">{stats.fps} FPS</p>
                  <span className="text-[9px] text-slate-400 font-mono">Target: 60 FPS</span>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    Frame Time
                  </span>
                  <p className="font-mono font-black text-lg text-cyan-400">{stats.frameTimeMs} ms</p>
                  <span className="text-[9px] text-slate-400 font-mono">Budget: 16.6ms</span>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-amber-400" />
                    GPU Draws
                  </span>
                  <p className="font-mono font-black text-lg text-amber-400">{stats.drawCalls}</p>
                  <span className="text-[9px] text-slate-400 font-mono">Batched Pass</span>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                    Zero GC Pool
                  </span>
                  <p className="font-mono font-black text-lg text-purple-400">+{stats.gcCallsPrevented}</p>
                  <span className="text-[9px] text-slate-400 font-mono">Allocations</span>
                </div>
              </div>

              {/* Texture Resolution & GPU Adaptive Scale */}
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-cyan-400 font-bold text-[11px]">
                  <span>Resolusi Tekstur Adaptif (GPU Mali-G57)</span>
                  <span className="font-mono bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-300 font-black">
                    {resolutionScale}% Skala
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-normal">
                  Status: Resolusi render tekstur disesuaikan secara otomatis berdasarkan FPS terkini untuk menjamin 60 FPS super mulus di itel A70.
                </p>
              </div>

              {/* Memory Guardian Panel */}
              <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                    <span>Memory Guardian (&gt;80% RAM Protection)</span>
                  </div>
                  <button
                    onClick={() => {
                      memoryGuardian.setDebugOverlayVisible(!memoryGuardian.isDebugOverlayVisible());
                      setGcReport(LiteOptimizationEngine.getLastGcReport());
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all border shadow ${
                      memoryGuardian.isDebugOverlayVisible()
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {memoryGuardian.isDebugOverlayVisible() ? 'HUD Debug Active' : 'Tampilkan Overlay HUD'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono bg-rose-900/20 p-2 rounded-lg border border-rose-500/20">
                  <span>Konsumsi RAM: {memoryGuardian.getStatus().heapUsedMB} MB / {memoryGuardian.getStatus().heapLimitMB} MB</span>
                  <span className={`px-1.5 py-0.5 rounded font-black ${
                    memoryGuardian.getStatus().memoryPercent > 80 ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {memoryGuardian.getStatus().memoryPercent}% ({memoryGuardian.getStatus().memoryPercent > 80 ? 'PEMBERSIHAN OTOMATIS' : 'AMAN'})
                  </span>
                </div>
              </div>

              {/* Auto-GC Trigger Panel */}
              <div className="p-3 bg-slate-800/90 border border-purple-500/30 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold text-[11px]">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Auto-Garbage Collection Engine</span>
                  </div>
                  <button
                    onClick={() => {
                      const rep = LiteOptimizationEngine.performAutoGarbageCollection(true);
                      setGcReport(rep);
                      setNotification('✨ Pembersihan memori RAM berhasil dijalankan!');
                    }}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Jalankan Auto-GC</span>
                  </button>
                </div>

                {gcReport ? (
                  <div className="text-[10px] font-mono text-purple-200 bg-purple-950/40 p-2 rounded-lg border border-purple-500/20 space-y-0.5">
                    <p>• Aset Dibersihkan: {gcReport.purgedAssetCount} item</p>
                    <p>• Aset Redundan Dihapus: {gcReport.redundantFreedCount} item</p>
                    <p>• Memori RAM Dibebaskan: {(gcReport.memorySavedBytes / 1024).toFixed(1)} KB</p>
                    {gcReport.heapUsageMB > 0 && <p>• Penggunaan JS Heap: {gcReport.heapUsageMB} MB</p>}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Pembersihan otomatis aktif di latar belakang (memantau tekanan RAM & FPS).
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-4 py-3 bg-slate-900/90 flex items-center justify-between gap-3">
          <span className="text-[10.5px] font-mono text-cyan-400 line-clamp-1">
            Preset Aktif: {UnifiedEngineHub.STYLE_PRESETS[selectedStyle].name}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 cursor-pointer transition-all"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
