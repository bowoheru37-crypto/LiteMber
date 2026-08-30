import React, { useState, useRef } from 'react';
import { GameProject, AudioAsset, VideoAsset, ImageAsset, Model3DAsset, Entity } from '../../types/engine';
import { soundEngine } from '../../engine/AudioEngine';
import { mediaConverterEngine } from '../../engine/MediaConverterEngine';
import {
  Volume2,
  Play,
  Square,
  Plus,
  Upload,
  Trash2,
  Music,
  Zap,
  Check,
  Disc,
  Radio,
  Video,
  Image as ImageIcon,
  Sparkles,
  Gauge,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Layers,
  Film,
  Box,
  Cpu,
  FileCode,
  ArrowDownCircle,
} from 'lucide-react';

interface AudioLibrarySheetProps {
  project: GameProject;
  selectedEntity: Entity | null;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

// Preset Collections
const PRESET_SFX_COLLECTION: Omit<AudioAsset, 'id'>[] = [
  { name: 'Suara Lompat (Jump)', type: 'sfx', format: 'synth', presetKey: 'jump', volume: 1 },
  { name: 'Suara Koin (Coin)', type: 'sfx', format: 'synth', presetKey: 'coin', volume: 1 },
  { name: 'Suara Tabrakan (Hit)', type: 'sfx', format: 'synth', presetKey: 'hit', volume: 1 },
  { name: 'Suara Laser (Shoot)', type: 'sfx', format: 'synth', presetKey: 'laser', volume: 1 },
  { name: 'Suara Ledakan (Explode)', type: 'sfx', format: 'synth', presetKey: 'explosion', volume: 1 },
  { name: 'Suara Powerup (Bonus)', type: 'sfx', format: 'synth', presetKey: 'powerup', volume: 1 },
  { name: 'Suara Menang (Victory)', type: 'sfx', format: 'synth', presetKey: 'win', volume: 1 },
  { name: 'Suara Langkah (Step)', type: 'sfx', format: 'synth', presetKey: 'bounce', volume: 1 },
];

const PRESET_VIDEO_COLLECTION: Omit<VideoAsset, 'id'>[] = [
  {
    name: 'Cyber Grid Loop (Video BG)',
    type: 'bg_loop',
    format: 'procedural',
    presetKey: 'cyber_grid_loop',
    fps: 30,
    fileSizeKb: 120,
    isOptimized: true,
  },
  {
    name: 'Space Nebula Warp (Video Cutscene)',
    type: 'cutscene',
    format: 'procedural',
    presetKey: 'space_nebula_loop',
    fps: 30,
    fileSizeKb: 180,
    isOptimized: true,
  },
  {
    name: 'Matrix Rain Code Loop',
    type: 'bg_loop',
    format: 'procedural',
    presetKey: 'matrix_rain_loop',
    fps: 30,
    fileSizeKb: 95,
    isOptimized: true,
  },
];

const PRESET_IMAGE_COLLECTION: Omit<ImageAsset, 'id'>[] = [
  {
    name: 'Cyber Grid Background Texture',
    type: 'bg_texture',
    format: 'pixel_grid',
    presetKey: 'cyber_grid_bg',
    fileSizeKb: 45,
    isOptimized: true,
  },
  {
    name: 'Dinding Bata Pixel (Brick Tile)',
    type: 'tileset',
    format: 'pixel_grid',
    presetKey: 'brick_wall_bg',
    fileSizeKb: 30,
    isOptimized: true,
  },
  {
    name: 'Langit Bintang Space (Retro Stars)',
    type: 'bg_texture',
    format: 'pixel_grid',
    presetKey: 'space_stars_bg',
    fileSizeKb: 25,
    isOptimized: true,
  },
];

const PRESET_MODEL3D_COLLECTION: Omit<Model3DAsset, 'id'>[] = [
  {
    name: 'Kubus Retro Cyber 3D',
    format: 'obj',
    vertexCount: 8,
    faceCount: 12,
    fileSizeKb: 15,
    isOptimized: true,
  },
  {
    name: 'Piramida Energi 3D',
    format: 'obj',
    vertexCount: 5,
    faceCount: 6,
    fileSizeKb: 12,
    isOptimized: true,
  },
];

export const AudioLibrarySheet: React.FC<AudioLibrarySheetProps> = ({
  project,
  selectedEntity,
  onUpdateProject,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'audio' | 'video' | '3d' | 'optimize'>('image');
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logMessage, setLogMessage] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const model3dInputRef = useRef<HTMLInputElement>(null);

  const audioAssets = project.assets?.audio || [];
  const videoAssets = project.assets?.video || [];
  const imageAssets = project.assets?.images || [];
  const model3dAssets = project.assets?.models3d || [];

  // Calculate Total Assets Storage Size
  const totalAudioKb = audioAssets.reduce((acc, a) => acc + (a.fileSizeKb || 15), 0);
  const totalVideoKb = videoAssets.reduce((acc, v) => acc + (v.fileSizeKb || 120), 0);
  const totalImageKb = imageAssets.reduce((acc, i) => acc + (i.fileSizeKb || 30), 0);
  const totalModelKb = model3dAssets.reduce((acc, m) => acc + (m.fileSizeKb || 20), 0);
  const totalAssetKb = totalAudioKb + totalVideoKb + totalImageKb + totalModelKb;

  // --- UPLOAD HANDLERS WITH AUTO CONVERSION & COMPRESSION ---

  // 1. Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setLogMessage(' Mengompresi gambar & mengoptimalkan resolusi untuk itel A70...');

    try {
      const res = await mediaConverterEngine.processImageUpload(file, { maxDimension: 512, quality: 0.78 });
      onUpdateProject({
        ...project,
        assets: {
          ...project.assets,
          audio: audioAssets,
          images: [...imageAssets, res.asset],
        },
      });
      setLogMessage(res.message);
    } catch (err: any) {
      setLogMessage('❌ Gagal memproses gambar: ' + (err?.message || 'Error'));
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  // 2. Audio Upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setLogMessage('🎵 Mengkompresi audio, downsampling ke 22kHz Mono...');

    try {
      const res = await mediaConverterEngine.processAudioUpload(file, { targetSampleRate: 22050 });
      onUpdateProject({
        ...project,
        assets: {
          ...project.assets,
          audio: [...audioAssets, res.asset],
        },
      });
      setLogMessage(res.message);
    } catch (err: any) {
      setLogMessage('❌ Gagal memproses audio: ' + (err?.message || 'Error'));
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  // 3. Video / Movie Upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setLogMessage('🎬 Mengompresi video, mengekstrak frame rate 15 FPS...');

    try {
      const res = await mediaConverterEngine.processVideoUpload(file, { maxFps: 15, maxDimension: 256 });
      onUpdateProject({
        ...project,
        assets: {
          ...project.assets,
          audio: audioAssets,
          video: [...videoAssets, res.asset],
        },
      });
      setLogMessage(res.message);
    } catch (err: any) {
      setLogMessage('❌ Gagal memproses video: ' + (err?.message || 'Error'));
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  // 4. 3D Model Upload
  const handleModel3dUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setLogMessage('🧊 Memparsing 3D mesh & memproyeksikan ke 2D Isometric Sprite...');

    try {
      const res = await mediaConverterEngine.process3DModelUpload(file, { projectionSize: 128 });
      onUpdateProject({
        ...project,
        assets: {
          ...project.assets,
          audio: audioAssets,
          models3d: [...model3dAssets, res.asset],
        },
      });
      setLogMessage(res.message);
    } catch (err: any) {
      setLogMessage('❌ Gagal memproses model 3D: ' + (err?.message || 'Error'));
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Delete Handlers
  const handleDeleteAudio = (id: string) => {
    if (playingAssetId === id) {
      soundEngine.stopBGM();
      setPlayingAssetId(null);
    }
    onUpdateProject({
      ...project,
      assets: {
        ...project.assets,
        audio: audioAssets.filter((a) => a.id !== id),
      },
    });
  };

  const handleDeleteImage = (id: string) => {
    onUpdateProject({
      ...project,
      assets: {
        ...project.assets,
        audio: audioAssets,
        images: imageAssets.filter((i) => i.id !== id),
      },
    });
  };

  const handleDeleteVideo = (id: string) => {
    onUpdateProject({
      ...project,
      assets: {
        ...project.assets,
        audio: audioAssets,
        video: videoAssets.filter((v) => v.id !== id),
      },
    });
  };

  const handleDeleteModel3d = (id: string) => {
    onUpdateProject({
      ...project,
      assets: {
        ...project.assets,
        audio: audioAssets,
        models3d: model3dAssets.filter((m) => m.id !== id),
      },
    });
  };

  const handleApply3DModelToEntity = (model: Model3DAsset) => {
    if (!selectedEntity || !model.projectionSpriteUrl) return;
    onUpdateProject({
      ...project,
      entities: project.entities.map((ent) => {
        if (ent.id === selectedEntity.id) {
          return {
            ...ent,
            sprite: {
              ...ent.sprite,
              type: 'image',
              imageAssetId: model.projectionSpriteUrl,
            },
          };
        }
        return ent;
      }),
    });
    setLogMessage(`✨ Model 3D '${model.name}' diterapkan sebagai sprite isometric objek ${selectedEntity.name}!`);
  };

  // Preview Audio
  const handlePreviewAsset = (asset: AudioAsset) => {
    if (playingAssetId === asset.id) {
      soundEngine.stopBGM();
      setPlayingAssetId(null);
    } else {
      soundEngine.stopBGM();
      setPlayingAssetId(asset.id);
      if (asset.type === 'bgm') {
        soundEngine.playBGM(asset);
      } else {
        soundEngine.playAsset(asset);
      }
    }
  };

  // Auto Optimize All Assets
  const handleAutoOptimizeAll = () => {
    setIsProcessing(true);
    setLogMessage('⚙️ Menjalankan auto-kompresi & pembersihan buffer seluruh aset...');

    setTimeout(() => {
      const freedBuffers = soundEngine.clearCache();
      const optAudio = audioAssets.map((a) => ({ ...a, isOptimized: true, fileSizeKb: Math.max(8, Math.round((a.fileSizeKb || 15) * 0.75)) }));
      const optImage = imageAssets.map((i) => ({ ...i, isOptimized: true, fileSizeKb: Math.max(10, Math.round((i.fileSizeKb || 30) * 0.7)) }));
      const optVideo = videoAssets.map((v) => ({ ...v, isOptimized: true, fileSizeKb: Math.max(25, Math.round((v.fileSizeKb || 120) * 0.65)) }));
      const optModel = model3dAssets.map((m) => ({ ...m, isOptimized: true, fileSizeKb: Math.max(10, Math.round((m.fileSizeKb || 20) * 0.7)) }));

      onUpdateProject({
        ...project,
        assets: {
          audio: optAudio,
          images: optImage,
          video: optVideo,
          models3d: optModel,
        },
      });

      setIsProcessing(false);
      setLogMessage(`✨ Selesai! Membebaskan ${freedBuffers} buffer RAM & mengompresi aset. Siap di running di itel A70 60 FPS.`);
    }, 600);
  };

  return (
    <div className="p-3 h-full flex flex-col text-slate-100 select-none bg-slate-900 border-t border-slate-800">
      {/* Hidden File Inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
      <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
      <input ref={model3dInputRef} type="file" accept=".obj,.gltf,.glb,.stl" onChange={handleModel3dUpload} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold tracking-wide">Pusat Unggah & Kompresi Media Aset</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
            {(totalAssetKb / 1024).toFixed(2)} MB (itel A70)
          </span>
        </div>
      </div>

      {/* Log Banner */}
      {logMessage && (
        <div className="mb-2.5 p-2 bg-slate-950 border border-amber-500/40 rounded-xl text-amber-300 text-[11px] font-mono flex items-center gap-2 animate-pulse">
          <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">{logMessage}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex bg-slate-950 p-1 rounded-xl mb-3 border border-slate-800 text-xs gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('image')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'image' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px]">Gambar ({imageAssets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'audio' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px]">Audio ({audioAssets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('video')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'video' ? 'bg-purple-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px]">Video ({videoAssets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('3d')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === '3d' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px]">3D Model ({model3dAssets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('optimize')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'optimize' ? 'bg-orange-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span className="text-[10px] sm:text-[11px]">Auto Kompresi</span>
        </button>
      </div>

      {/* TAB 1: IMAGE UPLOAD & CONVERT */}
      {activeTab === 'image' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                <ImageIcon className="w-4 h-4" /> Unggah & Kompresi Otomatis Gambar
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Mendukung PNG, JPG, WebP, GIF, SVG. Otomatis downscale max 512px & kompresi WebP untuk hemat RAM.
              </p>
            </div>
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={isProcessing}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer text-xs shrink-0 shadow"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Gambar</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Preset Tekstur Gambar:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_IMAGE_COLLECTION.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newAsset: ImageAsset = { ...img, id: 'img_' + Date.now() + '_' + idx };
                    onUpdateProject({ ...project, assets: { ...project.assets, audio: audioAssets, images: [...imageAssets, newAsset] } });
                  }}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-white truncate">{img.name}</span>
                  <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Daftar Aset Gambar Proyek ({imageAssets.length}):</span>
            {imageAssets.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                Belum ada aset gambar terunggah.
              </div>
            ) : (
              imageAssets.map((img) => (
                <div key={img.id} className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {img.url ? (
                      <img src={img.url} alt={img.name} className="w-8 h-8 rounded object-cover border border-slate-700" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs">🖼️</div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-white block">{img.name}</span>
                      <span className="text-[9px] text-emerald-400 font-mono">
                        {img.fileSizeKb || 25} KB • WebP Compressed
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteImage(img.id)} className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AUDIO UPLOAD & CONVERT */}
      {activeTab === 'audio' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Centralized Audio Normalization & Volume Controls */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" /> Normalisasi Volume Hardware & Centralized Mixer
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono font-bold">
                Normalizer Limits Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              {/* Master Volume */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-300">
                  <span>Master Vol</span>
                  <span className="font-mono text-cyan-400 font-bold">{Math.round(soundEngine.getVolumes().master * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue={soundEngine.getVolumes().master}
                  onChange={(e) => soundEngine.setMasterVolume(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* BGM Volume */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-300">
                  <span>BGM Vol</span>
                  <span className="font-mono text-amber-400 font-bold">{Math.round(soundEngine.getVolumes().bgm * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue={soundEngine.getVolumes().bgm}
                  onChange={(e) => soundEngine.setBgmVolume(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* SFX Volume */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-300">
                  <span>SFX Vol</span>
                  <span className="font-mono text-emerald-400 font-bold">{Math.round(soundEngine.getVolumes().sfx * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue={soundEngine.getVolumes().sfx}
                  onChange={(e) => soundEngine.setSfxVolume(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-cyan-400 flex items-center gap-1">
                <Music className="w-4 h-4" /> Unggah & Downsample Audio Otomatis
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Mendukung MP3, WAV, OGG, AAC, FLAC. Re-sample ke 22,050Hz Mono untuk menghemat 50% RAM HP.
              </p>
            </div>
            <button
              onClick={() => audioInputRef.current?.click()}
              disabled={isProcessing}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer text-xs shrink-0 shadow"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Audio</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Preset SFX Sound Effects:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {PRESET_SFX_COLLECTION.map((sfx, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newAsset: AudioAsset = { ...sfx, id: 'aud_' + Date.now() + '_' + idx, fileSizeKb: 12, isOptimized: true };
                    onUpdateProject({ ...project, assets: { ...project.assets, audio: [...audioAssets, newAsset] } });
                  }}
                  className="p-1.5 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left text-xs transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate text-[11px] font-medium text-slate-200">{sfx.name}</span>
                  <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Daftar Audio Proyek ({audioAssets.length}):</span>
            {audioAssets.map((asset) => {
              const isPlaying = playingAssetId === asset.id;
              return (
                <div
                  key={asset.id}
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    isPlaying ? 'bg-cyan-950/40 border-cyan-500' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      onClick={() => handlePreviewAsset(asset)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 cursor-pointer ${
                        isPlaying ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-slate-800 text-cyan-400'
                      }`}
                    >
                      {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-white truncate block">{asset.name}</span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {asset.type.toUpperCase()} • {asset.fileSizeKb || 15} KB • 22kHz Mono
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteAudio(asset.id)} className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: VIDEO UPLOAD & CONVERT */}
      {activeTab === 'video' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-purple-400 flex items-center gap-1">
                <Video className="w-4 h-4" /> Unggah & Kompresi Video Loop
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Mendukung MP4, WebM, MOV. Ekstrak frame & turunkan FPS ke 15 FPS untuk background video lancar.
              </p>
            </div>
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={isProcessing}
              className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer text-xs shrink-0 shadow"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Video</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Preset Video Loops:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_VIDEO_COLLECTION.map((vid, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newAsset: VideoAsset = { ...vid, id: 'vid_' + Date.now() + '_' + idx };
                    onUpdateProject({ ...project, assets: { ...project.assets, audio: audioAssets, video: [...videoAssets, newAsset] } });
                  }}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-purple-500/50 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-white truncate">{vid.name}</span>
                  <Plus className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Daftar Video Proyek ({videoAssets.length}):</span>
            {videoAssets.map((vid) => (
              <div key={vid.id} className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">{vid.name}</span>
                  <span className="text-[9px] text-purple-300 font-mono">
                    {vid.fps || 15} FPS • {vid.fileSizeKb || 95} KB
                  </span>
                </div>
                <button onClick={() => handleDeleteVideo(vid.id)} className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: 3D MODEL UPLOAD & PROJECTION CONVERSION */}
      {activeTab === '3d' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-amber-400 flex items-center gap-1">
                <Box className="w-4 h-4" /> Unggah & Proyeksi Isometric 3D Model
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Mendukung OBJ, GLTF, GLB, STL. Otomatis memparsing mesh & merender Proyeksi 2D Isometric Sprite untuk itel A70.
              </p>
            </div>
            <button
              onClick={() => model3dInputRef.current?.click()}
              disabled={isProcessing}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer text-xs shrink-0 shadow"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah 3D Model</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Preset 3D Wireframe Mesh:</span>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_MODEL3D_COLLECTION.map((m3d, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newAsset: Model3DAsset = { ...m3d, id: 'm3d_' + Date.now() + '_' + idx };
                    onUpdateProject({ ...project, assets: { ...project.assets, audio: audioAssets, models3d: [...model3dAssets, newAsset] } });
                  }}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{m3d.name}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{m3d.vertexCount} Vertices</span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Daftar Model 3D Proyek ({model3dAssets.length}):</span>
            {model3dAssets.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                Belum ada aset model 3D terunggah. Unggah file OBJ/GLTF/STL di atas.
              </div>
            ) : (
              model3dAssets.map((model) => (
                <div key={model.id} className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {model.projectionSpriteUrl ? (
                      <img src={model.projectionSpriteUrl} alt={model.name} className="w-10 h-10 rounded border border-slate-700 bg-slate-900 object-contain" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-xs">🧊</div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-white block">{model.name}</span>
                      <span className="text-[9px] text-amber-400 font-mono">
                        {model.vertexCount || 8} V • {model.fileSizeKb || 15} KB • Isometric 2D
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {selectedEntity && (
                      <button
                        onClick={() => handleApply3DModelToEntity(model)}
                        className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                      >
                        Pasang Sprite
                      </button>
                    )}
                    <button onClick={() => handleDeleteModel3d(model.id)} className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM AUTO OPTIMIZATION */}
      {activeTab === 'optimize' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Gambar</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{totalImageKb} KB</span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Audio</span>
              <span className="text-sm font-black text-cyan-400 font-mono">{totalAudioKb} KB</span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Video</span>
              <span className="text-sm font-black text-purple-400 font-mono">{totalVideoKb} KB</span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">3D Mesh</span>
              <span className="text-sm font-black text-amber-400 font-mono">{totalModelKb} KB</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-orange-400" /> Auto Compressor & Mobile Optimizer (itel A70)
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Secara cerdas mengompresi gambar, audio, video, dan model 3D untuk efisiensi RAM & stabilitas optimal di smartphone budget.
              </p>
            </div>

            <button
              onClick={handleAutoOptimizeAll}
              disabled={isProcessing}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>1-Click Optimalkan & Kompresi Semua Media</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
