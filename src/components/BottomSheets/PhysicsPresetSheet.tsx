import React, { useState, useEffect, useRef } from 'react';
import {
  GameProject,
  Entity,
  BodyType,
} from '../../types/engine';
import { UnifiedSheetHeader } from '../Common/UnifiedSheetHeader';
import {
  Zap,
  ShieldAlert,
  Snowflake,
  Box,
  User,
  Compass,
  Move,
  Feather,
  Check,
  RotateCcw,
  Sliders,
  Sparkles,
  RefreshCw,
  Target,
  CheckSquare,
  Square,
  Activity,
  Info,
} from 'lucide-react';

export interface PhysicsProfile {
  id: string;
  name: string;
  category: 'character' | 'environment' | 'hazard' | 'mechanics';
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  badge: string;
  accentColor: string; // Tailind color name like emerald, rose, etc.
  description: string;
  rigidbody: {
    bodyType: BodyType;
    mass: number;
    gravityScale: number;
    friction: number;
    restitution: number;
    fixedRotation: boolean;
  };
}

interface PhysicsPresetSheetProps {
  project: GameProject;
  selectedEntityId?: string | null;
  selectedEntityIds?: string[];
  onUpdateEntity: (entity: Entity) => void;
  onUpdateProject?: (project: GameProject) => void;
  onClose: () => void;
}

export const PHYSICS_PRESETS: PhysicsProfile[] = [
  {
    id: 'bouncy_ball',
    name: 'Bouncy / Elastis',
    category: 'mechanics',
    icon: Zap,
    tag: 'high-bounce',
    badge: 'Bounce 90%',
    accentColor: 'emerald',
    description: 'Pantulan tinggi (90%) saat membentur permukaan. Sangat cocok untuk bola, trampolin, item melompat, atau rintangan kenyal.',
    rigidbody: {
      bodyType: 'dynamic',
      mass: 0.8,
      gravityScale: 1.0,
      friction: 0.05,
      restitution: 0.9,
      fixedRotation: false,
    },
  },
  {
    id: 'heavy_rock',
    name: 'Heavy Anvil / Batu Berat',
    category: 'hazard',
    icon: ShieldAlert,
    tag: 'heavy-gravity',
    badge: 'Gravitasi 2.5x',
    accentColor: 'rose',
    description: 'Benda bermassa tinggi yang jatuh sangat cepat (Gravitasi 2.5x) tanpa pantulan. Ideal untuk batu jatuh, jebakan, atau peti besi.',
    rigidbody: {
      bodyType: 'dynamic',
      mass: 5.0,
      gravityScale: 2.5,
      friction: 0.8,
      restitution: 0.05,
      fixedRotation: true,
    },
  },
  {
    id: 'ice_slippery',
    name: 'Ice / Permukaan Licin',
    category: 'environment',
    icon: Snowflake,
    tag: 'zero-friction',
    badge: 'Gesekan 0.01',
    accentColor: 'cyan',
    description: 'Gesekan permukaan hampir nol (0.01). Membuat objek atau karakter meluncur tanpa hambatan gaya gesek di atas lantai es.',
    rigidbody: {
      bodyType: 'dynamic',
      mass: 1.0,
      gravityScale: 1.0,
      friction: 0.01,
      restitution: 0.1,
      fixedRotation: true,
    },
  },
  {
    id: 'static_wall',
    name: 'Static Wall / Pijakan Statis',
    category: 'environment',
    icon: Box,
    tag: 'immovable',
    badge: 'Statis Kokoh',
    accentColor: 'amber',
    description: 'Objek padat statis yang kokoh & tidak bergerak sama sekali. Presets standar untuk tanah, lantai, tembok, dan rintangan diam.',
    rigidbody: {
      bodyType: 'static',
      mass: 0,
      gravityScale: 0,
      friction: 0.5,
      restitution: 0.0,
      fixedRotation: true,
    },
  },
  {
    id: 'platformer_hero',
    name: 'Platformer Hero / Karakter',
    category: 'character',
    icon: User,
    tag: 'character-ready',
    badge: 'Hero Ready',
    accentColor: 'indigo',
    description: 'Pengaturan responsif untuk karakter utama. Rotasi terkunci tegak dan mendarat tegas tanpa pantulan tak diinginkan.',
    rigidbody: {
      bodyType: 'dynamic',
      mass: 1.0,
      gravityScale: 1.2,
      friction: 0.2,
      restitution: 0.0,
      fixedRotation: true,
    },
  },
  {
    id: 'zero_g_float',
    name: 'Zero-G Float / Melayang',
    category: 'mechanics',
    icon: Compass,
    tag: 'zero-gravity',
    badge: 'Gravitasi 0',
    accentColor: 'purple',
    description: 'Melayang bebas tanpa gaya berat. Cocok untuk kapal ruang angkasa, asteroid, proyektil sihir, atau gelembung udara.',
    rigidbody: {
      bodyType: 'dynamic',
      mass: 1.0,
      gravityScale: 0.0,
      friction: 0.05,
      restitution: 0.5,
      fixedRotation: false,
    },
  },
  {
    id: 'kinematic_platform',
    name: 'Kinematic Elevator / Platform',
    category: 'environment',
    icon: Move,
    tag: 'scripted-motion',
    badge: 'Kinematis',
    accentColor: 'blue',
    description: 'Platform bergerak yang digerakkan oleh logika/skrip. Tidak jatuh oleh gravitasi dan dapat menopang karakter di atasnya.',
    rigidbody: {
      bodyType: 'kinematic',
      mass: 1.0,
      gravityScale: 0.0,
      friction: 0.8,
      restitution: 0.0,
      fixedRotation: true,
    },
  },
  {
    id: 'rubber_crate',
    name: 'Rubber Box / Peti Karet',
    category: 'mechanics',
    icon: Feather,
    tag: 'flexible-crate',
    badge: 'Bounce 55%',
    accentColor: 'orange',
    description: 'Kotak dengan bahan kenyal sedang (Pantulan 55%) & gesekan seimbang. Terguling alami jika dikenai dorongan.',
    rigidbody: {
      bodyType: 'dynamic',
      mass: 1.2,
      gravityScale: 1.0,
      friction: 0.4,
      restitution: 0.55,
      fixedRotation: false,
    },
  },
];

export const PhysicsPresetSheet: React.FC<PhysicsPresetSheetProps> = ({
  project,
  selectedEntityId,
  selectedEntityIds = [],
  onUpdateEntity,
  onUpdateProject,
  onClose,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('platformer_hero');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [applyMode, setApplyMode] = useState<'selected' | 'all_dynamic' | 'all'>('selected');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Customized physics state based on chosen preset
  const activeProfile = PHYSICS_PRESETS.find((p) => p.id === selectedPresetId) || PHYSICS_PRESETS[0];
  const [customRigidbody, setCustomRigidbody] = useState(activeProfile.rigidbody);

  // Sync custom settings when preset changes
  useEffect(() => {
    setCustomRigidbody(activeProfile.rigidbody);
  }, [selectedPresetId, activeProfile]);

  // Simulation Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [simRunning, setSimRunning] = useState<boolean>(true);

  // Target calculation
  const effectiveSelectedIds = selectedEntityIds.length > 0
    ? selectedEntityIds
    : selectedEntityId
    ? [selectedEntityId]
    : [];

  const targetEntitiesCount = applyMode === 'selected'
    ? effectiveSelectedIds.length
    : applyMode === 'all_dynamic'
    ? project.entities.filter((e) => e.rigidbody?.bodyType === 'dynamic').length
    : project.entities.length;

  // Live Canvas physics mini simulation
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let posX = canvas.width / 2;
    let posY = 20;
    let velX = customRigidbody.friction < 0.1 ? 3 : 1.5;
    let velY = 0;
    let rot = 0;
    let rotVel = customRigidbody.fixedRotation ? 0 : 0.08;

    const radius = 12;
    const floorY = canvas.height - 20;
    const gravity = customRigidbody.bodyType === 'dynamic' ? customRigidbody.gravityScale * 0.35 : 0;
    const restitution = customRigidbody.restitution;
    const friction = customRigidbody.friction;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw floor
      ctx.fillStyle = customRigidbody.friction < 0.05 ? '#38bdf8' : '#334155';
      ctx.fillRect(0, floorY, canvas.width, 20);

      // Floor line indicator
      ctx.strokeStyle = customRigidbody.friction < 0.05 ? '#0284c7' : '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(canvas.width, floorY);
      ctx.stroke();

      if (customRigidbody.friction < 0.05) {
        ctx.fillStyle = '#bae6fd';
        ctx.font = '9px sans-serif';
        ctx.fillText('❄️ Permukaan Es (Gesekan 0.01)', 10, floorY + 13);
      }

      if (simRunning) {
        // Apply physics
        velY += gravity;
        posX += velX;
        posY += velY;
        rot += rotVel;

        // Bounce floor
        if (posY + radius >= floorY) {
          posY = floorY - radius;
          if (Math.abs(velY) > 0.5) {
            velY = -velY * restitution;
          } else {
            velY = 0;
          }
          velX *= 1 - friction * 0.3;
          rotVel *= 1 - friction * 0.2;
        }

        // Bounce walls
        if (posX - radius <= 0) {
          posX = radius;
          velX = -velX * restitution;
        } else if (posX + radius >= canvas.width) {
          posX = canvas.width - radius;
          velX = -velX * restitution;
        }

        // Reset if static or stopped
        if (customRigidbody.bodyType === 'static') {
          posY = canvas.height / 2;
          posX = canvas.width / 2;
          velX = 0;
          velY = 0;
        }
      }

      // Draw object shape
      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate(rot);

      if (activeProfile.id === 'bouncy_ball' || activeProfile.id === 'zero_g_float') {
        // Circle
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = customRigidbody.bodyType === 'static' ? '#f59e0b' : '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Inner detail dot
        ctx.beginPath();
        ctx.arc(4, -4, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else {
        // Rounded box
        const size = radius * 2;
        ctx.fillStyle = customRigidbody.bodyType === 'static' ? '#f59e0b' : customRigidbody.bodyType === 'kinematic' ? '#3b82f6' : '#6366f1';
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size / 2, -size / 2, size, size);
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [customRigidbody, simRunning, activeProfile]);

  const handleRestartSim = () => {
    setSimRunning(false);
    setTimeout(() => setSimRunning(true), 50);
  };

  const handleApplyPreset = () => {
    let affectedCount = 0;

    if (applyMode === 'selected') {
      if (effectiveSelectedIds.length === 0) {
        setToastMessage('⚠️ Tidak ada entitas terpilih. Silakan pilih entitas terlebih dahulu.');
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      project.entities.forEach((entity) => {
        if (effectiveSelectedIds.includes(entity.id)) {
          const updatedEntity: Entity = {
            ...entity,
            rigidbody: {
              ...(entity.rigidbody || {
                velocityX: 0,
                velocityY: 0,
                isGrounded: false,
              }),
              ...customRigidbody,
            },
          };
          onUpdateEntity(updatedEntity);
          affectedCount++;
        }
      });
    } else if (onUpdateProject) {
      const updatedEntities = project.entities.map((entity) => {
        const shouldApply =
          applyMode === 'all' ||
          (applyMode === 'all_dynamic' && entity.rigidbody?.bodyType === 'dynamic');

        if (shouldApply) {
          affectedCount++;
          return {
            ...entity,
            rigidbody: {
              ...(entity.rigidbody || {
                velocityX: 0,
                velocityY: 0,
                isGrounded: false,
              }),
              ...customRigidbody,
            },
          };
        }
        return entity;
      });

      onUpdateProject({
        ...project,
        entities: updatedEntities,
      });
    }

    setToastMessage(`✅ Berhasil menerapkan preset fisika "${activeProfile.name}" ke ${affectedCount} objek!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredPresets = PHYSICS_PRESETS.filter((p) => {
    if (categoryFilter === 'all') return true;
    return p.category === categoryFilter;
  });

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-slate-900 border-t border-slate-800 shadow-2xl max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-200">
      <UnifiedSheetHeader
        title="Physics Preset Manager"
        subtitle="Terapkan profil fisika (Membal, Berat, Es Licin, Statis) secara cepat"
        icon={Activity}
        iconColor="text-amber-400"
        onClose={onClose}
        badge={
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
            Rigidbody2D Presets
          </span>
        }
      />

      {/* Toast Banner */}
      {toastMessage && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 font-medium flex items-center justify-between shrink-0 animate-in fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-amber-300 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
        {/* Top Split Layout: Preset Selector + Live Simulation */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Simulation Preview & Target Selection Box */}
          <div className="md:col-span-5 bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulasi Fisika Real-Time</span>
              </div>
              <button
                onClick={handleRestartSim}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 transition-all cursor-pointer"
                title="Ulangi Jalannya Simulasi"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Ulangi</span>
              </button>
            </div>

            {/* Interactive Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
              <canvas ref={canvasRef} width={280} height={130} className="w-full h-[130px] block" />
              <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded text-[9.5px] font-mono text-slate-300 border border-slate-700/80">
                Bounce: {(customRigidbody.restitution * 100).toFixed(0)}% | Grav: {customRigidbody.gravityScale}x
              </div>
            </div>

            {/* Target Entities Selector */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 block">Target Pengaplikasian:</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setApplyMode('selected')}
                  className={`px-2 py-1.5 rounded-xl border text-[10.5px] font-bold transition-all cursor-pointer text-center ${
                    applyMode === 'selected'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  Terpilih ({effectiveSelectedIds.length})
                </button>
                <button
                  onClick={() => setApplyMode('all_dynamic')}
                  className={`px-2 py-1.5 rounded-xl border text-[10.5px] font-bold transition-all cursor-pointer text-center ${
                    applyMode === 'all_dynamic'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  Semua Dinamis
                </button>
                <button
                  onClick={() => setApplyMode('all')}
                  className={`px-2 py-1.5 rounded-xl border text-[10.5px] font-bold transition-all cursor-pointer text-center ${
                    applyMode === 'all'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  Semua Objek
                </button>
              </div>
            </div>

            {/* Action Apply Button */}
            <button
              onClick={handleApplyPreset}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Terapkan Preset "{activeProfile.name}" ({targetEntitiesCount} Objek)</span>
            </button>
          </div>

          {/* Preset Customizer Panel */}
          <div className="md:col-span-7 bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kustomisasi Parameter Rigidbody</span>
              </div>
              <button
                onClick={() => setCustomRigidbody(activeProfile.rigidbody)}
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset ke Nilai Preset</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs">
              {/* Body Type */}
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Tipe Rigidbody</label>
                <select
                  value={customRigidbody.bodyType}
                  onChange={(e) =>
                    setCustomRigidbody({ ...customRigidbody, bodyType: e.target.value as BodyType })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-medium"
                >
                  <option value="dynamic">Dynamic (Dinamis)</option>
                  <option value="static">Static (Statis/Kokoh)</option>
                  <option value="kinematic">Kinematic (Kinematis)</option>
                </select>
              </div>

              {/* Gravity Scale */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                  Skala Gravitasi: <span className="text-amber-300 font-mono">{customRigidbody.gravityScale}x</span>
                </label>
                <input
                  type="range"
                  min="-1"
                  max="4"
                  step="0.1"
                  value={customRigidbody.gravityScale}
                  onChange={(e) =>
                    setCustomRigidbody({ ...customRigidbody, gravityScale: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Mass */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                  Massa (Berat): <span className="text-amber-300 font-mono">{customRigidbody.mass} kg</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={customRigidbody.mass}
                  onChange={(e) =>
                    setCustomRigidbody({ ...customRigidbody, mass: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Restitution (Bounciness) */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                  Pantulan (Bounce): <span className="text-emerald-400 font-mono">{(customRigidbody.restitution * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={customRigidbody.restitution}
                  onChange={(e) =>
                    setCustomRigidbody({ ...customRigidbody, restitution: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Friction */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                  Gesekan (Friction): <span className="text-cyan-400 font-mono">{customRigidbody.friction.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={customRigidbody.friction}
                  onChange={(e) =>
                    setCustomRigidbody({ ...customRigidbody, friction: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Fixed Rotation */}
              <div className="flex items-center gap-2 pt-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-medium text-xs">
                  <input
                    type="checkbox"
                    checked={customRigidbody.fixedRotation}
                    onChange={(e) =>
                      setCustomRigidbody({ ...customRigidbody, fixedRotation: e.target.checked })
                    }
                    className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Kunci Rotasi</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-400 mr-1">Filter Profil:</span>
            {[
              { id: 'all', label: 'Semua Preset' },
              { id: 'character', label: '🎮 Karakter' },
              { id: 'environment', label: '🧱 Lingkungan' },
              { id: 'hazard', label: '⚠️ Danger' },
              { id: 'mechanics', label: '⚡ Mekanik' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Physics Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredPresets.map((profile) => {
            const IconComp = profile.icon;
            const isSelected = selectedPresetId === profile.id;

            return (
              <div
                key={profile.id}
                onClick={() => setSelectedPresetId(profile.id)}
                className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/70 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 group-hover:scale-105 transition-transform`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                          {profile.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">{profile.tag}</span>
                      </div>
                    </div>
                    <span className="bg-slate-900 text-amber-300 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-lg border border-slate-800 shrink-0">
                      {profile.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-3 line-clamp-2">
                    {profile.description}
                  </p>
                </div>

                {/* Technical Parameters Pill List */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono">
                    <div>Tipe: <span className="text-white font-semibold">{profile.rigidbody.bodyType}</span></div>
                    <div>Gravitasi: <span className="text-white font-semibold">{profile.rigidbody.gravityScale}x</span></div>
                    <div>Bounce: <span className="text-emerald-400 font-semibold">{(profile.rigidbody.restitution * 100).toFixed(0)}%</span></div>
                    <div>Gesekan: <span className="text-cyan-400 font-semibold">{profile.rigidbody.friction}</span></div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPresetId(profile.id);
                      handleApplyPreset();
                    }}
                    className={`w-full py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-slate-800 text-slate-200 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 border border-slate-700'
                    }`}
                  >
                    <span>{isSelected ? '✓ Terpilih (Terapkan)' : 'Pilih & Terapkan'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
