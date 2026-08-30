import React from 'react';
import { WorldSettings, GlobalLightingSettings } from '../../types/engine';
import { UnifiedSheetHeader } from '../Common/UnifiedSheetHeader';
import { Sun, Moon, Sparkles, Layers, Shield, Eye } from 'lucide-react';
import { LIGHTING_PRESETS, LightingEngine } from '../../engine/LightingEngine';

interface LightingSheetProps {
  world: WorldSettings;
  onUpdateWorld: (world: WorldSettings) => void;
  onClose: () => void;
}

export const LightingSheet: React.FC<LightingSheetProps> = ({
  world,
  onUpdateWorld,
  onClose,
}) => {
  const currentLighting: GlobalLightingSettings = world.lighting || LightingEngine.getDefaultSettings();

  const updateLighting = (partial: Partial<GlobalLightingSettings>) => {
    onUpdateWorld({
      ...world,
      lighting: {
        ...currentLighting,
        ...partial,
      },
    });
  };

  const applyPreset = (presetKey: string) => {
    const preset = LIGHTING_PRESETS[presetKey];
    if (preset) {
      onUpdateWorld({
        ...world,
        lighting: {
          ...preset.settings,
        },
      });
    }
  };

  const ambientColorOptions = [
    '#ffffff', '#ff7e33', '#0a192f', '#2b0036', '#0d1117', '#120024', '#0f172a', '#1e1b4b', '#022c22'
  ];

  const sunColorOptions = [
    '#fff8db', '#ffa834', '#4cc9f0', '#ff007f', '#ffaa00', '#00f0ff', '#f472b6', '#a7f3d0'
  ];

  const shadowColorOptions = [
    '#000000', '#3a0800', '#020b14', '#00f0ff', '#2b0036', '#0f172a', '#18181b'
  ];

  return (
    <div className="flex flex-col h-full text-white">
      <UnifiedSheetHeader
        title="Pencahayaan & Suasana (Global Lighting)"
        subtitle="Atur Warna Ambient, Intensititas Cahaya, & Bayangan Objek"
        icon={Sun}
        iconColor="text-amber-400"
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 text-xs">
        {/* Toggle Master Lighting */}
        <div className="p-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Sun className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-amber-200 text-sm">Pencahayaan Global Game</div>
              <div className="text-[10.5px] text-slate-400">Aktifkan efek warna ambient, pencahayaan matahari & bayangan</div>
            </div>
          </div>
          <button
            onClick={() => updateLighting({ enabled: !currentLighting.enabled })}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              currentLighting.enabled
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {currentLighting.enabled ? 'AKTIF' : 'NONAKTIF'}
          </button>
        </div>

        {/* Mood Presets Quick Selection */}
        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>Preset Suasana / Atmospir Cahaya</span>
          </div>
          <p className="text-[10.5px] text-slate-400">Pilih tema suasana siap pakai dengan sekali klik:</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {Object.entries(LIGHTING_PRESETS).map(([key, item]) => {
              const isSelected = currentLighting.moodPreset === key;
              return (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/80 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-[11px] truncate">{item.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <div
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: item.settings.ambientColor }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: item.settings.sunLightColor }}
                      />
                    </div>
                  </div>
                  <p className="text-[9.5px] text-slate-400 leading-tight line-clamp-2">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ambient Light Settings */}
        <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Sun className="w-4 h-4" />
              <span>Cahaya Lingkungan (Ambient Light)</span>
            </div>
            <span className="text-[11px] font-mono text-amber-400 font-bold">
              {Math.round(currentLighting.ambientIntensity * 100)}%
            </span>
          </div>

          {/* Ambient Color Swatches */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] text-slate-400">Warna Nadir / Ambient Scene:</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ambientColorOptions.map((col) => (
                <button
                  key={col}
                  onClick={() => updateLighting({ ambientColor: col, moodPreset: 'custom' })}
                  className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                    currentLighting.ambientColor.toLowerCase() === col.toLowerCase()
                      ? 'border-amber-400 scale-110 shadow-sm shadow-amber-500/50'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
              <input
                type="color"
                value={currentLighting.ambientColor}
                onChange={(e) => updateLighting({ ambientColor: e.target.value, moodPreset: 'custom' })}
                className="w-7 h-7 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer"
                title="Warna Kustom Ambient"
              />
            </div>
          </div>

          {/* Ambient Intensity Slider */}
          <div className="space-y-1">
            <label className="text-[10.5px] text-slate-400 flex items-center justify-between">
              <span>Intensitas Ambient Kegelapan:</span>
              <span className="font-mono text-slate-300">{(currentLighting.ambientIntensity).toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentLighting.ambientIntensity}
              onChange={(e) => updateLighting({ ambientIntensity: parseFloat(e.target.value), moodPreset: 'custom' })}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Directional Sunlight / Moonlight Tint */}
        <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Moon className="w-4 h-4" />
              <span>Sinar Matahari / Arah (Sunlight / Moonlight)</span>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 font-bold">
              {Math.round((currentLighting.sunLightIntensity ?? 0) * 100)}%
            </span>
          </div>

          {/* Sunlight Color Swatches */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] text-slate-400">Warna Tint Sorotan Cahaya:</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {sunColorOptions.map((col) => (
                <button
                  key={col}
                  onClick={() => updateLighting({ sunLightColor: col, moodPreset: 'custom' })}
                  className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                    currentLighting.sunLightColor?.toLowerCase() === col.toLowerCase()
                      ? 'border-cyan-400 scale-110 shadow-sm shadow-cyan-500/50'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
              <input
                type="color"
                value={currentLighting.sunLightColor || '#fff8db'}
                onChange={(e) => updateLighting({ sunLightColor: e.target.value, moodPreset: 'custom' })}
                className="w-7 h-7 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer"
                title="Warna Kustom Sorotan"
              />
            </div>
          </div>

          {/* Sunlight Intensity Slider */}
          <div className="space-y-1">
            <label className="text-[10.5px] text-slate-400 flex items-center justify-between">
              <span>Intensitas Kilauan Sinar:</span>
              <span className="font-mono text-slate-300">{(currentLighting.sunLightIntensity ?? 0).toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentLighting.sunLightIntensity ?? 0}
              onChange={(e) => updateLighting({ sunLightIntensity: parseFloat(e.target.value), moodPreset: 'custom' })}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Global Shadow Settings */}
        <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-400 font-bold">
              <Layers className="w-4 h-4" />
              <span>Bayangan Objek Global (Global Shadows)</span>
            </div>
            <button
              onClick={() => updateLighting({ shadowsEnabled: !currentLighting.shadowsEnabled })}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                currentLighting.shadowsEnabled
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {currentLighting.shadowsEnabled ? 'AKTIF' : 'OFF'}
            </button>
          </div>

          {currentLighting.shadowsEnabled && (
            <>
              {/* Shadow Color */}
              <div className="space-y-1.5">
                <label className="text-[10.5px] text-slate-400">Warna Bayangan Dasar:</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {shadowColorOptions.map((col) => (
                    <button
                      key={col}
                      onClick={() => updateLighting({ shadowColor: col, moodPreset: 'custom' })}
                      className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                        currentLighting.shadowColor?.toLowerCase() === col.toLowerCase()
                          ? 'border-purple-400 scale-110 shadow-sm shadow-purple-500/50'
                          : 'border-slate-700 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                  <input
                    type="color"
                    value={currentLighting.shadowColor || '#000000'}
                    onChange={(e) => updateLighting({ shadowColor: e.target.value, moodPreset: 'custom' })}
                    className="w-7 h-7 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer"
                    title="Warna Kustom Bayangan"
                  />
                </div>
              </div>

              {/* Shadow Intensity */}
              <div className="space-y-1">
                <label className="text-[10.5px] text-slate-400 flex items-center justify-between">
                  <span>Kepekatan Bayangan (Intensity):</span>
                  <span className="font-mono text-purple-300 font-bold">
                    {Math.round((currentLighting.shadowIntensity ?? 0.4) * 100)}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={currentLighting.shadowIntensity ?? 0.4}
                  onChange={(e) => updateLighting({ shadowIntensity: parseFloat(e.target.value), moodPreset: 'custom' })}
                  className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Shadow Offset X & Y */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Posisi Offset X:</span>
                    <span className="font-mono text-slate-300">{currentLighting.shadowOffsetX ?? 4}px</span>
                  </label>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={currentLighting.shadowOffsetX ?? 4}
                    onChange={(e) => updateLighting({ shadowOffsetX: parseInt(e.target.value), moodPreset: 'custom' })}
                    className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Posisi Offset Y:</span>
                    <span className="font-mono text-slate-300">{currentLighting.shadowOffsetY ?? 8}px</span>
                  </label>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={currentLighting.shadowOffsetY ?? 8}
                    onChange={(e) => updateLighting({ shadowOffsetY: parseInt(e.target.value), moodPreset: 'custom' })}
                    className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Shadow Blur */}
              <div className="space-y-1">
                <label className="text-[10.5px] text-slate-400 flex items-center justify-between">
                  <span>Kehalusan Bayangan (Blur / Softness):</span>
                  <span className="font-mono text-slate-300">{currentLighting.shadowBlur ?? 6}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={currentLighting.shadowBlur ?? 6}
                  onChange={(e) => updateLighting({ shadowBlur: parseInt(e.target.value), moodPreset: 'custom' })}
                  className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
