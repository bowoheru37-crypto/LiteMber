import React, { useState, useEffect } from 'react';
import { GameProject } from '../../types/engine';
import { UnifiedSheetHeader } from '../Common/UnifiedSheetHeader';
import {
  Database,
  Cpu,
  Trash2,
  RefreshCw,
  Zap,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  Download,
  X,
  Play,
  Volume2,
  Image as ImageIcon,
  Grid,
  Layers,
  Activity,
  Sliders,
  Shield,
  Clock,
} from 'lucide-react';
import { assetManager, MemoryStats, CachedAssetRecord } from '../../engine/AssetManager';
import { AndroidEngine } from '../../engine/AndroidEngine';

interface AssetManagerSheetProps {
  project: GameProject;
  onUpdateProject?: (updatedProject: GameProject) => void;
  onClose: () => void;
}

export const AssetManagerSheet: React.FC<AssetManagerSheetProps> = ({
  project,
  onUpdateProject,
  onClose,
}) => {
  const [stats, setStats] = useState<MemoryStats>(assetManager.getStats());
  const [cacheList, setCacheList] = useState<CachedAssetRecord[]>(assetManager.getCacheList());
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [preloadProgress, setPreloadProgress] = useState<{ loaded: number; total: number }>({ loaded: 0, total: 0 });
  const [selectedLimitMB, setSelectedLimitMB] = useState<number>(stats.maxMemoryLimitMB);
  const [lowRamMode, setLowRamMode] = useState<boolean>(stats.lowRamMode);
  const [memoryWarning, setMemoryWarning] = useState<boolean>(false);
  const [orphanedCount, setOrphanedCount] = useState<number>(() => assetManager.scanOrphanedAssets(project).length);
  const [orphanReportMessage, setOrphanReportMessage] = useState<string | null>(null);

  // Cleanup Orphaned Assets
  const handleCleanupOrphaned = () => {
    const report = assetManager.cleanupOrphanedAssets(project);
    if (onUpdateProject) {
      onUpdateProject(report.cleanedProject);
    }
    setOrphanedCount(0);
    setStats(assetManager.getStats());
    setCacheList(assetManager.getCacheList());
    if (report.orphanedCount > 0) {
      setOrphanReportMessage(`✅ Berhasil menghapus ${report.orphanedCount} aset tak terpakai! Memori terbebas: ${report.freedMb > 0 ? report.freedMb + ' MB' : report.freedKb + ' KB'}.`);
    } else {
      setOrphanReportMessage(`ℹ️ Tidak ada aset yatim ditemukan. Semua aset sedang digunakan.`);
    }
    AndroidEngine.triggerHaptic(30);
  };

  // Refresh Memory Stats periodically
  useEffect(() => {
    const updateStats = () => {
      const s = assetManager.getStats();
      setStats(s);
      setCacheList(assetManager.getCacheList());
      setMemoryWarning(s.totalBytes > s.maxMemoryLimitMB * 0.85);
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    const unsubscribeWarning = assetManager.onMemoryWarning(() => {
      setMemoryWarning(true);
      AndroidEngine.triggerHaptic(30);
    });

    return () => {
      clearInterval(interval);
      unsubscribeWarning();
    };
  }, []);

  // Set RAM Limit
  const handleLimitChange = (limitMB: number) => {
    setSelectedLimitMB(limitMB);
    assetManager.setMemoryLimitMB(limitMB);
    setStats(assetManager.getStats());
    setCacheList(assetManager.getCacheList());
    AndroidEngine.triggerHaptic(15);
  };

  // Toggle Low-RAM Mode
  const handleToggleLowRam = () => {
    const nextVal = !lowRamMode;
    setLowRamMode(nextVal);
    assetManager.setLowRamMode(nextVal);
    setStats(assetManager.getStats());
    setCacheList(assetManager.getCacheList());
    AndroidEngine.triggerHaptic(15);
  };

  // Trigger Garbage Collector (Purge Unused)
  const handleRunGC = () => {
    const purged = assetManager.purgeUnusedAssets();
    setStats(assetManager.getStats());
    setCacheList(assetManager.getCacheList());
    AndroidEngine.triggerHaptic(25);
  };

  // Purge All Caches
  const handleClearAll = () => {
    assetManager.clearAll();
    setStats(assetManager.getStats());
    setCacheList(assetManager.getCacheList());
    AndroidEngine.triggerHaptic(30);
  };

  // Preload All Project Assets
  const handlePreloadAll = async () => {
    setIsPreloading(true);
    setPreloadProgress({ loaded: 0, total: 100 });

    await assetManager.preloadProjectAssets(project, (loaded, total) => {
      setPreloadProgress({ loaded, total });
    });

    setIsPreloading(false);
    setStats(assetManager.getStats());
    setCacheList(assetManager.getCacheList());
    AndroidEngine.triggerHaptic(30);
  };

  // Unload Single Asset
  const handleUnloadAsset = (id: string) => {
    assetManager.unload(id);
    setStats(assetManager.getStats());
    setCacheList(assetManager.getCacheList());
    AndroidEngine.triggerHaptic(10);
  };

  // Percentage of Memory Used
  const memoryPercent = Math.min(100, Math.round((stats.totalMB / stats.maxMemoryLimitMB) * 100));

  return (
    <div className="flex flex-col h-full text-white">
      <UnifiedSheetHeader
        title="Asset & RAM Memory Manager"
        subtitle="itel A70 RAM Optimizer & Garbage Collector"
        icon={Database}
        iconColor="text-amber-400"
        onClose={onClose}
      />

      {/* Memory Pressure Warning Banner */}
      {memoryWarning && (
        <div className="bg-red-500/20 border-b border-red-500/50 p-2 text-red-200 text-xs font-bold flex items-center justify-between animate-pulse px-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>PERINGATAN MEMORI: Penggunaan RAM melebihi 85% batas perangkat itel A70!</span>
          </div>
          <button
            onClick={handleRunGC}
            className="bg-red-500 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase cursor-pointer hover:bg-red-400"
          >
            Bersihkan Memory (GC)
          </button>
        </div>
      )}

      {/* Main Manager Content */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3.5 text-xs">
        {/* KPI Dashboard Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* RAM Usage Gauge */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" /> Penggunaan RAM
              </span>
              <span className="text-amber-400 font-mono font-bold text-xs">{memoryPercent}%</span>
            </div>
            <div className="text-lg font-black text-white font-mono">
              {stats.totalMB} <span className="text-xs font-normal text-slate-400">/ {stats.maxMemoryLimitMB} MB</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  memoryPercent > 85 ? 'bg-red-500' : memoryPercent > 60 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${memoryPercent}%` }}
              />
            </div>
          </div>

          {/* Assets Count Breakdown */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> Total Aset Ter-Cache
            </span>
            <div className="text-lg font-black text-cyan-300 font-mono">{stats.totalAssets} <span className="text-xs font-normal text-slate-400">Resource</span></div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>🖼️ {stats.imageCount} Img</span>
              <span>🎵 {stats.audioCount} Aud</span>
              <span>🎨 {stats.canvasCount} Cvs</span>
            </div>
          </div>

          {/* Cache Hit Ratio */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> Rasio Cache Hit
            </span>
            <div className="text-lg font-black text-emerald-400 font-mono">{stats.hitRatioPercent}%</div>
            <div className="text-[10px] text-slate-400 font-mono">
              Hits: {stats.cacheHits} • Misses: {stats.cacheMisses}
            </div>
          </div>

          {/* Low-RAM Mode Status */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-purple-400" /> Mode Low-RAM
              </span>
              <button
                onClick={handleToggleLowRam}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  lowRamMode ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {lowRamMode ? 'AKTIF' : 'NON-AKTIF'}
              </button>
            </div>
            <div className="text-[10px] text-slate-400">
              {lowRamMode ? 'Otomatis melepas resource tidak terpakai (itel A70 ready).' : 'Cache standar tanpa pelepasan agresif.'}
            </div>
          </div>
        </div>

        {/* Control Bar & RAM Budget Selector */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-amber-400 text-xs">Batas Budget Memory RAM (Limit Threshold)</span>
              <p className="text-[10px] text-slate-400">
                Pilih batas alokasi memori sesuai kapasitas RAM HP (Rekomendasi 32MB untuk itel A70).
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {[16, 32, 64, 128].map((limit) => (
                <button
                  key={limit}
                  onClick={() => handleLimitChange(limit)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono cursor-pointer transition-all ${
                    selectedLimitMB === limit
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {limit} MB
                </button>
              ))}
            </div>
          </div>

          {orphanReportMessage && (
            <div className="bg-emerald-950/80 border border-emerald-500/40 p-2 rounded-lg text-emerald-300 text-xs font-bold flex items-center justify-between">
              <span>{orphanReportMessage}</span>
              <button
                onClick={() => setOrphanReportMessage(null)}
                className="text-slate-400 hover:text-white p-1 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
            <button
              onClick={handleCleanupOrphaned}
              title="Hapus aset dalam manifest proyek yang tidak lagi di-referensikan di scene manapun"
              className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow min-h-[38px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Unused ({orphanedCount} Aset Yatim)</span>
            </button>

            <button
              onClick={handleRunGC}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow min-h-[38px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Jalankan Garbage Collector</span>
            </button>

            <button
              onClick={handlePreloadAll}
              disabled={isPreloading}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow disabled:opacity-50 min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Preload Aset</span>
            </button>

            <button
              onClick={handleClearAll}
              className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow ml-auto min-h-[38px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Cache</span>
            </button>
          </div>

          {/* Preload Progress Bar */}
          {isPreloading && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] text-cyan-300 font-mono">
                <span>Memuat Aset Proyek...</span>
                <span>
                  {preloadProgress.loaded} / {preloadProgress.total}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-cyan-400 h-full transition-all duration-200"
                  style={{
                    width: `${
                      preloadProgress.total > 0
                        ? Math.round((preloadProgress.loaded / preloadProgress.total) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Loaded Asset Registry Table */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-400 text-xs flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Registry Resource Ter-Cache ({cacheList.length})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              LRU Auto-Eviction Enabled
            </span>
          </div>

          {cacheList.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              Belum ada aset ter-cache di memori.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-64 border border-slate-800 rounded-lg">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[9px] font-bold sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2">Asset ID</th>
                    <th className="p-2">Tipe</th>
                    <th className="p-2">Dimensi / Durasi</th>
                    <th className="p-2">Ukuran Memori</th>
                    <th className="p-2">Ref Count</th>
                    <th className="p-2">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {cacheList.map((rec) => {
                    const kb = Math.round(rec.byteSize / 1024);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-900/50">
                        <td className="p-2 font-bold text-white max-w-[140px] truncate" title={rec.id}>
                          {rec.id}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              rec.type === 'image' || rec.type === 'image_bitmap'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : rec.type === 'audio'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {rec.type}
                          </span>
                        </td>
                        <td className="p-2 text-slate-300">
                          {rec.width && rec.height
                            ? `${rec.width}x${rec.height}px`
                            : rec.duration
                            ? `${rec.duration.toFixed(1)}s`
                            : '-'}
                        </td>
                        <td className="p-2 text-amber-300 font-bold">
                          {kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb} KB`}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              rec.refCount > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {rec.refCount} refs
                          </span>
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => handleUnloadAsset(rec.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white cursor-pointer transition-all"
                            title="Unload from Memory"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
