import React, { useState, useEffect, useRef } from 'react';
import { GameProject } from '../../types/engine';
import {
  SpriteSheetSlicerEngine,
  SlicerOptions,
  SlicedFrameBounds,
  SliceResult,
} from '../../engine/SpriteSheetSlicerEngine';
import { soundEngine } from '../../engine/AudioEngine';
import {
  Scissors,
  Upload,
  Zap,
  Sliders,
  Check,
  X,
  Sparkles,
  Layers,
  HardDrive,
  RefreshCw,
  Gauge,
  CheckCircle,
  Copy,
  Plus,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Grid,
  Image as ImageIcon,
  Play,
  Box,
  Eye,
  FileCode,
} from 'lucide-react';

interface SpriteSheetSlicerSheetProps {
  project: GameProject;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

export const SpriteSheetSlicerSheet: React.FC<SpriteSheetSlicerSheetProps> = ({
  project,
  onUpdateProject,
  onClose,
}) => {
  // Image & Source State
  const [sourceImageSrc, setSourceImageSrc] = useState<string>('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetPrefixName, setAssetPrefixName] = useState<string>('sprite_anim');

  // Slicer Configuration Options
  const [slicerMode, setSlicerMode] = useState<'auto' | 'grid'>('auto');
  const [autoAlphaThresh, setAutoAlphaThresh] = useState<number>(10);
  const [autoMinSize, setAutoMinSize] = useState<number>(8);
  const [autoMergeDist, setAutoMergeDist] = useState<number>(2);

  const [gridCols, setGridCols] = useState<number>(4);
  const [gridRows, setGridRows] = useState<number>(1);
  const [gridFrameW, setGridFrameW] = useState<number>(32);
  const [gridFrameH, setGridFrameH] = useState<number>(32);
  const [gridOffsetX, setGridOffsetX] = useState<number>(0);
  const [gridOffsetY, setGridOffsetY] = useState<number>(0);
  const [gridPaddingX, setGridPaddingX] = useState<number>(0);
  const [gridPaddingY, setGridPaddingY] = useState<number>(0);

  const [trimAlpha, setTrimAlpha] = useState<boolean>(true);
  const [skipEmpty, setSkipEmpty] = useState<boolean>(true);

  // Commit / Export Options
  const [createAnimatedEntity, setCreateAnimatedEntity] = useState<boolean>(true);
  const [removeOriginalAsset, setRemoveOriginalAsset] = useState<boolean>(false);

  // Slicer Processing & Result State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sliceResult, setSliceResult] = useState<SliceResult | null>(null);
  const [frames, setFrames] = useState<SlicedFrameBounds[]>([]);
  const [logMessage, setLogMessage] = useState<string | null>(null);

  // Preview Canvas Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [hoveredFrameIdx, setHoveredFrameIdx] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showLog = (msg: string) => {
    setLogMessage(msg);
    setTimeout(() => setLogMessage(null), 3500);
  };

  // Load default demo sprite sheet on mount if no image loaded
  useEffect(() => {
    if (!sourceImageSrc) {
      handleLoadDemo('coin_spin');
    }
  }, []);

  // Re-run slicer when options or source image changes
  useEffect(() => {
    if (!sourceImageSrc) return;

    let isMounted = true;
    setIsProcessing(true);

    const options: SlicerOptions = {
      mode: slicerMode,
      alphaThreshold: autoAlphaThresh,
      minFrameSize: autoMinSize,
      mergeDistance: autoMergeDist,
      cols: gridCols,
      rows: gridRows,
      frameWidth: gridFrameW,
      frameHeight: gridFrameH,
      offsetX: gridOffsetX,
      offsetY: gridOffsetY,
      paddingX: gridPaddingX,
      paddingY: gridPaddingY,
      trimAlpha,
      skipEmptyFrames: skipEmpty,
    };

    SpriteSheetSlicerEngine.sliceSpriteSheet(sourceImageSrc, options)
      .then((res) => {
        if (!isMounted) return;
        setSliceResult(res);
        setFrames(res.frames);
        setIsProcessing(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error slicing sprite sheet:', err);
        showLog('Gagal memproses slicer gambar');
        setIsProcessing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    sourceImageSrc,
    slicerMode,
    autoAlphaThresh,
    autoMinSize,
    autoMergeDist,
    gridCols,
    gridRows,
    gridFrameW,
    gridFrameH,
    gridOffsetX,
    gridOffsetY,
    gridPaddingX,
    gridPaddingY,
    trimAlpha,
    skipEmpty,
  ]);

  // Render canvas overlay with color-coded frame bounding boxes
  useEffect(() => {
    if (!sliceResult || !canvasRef.current || !sourceImageSrc) return;

    const cvs = canvasRef.current;
    cvs.width = sliceResult.sourceImageWidth;
    cvs.height = sliceResult.sourceImageHeight;

    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = sourceImageSrc;
    img.onload = () => {
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      // Draw original sprite sheet
      ctx.drawImage(img, 0, 0);

      // Overlay frame bounding boxes
      frames.forEach((f, idx) => {
        const isHovered = hoveredFrameIdx === idx;
        const colors = ['#38bdf8', '#34d399', '#f43f5e', '#a855f7', '#fbbf24', '#f97316'];
        const boxColor = colors[idx % colors.length];

        ctx.lineWidth = isHovered ? 3 : 1.5;
        ctx.strokeStyle = f.selected ? boxColor : 'rgba(148, 163, 184, 0.4)';
        ctx.strokeRect(f.x, f.y, f.w, f.h);

        if (f.selected) {
          ctx.fillStyle = isHovered ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.35)';
          ctx.fillRect(f.x, f.y, f.w, f.h);

          // Frame index badge
          ctx.fillStyle = boxColor;
          ctx.fillRect(f.x, f.y, Math.min(f.w, 24), 14);
          ctx.fillStyle = '#020617';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`#${f.index}`, f.x + 3, f.y + 10);
        }
      });
    };
  }, [sliceResult, frames, hoveredFrameIdx, sourceImageSrc]);

  // Load image file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setSourceImageSrc(evt.target.result as string);
        setSelectedAssetId(null);
        setAssetPrefixName(file.name.split('.')[0].replace(/[^a-zA-Z0-9_]/g, '_'));
        soundEngine.playSfx('coin');
        showLog(`Gambar ${file.name} berhasil diimpor!`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Load from existing project asset
  const handleSelectProjectAsset = (assetId: string) => {
    const found = project.assets?.images?.find((img) => img.id === assetId);
    if (found && found.url) {
      setSourceImageSrc(found.url);
      setSelectedAssetId(assetId);
      setAssetPrefixName(found.name.replace(/[^a-zA-Z0-9_]/g, '_'));
      soundEngine.playSfx('coin');
      showLog(`Aset ${found.name} siap dipotong!`);
    }
  };

  // Load demo sprite sheet
  const handleLoadDemo = (type: 'pixel_hero' | 'coin_spin' | 'fireball') => {
    const demoUrl = SpriteSheetSlicerEngine.generateDemoSpriteSheet(type);
    setSourceImageSrc(demoUrl);
    setSelectedAssetId(null);
    setAssetPrefixName(type);
    soundEngine.playSfx('powerup');
    showLog(`Demo sprite sheet '${type}' dimuat!`);
  };

  // Toggle frame selection
  const handleToggleFrame = (frameId: string) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === frameId ? { ...f, selected: !f.selected } : f))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setFrames((prev) => prev.map((f) => ({ ...f, selected: select })));
  };

  // Commit sliced frames to game project
  const handleCommitSlicer = () => {
    const selectedFrames = frames.filter((f) => f.selected);
    if (selectedFrames.length === 0) {
      showLog('Pilih minimal 1 frame untuk disimpan!');
      return;
    }

    const { updatedProject, createdImageIds, createdEntityId } =
      SpriteSheetSlicerEngine.commitSlicedAssetsToProject(
        project,
        frames,
        assetPrefixName,
        {
          saveAsIndividualImages: true,
          saveAsSpritesheetAtlas: true,
          createAnimatedEntity,
          removeOriginalAssetId: removeOriginalAsset && selectedAssetId ? selectedAssetId : undefined,
        }
      );

    onUpdateProject(updatedProject);
    soundEngine.playSfx('win');
    showLog(
      `🎉 Berhasil memotong ${selectedFrames.length} frame! Memori terhemat ${sliceResult?.memorySavedPercent}% (${sliceResult?.memorySavedMbText} MB VRAM)`
    );

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const selectedCount = frames.filter((f) => f.selected).length;

  return (
    <div className="p-3 space-y-3 text-slate-100 flex flex-col h-full overflow-hidden">
      {/* Header & Status Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              Automated Sprite Sheet Slicer ✂️
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                Low-RAM Optimizer
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Potong otomatis 1 gambar sprite sheet menjadi frame individual & pangkas memori VRAM.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Layout: Controls (Left) + Interactive Preview (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 overflow-hidden">
        {/* Left Control Panel (5 Cols) */}
        <div className="md:col-span-5 flex flex-col space-y-2.5 overflow-y-auto pr-1 text-xs">
          {/* Source Image Selector */}
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Sumber Gambar Sprite Sheet
              </span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer text-[10px]"
              >
                <Upload className="w-3 h-3" /> Impor File
              </button>
            </div>

            {/* Existing Project Images Dropdown */}
            {project.assets?.images && project.assets.images.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Pilih dari Aset Proyek:</label>
                <select
                  value={selectedAssetId || ''}
                  onChange={(e) => e.target.value && handleSelectProjectAsset(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-amber-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Pilih Aset Gambar Proyek --</option>
                  {project.assets.images.map((img) => (
                    <option key={img.id} value={img.id}>
                      📷 {img.name} ({img.fileSizeKb || '?'} KB)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preset Demo Sprite Sheets */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-[10px]">
              <span className="text-slate-400 font-semibold whitespace-nowrap">Demo Preset:</span>
              <button
                onClick={() => handleLoadDemo('coin_spin')}
                className="px-2 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer whitespace-nowrap"
              >
                🪙 Koin 3D (8 Frame)
              </button>
              <button
                onClick={() => handleLoadDemo('fireball')}
                className="px-2 py-0.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 cursor-pointer whitespace-nowrap"
              >
                🔥 Bola Api (6 Frame)
              </button>
              <button
                onClick={() => handleLoadDemo('pixel_hero')}
                className="px-2 py-0.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 cursor-pointer whitespace-nowrap"
              >
                🏃 Hero Run (4 Frame)
              </button>
            </div>
          </div>

          {/* Slicer Mode Selection Tabs */}
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setSlicerMode('auto')}
                className={`py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  slicerMode === 'auto'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> 🤖 Deteksi Otomatis
              </button>
              <button
                onClick={() => setSlicerMode('grid')}
                className={`py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  slicerMode === 'grid'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" /> 📐 Mode Grid
              </button>
            </div>

            {/* Mode-Specific Parameters */}
            {slicerMode === 'auto' ? (
              <div className="space-y-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Batas Transparansi Alpha:</span>
                  <span className="font-mono text-amber-300 font-bold">{autoAlphaThresh} / 255</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={128}
                  value={autoAlphaThresh}
                  onChange={(e) => setAutoAlphaThresh(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <div className="flex justify-between">
                  <span className="text-slate-400">Ukuran Frame Minimal:</span>
                  <span className="font-mono text-amber-300 font-bold">{autoMinSize} px</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={64}
                  value={autoMinSize}
                  onChange={(e) => setAutoMinSize(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <div className="flex justify-between">
                  <span className="text-slate-400">Jarak Gabung Pulau (Merge Dist):</span>
                  <span className="font-mono text-amber-300 font-bold">{autoMergeDist} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={autoMergeDist}
                  onChange={(e) => setAutoMergeDist(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block text-[10px]">Jumlah Kolom:</label>
                    <input
                      type="number"
                      min={1}
                      max={64}
                      value={gridCols}
                      onChange={(e) => setGridCols(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-center text-amber-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px]">Jumlah Baris:</label>
                    <input
                      type="number"
                      min={1}
                      max={64}
                      value={gridRows}
                      onChange={(e) => setGridRows(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-center text-amber-300 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block text-[10px]">Lebar Frame (W):</label>
                    <input
                      type="number"
                      min={4}
                      value={gridFrameW}
                      onChange={(e) => setGridFrameW(Math.max(4, parseInt(e.target.value) || 32))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-center text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px]">Tinggi Frame (H):</label>
                    <input
                      type="number"
                      min={4}
                      value={gridFrameH}
                      onChange={(e) => setGridFrameH(Math.max(4, parseInt(e.target.value) || 32))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-center text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block text-[10px]">Padding X/Y (px):</label>
                    <input
                      type="number"
                      min={0}
                      value={gridPaddingX}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setGridPaddingX(val);
                        setGridPaddingY(val);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-center text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px]">Offset X/Y (px):</label>
                    <input
                      type="number"
                      min={0}
                      value={gridOffsetX}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setGridOffsetX(val);
                        setGridOffsetY(val);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-center text-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Common Options */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800 text-[11px]">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={trimAlpha}
                  onChange={(e) => setTrimAlpha(e.target.checked)}
                  className="accent-amber-500 rounded cursor-pointer"
                />
                <span>✂️ Potong Margin Transparansi (Trim Outer Alpha)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={skipEmpty}
                  onChange={(e) => setSkipEmpty(e.target.checked)}
                  className="accent-amber-500 rounded cursor-pointer"
                />
                <span>🚫 Abaikan Frame Kosong / Transparan 100%</span>
              </label>
            </div>
          </div>

          {/* Export Options & Actions */}
          <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2">
            <span className="font-bold text-amber-300 text-[11px] block">
              ⚙️ Opsi Ekspor ke Proyek Game
            </span>

            <div className="space-y-1 text-[11px]">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={createAnimatedEntity}
                  onChange={(e) => setCreateAnimatedEntity(e.target.checked)}
                  className="accent-amber-500 rounded cursor-pointer"
                />
                <span>🎬 Otomatis Buat Entitas Sprite Animasi di Scene</span>
              </label>

              {selectedAssetId && (
                <label className="flex items-center gap-2 cursor-pointer text-rose-300">
                  <input
                    type="checkbox"
                    checked={removeOriginalAsset}
                    onChange={(e) => setRemoveOriginalAsset(e.target.checked)}
                    className="accent-rose-500 rounded cursor-pointer"
                  />
                  <span>🗑️ Hapus Gambar Monolitik Asli (Hemat VRAM)</span>
                </label>
              )}
            </div>

            <div className="pt-1">
              <label className="text-[10px] text-slate-400 block mb-1">Prefix Nama Aset:</label>
              <input
                type="text"
                value={assetPrefixName}
                onChange={(e) => setAssetPrefixName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-amber-300 font-mono text-[11px]"
              />
            </div>

            <button
              onClick={handleCommitSlicer}
              disabled={selectedCount === 0}
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 text-xs"
            >
              <Scissors className="w-4 h-4 stroke-[2.5]" />
              <span>Simpan {selectedCount} Frame Sliced ke Proyek</span>
            </button>
          </div>
        </div>

        {/* Right Panel: Interactive Canvas Preview & Sliced Frame Gallery (7 Cols) */}
        <div className="md:col-span-7 flex flex-col space-y-2 overflow-hidden">
          {/* Memory Savings Summary Banner */}
          {sliceResult && (
            <div className="p-2.5 bg-slate-950 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs shrink-0 font-mono">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400 animate-pulse" />
                <div>
                  <span className="text-emerald-400 font-bold block text-[11px]">
                    Hemat Memori VRAM: {sliceResult.memorySavedPercent}% ({sliceResult.memorySavedMbText} MB)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {sliceResult.sourceImageWidth}x{sliceResult.sourceImageHeight}px • {sliceResult.frames.length} Frame Terdeteksi
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-amber-300 font-bold block text-[11px]">
                  {selectedCount} / {sliceResult.frames.length} Terpilih
                </span>
                <span className="text-[10px] text-slate-400">
                  ~{Math.round(sliceResult.totalSlicedVramBytes / 1024)} KB Sliced
                </span>
              </div>
            </div>
          )}

          {/* Canvas Viewport */}
          <div className="relative flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center min-h-[200px]">
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-amber-400 gap-2 font-mono text-xs">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>Memproses potongan frame 2D...</span>
              </div>
            )}

            <div
              className="relative max-w-full max-h-full overflow-auto p-4 flex items-center justify-center"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            >
              <canvas
                ref={canvasRef}
                className="max-w-none border border-slate-700/50 rounded shadow-2xl bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px]"
              />
            </div>

            {/* Canvas Zoom Toolbar */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 text-slate-300">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.25, z - 0.25))}
                className="p-1 hover:bg-slate-800 rounded cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1 font-bold">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.25))}
                className="p-1 hover:bg-slate-800 rounded cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1.0)}
                className="px-1.5 py-0.5 text-[9px] hover:bg-slate-800 rounded font-bold cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Sliced Frame Thumbnails Gallery */}
          <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl space-y-2 shrink-0 max-h-[140px] overflow-y-auto">
            <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
              <span className="font-bold text-slate-300">Pratinjau Frame Sliced:</span>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  onClick={() => handleSelectAll(true)}
                  className="text-amber-400 hover:underline cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="text-slate-400 hover:underline cursor-pointer"
                >
                  Batal Semua
                </button>
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
              {frames.map((frame, idx) => (
                <div
                  key={frame.id}
                  onClick={() => handleToggleFrame(frame.id)}
                  onMouseEnter={() => setHoveredFrameIdx(idx)}
                  onMouseLeave={() => setHoveredFrameIdx(null)}
                  className={`p-1 rounded-lg border flex flex-col items-center justify-between cursor-pointer transition-all ${
                    frame.selected
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                      : 'bg-slate-900 border-slate-800 opacity-40 hover:opacity-75'
                  }`}
                >
                  <div className="w-full h-9 flex items-center justify-center bg-slate-900/80 rounded border border-slate-800/80 overflow-hidden">
                    <img
                      src={frame.dataUrl}
                      alt={`frame_${idx + 1}`}
                      className="max-w-full max-h-full object-contain pixelated"
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-300 mt-0.5 font-bold">
                    #{frame.index} ({frame.w}x{frame.h})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Log Message */}
      {logMessage && (
        <div className="absolute bottom-4 right-4 bg-amber-500 text-slate-950 px-3 py-1.5 rounded-xl font-bold text-xs shadow-2xl animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 z-50">
          <Sparkles className="w-4 h-4" />
          <span>{logMessage}</span>
        </div>
      )}
    </div>
  );
};
