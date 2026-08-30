import React, { useState } from 'react';
import { Entity, GameProject, Prefab } from '../../types/engine';
import { PrefabManager } from '../../engine/PrefabManager';
import { AndroidEngine } from '../../engine/AndroidEngine';
import {
  Box,
  X,
  Check,
  Layers,
  Sparkles,
  Zap,
  Tag,
  Shield,
  Activity,
  Volume2,
  BookmarkPlus,
} from 'lucide-react';

interface SavePrefabModalProps {
  selectedEntities: Entity[];
  project: GameProject;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
  onSuccess?: (savedPrefab: Prefab) => void;
}

const CATEGORY_OPTIONS: Array<{ id: Prefab['category']; label: string; icon: string }> = [
  { id: 'player', label: 'Player / Hero', icon: '👤' },
  { id: 'item', label: 'Item / Koin', icon: '🪙' },
  { id: 'enemy', label: 'Musuh / Bahaya', icon: '👾' },
  { id: 'platform', label: 'Platform / Dinding', icon: '📦' },
  { id: 'interactive', label: 'Interaktif / Sensor', icon: '🦘' },
  { id: 'ui', label: 'UI / HUD', icon: '🎮' },
  { id: 'custom', label: 'Kustom Module', icon: '⭐' },
];

const PRESET_ICONS = ['👤', '🪙', '👾', '📦', '🦘', '🔥', '🎮', '⭐', '⚡', '🧊', '🚀', '💎'];
const PRESET_COLORS = ['#38bdf8', '#facc15', '#ef4444', '#22c55e', '#a855f7', '#f97316', '#ec4899'];

export const SavePrefabModal: React.FC<SavePrefabModalProps> = ({
  selectedEntities,
  project,
  onUpdateProject,
  onClose,
  onSuccess,
}) => {
  const isMulti = selectedEntities.length > 1;
  const defaultName = isMulti
    ? `Grup Module (${selectedEntities.length} Objek)`
    : selectedEntities[0]?.name || 'Prefab Baru';

  const [name, setName] = useState<string>(defaultName);
  const [category, setCategory] = useState<Prefab['category']>(
    selectedEntities[0]?.type === 'player'
      ? 'player'
      : selectedEntities[0]?.type === 'coin'
      ? 'item'
      : selectedEntities[0]?.type === 'enemy' || selectedEntities[0]?.type === 'hazard'
      ? 'enemy'
      : selectedEntities[0]?.type === 'platform'
      ? 'platform'
      : selectedEntities[0]?.type === 'ui_text'
      ? 'ui'
      : 'custom'
  );
  const [description, setDescription] = useState<string>('');
  const [selectedIcon, setSelectedIcon] = useState<string>(isMulti ? '📦' : '⭐');
  const [selectedColor, setSelectedColor] = useState<string>('#38bdf8');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!selectedEntities || selectedEntities.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 text-xs">
        Pilih setidaknya 1 objek di layar untuk disimpan sebagai Prefab.
      </div>
    );
  }

  // Count features across selected entities
  const hasPhysics = selectedEntities.some((e) => e.rigidbody || e.collider);
  const hasScriptRules = selectedEntities.reduce((acc, e) => acc + (e.script?.rules?.length || 0), 0);
  const hasAudio = selectedEntities.some((e) => e.audioSource);

  const handleSave = () => {
    try {
      AndroidEngine.triggerHaptic(30);

      const newPrefab = PrefabManager.createPrefabFromEntities(
        name,
        category,
        selectedEntities,
        description,
        selectedIcon,
        selectedColor
      );

      const updatedProj = PrefabManager.savePrefab(newPrefab, project);
      if (updatedProj) {
        onUpdateProject(updatedProj);
      }

      setSaveSuccessMsg(` Prefab "${newPrefab.name}" berhasil disimpan ke Library!`);

      if (onSuccess) {
        onSuccess(newPrefab);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      alert('Gagal menyimpan prefab: ' + (err?.message || 'Error'));
    }
  };

  return (
    <div className="flex flex-col h-full text-white bg-slate-900 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <BookmarkPlus className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm text-amber-400">
            Simpan Objek sebagai Prefab Module
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 p-2.5 text-xs text-emerald-300 font-bold flex items-center justify-between">
          <span>{saveSuccessMsg}</span>
          <Check className="w-4 h-4 text-emerald-400" />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Selected Package Overview */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-bold text-[11px]">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Paket Objek Terpilih
            </span>
            <span className="text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
              {selectedEntities.length} Objek
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedEntities.map((ent) => (
              <span
                key={ent.id}
                className="bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1"
              >
                <span>{ent.sprite.presetIcon === 'hero' ? '👤' : ent.sprite.presetIcon === 'coin' ? '🪙' : '📦'}</span>
                <span>{ent.name}</span>
              </span>
            ))}
          </div>

          {/* Component Stats Badges */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-900 text-[10px] text-slate-400">
            {hasPhysics && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Shield className="w-3 h-3" /> Fisika Rigidbody
              </span>
            )}
            {hasScriptRules > 0 && (
              <span className="flex items-center gap-1 text-purple-400">
                <Activity className="w-3 h-3" /> {hasScriptRules} Logika Rules
              </span>
            )}
            {hasAudio && (
              <span className="flex items-center gap-1 text-amber-400">
                <Volume2 className="w-3 h-3" /> Audio SFX
              </span>
            )}
          </div>
        </div>

        {/* Name Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Nama Prefab
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-semibold text-xs focus:border-amber-400 outline-none"
            placeholder="Contoh: Hero Player Utama, Koin Emas Bonus, dll"
          />
        </div>

        {/* Category Selection */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Kategori Module
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  AndroidEngine.triggerHaptic(10);
                }}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  category === cat.id
                    ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{cat.icon}</span>
                <span className="truncate">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Icon & Color Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Pilih Ikon
            </label>
            <div className="grid grid-cols-4 gap-1">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`p-1.5 rounded text-center text-sm cursor-pointer border ${
                    selectedIcon === icon
                      ? 'bg-amber-500/20 border-amber-500'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Warna Aksen
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                    selectedColor === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Description Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Deskripsi Singkat (Opsional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:border-amber-400 outline-none resize-none"
            placeholder="Jelaskan fungsionalitas module ini agar mudah digunakan di scene lain..."
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
        <button
          onClick={onClose}
          className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs cursor-pointer"
        >
          Batal
        </button>

        <button
          onClick={handleSave}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>Simpan ke Library Prefab</span>
        </button>
      </div>
    </div>
  );
};
