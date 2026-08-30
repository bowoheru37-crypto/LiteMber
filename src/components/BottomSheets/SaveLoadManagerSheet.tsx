import React, { useState, useEffect } from 'react';
import { GameProject, Entity } from '../../types/engine';
import {
  SaveLoadEngine,
  SaveSlotMetadata,
  SavedProjectMetadata,
  CompactSaveData,
  BenchmarkMetrics,
} from '../../engine/SaveLoadEngine';
import { soundEngine } from '../../engine/AudioEngine';
import {
  HardDrive,
  Save,
  FolderOpen,
  Trash2,
  X,
  Sparkles,
  Zap,
  Cpu,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  Gauge,
  Activity,
  Code,
  ShieldCheck,
  Heart,
  MapPin,
  Clock,
  Layers,
  FileCode,
  Plus,
} from 'lucide-react';

interface SaveLoadManagerSheetProps {
  project: GameProject;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

export const SaveLoadManagerSheet: React.FC<SaveLoadManagerSheetProps> = ({
  project,
  onUpdateProject,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'slots' | 'inspector' | 'profiler' | 'io'>('projects');
  const [savedProjects, setSavedProjects] = useState<SavedProjectMetadata[]>([]);
  const [slots, setSlots] = useState<{ slotId: string; metadata: SaveSlotMetadata | null; exists: boolean }[]>([]);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkMetrics | null>(null);

  // Live serialized JSON state
  const { compactData, jsonString, rawSizeBytes, compactSizeBytes } = SaveLoadEngine.serializeGameState(
    project.entities,
    0,
    project.name || 'Sekte Pagoda'
  );

  const showLog = (msg: string) => {
    setLogMessage(msg);
    setTimeout(() => setLogMessage(null), 3500);
  };

  const reloadAll = () => {
    setSlots(SaveLoadEngine.listAllSlots());
    setSavedProjects(SaveLoadEngine.listSavedProjectsFromLocalStorage());
  };

  useEffect(() => {
    reloadAll();
  }, []);

  // --- FULL PROJECT SAVE / LOAD HANDLERS ---
  const handleSaveProjectToStorage = () => {
    try {
      const res = SaveLoadEngine.saveProjectToLocalStorage(project, false);
      soundEngine.play('powerup');
      reloadAll();
      showLog(`💾 Proyek '${project.name}' berhasil disimpan ke Penyimpanan Perangkat HP!`);
    } catch (err: any) {
      showLog(`❌ Gagal menyimpan proyek: ${err?.message}`);
    }
  };

  const handleLoadProjectFromStorage = (projectId: string) => {
    try {
      const loadedProj = SaveLoadEngine.loadProjectFromLocalStorage(projectId);
      if (loadedProj) {
        onUpdateProject(loadedProj);
        soundEngine.play('coin');
        showLog(`📂 Proyek '${loadedProj.name}' berhasil dimuat dari Penyimpanan HP!`);
      } else {
        showLog('❌ Proyek tidak ditemukan di memori.');
      }
    } catch (err: any) {
      showLog(`❌ Gagal memuat proyek: ${err?.message}`);
    }
  };

  const handleDeleteProjectFromStorage = (projectId: string, name: string) => {
    if (confirm(`Hapus proyek '${name}' dari penyimpanan lokal HP?`)) {
      SaveLoadEngine.deleteProjectFromLocalStorage(projectId);
      reloadAll();
      soundEngine.play('hit');
      showLog(`🗑️ Proyek '${name}' berhasil dihapus dari HP.`);
    }
  };

  // --- RUNTIME GAME STATE SAVE HANDLERS ---
  const handleSaveToSlot = (slotId: string, slotName: string) => {
    try {
      const meta = SaveLoadEngine.saveToSlot(
        slotId,
        slotName,
        project.entities,
        0,
        project.name || 'Sekte Pagoda'
      );
      soundEngine.play('powerup');
      reloadAll();
      showLog(`💾 Game berhasil disimpan ke '${meta.slotName}'! Size: ${(meta.compactSizeBytes / 1024).toFixed(2)} KB (-${meta.compressionRatioPercent}%)`);
    } catch (err: any) {
      showLog(`❌ Gagal menyimpan: ${err?.message}`);
    }
  };

  // 2. Perform Load from Slot
  const handleLoadFromSlot = (slotId: string) => {
    try {
      const { saveData, metadata } = SaveLoadEngine.loadFromSlot(slotId);
      const restoredEntities = SaveLoadEngine.applySaveStateToEntities(project.entities, saveData);

      onUpdateProject({
        ...project,
        entities: restoredEntities,
      });

      soundEngine.play('coin');
      showLog(`📂 Game State dari '${metadata?.slotName || slotId}' berhasil dimuat ke Stage!`);
    } catch (err: any) {
      showLog(`❌ Gagal memuat save file: ${err?.message}`);
    }
  };

  // 3. Delete Slot
  const handleDeleteSlot = (slotId: string) => {
    SaveLoadEngine.deleteSlot(slotId);
    reloadAll();
    soundEngine.play('hit');
    showLog(`🗑️ Slot '${slotId}' berhasil dihapus.`);
  };

  // 4. Run Low-End CPU Benchmark (itel A70 Unisoc T603 Test)
  const handleRunBenchmark = () => {
    const res = SaveLoadEngine.runBenchmark(project.entities);
    setBenchmarkResult(res);
    soundEngine.play('powerup');
    showLog(`⚡ Benchmark Selesai! Latensi Serialisasi: ${res.serializeTimeMs}ms (${res.compressionRatioPercent}% hemat RAM)`);
  };

  // 5. Copy JSON payload
  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showLog('📋 Compact JSON Save berhasil disalin ke Clipboard!');
  };

  // 6. Download Save File (.sav)
  const handleDownloadFile = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `save_game_${Date.now()}.sav`;
    a.click();
    URL.revokeObjectURL(url);
    showLog('💾 File save (.sav) berhasil diunduh!');
  };

  // 7. Import JSON Save File
  const handleImportSaveText = () => {
    if (!importJsonText.trim()) return;
    try {
      const saveData = SaveLoadEngine.deserializeGameState(importJsonText);
      const restored = SaveLoadEngine.applySaveStateToEntities(project.entities, saveData);
      onUpdateProject({
        ...project,
        entities: restored,
      });
      soundEngine.play('coin');
      setImportJsonText('');
      showLog('✨ Save Data berhasil diimpor & diterapkan ke Objek Live!');
    } catch (err: any) {
      showLog(`❌ Error Impor Save: ${err?.message}`);
    }
  };

  return (
    <div className="p-3 h-full flex flex-col text-slate-100 select-none bg-slate-900 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1.5">
              <span>Manajer Game Save / Load</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono px-1.5 py-0.2 rounded-full">
                itel A70 Compact JSON
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">
              Serialisasi posisi, status kesehatan & variabel objek ke LocalStorage hemat memori
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Log Banner */}
      {logMessage && (
        <div className="mb-2 p-2 bg-slate-950 border border-emerald-500/40 rounded-xl text-emerald-300 text-[11px] font-mono flex items-center gap-2 animate-pulse">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{logMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-950 p-1 rounded-xl mb-3 border border-slate-800 text-xs gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'projects'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px] whitespace-nowrap">Proyek Game (HP)</span>
        </button>

        <button
          onClick={() => setActiveTab('slots')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'slots'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px] whitespace-nowrap">Slot State Live</span>
        </button>

        <button
          onClick={() => setActiveTab('inspector')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'inspector'
              ? 'bg-purple-500 text-slate-950 font-bold shadow-md shadow-purple-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px] whitespace-nowrap">JSON Payload</span>
        </button>

        <button
          onClick={() => setActiveTab('profiler')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'profiler'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px] whitespace-nowrap">Profiler</span>
        </button>

        <button
          onClick={() => setActiveTab('io')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeTab === 'io'
              ? 'bg-indigo-500 text-slate-950 font-bold shadow-md shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px] whitespace-nowrap">Ekspor / Impor</span>
        </button>
      </div>

      {/* TAB 0: SAVED PROJECTS (FULL GAME DESIGNS) */}
      {activeTab === 'projects' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Quick Save Project Banner */}
          <div className="p-3 bg-gradient-to-r from-cyan-950/80 to-slate-950 border border-cyan-500/30 rounded-xl flex items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40 shrink-0">
                <Save className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{project.name || 'Proyek Aktif'}</span>
                  <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-mono px-1.5 py-0.2 rounded border border-cyan-500/30">
                    Auto-Save Active
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  {project.entities?.length || 0} Objek · {project.scenes?.length || 1} Scene · Terakhir Diubah:{' '}
                  {new Date(project.updatedAt || Date.now()).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveProjectToStorage}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20 active:scale-95 shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan ke HP</span>
            </button>
          </div>

          {/* List of Saved Projects in Device Storage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                Proyek Game Tersimpan di Perangkat ({savedProjects.length})
              </span>
              <span className="text-[9px] font-mono text-slate-500">Penyimpanan HP Lokal</span>
            </div>

            {savedProjects.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center space-y-2 bg-slate-950/40">
                <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">Belum ada proyek game manual tersimpan di HP.</p>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                  Klik tombol "Simpan ke HP" di atas untuk menyimpan salinan permanen proyek saat ini ke memori perangkat.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      proj.id === project.id
                        ? 'bg-slate-950 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white truncate max-w-[160px]" title={proj.name}>
                          {proj.name}
                        </span>
                        <span className="text-[9px] font-mono bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded">
                          {(proj.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                      </div>

                      {proj.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-1 mb-1">{proj.description}</p>
                      )}

                      <div className="space-y-0.5 text-[9.5px] text-slate-400 mb-2 font-mono">
                        <div className="flex justify-between">
                          <span>Diubah:</span>
                          <span className="text-slate-300">{new Date(proj.updatedAt).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Komponen:</span>
                          <span className="text-slate-300">
                            {proj.entityCount} Objek · {proj.sceneCount} Scene
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                      {proj.id === project.id ? (
                        <span className="flex-1 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold rounded-lg text-[10px] text-center">
                          ✓ Sedang Dibuka
                        </span>
                      ) : (
                        <button
                          onClick={() => handleLoadProjectFromStorage(proj.id)}
                          className="flex-1 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow"
                        >
                          <FolderOpen className="w-3 h-3" />
                          <span>Muat</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteProjectFromStorage(proj.id, proj.name)}
                        className="p-1.5 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                        title="Hapus Proyek dari HP"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: SAVE SLOTS */}
      {activeTab === 'slots' && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {slots.map((s) => (
              <div
                key={s.slotId}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  s.exists
                    ? 'bg-slate-950 border-emerald-500/40 hover:border-emerald-500/70'
                    : 'bg-slate-950/60 border-slate-800 border-dashed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white flex items-center gap-1">
                      {s.metadata?.slotName || s.slotId}
                    </span>
                    {s.exists ? (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                        {(s.metadata!.compactSizeBytes / 1024).toFixed(2)} KB (-{s.metadata!.compressionRatioPercent}%)
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500 font-mono">Kosong</span>
                    )}
                  </div>

                  {s.exists && s.metadata ? (
                    <div className="space-y-1 text-[10px] text-slate-400 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400" /> Scene:
                        </span>
                        <strong className="text-slate-200 truncate">{s.metadata.sceneName}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" /> Waktu:
                        </span>
                        <span className="font-mono text-slate-300">
                          {new Date(s.metadata.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-indigo-400" /> Dynamic Entities:
                        </span>
                        <span className="font-mono text-slate-300">{s.metadata.entityCount} Objek</span>
                      </div>
                      {s.metadata.playerHealth !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-rose-400">
                            <Heart className="w-3 h-3 text-rose-400 fill-current" /> HP Pemain:
                          </span>
                          <span className="font-mono font-bold text-rose-300">{s.metadata.playerHealth} / 100</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 mb-2">Slot ini belum berisi save data state game.</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => handleSaveToSlot(s.slotId, s.metadata?.slotName || s.slotId)}
                    className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer shadow"
                  >
                    <Save className="w-3 h-3" />
                    <span>Simpan</span>
                  </button>

                  {s.exists && (
                    <>
                      <button
                        onClick={() => handleLoadFromSlot(s.slotId)}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <FolderOpen className="w-3 h-3" />
                        <span>Muat</span>
                      </button>

                      <button
                        onClick={() => handleDeleteSlot(s.slotId)}
                        className="p-1.5 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                        title="Hapus Save Slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: JSON PAYLOAD INSPECTOR */}
      {activeTab === 'inspector' && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-cyan-400 flex items-center gap-1">
                <Code className="w-4 h-4" /> Live Compact JSON Serialized Payload
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                  Raw: {(rawSizeBytes / 1024).toFixed(2)} KB
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  Compact: {(compactSizeBytes / 1024).toFixed(2)} KB (-
                  {rawSizeBytes > 0 ? Math.round((1 - compactSizeBytes / rawSizeBytes) * 100) : 0}%)
                </span>
              </div>
            </div>

            <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-mono text-cyan-300 overflow-x-auto max-h-56 leading-relaxed select-text">
              {JSON.stringify(compactData, null, 2)}
            </pre>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={handleCopyJson}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin JSON Payload'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROFILER & BENCHMARK */}
      {activeTab === 'profiler' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                <Gauge className="w-4 h-4" /> Pengujian Performa Hardware Low-End (itel A70 Benchmark)
              </span>
              <button
                onClick={handleRunBenchmark}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Uji Latensi Serialisasi</span>
              </button>
            </div>

            {benchmarkResult ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block">Waktu Serialisasi:</span>
                  <span className="font-mono text-sm font-bold text-amber-400">
                    {benchmarkResult.serializeTimeMs} ms
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block">Waktu Deserialisasi:</span>
                  <span className="font-mono text-sm font-bold text-cyan-400">
                    {benchmarkResult.deserializeTimeMs} ms
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block">Hemat Memori Storage:</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {benchmarkResult.compressionRatioPercent}%
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block">Memori Terhemat:</span>
                  <span className="font-mono text-sm font-bold text-indigo-400">
                    {(benchmarkResult.savedBytes / 1024).toFixed(2)} KB
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                Klik tombol "Uji Latensi Serialisasi" di atas untuk mengukur waktu simpan di CPU Unisoc T603 itel A70.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: EXPORT / IMPORT */}
      {activeTab === 'io' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <span className="font-bold text-xs text-indigo-400 flex items-center gap-1.5 border-b border-slate-800 pb-2 block">
              <Download className="w-4 h-4" /> Unduh / Impor File Save State
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadFile}
                className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Save (.sav)</span>
              </button>

              <button
                onClick={handleCopyJson}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Salin Teks Save</span>
              </button>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-[10px] text-slate-400 block">Tempel Kode JSON Save untuk Dimuat:</label>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder="Tempel string JSON save di sini..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleImportSaveText}
                className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <Upload className="w-4 h-4" />
                <span>Terapkan Save Data ke Live Stage</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
