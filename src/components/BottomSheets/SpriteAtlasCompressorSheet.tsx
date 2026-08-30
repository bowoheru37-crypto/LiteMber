import React, { useState, useEffect, useRef } from 'react';
import { GameProject, ImageAsset } from '../../types/engine';
import {
  SpriteAtlasCompressorEngine,
  FrameInput,
  AtlasBuildResult,
  CompressionOptions,
} from '../../engine/SpriteAtlasCompressorEngine';
import { soundEngine } from '../../engine/AudioEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';
import {
  Layers,
  Upload,
  Zap,
  Sliders,
  Download,
  Check,
  X,
  Sparkles,
  Cpu,
  Eye,
  FileCode,
  HardDrive,
  RefreshCw,
  Gauge,
  CheckCircle,
  Copy,
  Plus,
  Trash2,
  Maximize2,
  Box,
} from 'lucide-react';

interface SpriteAtlasCompressorSheetProps {
  project: GameProject;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

export const SpriteAtlasCompressorSheet: React.FC<SpriteAtlasCompressorSheetProps> = ({
  project,
  onUpdateProject,
  onClose,
}) => {
  const [inputs, setInputs] = useState<FrameInput[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AtlasBuildResult | null>(null);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [copiedJson, setCopiedJson] = useState(false);
  const [atlasName, setAtlasName] = useState('atlas_opt_' + Date.now().toString().slice(-4));

  // Compression Options State
  const [options, setOptions] = useState<CompressionOptions>({
    maxFrameDimension: 64, // Default 64x64 for mobile
    quality: 0.8,
    trimAlpha: true,
    padding: 2,
    powerOfTwo: true,
    deduplicate: true,
    format: 'image/webp',
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showLog = (msg: string) => {
    setLogMessage(msg);
    setTimeout(() => setLogMessage(null), 3500);
  };

  // Helper to draw bounding boxes on preview canvas
  useEffect(() => {
    if (!result || !canvasRef.current) return;

    const cvs = canvasRef.current;
    cvs.width = result.atlasWidth;
    cvs.height = result.atlasHeight;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    // Draw compressed atlas image
    ctx.drawImage(result.atlasCanvas, 0, 0);

    // Draw overlay bounding boxes
    if (showBoundingBoxes) {
      ctx.lineWidth = 1;
      result.frames.forEach((f, idx) => {
        // Alternating neon colors
        const colors = ['#38bdf8', '#34d399', '#f43f5e', '#a855f7', '#fbbf24'];
        ctx.strokeStyle = colors[idx % colors.length];
        ctx.strokeRect(f.x, f.y, f.w, f.h);

        // Frame label
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(f.x, f.y, Math.min(f.w, 48), 12);
        ctx.fillStyle = colors[idx % colors.length];
        ctx.font = '9px monospace';
        ctx.fillText(f.name.slice(0, 7), f.x + 2, f.y + 9);
      });
    }
  }, [result, showBoundingBoxes]);

  // Handle building/rebuilding atlas whenever options or inputs change
  const buildAtlas = async (currentInputs: FrameInput[], currentOpts: CompressionOptions) => {
    if (currentInputs.length === 0) {
      setResult(null);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await SpriteAtlasCompressorEngine.buildCompressedAtlas(currentInputs, currentOpts);
      setResult(res);
      soundEngine.play('powerup');
      AndroidEngine.triggerHaptic(15);
    } catch (err: any) {
      showLog(`❌ Gagal kompresi atlas: ${err?.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 1. Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files) as File[];
    const newInputs: FrameInput[] = files.map((file, idx) => ({
      id: `frame_${Date.now()}_${idx}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      source: file,
      originalSizeKb: Math.round(file.size / 1024),
    }));

    const updated = [...inputs, ...newInputs];
    setInputs(updated);
    buildAtlas(updated, options);
    showLog(`✨ ${files.length} gambar baru berhasil ditambahkan!`);
  };

  // 2. Load Demo Frame Presets
  const handleLoadDemoPreset = () => {
    const demoColors = ['#f43f5e', '#38bdf8', '#34d399', '#fbbf24', '#a855f7', '#ec4899', '#10b981', '#6366f1'];
    const demoFrames: FrameInput[] = [];

    // Create 8 demo animated sprite frames programmatically
    demoColors.forEach((color, idx) => {
      const tempCvs = document.createElement('canvas');
      tempCvs.width = 128;
      tempCvs.height = 128;
      const ctx = tempCvs.getContext('2d')!;

      // Draw character body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(64, 64 + Math.sin(idx) * 10, 36, 0, Math.PI * 2);
      ctx.fill();

      // Draw eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(52, 52 + Math.sin(idx) * 10, 8, 12);
      ctx.fillRect(68, 52 + Math.sin(idx) * 10, 8, 12);

      demoFrames.push({
        id: `demo_frame_${idx}`,
        name: `hero_run_0${idx + 1}`,
        source: tempCvs.toDataURL('image/png'),
        originalSizeKb: 64, // Simulated size
      });
    });

    setInputs(demoFrames);
    buildAtlas(demoFrames, options);
    showLog('🚀 Demo 8 Frame Animasi berhasil dimuat!');
  };

  // 3. Remove Single Frame Input
  const handleRemoveFrame = (id: string) => {
    const updated = inputs.filter((f) => f.id !== id);
    setInputs(updated);
    buildAtlas(updated, options);
  };

  // 4. Clear All Inputs
  const handleClearAll = () => {
    setInputs([]);
    setResult(null);
  };

  // 5. Update Options
  const handleOptionChange = (key: keyof CompressionOptions, val: any) => {
    const updatedOpts = { ...options, [key]: val };
    setOptions(updatedOpts);
    if (inputs.length > 0) {
      buildAtlas(inputs, updatedOpts);
    }
  };

  // 6. Save Compressed Atlas to Game Project Assets
  const handleSaveToProjectAssets = () => {
    if (!result) return;

    const newAsset: ImageAsset = {
      id: 'img_atlas_' + Date.now(),
      name: atlasName || 'Compressed Spritesheet Atlas',
      type: 'tileset',
      format: 'data_url',
      url: result.dataUrl,
      fileSizeKb: result.metrics.compressedAtlasSizeKb,
      isOptimized: true,
    };

    const existingImages = project.assets?.images || [];
    const updatedProject = {
      ...project,
      assets: {
        ...project.assets,
        images: [...existingImages, newAsset],
      },
    };

    onUpdateProject(updatedProject);
    soundEngine.play('powerup');
    AndroidEngine.triggerHaptic(20);
    showLog(`🎉 Spritesheet Atlas '${newAsset.name}' berhasil ditambahkan ke Aset Game!`);
  };

  // 7. Download Atlas Image File
  const handleDownloadImage = () => {
    if (!result) return;
    const ext = result.format.includes('webp') ? 'webp' : 'png';
    const a = document.createElement('a');
    a.href = result.dataUrl;
    a.download = `${atlasName}.${ext}`;
    a.click();
    showLog(`💾 Image Atlas (${ext.toUpperCase()}) berhasil diunduh!`);
  };

  // 8. Download JSON Metadata
  const handleDownloadJson = () => {
    if (!result) return;
    const blob = new Blob([result.jsonMetadataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${atlasName}_atlas.json`;
    a.click();
    URL.revokeObjectURL(url);
    showLog('💾 File JSON Metadata Atlas berhasil diunduh!');
  };

  // 9. Copy JSON Metadata
  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.jsonMetadataString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
    showLog('📋 JSON Metadata berhasil disalin ke Clipboard!');
  };

  return (
    <div className="p-3 h-full flex flex-col text-slate-100 select-none bg-slate-900 border-t border-slate-800">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-white shadow-md shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1.5">
              <span>Kompresor Image & Spritesheet Atlas</span>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono px-1.5 py-0.2 rounded-full">
                itel A70 WebP & VRAM
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">
              Downscaling otomatis, trimming alpha & bin-packing atlas untuk menghemat RAM HP low-end
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
        <div className="mb-2 p-2 bg-slate-950 border border-cyan-500/40 rounded-xl text-cyan-300 text-[11px] font-mono flex items-center gap-2 animate-pulse">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate">{logMessage}</span>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-3 pr-1">
        {/* LEFT COLUMN: Controls & Input List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Upload Dropzone */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <Upload className="w-3.5 h-3.5 text-cyan-400" /> Impor Gambar / Frame
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{inputs.length} Frame</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Pilih File Gambar</span>
              </button>

              <button
                onClick={handleLoadDemoPreset}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                title="Muat preset demo"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Preset Demo</span>
              </button>
            </div>

            {/* List of uploaded input frames */}
            {inputs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 max-h-36 overflow-y-auto">
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>Daftar Frame ({inputs.length})</span>
                  <button onClick={handleClearAll} className="text-rose-400 hover:underline cursor-pointer">
                    Hapus Semua
                  </button>
                </div>
                {inputs.map((inp) => (
                  <div
                    key={inp.id}
                    className="p-1.5 bg-slate-900 rounded-lg flex items-center justify-between text-xs text-slate-300"
                  >
                    <span className="truncate max-w-[180px] font-mono text-[10px]">{inp.name}</span>
                    <button
                      onClick={() => handleRemoveFrame(inp.id)}
                      className="p-1 hover:text-rose-400 text-slate-500 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compression & Packing Controls */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1 border-b border-slate-800 pb-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" /> Pengaturan Kompresi & Atlas
            </span>

            {/* Max Frame Dimension */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <label className="text-slate-300">Resizing Frame Maksimal:</label>
                <span className="font-mono text-cyan-400 font-bold">
                  {options.maxFrameDimension ? `${options.maxFrameDimension}px` : 'Original'}
                </span>
              </div>
              <select
                value={options.maxFrameDimension}
                onChange={(e) => handleOptionChange('maxFrameDimension', parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value={16}>16 x 16 px (Pixel Art Micro)</option>
                <option value={32}>32 x 32 px (Pixel Art Retro)</option>
                <option value={64}>64 x 64 px (Sangat Hemat RAM itel A70)</option>
                <option value={128}>128 x 128 px (Standar HD Game)</option>
                <option value={256}>256 x 256 px (Ultra Detail)</option>
                <option value={0}>Original (Tanpa Resizing)</option>
              </select>
            </div>

            {/* Format & Quality */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-300 block">Format Output:</label>
                <select
                  value={options.format}
                  onChange={(e) => handleOptionChange('format', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="image/webp">WebP (Super Hemat)</option>
                  <option value="image/png">PNG (Lossless Alpha)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <label className="text-slate-300">Kualitas:</label>
                  <span className="font-mono text-emerald-400 font-bold">{Math.round((options.quality || 0.8) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={options.quality}
                  onChange={(e) => handleOptionChange('quality', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-800">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={options.trimAlpha}
                  onChange={(e) => handleOptionChange('trimAlpha', e.target.checked)}
                  className="rounded accent-cyan-500 cursor-pointer"
                />
                <span>Trim Alpha Padding</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={options.deduplicate}
                  onChange={(e) => handleOptionChange('deduplicate', e.target.checked)}
                  className="rounded accent-cyan-500 cursor-pointer"
                />
                <span>Hapus Frame Duplikat</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={options.powerOfTwo}
                  onChange={(e) => handleOptionChange('powerOfTwo', e.target.checked)}
                  className="rounded accent-cyan-500 cursor-pointer"
                />
                <span>Power of 2 (GPU Po2)</span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Atlas Live Canvas & Metrics (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {result ? (
            <>
              {/* Metrics Dashboard */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Gauge className="w-4 h-4" /> Performa Kompresi & VRAM
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {result.metrics.processTimeMs} ms Latensi
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">Ukuran Asli:</span>
                    <span className="font-mono text-xs font-bold text-slate-300">
                      {result.metrics.originalTotalSizeKb} KB
                    </span>
                  </div>

                  <div className="p-2 bg-slate-900 rounded-lg border border-emerald-500/40">
                    <span className="text-[9px] text-slate-400 block">Atlas Kompresi:</span>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {result.metrics.compressedAtlasSizeKb} KB (-{result.metrics.savedStoragePercent}%)
                    </span>
                  </div>

                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">Estimasi VRAM GPU:</span>
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {result.metrics.vramFootprintMb} MB
                    </span>
                  </div>

                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">Dimensi Atlas:</span>
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {result.atlasWidth}x{result.atlasHeight} px
                    </span>
                  </div>
                </div>
              </div>

              {/* Atlas Canvas Preview */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" /> Preview Spritesheet Atlas Packed
                  </span>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBoundingBoxes}
                      onChange={(e) => setShowBoundingBoxes(e.target.checked)}
                      className="rounded accent-cyan-500 cursor-pointer"
                    />
                    <span>Garis Bounding Box</span>
                  </label>
                </div>

                <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center overflow-auto max-h-64 min-h-[160px] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px]">
                  <canvas ref={canvasRef} className="max-w-full h-auto rounded border border-slate-700/50 shadow-md" />
                </div>

                {/* Save & Download Actions */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={atlasName}
                      onChange={(e) => setAtlasName(e.target.value)}
                      placeholder="Nama Atlas"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <button
                      onClick={handleSaveToProjectAssets}
                      className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <HardDrive className="w-4 h-4" />
                      <span>Simpan ke Aset Game</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadImage}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Atlas ({options.format === 'image/webp' ? 'WebP' : 'PNG'})</span>
                    </button>

                    <button
                      onClick={handleDownloadJson}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Unduh JSON Metadata</span>
                    </button>

                    <button
                      onClick={handleCopyJson}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                      title="Salin JSON Metadata"
                    >
                      {copiedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Belum ada gambar yang dimasukkan. Pilih file gambar atau klik "Preset Demo" di panel kiri.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
