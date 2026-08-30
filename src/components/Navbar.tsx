import React, { useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Smartphone,
  Download,
  Gauge,
  FolderOpen,
  Zap,
  Sparkles,
  Upload,
  Undo2,
  Redo2,
  Maximize2,
  Layout,
} from 'lucide-react';
import { GameProject } from '../types/engine';
import { ZipImporterEngine } from '../engine/ZipImporterEngine';
import { AspectPreset, LayoutMode } from '../hooks/useWorkspaceLayout';

interface NavbarProps {
  currentProject: GameProject;
  projects: GameProject[];
  onSelectProject: (proj: GameProject) => void;
  onImportProject: (imported: GameProject) => void;
  isPlaying: boolean;
  isPaused: boolean;
  onStartPlay: () => void;
  onStopPlay: () => void;
  onTogglePause: () => void;
  onOpenProfiler: () => void;
  onOpenExport: () => void;
  onOpenAiStudio: () => void;
  onOpenFullscreenPreview?: () => void;
  onOpenLayoutCustomizer?: () => void;
  aspectPreset?: AspectPreset;
  layoutMode?: LayoutMode;
  fps: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  undoActionLabel?: string;
  redoActionLabel?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  projects,
  onSelectProject,
  onImportProject,
  isPlaying,
  isPaused,
  onStartPlay,
  onStopPlay,
  onTogglePause,
  onOpenProfiler,
  onOpenExport,
  onOpenAiStudio,
  onOpenFullscreenPreview,
  onOpenLayoutCustomizer,
  aspectPreset = 'itel_a70',
  layoutMode = 'bottom_dock',
  fps,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  undoActionLabel,
  redoActionLabel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedProj = await ZipImporterEngine.importProjectFromFile(file);
      onImportProject(importedProj);
      alert(`Proyek "${importedProj.name}" berhasil diimpor dari file Zip / SWB / JSON!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengimpor file';
      alert(`Gagal Impor Zip: ${msg}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header id="app-navbar" className="bg-slate-900 border-b border-slate-800 text-white px-2 sm:px-4 py-2 flex items-center justify-between select-none shadow-lg z-30 overflow-x-auto no-scrollbar gap-2">
      {/* Left: App Logo & Project Selector */}
      <div id="navbar-left" className="flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white whitespace-nowrap">LiteEngine</span>
            <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-400 px-1.5 py-0.2 rounded-full border border-cyan-500/30">
              2D
            </span>
          </div>

          <div className="relative group flex items-center">
            <select
              value={currentProject.id}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) onSelectProject(found);
              }}
              className="bg-transparent text-[11px] text-slate-300 font-medium hover:text-white cursor-pointer pr-4 focus:outline-none appearance-none max-w-[120px] sm:max-w-[160px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name}
                </option>
              ))}
            </select>
            <FolderOpen className="w-3 h-3 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Import Zip / SWB / JSON File Button */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".zip,.swb,.json"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          id="btn-import-zip"
          className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 shrink-0"
          title="Impor Sample Proyek Game (.zip / .swb / .json)"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden xs:inline text-[10px] sm:text-[11px]">Impor Zip</span>
        </button>
      </div>

      {/* Center: Undo / Redo & Play / Pause / Reset Controls */}
      <div id="navbar-center" className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-full border border-slate-700/80 shrink-0 shadow-inner">
        {!isPlaying ? (
          <>
            {/* Undo Touch Button */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              id="btn-undo"
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                canUndo
                  ? 'bg-slate-700 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 active:scale-90 shadow-sm'
                  : 'bg-slate-800/50 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-40'
              }`}
              title={canUndo ? `Undo (Ctrl+Z): ${undoActionLabel || 'Batalkan Perubahan'}` : 'Undo (Ctrl+Z)'}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            {/* Redo Touch Button */}
            <button
              onClick={onRedo}
              disabled={!canRedo}
              id="btn-redo"
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                canRedo
                  ? 'bg-slate-700 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 active:scale-90 shadow-sm'
                  : 'bg-slate-800/50 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-40'
              }`}
              title={canRedo ? `Redo (Ctrl+Y): ${redoActionLabel || 'Pulihkan Perubahan'}` : 'Redo (Ctrl+Y)'}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-700/80 my-auto" />

            <button
              onClick={onStartPlay}
              id="btn-play-game"
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3.5 py-1 rounded-full text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Mainkan</span>
            </button>

            {onOpenFullscreenPreview && (
              <button
                onClick={onOpenFullscreenPreview}
                id="btn-fullscreen-preview-nav"
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1 rounded-full text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
                title="Buka Pratinjau Layar Penuh (Fullscreen Preview)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={onTogglePause}
              id="btn-pause-game"
              className="bg-amber-500/20 text-amber-400 border border-amber-500/40 p-1.5 rounded-full text-xs font-medium hover:bg-amber-500/30 active:scale-95 cursor-pointer"
              title={isPaused ? 'Lanjutkan Game' : 'Jeda Game'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onStopPlay}
              id="btn-stop-game"
              className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            {onOpenFullscreenPreview && (
              <button
                onClick={onOpenFullscreenPreview}
                id="btn-fullscreen-preview-playing"
                className="p-1.5 rounded-full bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all cursor-pointer"
                title="Pratinjau Layar Penuh (Fullscreen)"
              >
                <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Right: Hardware Profiler & Assistant & Layout & Export */}
      <div id="navbar-right" className="flex items-center gap-1.5 shrink-0">
        {/* Workspace Layout Customizer Trigger */}
        {onOpenLayoutCustomizer && (
          <button
            onClick={onOpenLayoutCustomizer}
            id="btn-workspace-layout-customizer"
            className="flex items-center gap-1 bg-slate-800/90 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
            title="Kustomisasi Tata Letak, Mode Layar Luas, & Posisi Blok Panel"
          >
            <Layout className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline text-xs font-bold">Tata Letak</span>
            <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 px-1 py-0.2 rounded border border-cyan-500/30">
              {layoutMode === 'ultra_canvas'
                ? 'Layar Penuh'
                : layoutMode === 'floating_pip'
                ? 'PiP'
                : layoutMode === 'side_studio'
                ? 'Sidebar'
                : 'Dock'}
            </span>
          </button>
        )}

        {/* itel A70 Optimiser Badge */}
        <button
          onClick={onOpenProfiler}
          id="btn-hardware-profiler"
          className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 hover:border-cyan-500/50 text-xs px-2 py-1 rounded-lg text-slate-300 transition-all active:scale-95 cursor-pointer shrink-0"
          title="Hardware FPS & RAM Profiler"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline text-[11px] font-mono text-slate-300">itel A70</span>
          <span
            className={`font-mono font-bold text-[11px] ml-0.5 ${
              fps >= 55 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {fps} FPS
          </span>
          <Gauge className="w-3 h-3 text-cyan-400 ml-0.5" />
        </button>

        {/* AI Studio Assistant Button */}
        <button
          onClick={onOpenAiStudio}
          id="btn-ai-studio"
          className="flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer shrink-0"
          title="Asisten AI Generator"
        >
          <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
          <span className="hidden sm:inline text-xs">Asisten AI</span>
        </button>

        {/* Export APK / Project */}
        <button
          onClick={onOpenExport}
          id="btn-export-project"
          className="flex items-center gap-1 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/40 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer shrink-0"
          title="Ekspor Game / APK"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-xs">Ekspor</span>
        </button>
      </div>
    </header>
  );
};
