import React, { useState, useEffect } from 'react';
import { GameProject, Entity, BodyType } from '../../types/engine';
import { UnifiedSheetHeader } from '../Common/UnifiedSheetHeader';
import { soundEngine } from '../../engine/AudioEngine';
import {
  Sliders,
  Zap,
  Activity,
  CheckSquare,
  Square,
  Check,
  RefreshCw,
  Sparkles,
  Layers,
  Box,
  SlidersHorizontal,
  Flame,
  Shield,
  Snowflake,
  MoveDown,
  CircleDot,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface BatchPropertySheetProps {
  project: GameProject;
  selectedEntityId?: string | null;
  selectedEntityIds?: string[];
  onSelectEntity?: (id: string | null, isMultiToggle?: boolean) => void;
  onUpdateEntity?: (entity: Entity) => void;
  onUpdateProject: (project: GameProject) => void;
  onClose: () => void;
}

export const BatchPropertySheet: React.FC<BatchPropertySheetProps> = ({
  project,
  selectedEntityId,
  selectedEntityIds = [],
  onUpdateProject,
  onClose,
}) => {
  // Target Entities State
  const [targetEntityIds, setTargetEntityIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (selectedEntityIds && selectedEntityIds.length > 0) {
      selectedEntityIds.forEach((id) => initial.add(id));
    } else if (selectedEntityId) {
      initial.add(selectedEntityId);
    } else {
      // Default to all entities in project if none selected
      project.entities.forEach((e) => initial.add(e.id));
    }
    return initial;
  });

  // Filter tab for entity list
  const [entityFilter, setEntityFilter] = useState<'all' | 'rigidbody' | 'dynamic' | 'static'>('all');

  // Property Update Toggles
  const [enableFriction, setEnableFriction] = useState<boolean>(true);
  const [frictionValue, setFrictionValue] = useState<number>(0.5);

  const [enableGravityScale, setEnableGravityScale] = useState<boolean>(true);
  const [gravityScaleValue, setGravityScaleValue] = useState<number>(1.0);

  const [enableBounce, setEnableBounce] = useState<boolean>(true);
  const [bounceValue, setBounceValue] = useState<number>(0.5);

  const [enableBodyType, setEnableBodyType] = useState<boolean>(false);
  const [bodyTypeValue, setBodyTypeValue] = useState<BodyType>('dynamic');

  const [enableMass, setEnableMass] = useState<boolean>(false);
  const [massValue, setMassValue] = useState<number>(1.0);

  const [enableFixedRotation, setEnableFixedRotation] = useState<boolean>(false);
  const [fixedRotationValue, setFixedRotationValue] = useState<boolean>(true);

  // Status & Feedback
  const [logMessage, setLogMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setLogMessage(msg);
    setTimeout(() => setLogMessage(null), 3000);
  };

  // Filtered entities list
  const filteredEntities = project.entities.filter((entity) => {
    if (entityFilter === 'rigidbody') return !!entity.rigidbody;
    if (entityFilter === 'dynamic') return entity.rigidbody?.bodyType === 'dynamic';
    if (entityFilter === 'static') return entity.rigidbody?.bodyType === 'static';
    return true;
  });

  // Entity Selection Handlers
  const toggleEntity = (id: string) => {
    setTargetEntityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = (select: boolean) => {
    setTargetEntityIds((prev) => {
      const next = new Set(prev);
      filteredEntities.forEach((e) => {
        if (select) {
          next.add(e.id);
        } else {
          next.delete(e.id);
        }
      });
      return next;
    });
  };

  const handleSelectOnlyRigidbodies = () => {
    const next = new Set<string>();
    project.entities.forEach((e) => {
      if (e.rigidbody) next.add(e.id);
    });
    setTargetEntityIds(next);
  };

  // Quick Preset Handlers
  const applyPreset = (
    presetName: string,
    f: number,
    g: number,
    b: number,
    bodyType?: BodyType,
    m?: number
  ) => {
    setEnableFriction(true);
    setFrictionValue(f);

    setEnableGravityScale(true);
    setGravityScaleValue(g);

    setEnableBounce(true);
    setBounceValue(b);

    if (bodyType !== undefined) {
      setEnableBodyType(true);
      setBodyTypeValue(bodyType);
    }
    if (m !== undefined) {
      setEnableMass(true);
      setMassValue(m);
    }

    soundEngine.playSfx('coin');
    showToast(`Preset '${presetName}' diterapkan ke panel kontrol!`);
  };

  // Execute Batch Property Update
  const handleApplyBatchUpdate = () => {
    if (targetEntityIds.size === 0) {
      showToast('Pilih minimal 1 entitas untuk di-update!');
      return;
    }

    if (
      !enableFriction &&
      !enableGravityScale &&
      !enableBounce &&
      !enableBodyType &&
      !enableMass &&
      !enableFixedRotation
    ) {
      showToast('Aktifkan minimal 1 properti untuk di-update!');
      return;
    }

    let updatedCount = 0;
    const updatedEntities = project.entities.map((entity) => {
      if (!targetEntityIds.has(entity.id)) return entity;

      updatedCount++;

      // Ensure rigidbody component exists
      const existingRb = entity.rigidbody || {
        bodyType: 'dynamic' as BodyType,
        mass: 1.0,
        gravityScale: 1.0,
        velocityX: 0,
        velocityY: 0,
        friction: 0.5,
        restitution: 0.5,
        isGrounded: false,
        fixedRotation: false,
      };

      const updatedRb = {
        ...existingRb,
        ...(enableFriction && { friction: frictionValue }),
        ...(enableGravityScale && { gravityScale: gravityScaleValue }),
        ...(enableBounce && { restitution: bounceValue }),
        ...(enableBodyType && { bodyType: bodyTypeValue }),
        ...(enableMass && { mass: massValue }),
        ...(enableFixedRotation && { fixedRotation: fixedRotationValue }),
      };

      return {
        ...entity,
        rigidbody: updatedRb,
      };
    });

    onUpdateProject({
      ...project,
      entities: updatedEntities,
    });

    soundEngine.playSfx('powerup');

    const updatedPropsList: string[] = [];
    if (enableFriction) updatedPropsList.push(`Gesekan: ${frictionValue}`);
    if (enableGravityScale) updatedPropsList.push(`Gravitasi: ${gravityScaleValue}x`);
    if (enableBounce) updatedPropsList.push(`Pantulan: ${bounceValue * 100}%`);

    showToast(
      `🎉 Berhasil meng-update ${updatedCount} entitas! (${updatedPropsList.join(' • ')})`
    );

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Sheet Header */}
      <UnifiedSheetHeader
        title="Batch Property Editor ⚡"
        subtitle="Update massal properti fisika (Gesekan, Gravitasi, Pantulan) pada semua entitas terpilih sekaligus"
        icon={SlidersHorizontal}
        iconColor="text-amber-400"
        onClose={onClose}
        badge={
          <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-mono font-bold">
            {targetEntityIds.size} / {project.entities.length} Terpilih
          </span>
        }
      />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 flex-1 overflow-hidden text-xs">
        {/* Left Column: Property Modifiers & Presets (7 Cols) */}
        <div className="md:col-span-7 flex flex-col space-y-3 overflow-y-auto pr-1">
          {/* Quick Presets Bar */}
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Preset Cepat Properti Fisika
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10.5px]">
              <button
                onClick={() => applyPreset('Bouncy Rubber', 0.4, 1.0, 0.85, 'dynamic')}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-semibold transition-all flex items-center gap-1.5 cursor-pointer text-left"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold">🏀 Bola Elastis</div>
                  <div className="text-[9px] text-slate-400">Bounce 85% • Gravity 1x</div>
                </div>
              </button>

              <button
                onClick={() => applyPreset('Licin Es', 0.0, 1.0, 0.1, 'dynamic')}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-semibold transition-all flex items-center gap-1.5 cursor-pointer text-left"
              >
                <Snowflake className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-bold">🧊 Permukaan Es</div>
                  <div className="text-[9px] text-slate-400">Friction 0.0 • Low Bounce</div>
                </div>
              </button>

              <button
                onClick={() => applyPreset('Batu Berat', 0.8, 2.5, 0.05, 'dynamic', 5.0)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-500/30 text-rose-300 font-semibold transition-all flex items-center gap-1.5 cursor-pointer text-left"
              >
                <MoveDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <div>
                  <div className="font-bold">🪨 Batu Berat</div>
                  <div className="text-[9px] text-slate-400">Gravity 2.5x • Heavy Mass</div>
                </div>
              </button>

              <button
                onClick={() => applyPreset('Zero-G Floating', 0.1, 0.0, 0.6, 'dynamic')}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-purple-500/30 text-purple-300 font-semibold transition-all flex items-center gap-1.5 cursor-pointer text-left"
              >
                <CircleDot className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div>
                  <div className="font-bold">🚀 Tanpa Gravitasi</div>
                  <div className="text-[9px] text-slate-400">Gravity 0x • Floating</div>
                </div>
              </button>

              <button
                onClick={() => applyPreset('Sticky Wall', 1.5, 0.0, 0.0, 'static')}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 font-semibold transition-all flex items-center gap-1.5 cursor-pointer text-left"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">🧱 Dinding Lengket</div>
                  <div className="text-[9px] text-slate-400">Static • Friction 1.5</div>
                </div>
              </button>

              <button
                onClick={() => applyPreset('Anti-Gravitasi', 0.2, -1.0, 0.4, 'dynamic')}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-orange-500/30 text-orange-300 font-semibold transition-all flex items-center gap-1.5 cursor-pointer text-left"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <div>
                  <div className="font-bold">🎈 Balon / Terbang</div>
                  <div className="text-[9px] text-slate-400">Gravity -1.0x (Ascend)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Interactive Sliders for Core Physics Properties */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            {/* 1. Friction (Gesekan) Slider */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              enableFriction
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-slate-900/40 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
                  <input
                    type="checkbox"
                    checked={enableFriction}
                    onChange={(e) => setEnableFriction(e.target.checked)}
                    className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                  />
                  <span>🛷 Friction (Gesekan Permukaan)</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-amber-300 font-extrabold text-sm bg-slate-900 px-2 py-0.5 rounded border border-amber-500/30">
                    {frictionValue.toFixed(2)}
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={2.0}
                step={0.05}
                disabled={!enableFriction}
                value={frictionValue}
                onChange={(e) => setFrictionValue(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              {/* Preset buttons for Friction */}
              <div className="flex items-center gap-1 mt-1.5 text-[9.5px]">
                <span className="text-slate-400 mr-1">Quick:</span>
                {[
                  { label: 'Es (0.0)', val: 0.0 },
                  { label: 'Halus (0.1)', val: 0.1 },
                  { label: 'Normal (0.5)', val: 0.5 },
                  { label: 'Kasar (0.8)', val: 0.8 },
                  { label: 'Sangat Kesat (1.5)', val: 1.5 },
                ].map((item) => (
                  <button
                    key={item.label}
                    disabled={!enableFriction}
                    onClick={() => setFrictionValue(item.val)}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer disabled:opacity-40"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Gravity Scale Slider */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              enableGravityScale
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-slate-900/40 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
                  <input
                    type="checkbox"
                    checked={enableGravityScale}
                    onChange={(e) => setEnableGravityScale(e.target.checked)}
                    className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                  />
                  <span>🌍 Gravity Scale (Pengali Skala Gravitasi)</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-amber-300 font-extrabold text-sm bg-slate-900 px-2 py-0.5 rounded border border-amber-500/30">
                    {gravityScaleValue.toFixed(1)}x
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={-2.0}
                max={5.0}
                step={0.1}
                disabled={!enableGravityScale}
                value={gravityScaleValue}
                onChange={(e) => setGravityScaleValue(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              {/* Preset buttons for Gravity Scale */}
              <div className="flex items-center gap-1 mt-1.5 text-[9.5px]">
                <span className="text-slate-400 mr-1">Quick:</span>
                {[
                  { label: 'Anti-G (-1.0)', val: -1.0 },
                  { label: 'Melayang (0.0)', val: 0.0 },
                  { label: 'Ringan (0.3)', val: 0.3 },
                  { label: 'Normal (1.0)', val: 1.0 },
                  { label: 'Berat (2.5)', val: 2.5 },
                ].map((item) => (
                  <button
                    key={item.label}
                    disabled={!enableGravityScale}
                    onClick={() => setGravityScaleValue(item.val)}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer disabled:opacity-40"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Bounce / Restitution Slider */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              enableBounce
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-slate-900/40 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
                  <input
                    type="checkbox"
                    checked={enableBounce}
                    onChange={(e) => setEnableBounce(e.target.checked)}
                    className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                  />
                  <span>🏀 Bounce / Restitution (Tingkat Pantulan Elastic)</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-amber-300 font-extrabold text-sm bg-slate-900 px-2 py-0.5 rounded border border-amber-500/30">
                    {Math.round(bounceValue * 100)}%
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={1.0}
                step={0.05}
                disabled={!enableBounce}
                value={bounceValue}
                onChange={(e) => setBounceValue(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              {/* Preset buttons for Bounce */}
              <div className="flex items-center gap-1 mt-1.5 text-[9.5px]">
                <span className="text-slate-400 mr-1">Quick:</span>
                {[
                  { label: 'Tanpa Pantulan (0%)', val: 0.0 },
                  { label: 'Kayu (20%)', val: 0.2 },
                  { label: 'Karet (50%)', val: 0.5 },
                  { label: 'Super Bounce (85%)', val: 0.85 },
                  { label: '100% Elastic', val: 1.0 },
                ].map((item) => (
                  <button
                    key={item.label}
                    disabled={!enableBounce}
                    onClick={() => setBounceValue(item.val)}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer disabled:opacity-40"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Optional Physics Settings (Body Type, Mass, Fixed Rotation) */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {/* Body Type */}
              <div className={`p-2 rounded-lg border ${
                enableBodyType ? 'bg-slate-900 border-amber-500/40' : 'bg-slate-900/30 border-slate-800 opacity-60'
              }`}>
                <label className="flex items-center gap-2 cursor-pointer font-bold mb-1">
                  <input
                    type="checkbox"
                    checked={enableBodyType}
                    onChange={(e) => setEnableBodyType(e.target.checked)}
                    className="accent-amber-500 rounded cursor-pointer"
                  />
                  <span>Tipe Bodi Fisika</span>
                </label>
                <select
                  disabled={!enableBodyType}
                  value={bodyTypeValue}
                  onChange={(e) => setBodyTypeValue(e.target.value as BodyType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-amber-300 font-bold focus:outline-none"
                >
                  <option value="dynamic">Dynamic (Aktif Bergerak)</option>
                  <option value="static">Static (Diam/Platform)</option>
                  <option value="kinematic">Kinematic (Terkontrol Kode)</option>
                </select>
              </div>

              {/* Mass */}
              <div className={`p-2 rounded-lg border ${
                enableMass ? 'bg-slate-900 border-amber-500/40' : 'bg-slate-900/30 border-slate-800 opacity-60'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={enableMass}
                      onChange={(e) => setEnableMass(e.target.checked)}
                      className="accent-amber-500 rounded cursor-pointer"
                    />
                    <span>Massa Benda (Kg)</span>
                  </label>
                  <span className="font-mono text-amber-300 font-bold">{massValue} kg</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={20.0}
                  step={0.1}
                  disabled={!enableMass}
                  value={massValue}
                  onChange={(e) => setMassValue(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Entity Target Selector & Execute Button (5 Cols) */}
        <div className="md:col-span-5 flex flex-col space-y-2.5 overflow-hidden">
          {/* Target Entities Selection Panel */}
          <div className="flex-1 bg-slate-950/90 rounded-xl border border-slate-800 p-2.5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
              <span className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Target Entitas Terpilih
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold">
                {targetEntityIds.size} / {project.entities.length}
              </span>
            </div>

            {/* Quick Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 my-2 shrink-0 text-[10px]">
              <button
                onClick={() => setEntityFilter('all')}
                className={`py-1 rounded font-bold transition-all cursor-pointer ${
                  entityFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua ({project.entities.length})
              </button>
              <button
                onClick={() => setEntityFilter('rigidbody')}
                className={`py-1 rounded font-bold transition-all cursor-pointer ${
                  entityFilter === 'rigidbody'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rigidbody ({project.entities.filter((e) => e.rigidbody).length})
              </button>
              <button
                onClick={() => setEntityFilter('dynamic')}
                className={`py-1 rounded font-bold transition-all cursor-pointer ${
                  entityFilter === 'dynamic'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dynamic
              </button>
              <button
                onClick={() => setEntityFilter('static')}
                className={`py-1 rounded font-bold transition-all cursor-pointer ${
                  entityFilter === 'static'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Static
              </button>
            </div>

            {/* Select All / Deselect Toolbar */}
            <div className="flex items-center justify-between text-[10px] pb-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectAllFiltered(true)}
                  className="text-amber-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
                >
                  <CheckSquare className="w-3 h-3" /> Pilih Semua
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => handleSelectAllFiltered(false)}
                  className="text-slate-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
                >
                  <Square className="w-3 h-3" /> Batal Semua
                </button>
              </div>

              <button
                onClick={handleSelectOnlyRigidbodies}
                className="text-cyan-400 hover:underline font-bold cursor-pointer"
              >
                Khusus Rigidbody
              </button>
            </div>

            {/* Scrollable Entity Checkbox List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredEntities.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-[11px]">
                  Tidak ada entitas dalam kategori filter ini.
                </div>
              ) : (
                filteredEntities.map((entity) => {
                  const isChecked = targetEntityIds.has(entity.id);
                  return (
                    <div
                      key={entity.id}
                      onClick={() => toggleEntity(entity.id)}
                      className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isChecked
                              ? 'bg-amber-500 border-amber-400 text-slate-950'
                              : 'bg-slate-800 border-slate-700'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold block truncate text-[11px] text-white">
                            {entity.name}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            Type: {entity.type} • {entity.rigidbody ? entity.rigidbody.bodyType : 'No Rigidbody'}
                          </span>
                        </div>
                      </div>

                      {/* Current Physics Badge */}
                      {entity.rigidbody && (
                        <div className="text-[9px] font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 text-right shrink-0">
                          F:{entity.rigidbody.friction.toFixed(1)} G:{entity.rigidbody.gravityScale.toFixed(1)}x B:{Math.round(entity.rigidbody.restitution * 100)}%
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Execute Batch Update Button */}
          <button
            onClick={handleApplyBatchUpdate}
            disabled={targetEntityIds.size === 0}
            className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-amber-500/25 cursor-pointer flex items-center justify-center gap-2 text-xs shrink-0 active:scale-[0.99]"
          >
            <Sliders className="w-4 h-4 stroke-[2.5]" />
            <span>Terapkan Batch Update ke {targetEntityIds.size} Entitas</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {logMessage && (
        <div className="absolute bottom-4 right-4 bg-amber-500 text-slate-950 px-3.5 py-2 rounded-xl font-bold text-xs shadow-2xl animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 z-50">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{logMessage}</span>
        </div>
      )}
    </div>
  );
};
