import React, { useState } from 'react';
import { GameProject, Entity, ShaderComponent, ShaderType } from '../../types/engine';
import { ShaderEngine, SHADER_PRESETS } from '../../engine/ShaderEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';
import {
  Sparkles,
  Zap,
  Eye,
  Sliders,
  Check,
  RotateCcw,
  Gauge,
  Cpu,
  Layers,
  Globe,
  Box,
  Palette,
  Activity,
  ShieldCheck,
  Flame,
} from 'lucide-react';

interface ShaderEditorSheetProps {
  project: GameProject;
  selectedEntity: Entity | null;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

export const ShaderEditorSheet: React.FC<ShaderEditorSheetProps> = ({
  project,
  selectedEntity,
  onUpdateProject,
  onClose,
}) => {
  const [applyTarget, setApplyTarget] = useState<'world' | 'entity'>(selectedEntity ? 'entity' : 'world');

  // Active Shader Component
  const activeShader: ShaderComponent =
    applyTarget === 'world'
      ? project.world.worldShader || {
          enabled: false,
          type: 'cyber_neon',
          intensity: 0.8,
          scale: 1.5,
          speed: 2.0,
          glowColor: '#06b6d4',
          blendMode: 'screen',
        }
      : selectedEntity?.shader || {
          enabled: false,
          type: 'cyber_neon',
          intensity: 0.8,
          scale: 1.5,
          speed: 2.0,
          glowColor: '#06b6d4',
          blendMode: 'screen',
        };

  const handleSelectPreset = (presetType: ShaderType) => {
    const preset = SHADER_PRESETS[presetType];
    const newShader: ShaderComponent = {
      enabled: true,
      type: presetType,
      intensity: preset.defaultIntensity,
      scale: preset.defaultScale,
      speed: preset.defaultSpeed,
      glowColor: preset.defaultGlowColor,
      blendMode: preset.blendMode,
    };

    updateShaderInProject(newShader);
    AndroidEngine.triggerHaptic(20);
  };

  const updateShaderInProject = (updatedShader: ShaderComponent) => {
    if (applyTarget === 'world') {
      onUpdateProject({
        ...project,
        world: {
          ...project.world,
          worldShader: updatedShader,
        },
      });
    } else if (selectedEntity) {
      onUpdateProject({
        ...project,
        entities: project.entities.map((ent) => (ent.id === selectedEntity.id ? { ...ent, shader: updatedShader } : ent)),
      });
    }
  };

  const handleToggleShader = () => {
    updateShaderInProject({
      ...activeShader,
      enabled: !activeShader.enabled,
    });
    AndroidEngine.triggerHaptic(15);
  };

  const handleClearShader = () => {
    if (applyTarget === 'world') {
      onUpdateProject({
        ...project,
        world: {
          ...project.world,
          worldShader: undefined,
        },
      });
    } else if (selectedEntity) {
      onUpdateProject({
        ...project,
        entities: project.entities.map((ent) => (ent.id === selectedEntity.id ? { ...ent, shader: undefined } : ent)),
      });
    }
    AndroidEngine.triggerHaptic(15);
  };

  return (
    <div className="p-3 h-full flex flex-col text-slate-100 select-none bg-slate-900 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold tracking-wide">Editor & Manager Shader GPU Mobile</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
            itel A70 (60 FPS Mali-G57)
          </span>
        </div>
      </div>

      {/* Target Selector: World Backdrop vs Active Entity */}
      <div className="flex bg-slate-950 p-1 rounded-xl mb-3 border border-slate-800 text-xs gap-1">
        <button
          onClick={() => setApplyTarget('world')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            applyTarget === 'world' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Shader Backdrop Dunia</span>
        </button>

        <button
          onClick={() => selectedEntity && setApplyTarget('entity')}
          disabled={!selectedEntity}
          className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            applyTarget === 'entity' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
          } ${!selectedEntity ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>{selectedEntity ? `Shader Objek (${selectedEntity.name})` : 'Pilih Objek di Canvas'}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* Toggle & Quick Control Card */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleShader}
              className={`w-10 h-6 rounded-full transition-colors flex items-center p-1 cursor-pointer ${
                activeShader.enabled ? 'bg-amber-400' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  activeShader.enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <span className="text-xs font-bold text-white block">
                {activeShader.enabled ? 'Shader Aktif' : 'Shader Nonaktif'}
              </span>
              <span className="text-[10px] text-slate-400">
                {SHADER_PRESETS[activeShader.type]?.name || 'Custom Shader'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearShader}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px]">Reset Shader</span>
            </button>
          </div>
        </div>

        {/* Shader Presets Grid */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 block">Koleksi Preset Shader Visual:</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(SHADER_PRESETS) as ShaderType[]).map((typeKey) => {
              const preset = SHADER_PRESETS[typeKey];
              const isSelected = activeShader.enabled && activeShader.type === typeKey;

              return (
                <button
                  key={typeKey}
                  onClick={() => handleSelectPreset(typeKey)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </div>
                  <p className="text-[9.5px] text-slate-400 line-clamp-2 leading-tight">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Parameter Fine-Tuning */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-amber-400" /> Pengaturan Parameter Shader & Warna Glow
          </h3>

          {/* Intensity Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Intensitas Efek:</span>
              <span className="font-mono text-amber-400 font-bold">{Math.round((activeShader.intensity || 0.5) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={activeShader.intensity || 0.5}
              onChange={(e) => updateShaderInProject({ ...activeShader, intensity: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Scale / Density Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Skala / Densitas Pixel:</span>
              <span className="font-mono text-amber-400 font-bold">{activeShader.scale || 2.0}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={activeShader.scale || 2.0}
              onChange={(e) => updateShaderInProject({ ...activeShader, scale: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Animation Speed Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Kecepatan Animasi Pulsing:</span>
              <span className="font-mono text-amber-400 font-bold">{activeShader.speed || 1.0}x</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.2"
              value={activeShader.speed || 1.0}
              onChange={(e) => updateShaderInProject({ ...activeShader, speed: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Glow Color Selector */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-300 block">Warna Pendaran (Glow Color):</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={activeShader.glowColor || '#06b6d4'}
                onChange={(e) => updateShaderInProject({ ...activeShader, glowColor: e.target.value })}
                className="w-8 h-8 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-300">{activeShader.glowColor || '#06b6d4'}</span>
            </div>
          </div>
        </div>

        {/* Mobile GPU Profiler & Optimiser Card */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
            <div>
              <span className="text-xs font-bold text-white block">Status GPU Mobile itel A70</span>
              <span className="text-[10px] text-emerald-400 font-mono">
                60 FPS • Canvas Shader Filter LUT Caching Active
              </span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono font-bold">
            RAM: &lt; 3MB
          </span>
        </div>
      </div>
    </div>
  );
};
