import React, { useState } from 'react';
import { GameProject, Scene, WorldSettings } from '../../types/engine';
import {
  ProceduralLevelEngine,
  ProceduralLevelParams,
  THEME_PROFILES,
  LevelTheme,
  PathDifficulty,
  LevelDensity,
  GroundStyle,
  GeneratedLevelResult,
} from '../../engine/ProceduralLevelEngine';
import { SceneEngine } from '../../engine/SceneEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';
import { soundEngine } from '../../engine/AudioEngine';
import {
  Wand2,
  Sparkles,
  Dice5,
  Layers,
  Flame,
  ShieldAlert,
  Zap,
  Coins,
  Bot,
  Activity,
  Check,
  RotateCcw,
  Sliders,
  Play,
  Star,
  Plus,
} from 'lucide-react';

interface ProceduralLevelSheetProps {
  project: GameProject;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

export const ProceduralLevelSheet: React.FC<ProceduralLevelSheetProps> = ({
  project,
  onUpdateProject,
  onClose,
}) => {
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 999999));
  const [theme, setTheme] = useState<LevelTheme>('cyber_neon');
  const [difficulty, setDifficulty] = useState<PathDifficulty>('medium');
  const [density, setDensity] = useState<LevelDensity>('medium');
  const [groundStyle, setGroundStyle] = useState<GroundStyle>('continuous_with_pits');
  const [levelWidth, setLevelWidth] = useState<number>(2400);
  const [collectibleDensity, setCollectibleDensity] = useState<number>(0.7);
  const [enemyDensity, setEnemyDensity] = useState<number>(0.5);
  const [hazardDensity, setHazardDensity] = useState<number>(0.5);
  const [includeMovingPlatforms, setIncludeMovingPlatforms] = useState<boolean>(true);
  const [destinationMode, setDestinationMode] = useState<'current_scene' | 'new_scene'>('current_scene');

  // Preview Result
  const [generatedPreview, setGeneratedPreview] = useState<GeneratedLevelResult>(() =>
    ProceduralLevelEngine.generateLevel({
      seed,
      theme,
      difficulty,
      density,
      groundStyle,
      levelWidth,
      levelHeight: 450,
      collectibleDensity,
      enemyDensity,
      hazardDensity,
      includeMovingPlatforms,
      includeCheckpoints: true,
      includeBossArena: false,
      clearExistingEntities: true,
    })
  );

  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 999999);
    setSeed(newSeed);
    triggerPreviewUpdate(newSeed, theme, difficulty, density, groundStyle, levelWidth);
    AndroidEngine.triggerHaptic(15);
  };

  const triggerPreviewUpdate = (
    curSeed = seed,
    curTheme = theme,
    curDiff = difficulty,
    curDens = density,
    curGround = groundStyle,
    curWidth = levelWidth
  ) => {
    const result = ProceduralLevelEngine.generateLevel({
      seed: curSeed,
      theme: curTheme,
      difficulty: curDiff,
      density: curDens,
      groundStyle: curGround,
      levelWidth: curWidth,
      levelHeight: 450,
      collectibleDensity,
      enemyDensity,
      hazardDensity,
      includeMovingPlatforms,
      includeCheckpoints: true,
      includeBossArena: false,
      clearExistingEntities: true,
    });
    setGeneratedPreview(result);
  };

  const handleApplyLevel = () => {
    AndroidEngine.triggerHaptic(30);
    soundEngine.play('powerup');

    const updatedWorld = {
      ...project.world,
      ...generatedPreview.worldSettings,
    };

    if (destinationMode === 'current_scene') {
      // Overwrite active entities & world settings
      onUpdateProject({
        ...project,
        world: updatedWorld,
        entities: generatedPreview.entities,
      });
    } else {
      // Create new scene and switch
      const newSceneName = `Level Prosedural #${(project.scenes?.length || 1) + 1} (${THEME_PROFILES[theme].name})`;
      const newScene = SceneEngine.createScene(newSceneName, generatedPreview.entities, updatedWorld as WorldSettings);

      const scenesList = project.scenes ? [...project.scenes, newScene] : [newScene];

      onUpdateProject({
        ...project,
        scenes: scenesList,
        activeSceneId: newScene.id,
        world: updatedWorld,
        entities: generatedPreview.entities,
      });
    }

    onClose();
  };

  return (
    <div className="p-3 h-full flex flex-col text-slate-100 select-none bg-slate-900 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h2 className="text-sm font-bold tracking-wide">Generator Level Platformer Prosedural</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-mono font-bold">
            Algoritma PRNG Mulberry32
          </span>
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* Seed & Quick Randomizer Card */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Dice5 className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block">Seed Peta (Aksen Unik)</span>
              <span className="text-[10px] text-slate-400 font-mono">
                Nomor seed menentukan tata letak rintangan
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              value={seed}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setSeed(val);
                triggerPreviewUpdate(val);
              }}
              className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-indigo-300 font-mono font-bold text-center"
            />
            <button
              onClick={handleRandomizeSeed}
              className="p-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Acak Seed Baru"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px]">Acak</span>
            </button>
          </div>
        </div>

        {/* Theme Selector Grid */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 block">Tema Visual & Palette Warna:</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(THEME_PROFILES) as LevelTheme[]).map((themeKey) => {
              const profile = THEME_PROFILES[themeKey];
              const isSelected = theme === themeKey;
              return (
                <button
                  key={themeKey}
                  onClick={() => {
                    setTheme(themeKey);
                    triggerPreviewUpdate(seed, themeKey);
                    AndroidEngine.triggerHaptic(15);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white truncate">{profile.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: profile.platformColor }} />
                    <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: profile.accentColor }} />
                    <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: profile.hazardColor }} />
                    <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: profile.collectibleColor }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Path Difficulty & Platform Density Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Difficulty Selector */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" /> Tingkat Kesulitan Parkour
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {(['easy', 'medium', 'hard', 'nightmare'] as PathDifficulty[]).map((diffKey) => (
                <button
                  key={diffKey}
                  onClick={() => {
                    setDifficulty(diffKey);
                    triggerPreviewUpdate(seed, theme, diffKey);
                    AndroidEngine.triggerHaptic(15);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                    difficulty === diffKey
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {diffKey}
                </button>
              ))}
            </div>
          </div>

          {/* Density Selector */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" /> Kerapatan Platform (Density)
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {(['sparse', 'medium', 'dense', 'packed'] as LevelDensity[]).map((densKey) => (
                <button
                  key={densKey}
                  onClick={() => {
                    setDensity(densKey);
                    triggerPreviewUpdate(seed, theme, difficulty, densKey);
                    AndroidEngine.triggerHaptic(15);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                    density === densKey
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {densKey}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sliders for Mechanics & Densities */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-indigo-400" /> Parameter Panjang & Rintangan Map
          </span>

          {/* Level Width Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Panjang Map Level (px):</span>
              <span className="font-mono text-indigo-400 font-bold">{levelWidth}px</span>
            </div>
            <input
              type="range"
              min="1200"
              max="4800"
              step="200"
              value={levelWidth}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setLevelWidth(val);
                triggerPreviewUpdate(seed, theme, difficulty, density, groundStyle, val);
              }}
              className="w-full accent-indigo-400 cursor-pointer"
            />
          </div>

          {/* Collectible Density */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Frekuensi Coin / Bintang:</span>
              <span className="font-mono text-indigo-400 font-bold">{Math.round(collectibleDensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={collectibleDensity}
              onChange={(e) => {
                setCollectibleDensity(parseFloat(e.target.value));
                triggerPreviewUpdate();
              }}
              className="w-full accent-indigo-400 cursor-pointer"
            />
          </div>

          {/* Enemy & Hazard Densities */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-300">Musuh Patroli:</span>
                <span className="font-mono text-indigo-400 font-bold">{Math.round(enemyDensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={enemyDensity}
                onChange={(e) => {
                  setEnemyDensity(parseFloat(e.target.value));
                  triggerPreviewUpdate();
                }}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-300">Duri & Traps:</span>
                <span className="font-mono text-indigo-400 font-bold">{Math.round(hazardDensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={hazardDensity}
                onChange={(e) => {
                  setHazardDensity(parseFloat(e.target.value));
                  triggerPreviewUpdate();
                }}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Live Map Statistics Card */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Hasil Analisis Statistik Level Tergenerasi
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Platform Total:</span>
              <span className="font-bold text-white font-mono">{generatedPreview.stats.platformCount} Objek</span>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Platform Bergerak:</span>
              <span className="font-bold text-cyan-300 font-mono">{generatedPreview.stats.movingPlatformCount} Objek</span>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Jumlah Coin Star:</span>
              <span className="font-bold text-amber-300 font-mono">{generatedPreview.stats.coinCount} Item</span>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Estimasi Durasi:</span>
              <span className="font-bold text-emerald-300 font-mono">~{generatedPreview.stats.estimatedPlayTimeSec} Detik</span>
            </div>
          </div>
        </div>

        {/* Destination Target & Generate Action Button */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold">Target Penerapan Map:</span>
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 gap-1">
              <button
                onClick={() => setDestinationMode('current_scene')}
                className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                  destinationMode === 'current_scene' ? 'bg-indigo-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Ganti Scene Saat Ini
              </button>
              <button
                onClick={() => setDestinationMode('new_scene')}
                className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                  destinationMode === 'new_scene' ? 'bg-indigo-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Buat Scene Baru
              </button>
            </div>
          </div>

          <button
            onClick={handleApplyLevel}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
          >
            <Wand2 className="w-5 h-5 fill-slate-950" />
            <span>TERAPKAN PETA PROSEDURAL KE GAME NOW</span>
          </button>
        </div>
      </div>
    </div>
  );
};
