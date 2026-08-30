import React, { useState } from 'react';
import { Entity, ParticleComponent, ParticleEmitterShape, ParticleShape } from '../../types/engine';
import { Sparkles, Activity, Play, Zap, Flame, X, Circle, Sliders, Layers, Film } from 'lucide-react';
import { ParticleEngine, ParticlePresetType } from '../../engine/ParticleEngine';
import { TweenEngine, EasingType } from '../../engine/TweenEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';
import { AnimationTimeline } from '../AnimationTimeline';

interface AnimationParticleSheetProps {
  entity: Entity | null;
  onUpdateEntity: (updated: Entity) => void;
  onClose: () => void;
}

export const AnimationParticleSheet: React.FC<AnimationParticleSheetProps> = ({
  entity,
  onUpdateEntity,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'particles' | 'tweens' | 'anim'>('timeline');
  const [testEasing, setTestEasing] = useState<EasingType>('easeOutBounce');
  const [testDuration, setTestDuration] = useState<number>(800);
  const [selectedParticlePreset, setSelectedParticlePreset] = useState<ParticlePresetType>('explosion');

  if (!entity) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs">
        Pilih objek di layar untuk mengatur animasi, partikel, dan tween.
      </div>
    );
  }

  const comp: ParticleComponent = entity.particles || {
    enabled: false,
    burstRate: 20,
    rate: 20,
    color: '#38bdf8',
    colorGradient: ['#38bdf8', '#a855f7'],
    minSpeed: 30,
    maxSpeed: 90,
    speed: 60,
    minLifetime: 0.3,
    maxLifetime: 0.8,
    lifetime: 0.5,
    minSize: 3,
    maxSize: 6,
    size: 4,
    shape: 'spark',
    emitterShape: 'point',
    emitterWidth: 32,
    emitterHeight: 32,
    emitterRadius: 20,
    angle: 0,
    spread: 360,
    gravityX: 0,
    gravityY: 0,
  };

  const updateParticleComp = (updatedComp: Partial<ParticleComponent>) => {
    const merged: ParticleComponent = { ...comp, ...updatedComp, enabled: true };
    onUpdateEntity({
      ...entity,
      particles: merged,
    });
  };

  const handleTestParticleBurst = () => {
    const centerX = entity.transform.x + entity.transform.width / 2;
    const centerY = entity.transform.y + entity.transform.height / 2;
    if (entity.particles && entity.particles.enabled) {
      ParticleEngine.emitFromComponent(centerX, centerY, entity.particles, 25);
    } else {
      ParticleEngine.emit(centerX, centerY, 20, selectedParticlePreset);
    }
    AndroidEngine.triggerHaptic(15);
  };

  const handleTestTweenBounce = () => {
    const originalY = entity.transform.y;
    TweenEngine.create({
      target: entity.transform,
      property: 'y',
      from: originalY,
      to: originalY - 60,
      durationMs: testDuration,
      easing: testEasing,
      yoyo: true,
      onUpdate: () => onUpdateEntity({ ...entity }),
      onComplete: () => {
        entity.transform.y = originalY;
        onUpdateEntity({ ...entity });
      },
    });
    AndroidEngine.triggerHaptic(20);
  };

  const gradientPresets = [
    { name: 'Cyber Neon', colors: ['#38bdf8', '#a855f7', '#ec4899'] },
    { name: 'Solar Fire', colors: ['#facc15', '#f97316', '#ef4444'] },
    { name: 'Emerald Energy', colors: ['#4ade80', '#10b981', '#064e3b'] },
    { name: 'Purple Magic', colors: ['#c084fc', '#8b5cf6', '#4c1d95'] },
    { name: 'Gold Coin', colors: ['#fef08a', '#facc15', '#b45309'] },
    { name: 'Rainbow Spark', colors: ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#a855f7'] },
    { name: 'Snow Ice', colors: ['#ffffff', '#e0f2fe', '#38bdf8'] },
    { name: 'Volcano Red', colors: ['#f87171', '#dc2626', '#450a0a'] },
  ];

  const emitterShapesList: { name: string; key: ParticleEmitterShape }[] = [
    { name: 'Point', key: 'point' },
    { name: 'Box', key: 'box' },
    { name: 'Circle', key: 'circle' },
    { name: 'Cone', key: 'cone' },
    { name: 'Line', key: 'line' },
    { name: 'Ring', key: 'ring' },
  ];

  const particleShapesList: { name: string; key: ParticleShape; icon: string }[] = [
    { name: 'Spark', key: 'spark', icon: '⚡' },
    { name: 'Circle', key: 'circle', icon: '⚪' },
    { name: 'Square', key: 'square', icon: '⏹️' },
    { name: 'Star', key: 'star', icon: '⭐' },
    { name: 'Ring', key: 'ring', icon: '⭕' },
  ];

  const easingList: { name: string; key: EasingType }[] = [
    { name: 'Linear', key: 'linear' },
    { name: 'Pantul (Bounce)', key: 'easeOutBounce' },
    { name: 'Karet (Elastic)', key: 'easeOutElastic' },
    { name: 'Cepat-Lambat (Quad)', key: 'easeInOutQuad' },
    { name: 'Tarik Belakang (Back)', key: 'easeOutBack' },
    { name: 'Gelombang Sine', key: 'easeOutSine' },
  ];

  return (
    <div className="flex flex-col h-full text-white bg-slate-900 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm">Editor Sistem Partikel & Animasi</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-950 p-1 border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-1.5 rounded-md font-bold transition-all ${activeTab === 'timeline' ? 'bg-purple-600 text-white shadow' : 'text-slate-400'}`}
        >
          🎬 Timeline
        </button>
        <button
          onClick={() => setActiveTab('particles')}
          className={`flex-1 py-1.5 rounded-md font-bold transition-all ${activeTab === 'particles' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'}`}
        >
          ✨ Partikel
        </button>
        <button
          onClick={() => setActiveTab('tweens')}
          className={`flex-1 py-1.5 rounded-md font-bold transition-all ${activeTab === 'tweens' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400'}`}
        >
          📈 Tween
        </button>
        <button
          onClick={() => setActiveTab('anim')}
          className={`flex-1 py-1.5 rounded-md font-bold transition-all ${activeTab === 'anim' ? 'bg-purple-500 text-slate-950 shadow' : 'text-slate-400'}`}
        >
          🎞️ Clips
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {activeTab === 'timeline' && (
          <AnimationTimeline entity={entity} onUpdateEntity={onUpdateEntity} onClose={onClose} />
        )}

        {activeTab === 'particles' && (
          <div className="space-y-3">
            {/* Toggle Enable & Test Button */}
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <label className="flex items-center gap-2 font-bold text-amber-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={entity.particles?.enabled || false}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateParticleComp({ enabled: true });
                    } else {
                      onUpdateEntity({
                        ...entity,
                        particles: { ...(entity.particles || comp), enabled: false },
                      });
                    }
                  }}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span>Aktifkan Emitter Partikel</span>
              </label>

              <button
                onClick={handleTestParticleBurst}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold px-3 py-1 rounded-lg flex items-center gap-1 shadow cursor-pointer active:scale-95 text-xs"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Uji Semburan</span>
              </button>
            </div>

            {/* Mobile Optimization & Quality Budget */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 text-[11px] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" /> Profil Performa Partikel Mobile
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Zero-GC TypedArray</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: 'auto', label: 'Auto (HP)' },
                  { key: 'low', label: 'Low (200)' },
                  { key: 'medium', label: 'Med (400)' },
                  { key: 'high', label: 'High (800)' },
                ].map((q) => (
                  <button
                    key={q.key}
                    onClick={() => {
                      ParticleEngine.setQualityLevel(q.key as any);
                      AndroidEngine.triggerHaptic(10);
                    }}
                    className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 hover:text-cyan-300 transition-all text-center"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Effect Utilities Spawner */}
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Spawner Efek Visual Instan
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { name: 'Explosion', fn: ParticleEngine.spawnExplosion, color: 'text-amber-400' },
                  { name: 'Dust', fn: ParticleEngine.spawnDust, color: 'text-slate-400' },
                  { name: 'Sparks', fn: ParticleEngine.spawnSparks, color: 'text-yellow-300' },
                  { name: 'Fire', fn: ParticleEngine.spawnFire, color: 'text-orange-400' },
                  { name: 'Smoke', fn: ParticleEngine.spawnSmoke, color: 'text-slate-300' },
                  { name: 'Coin FX', fn: ParticleEngine.spawnCoinSparkle, color: 'text-amber-300' },
                  { name: 'Starburst', fn: ParticleEngine.spawnStarburst, color: 'text-purple-300' },
                  { name: 'Shockwave', fn: ParticleEngine.spawnShockwave, color: 'text-cyan-300' },
                ].map((fx) => (
                  <button
                    key={fx.name}
                    onClick={() => {
                      const cx = entity.transform.x + entity.transform.width / 2;
                      const cy = entity.transform.y + entity.transform.height / 2;
                      fx.fn(cx, cy);
                      AndroidEngine.triggerHaptic(15);
                    }}
                    className="py-1.5 px-1 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-[10px] font-bold text-slate-200 cursor-pointer transition-all flex flex-col items-center gap-0.5"
                  >
                    <span className={`text-[11px] ${fx.color}`}>✦</span>
                    <span>{fx.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Gradient Presets */}
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1 text-[11px]">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Preset Warna Gradien Partikel
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {gradientPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => updateParticleComp({ colorGradient: preset.colors, color: preset.colors[0] })}
                    className="p-2 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all"
                  >
                    <span className="text-[11px] font-medium text-slate-200">{preset.name}</span>
                    <div className="flex gap-0.5">
                      {preset.colors.slice(0, 3).map((c, i) => (
                        <div key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Emission Rate & Lifetime */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Kecepatan Semburan (Burst Rate / sec)</span>
                  <span className="font-mono text-amber-400 font-bold">{comp.burstRate || comp.rate || 20} / dtk</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={comp.burstRate || comp.rate || 20}
                  onChange={(e) => updateParticleComp({ burstRate: parseInt(e.target.value) || 20, rate: parseInt(e.target.value) || 20 })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400">Min Lifetime (detik)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={comp.minLifetime || 0.2}
                    onChange={(e) => updateParticleComp({ minLifetime: parseFloat(e.target.value) || 0.2 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Max Lifetime (detik)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={comp.maxLifetime || 0.8}
                    onChange={(e) => updateParticleComp({ maxLifetime: parseFloat(e.target.value) || 0.8 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Emitter Shape Selection */}
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300 text-[11px]">Bentuk Area Emitter (Emitter Shape)</span>
              <div className="grid grid-cols-3 gap-1.5">
                {emitterShapesList.map((shape) => (
                  <button
                    key={shape.key}
                    onClick={() => updateParticleComp({ emitterShape: shape.key })}
                    className={`py-1.5 rounded-lg border font-bold capitalize cursor-pointer transition-all text-[11px] ${
                      comp.emitterShape === shape.key
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {shape.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Particle Shape Selection */}
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300 text-[11px]">Bentuk Biji Partikel (Particle Shape)</span>
              <div className="grid grid-cols-5 gap-1">
                {particleShapesList.map((pShape) => (
                  <button
                    key={pShape.key}
                    onClick={() => updateParticleComp({ shape: pShape.key })}
                    className={`p-1.5 rounded-lg border flex flex-col items-center cursor-pointer transition-all ${
                      comp.shape === pShape.key
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="text-sm">{pShape.icon}</span>
                    <span className="text-[9px] mt-0.5">{pShape.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Angle, Spread, Gravity */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400">Arah Sudut (Degrees)</span>
                  <input
                    type="number"
                    value={comp.angle || 0}
                    onChange={(e) => updateParticleComp({ angle: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Sebaran Cone (Spread °)</span>
                  <input
                    type="number"
                    value={comp.spread !== undefined ? comp.spread : 360}
                    onChange={(e) => updateParticleComp({ spread: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400">Gravitasi Partikel Y</span>
                  <input
                    type="number"
                    value={comp.gravityY || 0}
                    onChange={(e) => updateParticleComp({ gravityY: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Gravitasi Partikel X</span>
                  <input
                    type="number"
                    value={comp.gravityX || 0}
                    onChange={(e) => updateParticleComp({ gravityX: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tweens' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 flex items-center gap-1">
                <Zap className="w-4 h-4" /> Kurva Interpolasi Easing
              </span>
              <button
                onClick={handleTestTweenBounce}
                className="bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold px-3 py-1 rounded-lg flex items-center gap-1 shadow cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Uji Gerak Tween</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-semibold">Tipe Kurva Easing</label>
              <div className="grid grid-cols-2 gap-2">
                {easingList.map((e) => (
                  <button
                    key={e.key}
                    onClick={() => setTestEasing(e.key)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      testEasing === e.key
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300'
                    }`}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                <span>Durasi Tween (ms):</span>
                <span className="font-mono text-cyan-400">{testDuration} ms</span>
              </div>
              <input
                type="range"
                min={200}
                max={2000}
                step={100}
                value={testDuration}
                onChange={(e) => setTestDuration(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {activeTab === 'anim' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-400 flex items-center gap-1">
                <Activity className="w-4 h-4" /> Clip & FPS Frame Sprite
              </span>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2">
              <p className="text-[11px] text-slate-300">
                Pilih status animasi karakter (Idle, Run, Jump, Attack) dan kecepatan FPS.
              </p>
              <div className="flex gap-2">
                {['idle', 'run', 'jump', 'attack'].map((clip) => (
                  <button
                    key={clip}
                    onClick={() => {
                      const updated = { ...entity };
                      if (updated.sprite) {
                        updated.sprite.type = 'animated';
                        updated.sprite.currentClip = clip;
                      }
                      onUpdateEntity(updated);
                    }}
                    className={`flex-1 py-1.5 rounded-lg border font-bold capitalize cursor-pointer transition-all ${
                      entity.sprite?.currentClip === clip
                        ? 'bg-purple-500 border-purple-300 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {clip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
