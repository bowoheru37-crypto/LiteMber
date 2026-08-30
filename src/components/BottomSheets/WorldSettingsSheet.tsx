import React from 'react';
import { Entity, WorldSettings, GameProject } from '../../types/engine';
import { UnifiedSheetHeader } from '../Common/UnifiedSheetHeader';
import { Smartphone, Globe, Camera, Focus, Grid, Magnet, Zap, Target } from 'lucide-react';
import { snappingEngine } from '../../engine/SnappingEngine';
import { LiteOptimizationEngine } from '../../engine/LiteOptimizationEngine';

interface WorldSettingsSheetProps {
  world: WorldSettings;
  project?: GameProject;
  entities?: Entity[];
  onUpdateWorld: (world: WorldSettings) => void;
  onUpdateProject?: (project: GameProject) => void;
  onClose: () => void;
}

export const WorldSettingsSheet: React.FC<WorldSettingsSheetProps> = ({
  world,
  project,
  entities = [],
  onUpdateWorld,
  onUpdateProject,
  onClose,
}) => {
  const bgColors = [
    '#0f172a', '#030712', '#1e1b4b', '#022c22', '#312e81', '#18181b', '#000000'
  ];

  return (
    <div className="flex flex-col h-full text-white">
      <UnifiedSheetHeader
        title="Pengaturan Dunia & Optimasi"
        subtitle="Gravitasi, FPS, Kamera, & Profile itel A70"
        icon={Globe}
        iconColor="text-cyan-400"
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 text-xs">
        {/* itel A70 Hardware Preset Card */}
        <div className="p-3 bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-500/40 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Smartphone className="w-4 h-4" />
              <span>Lite Optimization Mode (itel A70)</span>
            </div>
            <button
              onClick={() => {
                const nextLite = !world.liteOptimizationMode;
                onUpdateWorld({
                  ...world,
                  liteOptimizationMode: nextLite,
                  deviceProfile: nextLite ? 'itel_a70_optimized' : 'standard',
                  maxActiveParticles: nextLite ? 150 : 300,
                });
              }}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold cursor-pointer transition-all ${
                world.liteOptimizationMode !== false
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {world.liteOptimizationMode !== false ? 'AKTIF (60 FPS)' : 'OFF'}
            </button>
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed">
            Mencakup Object Pooling agresif (Zero-GC), throttling rendering saat panel sheet dibuka, dan alokasi Float32Array untuk chipset Unisoc T606 / Mali-G57 GPU.
          </p>

          {project && onUpdateProject && (
            <button
              onClick={() => {
                const compressed = LiteOptimizationEngine.compressProjectAssets(project);
                onUpdateProject(compressed);
              }}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Otomatis Kompres Tekstur & Audio Proyek</span>
            </button>
          )}
        </div>

        {/* 2D Camera Tracking System Controls */}
        <div className="space-y-3 border-t border-slate-800 pt-3 bg-slate-950 p-3 rounded-xl border">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Camera className="w-4 h-4" />
            <span>Kamera Focus & Smooth Tracking</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Viewport GameCanvas melacak target entitas terpilih di stage dengan interpolasi gerak mulus dan velocity look-ahead saat Mode Play.
          </p>

          {/* Camera Target Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Target Focus Objek Kamera</span>
            </label>
            <select
              value={world.cameraFollowEntityId || ''}
              onChange={(e) =>
                onUpdateWorld({
                  ...world,
                  cameraFollowEntityId: e.target.value || undefined,
                })
              }
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
            >
              <option value="">Auto (Deteksi Otomatis 'Player' / 'Hero')</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  🎯 {ent.name} ({ent.type})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-300">Kehalusan Gerak Kamera (Smoothing Lerp)</span>
              <span className="font-mono text-amber-400 font-bold">
                {Math.round((world.cameraSmoothing || 0.12) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.02"
              max="0.4"
              step="0.01"
              value={world.cameraSmoothing || 0.12}
              onChange={(e) =>
                onUpdateWorld({ ...world, cameraSmoothing: parseFloat(e.target.value) || 0.12 })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Snapping System & Smart Guides Settings Card */}
        <div className="space-y-3 border-t border-slate-800 pt-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Grid className="w-4 h-4" />
              <span>Sistem Snapping & Smart Guides Stage</span>
            </div>
            <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
              PRESISI DESAIN
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Menyelaraskan objek secara instan saat ditarik di layar sentuh mobile. Mendukung Snap Grid dan Panduan Garis Pintar (Smart Guides).
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                const current = snappingEngine.getConfig();
                const nextGrid = !current.gridSnap;
                snappingEngine.setConfig({ gridSnap: nextGrid });
                onUpdateWorld({ ...world, showGridSnap: nextGrid });
              }}
              className={`p-2 rounded-xl border text-left font-bold flex items-center justify-between cursor-pointer transition-all ${
                snappingEngine.getConfig().gridSnap
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5" />
                <span>Snap Grid</span>
              </div>
              <span className="text-[10px] font-mono font-bold">
                {snappingEngine.getConfig().gridSnap ? 'AKTIF' : 'OFF'}
              </span>
            </button>

            <button
              onClick={() => {
                const current = snappingEngine.getConfig();
                const nextObj = !current.objectSnap;
                snappingEngine.setConfig({ objectSnap: nextObj });
                onUpdateWorld({ ...world });
              }}
              className={`p-2 rounded-xl border text-left font-bold flex items-center justify-between cursor-pointer transition-all ${
                snappingEngine.getConfig().objectSnap
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Magnet className="w-3.5 h-3.5" />
                <span>Smart Guides</span>
              </div>
              <span className="text-[10px] font-mono font-bold">
                {snappingEngine.getConfig().objectSnap ? 'AKTIF' : 'OFF'}
              </span>
            </button>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-300">Ukuran Grid Snap Stage</span>
              <span className="font-mono text-cyan-400 font-bold">
                {world.gridSize || snappingEngine.getConfig().gridSize} px
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[16, 32, 64].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    snappingEngine.setConfig({ gridSize: size, gridSnap: true });
                    onUpdateWorld({ ...world, gridSize: size, showGridSnap: true });
                  }}
                  className={`py-1 rounded-lg border text-center font-mono font-bold cursor-pointer text-[11px] transition-all ${
                    (world.gridSize || snappingEngine.getConfig().gridSize) === size
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {size} px
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gravity Control Slider */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-300">Gravitasi Vertikal (Y)</span>
            <span className="font-mono text-cyan-400 font-bold">{world.gravityY} px/s²</span>
          </div>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={world.gravityY}
            onChange={(e) =>
              onUpdateWorld({ ...world, gravityY: parseFloat(e.target.value) || 0 })
            }
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>

        {/* Target FPS Switch */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <span className="font-semibold text-slate-300 block">Target Refresh Rate</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateWorld({ ...world, targetFPS: 60 })}
              className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                world.targetFPS === 60
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              60 FPS (Super Mulus)
            </button>
            <button
              onClick={() => onUpdateWorld({ ...world, targetFPS: 30 })}
              className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                world.targetFPS === 30
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              30 FPS (Hemat Baterai)
            </button>
          </div>
        </div>

        {/* Background Color */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <span className="font-semibold text-slate-300 block">Warna Latar Belakang Stage</span>
          <div className="flex items-center gap-2 flex-wrap">
            {bgColors.map((color) => (
              <button
                key={color}
                onClick={() => onUpdateWorld({ ...world, backgroundColor: color })}
                className={`w-8 h-8 rounded-xl border border-white/20 cursor-pointer transition-all ${
                  world.backgroundColor === color ? 'ring-2 ring-cyan-400 scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
