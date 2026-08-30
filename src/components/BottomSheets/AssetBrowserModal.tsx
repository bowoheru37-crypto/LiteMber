import React, { useState, useRef } from 'react';
import { GameProject, ImageAsset, AudioAsset, VideoAsset, Model3DAsset, Entity, EntityType } from '../../types/engine';
import { UnifiedSheetHeader } from '../Common/UnifiedSheetHeader';
import { mediaConverterEngine } from '../../engine/MediaConverterEngine';
import { soundEngine } from '../../engine/AudioEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';
import { assetManager } from '../../engine/AssetManager';
import {
  FolderOpen,
  Image as ImageIcon,
  Volume2,
  Video,
  Grid,
  Box,
  Upload,
  Plus,
  Trash2,
  Search,
  CheckSquare,
  Square,
  Play,
  Pause,
  Layers,
  Sparkles,
  Zap,
  ArrowRight,
  Sliders,
  Check,
  Package,
  Cpu,
  Info,
  RefreshCw,
  X,
} from 'lucide-react';

interface AssetBrowserModalProps {
  project: GameProject;
  selectedEntity?: Entity | null;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
  onSelectAssetForAssembly?: (asset: { id: string; category: string; name: string; url?: string }) => void;
}

export const AssetBrowserModal: React.FC<AssetBrowserModalProps> = ({
  project,
  selectedEntity,
  onUpdateProject,
  onClose,
  onSelectAssetForAssembly,
}) => {
  // Category state
  const [activeCategory, setActiveCategory] = useState<'all' | 'image' | 'audio' | 'video' | 'tile' | '3d' | 'animation'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Batch Selection State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedAssetKeys, setSelectedAssetKeys] = useState<Set<string>>(new Set());

  // Asset Inspection / Validation Modal
  const [inspectedAssetReport, setInspectedAssetReport] = useState<any | null>(null);

  // Batch Uploading / Converting State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadLogs, setUploadLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Preview State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Orphaned Assets Scan & Cleanup State
  const [orphanedAssetsList, setOrphanedAssetsList] = useState(() => assetManager.scanOrphanedAssets(project));
  const [cleanupNotification, setCleanupNotification] = useState<string | null>(null);

  const handleCleanupOrphanedAssets = () => {
    const report = assetManager.cleanupOrphanedAssets(project);
    onUpdateProject(report.cleanedProject);
    setOrphanedAssetsList([]);
    if (report.orphanedCount > 0) {
      setCleanupNotification(`✅ Berhasil membersihkan ${report.orphanedCount} aset tak terpakai! Terbebas ${report.freedMb > 0 ? report.freedMb + ' MB' : report.freedKb + ' KB'} memori.`);
    } else {
      setCleanupNotification(`ℹ️ Tidak ada aset yatim yang perlu dibersihkan. Semua aset aktif di-referensikan.`);
    }
    AndroidEngine.triggerHaptic(35);
  };

  // Load Built-in Asset Kit
  const handleLoadBuiltinAssets = () => {
    const kit = assetManager.getBuiltinAssetLibrary();
    const newImages = [...(project.assets?.images || [])];
    const newAudio = [...(project.assets?.audio || [])];
    const newVideo = [...(project.assets?.video || [])];
    const new3D = [...(project.assets?.models3d || [])];
    const newAnim = [...(project.assets?.animations || [])];

    kit.images.forEach((img) => {
      if (!newImages.some((i) => i.id === img.id)) newImages.push(img);
    });
    kit.audio.forEach((aud) => {
      if (!newAudio.some((a) => a.id === aud.id)) newAudio.push(aud);
    });
    kit.video.forEach((vid) => {
      if (!newVideo.some((v) => v.id === vid.id)) newVideo.push(vid);
    });
    kit.models3d.forEach((m3d) => {
      if (!new3D.some((m) => m.id === m3d.id)) new3D.push(m3d);
    });
    kit.animations.forEach((anim) => {
      if (!newAnim.some((a) => a.id === anim.id)) newAnim.push(anim);
    });

    onUpdateProject({
      ...project,
      assets: {
        ...project.assets,
        images: newImages,
        audio: newAudio,
        video: newVideo,
        models3d: new3D,
        animations: newAnim,
      },
    });

    setCleanupNotification(`⚡ Berhasil memuat Built-in Cyber Asset Kit (2D Sprite, 3D Mesh, Audio Foley, Looping Video, dan Animasi Clip)!`);
    AndroidEngine.triggerHaptic(30);
  };

  // Batch Assembly Config Dialog State
  const [isAssemblyConfigOpen, setIsAssemblyConfigOpen] = useState(false);
  const [assemblyLayout, setAssemblyLayout] = useState<'row' | 'column' | 'grid' | 'stack'>('grid');
  const [assemblyStartX, setAssemblyStartX] = useState(120);
  const [assemblyStartY, setAssemblyStartY] = useState(200);
  const [assemblySpacing, setAssemblySpacing] = useState(24);
  const [assemblyGridCols, setAssemblyGridCols] = useState(3);
  const [assemblyPhysicsPreset, setAssemblyPhysicsPreset] = useState<'none' | 'platform' | 'coin' | 'enemy' | 'trigger'>('none');

  // Unified Asset Collections
  const imageAssets: ImageAsset[] = project.assets?.images || [];
  const audioAssets: AudioAsset[] = project.assets?.audio || [];
  const videoAssets: VideoAsset[] = project.assets?.video || [];
  const model3dAssets: Model3DAsset[] = project.assets?.models3d || [];
  const animationAssets: any[] = project.assets?.animations || [];
  const tilesets = project.assets?.tilesets || [];

  // Filter Assets by Category & Search
  const getAllUnifiedAssets = () => {
    const list: Array<{
      key: string;
      id: string;
      name: string;
      category: 'image' | 'audio' | 'video' | 'tile' | '3d' | 'animation';
      format?: string;
      sizeKb?: number;
      url?: string;
      rawAsset: any;
    }> = [];

    imageAssets.forEach((img) => {
      list.push({
        key: `img_${img.id}`,
        id: img.id,
        name: img.name,
        category: 'image',
        format: img.format,
        sizeKb: img.fileSizeKb,
        url: img.url,
        rawAsset: img,
      });
    });

    audioAssets.forEach((aud) => {
      list.push({
        key: `aud_${aud.id}`,
        id: aud.id,
        name: aud.name,
        category: 'audio',
        format: aud.type === 'bgm' ? 'BGM Audio' : 'SFX Audio',
        sizeKb: aud.fileSizeKb,
        url: aud.url,
        rawAsset: aud,
      });
    });

    videoAssets.forEach((vid) => {
      list.push({
        key: `vid_${vid.id}`,
        id: vid.id,
        name: vid.name,
        category: 'video',
        format: vid.type,
        sizeKb: vid.fileSizeKb,
        url: vid.url,
        rawAsset: vid,
      });
    });

    model3dAssets.forEach((m3d) => {
      list.push({
        key: `3d_${m3d.id}`,
        id: m3d.id,
        name: m3d.name,
        category: '3d',
        format: m3d.format,
        sizeKb: m3d.fileSizeKb,
        url: m3d.projectionSpriteUrl || m3d.url,
        rawAsset: m3d,
      });
    });

    animationAssets.forEach((anim) => {
      list.push({
        key: `anim_${anim.id}`,
        id: anim.id,
        name: anim.name,
        category: 'animation',
        format: `${anim.fps || 12} FPS ${anim.type || 'Clip'}`,
        sizeKb: anim.fileSizeKb || 12,
        rawAsset: anim,
      });
    });

    tilesets.forEach((ts) => {
      list.push({
        key: `tile_${ts.id}`,
        id: ts.id,
        name: ts.name,
        category: 'tile',
        format: `${ts.tileSize}px Tileset`,
        rawAsset: ts,
      });
    });

    return list;
  };

  const allAssets = getAllUnifiedAssets();

  const filteredAssets = allAssets.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    }
    return true;
  });

  // Batch Select Toggle
  const toggleSelectAsset = (key: string) => {
    const updated = new Set(selectedAssetKeys);
    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }
    setSelectedAssetKeys(updated);
    AndroidEngine.triggerHaptic(10);
  };

  const handleSelectAllFiltered = () => {
    const updated = new Set(selectedAssetKeys);
    filteredAssets.forEach((a) => updated.add(a.key));
    setSelectedAssetKeys(updated);
  };

  const handleDeselectAll = () => {
    setSelectedAssetKeys(new Set());
  };

  // Audio Preview Toggle
  const handleToggleAudioPreview = (aud: AudioAsset) => {
    if (playingAudioId === aud.id) {
      soundEngine.stopBGM();
      setPlayingAudioId(null);
    } else {
      soundEngine.playAsset(aud);
      setPlayingAudioId(aud.id);
    }
  };

  // Drag & Drop State
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Core Batch Process Files Pipeline
  const processFilesBatch = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    setUploadLogs([]);

    const newImages: ImageAsset[] = [...(project.assets?.images || [])];
    const newAudio: AudioAsset[] = [...(project.assets?.audio || [])];
    const newVideo: VideoAsset[] = [...(project.assets?.video || [])];
    const new3D: Model3DAsset[] = [...(project.assets?.models3d || [])];

    const logs: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length });

      try {
        if (file.type.startsWith('image/')) {
          const res = await mediaConverterEngine.processImageUpload(file, { maxDimension: 512, quality: 0.8 });
          newImages.push(res.asset);
          logs.push(res.message);
        } else if (file.type.startsWith('audio/')) {
          const res = await mediaConverterEngine.processAudioUpload(file);
          newAudio.push(res.asset);
          logs.push(res.message);
        } else if (file.type.startsWith('video/')) {
          const res = await mediaConverterEngine.processVideoUpload(file);
          newVideo.push(res.asset);
          logs.push(res.message);
        } else if (file.name.endsWith('.obj') || file.name.endsWith('.gltf') || file.name.endsWith('.glb') || file.name.endsWith('.stl')) {
          const res = await mediaConverterEngine.process3DModelUpload(file);
          new3D.push(res.asset);
          logs.push(res.message);
        } else {
          logs.push(`⚠️ Skipping ${file.name}: Unsupported file format`);
        }
      } catch (err: any) {
        logs.push(`❌ Gagal memproses ${file.name}: ${err.message || 'Error'}`);
      }
    }

    onUpdateProject({
      ...project,
      assets: {
        ...project.assets,
        images: newImages,
        audio: newAudio,
        video: newVideo,
        models3d: new3D,
      },
    });

    setUploadLogs(logs);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    AndroidEngine.triggerHaptic(30);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFilesBatch(e.dataTransfer.files);
    }
  };

  // Batch File Import / Upload Handler from Input
  const handleBatchFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFilesBatch(e.target.files);
    }
  };

  // Batch Delete Selected Assets
  const handleBatchDeleteSelected = () => {
    if (selectedAssetKeys.size === 0) return;

    const keysToDelete = Array.from(selectedAssetKeys);

    const remainingImages = imageAssets.filter((img) => !keysToDelete.includes(`img_${img.id}`));
    const remainingAudio = audioAssets.filter((aud) => !keysToDelete.includes(`aud_${aud.id}`));
    const remainingVideo = videoAssets.filter((vid) => !keysToDelete.includes(`vid_${vid.id}`));
    const remaining3D = model3dAssets.filter((m3d) => !keysToDelete.includes(`3d_${m3d.id}`));
    const remainingTiles = tilesets.filter((ts) => !keysToDelete.includes(`tile_${ts.id}`));

    onUpdateProject({
      ...project,
      assets: {
        ...project.assets,
        images: remainingImages,
        audio: remainingAudio,
        video: remainingVideo,
        models3d: remaining3D,
        tilesets: remainingTiles,
      },
    });

    setSelectedAssetKeys(new Set());
    AndroidEngine.triggerHaptic(25);
  };

  // Batch Instantiate Selected Assets into Scene
  const handleExecuteBatchAssembly = () => {
    const selectedItems = allAssets.filter((a) => selectedAssetKeys.has(a.key));
    if (selectedItems.length === 0) return;

    const baseWidth = 48;
    const baseHeight = 48;

    const newEntities: Entity[] = [];

    selectedItems.forEach((asset, idx) => {
      let posX = assemblyStartX;
      let posY = assemblyStartY;

      if (assemblyLayout === 'row') {
        posX = assemblyStartX + idx * (baseWidth + assemblySpacing);
        posY = assemblyStartY;
      } else if (assemblyLayout === 'column') {
        posX = assemblyStartX;
        posY = assemblyStartY + idx * (baseHeight + assemblySpacing);
      } else if (assemblyLayout === 'grid') {
        const col = idx % Math.max(1, assemblyGridCols);
        const row = Math.floor(idx / Math.max(1, assemblyGridCols));
        posX = assemblyStartX + col * (baseWidth + assemblySpacing);
        posY = assemblyStartY + row * (baseHeight + assemblySpacing);
      } else if (assemblyLayout === 'stack') {
        posX = assemblyStartX + idx * 4;
        posY = assemblyStartY + idx * 4;
      }

      let entType: EntityType = 'platform';
      if (asset.category === 'audio') entType = 'trigger';
      if (assemblyPhysicsPreset === 'coin') entType = 'coin';
      if (assemblyPhysicsPreset === 'enemy') entType = 'enemy';

      const newEntity: Entity = {
        id: `ent_batch_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
        name: asset.name,
        type: entType,
        visible: true,
        locked: false,
        transform: {
          x: posX,
          y: posY,
          width: baseWidth,
          height: baseHeight,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 10 + idx,
        },
        sprite: {
          type: asset.category === 'video' ? 'video' : 'preset',
          color: asset.category === 'audio' ? '#a855f7' : '#38bdf8',
          presetIcon: asset.category === 'image' ? 'star' : 'box',
          imageAssetId: asset.category === 'image' ? asset.id : undefined,
          videoAssetId: asset.category === 'video' ? asset.id : undefined,
          opacity: 1,
        },
        rigidbody: {
          bodyType:
            assemblyPhysicsPreset === 'enemy'
              ? 'dynamic'
              : assemblyPhysicsPreset === 'platform' || assemblyPhysicsPreset === 'coin'
              ? 'static'
              : 'static',
          mass: 1,
          gravityScale: assemblyPhysicsPreset === 'enemy' ? 1 : 0,
          velocityX: 0,
          velocityY: 0,
          friction: 0.1,
          restitution: assemblyPhysicsPreset === 'coin' ? 0.5 : 0.2,
          isGrounded: false,
          fixedRotation: true,
        },
        collider: {
          enabled: assemblyPhysicsPreset !== 'none',
          type: assemblyPhysicsPreset === 'coin' ? 'circle' : 'box',
          isTrigger: assemblyPhysicsPreset === 'coin' || assemblyPhysicsPreset === 'trigger' || asset.category === 'audio',
          offsetX: 0,
          offsetY: 0,
          width: baseWidth,
          height: baseHeight,
          radius: baseWidth / 2,
        },
        audioSource:
          asset.category === 'audio'
            ? {
                soundOnStart: asset.rawAsset.type === 'sfx' ? asset.id : undefined,
                bgmAssetId: asset.rawAsset.type === 'bgm' ? asset.id : undefined,
                autoplayBgm: asset.rawAsset.type === 'bgm',
                loopBgm: asset.rawAsset.type === 'bgm',
                volume: asset.rawAsset.volume || 0.8,
              }
            : undefined,
      };

      newEntities.push(newEntity);
    });

    onUpdateProject({
      ...project,
      entities: [...project.entities, ...newEntities],
    });

    setIsAssemblyConfigOpen(false);
    setSelectedAssetKeys(new Set());
    AndroidEngine.triggerHaptic(35);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-full text-white bg-slate-900 border-t border-slate-800 relative"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-cyan-950/95 border-2 border-dashed border-cyan-400 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
          <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 mb-4 animate-bounce">
            <Upload className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-black text-white mb-1">Lepaskan File Disini untuk Impor Batch</h3>
          <p className="text-xs text-cyan-200 max-w-md">
            File gambar (WebP/PNG/JPG), audio (MP3/WAV/OGG), video (MP4/WebM), atau model 3D (OBJ/GLTF/GLB/STL) akan dikompresi dan dimasukkan otomatis ke manifest proyek.
          </p>
        </div>
      )}

      {/* Header */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*,audio/*,video/*,.obj,.gltf,.glb"
        onChange={handleBatchFileUpload}
        className="hidden"
      />

      <UnifiedSheetHeader
        title="Asset Library"
        subtitle="Kelola & impor aset lokal ke scene panggung"
        icon={FolderOpen}
        iconColor="text-cyan-400"
        badge={
          <span className="text-[10px] bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono px-2 py-0.5 rounded-md">
            {allAssets.length} ASET
          </span>
        }
        action={
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCleanupOrphanedAssets}
              title="Bersihkan aset tidak terpakai"
              className="min-h-[40px] px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="hidden sm:inline">Unused ({orphanedAssetsList.length})</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="min-h-[40px] px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-900/30 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>{isUploading ? `Upload (${uploadProgress.current}/${uploadProgress.total})` : 'Unggah'}</span>
            </button>
          </div>
        }
        onClose={onClose}
      />

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Cleanup Notification Banner */}
        {cleanupNotification && (
          <div className="bg-slate-950 p-3 rounded-2xl border border-emerald-500/40 flex items-center justify-between text-xs font-bold text-emerald-300">
            <span>{cleanupNotification}</span>
            <button
              onClick={() => setCleanupNotification(null)}
              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {/* Upload Logs Feedback Bar */}
        {uploadLogs.length > 0 && (
          <div className="bg-slate-950 p-3 rounded-2xl border border-cyan-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Log Impor Batch Terakhir
              </span>
              <button
                onClick={() => setUploadLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Tutup Log
              </button>
            </div>
            <div className="max-h-24 overflow-y-auto text-[10px] font-mono space-y-1 text-slate-300">
              {uploadLogs.map((log, idx) => (
                <p key={idx}>{log}</p>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'all' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua ({allAssets.length})
            </button>
            <button
              onClick={() => setActiveCategory('image')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeCategory === 'image' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Gambar ({imageAssets.length})
            </button>
            <button
              onClick={() => setActiveCategory('audio')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeCategory === 'audio' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              Audio ({audioAssets.length})
            </button>
            <button
              onClick={() => setActiveCategory('video')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeCategory === 'video' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Video ({videoAssets.length})
            </button>
            <button
              onClick={() => setActiveCategory('3d')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeCategory === '3d' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              3D ({model3dAssets.length})
            </button>
            <button
              onClick={() => setActiveCategory('animation')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeCategory === 'animation' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Animasi ({animationAssets.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadBuiltinAssets}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-cyan-950 to-slate-900 border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 transition-all cursor-pointer shadow-sm"
              title="Muat aset bawaan 2D Sprite, 3D Mesh, Audio, Video & Animasi"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kit Preset Bawaan</span>
            </button>
            <button
              onClick={() => setIsBatchMode(!isBatchMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isBatchMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-amber-400" />
              <span>{isBatchMode ? 'Mode Batch Aktif' : 'Pilih Banyak'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama aset, tipe file, atau format..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Batch Action Floating Toolbar (When items selected) */}
        {selectedAssetKeys.size > 0 && (
          <div className="bg-gradient-to-r from-amber-950/90 to-slate-950/90 border border-amber-500/40 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/40">
                {selectedAssetKeys.size}
              </span>
              <span className="text-xs font-bold text-amber-300">Aset Dipilih</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Pilih Semua
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Batal Pilih
              </button>
              <button
                onClick={handleBatchDeleteSelected}
                className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus ({selectedAssetKeys.size})
              </button>
              <button
                onClick={() => setIsAssemblyConfigOpen(true)}
                className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>Pasang Banyak ke Scene</span>
              </button>
            </div>
          </div>
        )}

        {/* Asset Cards Grid */}
        {filteredAssets.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl p-6 bg-slate-950/40 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-300">Tidak Ada Aset Dalam Kategori Ini</p>
              <p className="text-xs text-slate-500 mt-1">
                Klik tombol "Unggah Banyak File" di atas untuk menambahkan aset lokal Anda.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredAssets.map((asset) => {
              const isSelected = selectedAssetKeys.has(asset.key);

              return (
                <div
                  key={asset.key}
                  onClick={() => {
                    if (isBatchMode) {
                      toggleSelectAsset(asset.key);
                    }
                  }}
                  className={`bg-slate-950/90 border rounded-2xl p-2.5 flex flex-col justify-between space-y-2 relative group transition-all shadow-md cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-950/20 shadow-amber-950/40'
                      : 'border-slate-800/90 hover:border-cyan-500/50'
                  }`}
                >
                  {/* Select Checkbox Badge */}
                  {isBatchMode && (
                    <div className="absolute top-2 right-2 z-10">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                      )}
                    </div>
                  )}

                  {/* Preview Box */}
                  <div className="w-full h-24 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-center overflow-hidden relative">
                    {asset.category === 'image' && asset.url ? (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-contain p-1" />
                    ) : asset.category === 'audio' ? (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAudioPreview(asset.rawAsset);
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            playingAudioId === asset.id
                              ? 'bg-purple-500 text-white animate-pulse'
                              : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40'
                          }`}
                        >
                          {playingAudioId === asset.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>
                        <span className="text-[9px] font-mono text-purple-300">
                          {asset.rawAsset.durationSeconds ? `${asset.rawAsset.durationSeconds}s` : 'Audio'}
                        </span>
                      </div>
                    ) : asset.category === 'video' ? (
                      <div className="flex flex-col items-center gap-1 text-emerald-400">
                        <Video className="w-8 h-8" />
                        <span className="text-[9px] font-mono">Video Loop</span>
                      </div>
                    ) : asset.category === '3d' ? (
                      <div className="flex flex-col items-center gap-1 text-amber-400">
                        <Box className="w-8 h-8" />
                        <span className="text-[9px] font-mono">Model 3D</span>
                      </div>
                    ) : asset.category === 'animation' ? (
                      <div className="flex flex-col items-center gap-1 text-pink-400">
                        <Sparkles className="w-8 h-8" />
                        <span className="text-[9px] font-mono">Animasi Clip</span>
                      </div>
                    ) : (
                      <Grid className="w-8 h-8 text-cyan-400" />
                    )}

                    {/* Category Icon Badge */}
                    <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-slate-950/80 border border-slate-800 text-slate-300">
                      {asset.category}
                    </span>

                    {/* Inspection Quick Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rep = assetManager.validateAsset(asset.rawAsset, asset.category as any, 'low_end_mobile');
                        setInspectedAssetReport({ ...rep, assetName: asset.name });
                        AndroidEngine.triggerHaptic(15);
                      }}
                      className="absolute top-1 left-1 w-5 h-5 rounded-md bg-slate-950/80 hover:bg-cyan-600 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 text-[10px] transition-all cursor-pointer"
                      title="Verifikasi Pipeline Layer 1 & Texel Density"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Info Footer */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-200 line-clamp-1">{asset.name}</p>
                    <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-mono">
                      <span>{asset.format || 'Standard'}</span>
                      {asset.sizeKb ? <span>{asset.sizeKb} KB</span> : null}
                    </div>
                  </div>

                  {/* Individual Action Buttons */}
                  {!isBatchMode && (
                    <div className="space-y-1 pt-1">
                      {/* One-click Spawn to Canvas */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const result = assetManager.instantiateEntityFromAsset(project, {
                            id: asset.id,
                            category: asset.category as any,
                            name: asset.name,
                            url: asset.url,
                            rawAsset: asset.rawAsset,
                          });
                          onUpdateProject(result.updatedProject);
                          setCleanupNotification(`✨ Objek game "${result.newEntity.name}" berhasil dibuat di scene!`);
                        }}
                        className="w-full py-1.5 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border border-cyan-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Buat Objek Game</span>
                      </button>

                      {/* If Entity Selected: Inject Asset */}
                      {selectedEntity && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const result = assetManager.injectAssetIntoEntity(project, selectedEntity.id, {
                              id: asset.id,
                              category: asset.category as any,
                              name: asset.name,
                              url: asset.url,
                              rawAsset: asset.rawAsset,
                            });
                            if (result.updatedEntity) {
                              onUpdateProject(result.updatedProject);
                              setCleanupNotification(`🎯 Aset "${asset.name}" berhasil diterapkan ke entitas "${selectedEntity.name}"!`);
                            }
                          }}
                          className="w-full py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-xl text-[9.5px] font-bold flex items-center justify-center gap-1 border border-amber-500/40 transition-all cursor-pointer"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Terapkan ke Entitas</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assembly Configuration Modal */}
      {isAssemblyConfigOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm flex items-center gap-2 text-white">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Konfigurasi Batch Penempatan Scene</span>
              </h4>
              <button
                onClick={() => setIsAssemblyConfigOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-xl text-amber-200 text-[11px] font-semibold">
                Memasang <span className="font-bold underline">{selectedAssetKeys.size} aset</span> terpilih sekaligus ke panggung game.
              </div>

              {/* Layout Mode */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Susunan Tata Letak (Layout Arrangement)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssemblyLayout('grid')}
                    className={`p-2 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      assemblyLayout === 'grid'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                    <span>Grid Matrix 2D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssemblyLayout('row')}
                    className={`p-2 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      assemblyLayout === 'row'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Berjejer Menyamping</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssemblyLayout('column')}
                    className={`p-2 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      assemblyLayout === 'column'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Berjejer Kebawah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssemblyLayout('stack')}
                    className={`p-2 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      assemblyLayout === 'stack'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Box className="w-4 h-4" />
                    <span>Tumpuk di Pusat</span>
                  </button>
                </div>
              </div>

              {/* Grid Columns if Grid Layout */}
              {assemblyLayout === 'grid' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jumlah Kolom Grid</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={assemblyGridCols}
                    onChange={(e) => setAssemblyGridCols(parseInt(e.target.value) || 3)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              {/* Start Positions & Spacing */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Posisi X (px)</label>
                  <input
                    type="number"
                    value={assemblyStartX}
                    onChange={(e) => setAssemblyStartX(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Posisi Y (px)</label>
                  <input
                    type="number"
                    value={assemblyStartY}
                    onChange={(e) => setAssemblyStartY(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jarak Gap (px)</label>
                  <input
                    type="number"
                    value={assemblySpacing}
                    onChange={(e) => setAssemblySpacing(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              {/* Physics Preset */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Preset Fisika Objek Batch</label>
                <select
                  value={assemblyPhysicsPreset}
                  onChange={(e) => setAssemblyPhysicsPreset(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="none">Kosong (Tanpa Fisika / Dekoratif)</option>
                  <option value="platform">🧱 Platform Padat (Static Solid)</option>
                  <option value="coin">🪙 Item Koleksi Koin (Trigger Sensor)</option>
                  <option value="enemy">👾 Musuh Aktor (Dynamic Rigidbody)</option>
                  <option value="trigger">🔊 Trigger Suara / Area</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssemblyConfigOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBatchAssembly}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-black shadow-lg shadow-amber-900/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Pasang Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Validation & Pipeline Inspection Modal */}
      {inspectedAssetReport && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <div>
                  <h4 className="font-bold text-sm text-white">Inspeksi Pipeline Layer 1</h4>
                  <p className="text-[10.5px] text-slate-400 font-mono">{inspectedAssetReport.assetName}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectedAssetReport(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Score Badges */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>Texel Density</span>
                    <span className="text-cyan-400 font-mono font-bold">{inspectedAssetReport.texelDensityScore}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full"
                      style={{ width: `${inspectedAssetReport.texelDensityScore}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>GPU Poly Budget</span>
                    <span className="text-amber-400 font-mono font-bold">{inspectedAssetReport.polyBudgetScore}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${inspectedAssetReport.polyBudgetScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Health Status */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  inspectedAssetReport.mobileCompatibility === 'perfect'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : inspectedAssetReport.mobileCompatibility === 'good'
                    ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                }`}
              >
                <span>Kompatibilitas Mobile (Itel A70 / Low RAM)</span>
                <span className="uppercase font-mono text-[10px] px-2 py-0.5 rounded bg-slate-950/60 border border-current">
                  {inspectedAssetReport.mobileCompatibility}
                </span>
              </div>

              {/* Optimizations Applied */}
              {inspectedAssetReport.optimizationsApplied?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">Optimasi Mesin Aktif:</span>
                  <div className="space-y-1">
                    {inspectedAssetReport.optimizationsApplied.map((opt: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings if any */}
              {inspectedAssetReport.warnings?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-amber-400">Peringatan Budget:</span>
                  <div className="space-y-1">
                    {inspectedAssetReport.warnings.map((warn: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-300 bg-amber-950/20 p-2 rounded-lg border border-amber-500/30">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setInspectedAssetReport(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
