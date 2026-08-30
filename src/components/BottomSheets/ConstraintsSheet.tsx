import React, { useState } from 'react';
import { GameProject, PhysicsJoint, PhysicsJointType } from '../../types/engine';
import { UnifiedSheetHeader } from '../Common/UnifiedSheetHeader';
import { AndroidEngine } from '../../engine/AndroidEngine';
import {
  Link2,
  Plus,
  Trash2,
  Settings2,
  Zap,
  Activity,
  Check,
  Circle,
  HelpCircle,
  Sparkles,
  RotateCw,
  Gauge,
  Layers,
} from 'lucide-react';

interface ConstraintsSheetProps {
  project: GameProject;
  selectedEntityId?: string | null;
  selectedEntityIds?: string[];
  onUpdateProject: (project: GameProject) => void;
  onClose: () => void;
}

export const ConstraintsSheet: React.FC<ConstraintsSheetProps> = ({
  project,
  selectedEntityId,
  selectedEntityIds = [],
  onUpdateProject,
  onClose,
}) => {
  const constraints = project.constraints || project.joints || [];

  // Form State for creating a new joint
  const [entityAId, setEntityAId] = useState<string>(
    selectedEntityIds[0] || selectedEntityId || (project.entities[0]?.id || '')
  );
  const [entityBId, setEntityBId] = useState<string>(
    selectedEntityIds[1] || (project.entities.find((e) => e.id !== entityAId)?.id || '')
  );
  const [jointType, setJointType] = useState<PhysicsJointType>('distance');
  const [jointName, setJointName] = useState<string>('Sendi Mekanis');
  const [targetDistance, setTargetDistance] = useState<number>(100);
  const [stiffness, setStiffness] = useState<number>(100);
  const [enableMotor, setEnableMotor] = useState<boolean>(false);
  const [motorSpeed, setMotorSpeed] = useState<number>(180);
  const [enableLimits, setEnableLimits] = useState<boolean>(false);
  const [minAngle, setMinAngle] = useState<number>(-90);
  const [maxAngle, setMaxAngle] = useState<number>(90);

  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'presets'>('manage');

  const handleAddJoint = () => {
    if (!entityAId || !entityBId || entityAId === entityBId) {
      alert('Pilih dua entitas yang berbeda untuk membuat sambungan sendi!');
      return;
    }

    const entA = project.entities.find((e) => e.id === entityAId);
    const entB = project.entities.find((e) => e.id === entityBId);
    if (!entA || !entB) return;

    // Calculate default distance from center positions
    const pAx = entA.transform.x + entA.transform.width / 2;
    const pAy = entA.transform.y + entA.transform.height / 2;
    const pBx = entB.transform.x + entB.transform.width / 2;
    const pBy = entB.transform.y + entB.transform.height / 2;
    const calculatedDist = Math.round(Math.hypot(pBx - pAx, pBy - pAy)) || 100;

    const newJoint: PhysicsJoint = {
      id: `joint_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: jointName || `Sendi ${jointType.toUpperCase()}`,
      type: jointType,
      entityAId,
      entityBId,
      distance: targetDistance > 0 ? targetDistance : calculatedDist,
      stiffness,
      enableMotor,
      motorSpeed,
      enableLimits,
      minAngle,
      maxAngle,
      enabled: true,
      color: jointType === 'distance' ? '#06b6d4' : jointType === 'hinge' ? '#f59e0b' : '#a855f7',
    };

    // Ensure entities have proper rigidbody configurations for mechanical linking
    const updatedEntities = project.entities.map((e) => {
      if (e.id === entityAId || e.id === entityBId) {
        const isDynamic = e.rigidbody?.bodyType === 'dynamic' || e.id === entityBId; // Ensure secondary linked entity can move freely
        return {
          ...e,
          rigidbody: {
            bodyType: e.rigidbody?.bodyType || (isDynamic ? 'dynamic' : 'static'),
            mass: e.rigidbody?.mass || 1.0,
            gravityScale: e.rigidbody?.gravityScale !== undefined ? e.rigidbody.gravityScale : 1.0,
            velocityX: e.rigidbody?.velocityX || 0,
            velocityY: e.rigidbody?.velocityY || 0,
            friction: e.rigidbody?.friction !== undefined ? e.rigidbody.friction : 0.2,
            restitution: e.rigidbody?.restitution !== undefined ? e.rigidbody.restitution : 0.1,
            isGrounded: false,
            fixedRotation: jointType === 'hinge' ? false : (e.rigidbody?.fixedRotation ?? true),
          },
          collider: e.collider || {
            enabled: true,
            type: 'box',
            offsetX: 0,
            offsetY: 0,
            width: e.transform.width,
            height: e.transform.height,
            isTrigger: false,
          },
        };
      }
      return e;
    });

    const updatedConstraints = [...constraints, newJoint];
    onUpdateProject({
      ...project,
      entities: updatedEntities,
      constraints: updatedConstraints,
      joints: updatedConstraints,
    });

    AndroidEngine.triggerHaptic(30);
    setActiveTab('manage');
  };

  const handleToggleJoint = (id: string) => {
    const updated = constraints.map((j) => (j.id === id ? { ...j, enabled: !j.enabled } : j));
    onUpdateProject({ ...project, constraints: updated, joints: updated });
    AndroidEngine.triggerHaptic(15);
  };

  const handleDeleteJoint = (id: string) => {
    const updated = constraints.filter((j) => j.id !== id);
    onUpdateProject({ ...project, constraints: updated, joints: updated });
    AndroidEngine.triggerHaptic(25);
  };

  const handleClearAllJoints = () => {
    if (confirm('Hapus semua sambungan sendi fisika pada proyek ini?')) {
      onUpdateProject({ ...project, constraints: [], joints: [] });
      AndroidEngine.triggerHaptic(40);
    }
  };

  // Quick Preset Handlers
  const handleApplyPreset = (presetType: 'pendulum' | 'motor_wheel' | 'bridge') => {
    if (project.entities.length < 2) {
      alert('Dibutuhkan minimal 2 objek di canvas untuk menerapkan preset sendi!');
      return;
    }

    const eA = project.entities[0];
    const eB = project.entities[1];

    if (presetType === 'pendulum') {
      const joint: PhysicsJoint = {
        id: `joint_pendulum_${Date.now()}`,
        name: `Pendulum (${eA.name} ↔ ${eB.name})`,
        type: 'distance',
        entityAId: eA.id,
        entityBId: eB.id,
        distance: 120,
        stiffness: 100,
        enabled: true,
        color: '#06b6d4',
      };
      onUpdateProject({
        ...project,
        constraints: [...constraints, joint],
        joints: [...constraints, joint],
      });
    } else if (presetType === 'motor_wheel') {
      const joint: PhysicsJoint = {
        id: `joint_wheel_${Date.now()}`,
        name: `Roda Motor (${eA.name} ↔ ${eB.name})`,
        type: 'hinge',
        entityAId: eA.id,
        entityBId: eB.id,
        enableMotor: true,
        motorSpeed: 240,
        enabled: true,
        color: '#f59e0b',
      };
      onUpdateProject({
        ...project,
        constraints: [...constraints, joint],
        joints: [...constraints, joint],
      });
    } else if (presetType === 'bridge') {
      const joint: PhysicsJoint = {
        id: `joint_bridge_${Date.now()}`,
        name: `Sendi Elastis (${eA.name} ↔ ${eB.name})`,
        type: 'spring',
        entityAId: eA.id,
        entityBId: eB.id,
        distance: 90,
        stiffness: 60,
        enabled: true,
        color: '#10b981',
      };
      onUpdateProject({
        ...project,
        constraints: [...constraints, joint],
        joints: [...constraints, joint],
      });
    }
    AndroidEngine.triggerHaptic(30);
    setActiveTab('manage');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white select-none">
      <UnifiedSheetHeader
        title="Sendi & Constraints Fisika"
        subtitle="Buat sambungan Distance, Hinge, atau Spring antara dua objek"
        icon={<Link2 className="w-5 h-5 text-cyan-400" />}
        onClose={onClose}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 bg-slate-950/80 border-b border-slate-800 shrink-0">
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'manage'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Kelola ({constraints.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'create'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat Baru</span>
        </button>

        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'presets'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Preset Mekanis</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: MANAGE CONSTRAINTS */}
        {activeTab === 'manage' && (
          <div className="space-y-3">
            {constraints.length === 0 ? (
              <div className="p-6 bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Link2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Belum Ada Sendi Fisika</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Hubungkan dua objek untuk membuat sistem mekanis seperti ayunan, roda berputar, tali, atau engsel.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Tambah Sendi Sekarang</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">
                    Daftar Sendi Terpasang
                  </span>
                  <button
                    onClick={handleClearAllJoints}
                    className="text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Semua</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {constraints.map((joint) => {
                    const entA = project.entities.find((e) => e.id === joint.entityAId);
                    const entB = project.entities.find((e) => e.id === joint.entityBId);

                    return (
                      <div
                        key={joint.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          joint.enabled !== false
                            ? 'bg-slate-800/80 border-slate-700 hover:border-cyan-500/50'
                            : 'bg-slate-900/60 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => handleToggleJoint(joint.id)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                              joint.enabled !== false
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                            }`}
                            title={joint.enabled !== false ? 'Matikan Sendi' : 'Aktifkan Sendi'}
                          >
                            <Link2 className="w-4 h-4" />
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white truncate">{joint.name}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-black bg-cyan-950 text-cyan-300 border border-cyan-800">
                                {joint.type}
                              </span>
                            </div>
                            <div className="text-[10.5px] font-mono text-slate-400 truncate mt-0.5">
                              {entA ? entA.name : 'Objek A'} ↔ {entB ? entB.name : 'Objek B'}
                              {joint.distance !== undefined && ` • ${joint.distance}px`}
                              {joint.enableMotor && ` • Motor: ${joint.motorSpeed}°/s`}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteJoint(joint.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer shrink-0"
                          title="Hapus Sendi Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: CREATE JOINT */}
        {activeTab === 'create' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300 font-bold">Nama Sendi</label>
              <input
                type="text"
                value={jointName}
                onChange={(e) => setJointName(e.target.value)}
                placeholder="Contoh: Sendi Roda, Engsel Pintu, Ayunan"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            {/* Select Entities */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-mono text-cyan-300 font-bold flex items-center gap-1">
                  <span>Objek A (Anchor)</span>
                </label>
                <select
                  value={entityAId}
                  onChange={(e) => setEntityAId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 outline-none"
                >
                  <option value="" disabled>
                    -- Pilih Objek A --
                  </option>
                  {project.entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-cyan-300 font-bold flex items-center gap-1">
                  <span>Objek B (Target)</span>
                </label>
                <select
                  value={entityBId}
                  onChange={(e) => setEntityBId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-cyan-500 outline-none"
                >
                  <option value="" disabled>
                    -- Pilih Objek B --
                  </option>
                  {project.entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Joint Type Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-bold">Tipe Sambungan Sendi</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setJointType('distance')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    jointType === 'distance'
                      ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Link2 className="w-4 h-4 text-cyan-400" />
                    <span>Distance Joint</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Menjaga jarak tetap konstan antara dua objek (seperti batang besi).
                  </p>
                </button>

                <button
                  onClick={() => setJointType('hinge')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    jointType === 'hinge'
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <RotateCw className="w-4 h-4 text-amber-400" />
                    <span>Hinge / Engsel</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Poros putar seperti engsel pintu atau Roda kendaraan berputar.
                  </p>
                </button>

                <button
                  onClick={() => setJointType('spring')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    jointType === 'spring'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Spring / Pegas</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Sambungan membal elastis dengan kekakuan (stiffness) dapat disetel.
                  </p>
                </button>

                <button
                  onClick={() => setJointType('rope')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    jointType === 'rope'
                      ? 'bg-purple-500/20 border-purple-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span>Rope / Tali</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Membatasi jarak maksimum (bebas mendekat, hanya menarik saat tegang).
                  </p>
                </button>
              </div>
            </div>

            {/* Config options based on joint type */}
            {(jointType === 'distance' || jointType === 'spring' || jointType === 'rope') && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-slate-300">Jarak Target (Distance)</span>
                    <span className="font-mono text-cyan-400 font-bold">{targetDistance} px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    value={targetDistance}
                    onChange={(e) => setTargetDistance(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {jointType === 'spring' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-slate-300">Kekakuan Pegas (Stiffness)</span>
                      <span className="font-mono text-emerald-400 font-bold">{stiffness}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      value={stiffness}
                      onChange={(e) => setStiffness(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            {jointType === 'hinge' && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                {/* Motor Controls */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Motor Putar Pasif (Motor Speed)</div>
                    <div className="text-[10px] text-slate-400">Roda berputar otomatis dengan torsi</div>
                  </div>
                  <button
                    onClick={() => setEnableMotor(!enableMotor)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      enableMotor ? 'bg-amber-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        enableMotor ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {enableMotor && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-slate-300">Kecepatan Putar (Deg/s)</span>
                      <span className="font-mono text-amber-400 font-bold">{motorSpeed}°/s</span>
                    </div>
                    <input
                      type="range"
                      min="-720"
                      max="720"
                      step="10"
                      value={motorSpeed}
                      onChange={(e) => setMotorSpeed(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleAddJoint}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Buat Sambungan Sendi Sekarang</span>
            </button>
          </div>
        )}

        {/* TAB 3: PRESETS */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">
              Preset Sistem Mekanis Instant
            </span>

            <div className="space-y-2">
              <button
                onClick={() => handleApplyPreset('pendulum')}
                className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      Ayunan Pendulum / Beban Gantung
                    </h5>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      Menghubungkan 2 objek pertama dengan Distance Joint kaku.
                    </p>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              </button>

              <button
                onClick={() => handleApplyPreset('motor_wheel')}
                className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                    <RotateCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      Roda Motor Berputar (Hinge Motor)
                    </h5>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      Pusat Roda terhubung ke Bodi dengan Engsel Berputar 240°/s.
                    </p>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              </button>

              <button
                onClick={() => handleApplyPreset('bridge')}
                className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Jembatan Gantung / Pegas Elastis
                    </h5>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      Pegas elastis fleksibel antara 2 papan kayu atau objek.
                    </p>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
