import React, { useState, useRef } from 'react';
import { GameProject, Prefab, Entity } from '../../types/engine';
import { PrefabManager } from '../../engine/PrefabManager';
import { AndroidEngine } from '../../engine/AndroidEngine';
import {
  Box,
  X,
  Search,
  Plus,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Zap,
  BookmarkPlus,
  Shield,
  Activity,
  Volume2,
  Check,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface PrefabLibrarySheetProps {
  project: GameProject;
  onUpdateProject: (updatedProject: GameProject) => void;
  onSelectEntity?: (entityId: string) => void;
  onOpenSavePrefab?: () => void;
  onClose: () => void;
}

type CategoryFilter = 'all' | 'user' | 'player' | 'item' | 'enemy' | 'platform' | 'interactive' | 'ui' | 'custom';

export const PrefabLibrarySheet: React.FC<PrefabLibrarySheetProps> = ({
  project,
  onUpdateProject,
  onSelectEntity,
  onOpenSavePrefab,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all prefabs
  const allPrefabs = PrefabManager.getAllPrefabs(project);

  // Filter prefabs based on search & category
  const filteredPrefabs = allPrefabs.filter((p) => {
    const matchesCategory =
      activeCategory === 'all'
        ? true
        : activeCategory === 'user'
        ? !p.isBuiltin
        : p.category === activeCategory;

    const matchesSearch =
      searchQuery.trim() === ''
        ? true
        : p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Instantiate / Spawn Prefab onto Scene
  const handleInstantiate = (prefab: Prefab) => {
    try {
      AndroidEngine.triggerHaptic(25);

      // Position center of viewport or offset slightly
      const spawnX = project.world.viewportWidth ? project.world.viewportWidth / 2 : 200;
      const spawnY = project.world.viewportHeight ? project.world.viewportHeight / 2 : 300;

      const newEntities = PrefabManager.instantiatePrefab(prefab, { x: spawnX, y: spawnY });

      const updatedEntities = [...project.entities, ...newEntities];

      onUpdateProject({
        ...project,
        entities: updatedEntities,
      });

      // Select newly spawned primary entity
      if (onSelectEntity && newEntities.length > 0) {
        onSelectEntity(newEntities[0].id);
      }

      setFeedbackMsg(`⚡ Module "${prefab.name}" dipasang ke scene (${newEntities.length} objek baru)!`);

      setTimeout(() => {
        setFeedbackMsg(null);
      }, 2500);
    } catch (err: any) {
      alert('Gagal memasang prefab: ' + (err?.message || 'Error'));
    }
  };

  // Delete User Prefab
  const handleDeletePrefab = (e: React.MouseEvent, prefabId: string) => {
    e.stopPropagation();
    if (confirm('Hapus module prefab ini dari library?')) {
      AndroidEngine.triggerHaptic(20);
      const updatedProj = PrefabManager.deletePrefab(prefabId, project);
      if (updatedProj) {
        onUpdateProject(updatedProj);
      }
      setFeedbackMsg(' Prefab berhasil dihapus');
      setTimeout(() => setFeedbackMsg(null), 2000);
    }
  };

  // Export Prefab to JSON download
  const handleExportPrefab = (e: React.MouseEvent, prefab: Prefab) => {
    e.stopPropagation();
    try {
      const jsonStr = PrefabManager.exportPrefabToJSON(prefab);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prefab_${prefab.name.toLowerCase().replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      AndroidEngine.triggerHaptic(15);
    } catch (err: any) {
      alert('Gagal mengeksport prefab: ' + err?.message);
    }
  };

  // Import Prefab from JSON file upload
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = PrefabManager.importPrefabFromJSON(content);
        const updatedProj = PrefabManager.savePrefab(imported, project);
        if (updatedProj) {
          onUpdateProject(updatedProj);
        }
        setFeedbackMsg(` Module Prefab "${imported.name}" berhasil diimport!`);
        AndroidEngine.triggerHaptic(25);
      } catch (err: any) {
        alert('Gagal mengimport JSON Prefab: ' + (err?.message || 'Format tidak valid'));
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full text-white bg-slate-900 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm text-amber-400">
            Modular Prefab Library System
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer border border-slate-700"
            title="Import Prefab dari file JSON"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Import JSON</span>
          </button>

          {onOpenSavePrefab && (
            <button
              onClick={onOpenSavePrefab}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer shadow"
              title="Simpan Objek Terpilih sebagai Prefab"
            >
              <BookmarkPlus className="w-3.5 h-3.5 fill-slate-950" />
              <span>+ Simpan Prefab</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feedback Alert Bar */}
      {feedbackMsg && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-3 py-1.5 text-[11px] font-semibold text-amber-300 flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Search & Category Tabs */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 space-y-2">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari module prefab (e.g. Hero, Koin, Musuh, Platform)..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'all' as CategoryFilter, label: 'Semua', icon: '✨' },
            { id: 'user' as CategoryFilter, label: 'User Saved', icon: '⭐' },
            { id: 'player' as CategoryFilter, label: 'Player', icon: '👤' },
            { id: 'item' as CategoryFilter, label: 'Item/Koin', icon: '🪙' },
            { id: 'enemy' as CategoryFilter, label: 'Musuh', icon: '👾' },
            { id: 'platform' as CategoryFilter, label: 'Platform', icon: '📦' },
            { id: 'interactive' as CategoryFilter, label: 'Interaktif', icon: '🦘' },
            { id: 'ui' as CategoryFilter, label: 'UI HUD', icon: '🎮' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                AndroidEngine.triggerHaptic(10);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer flex items-center gap-1 transition-all ${
                activeCategory === cat.id
                  ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300 shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Prefab Grid List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {filteredPrefabs.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            Tidak ada prefab yang sesuai kriteria pencarian.
          </div>
        ) : (
          filteredPrefabs.map((prefab) => {
            const entCount = prefab.entities?.length || 0;
            const hasPhysics = prefab.entities?.some((e) => e.rigidbody || e.collider);
            const hasRules = prefab.entities?.reduce((acc, e) => acc + (e.script?.rules?.length || 0), 0);

            return (
              <div
                key={prefab.id}
                onClick={() => handleInstantiate(prefab)}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Icon Box */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border"
                    style={{
                      backgroundColor: (prefab.color || '#38bdf8') + '20',
                      borderColor: (prefab.color || '#38bdf8') + '50',
                    }}
                  >
                    {prefab.icon || '📦'}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors truncate">
                        {prefab.name}
                      </span>
                      {!prefab.isBuiltin ? (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                          USER PREFAB
                        </span>
                      ) : (
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded font-mono">
                          BUILT-IN
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1 leading-snug">
                      {prefab.description || 'Module Objek Reusable'}
                    </p>

                    {/* Component Badges */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pt-0.5">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" /> {entCount} Objek
                      </span>
                      {hasPhysics && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Shield className="w-3 h-3" /> Fisika
                        </span>
                      )}
                      {hasRules > 0 && (
                        <span className="flex items-center gap-1 text-purple-400">
                          <Activity className="w-3 h-3" /> {hasRules} Rules
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    onClick={(e) => handleExportPrefab(e, prefab)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 transition-all cursor-pointer"
                    title="Export Prefab ke JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {!prefab.isBuiltin && (
                    <button
                      onClick={(e) => handleDeletePrefab(e, prefab.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all cursor-pointer"
                      title="Hapus Prefab dari Library"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleInstantiate(prefab)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow active:scale-95 transition-all"
                  >
                    <span>Pasang ke Scene</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
