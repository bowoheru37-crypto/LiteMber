import React, { useState, useRef } from 'react';
import {
  GameProject,
  Entity,
  EntityType,
  BodyType,
  TriggerType,
  ActionType,
  LogicRule,
  ImageAsset,
  AudioAsset,
  VideoAsset,
  Model3DAsset,
  TilesetTile,
} from '../../types/engine';
import { mediaConverterEngine } from '../../engine/MediaConverterEngine';
import { soundEngine } from '../../engine/AudioEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';
import {
  Image as ImageIcon,
  Type,
  Volume2,
  Music,
  Video,
  Box,
  Layers,
  Upload,
  Zap,
  Play,
  Plus,
  Check,
  X,
  Shield,
  Activity,
  Sliders,
  Sparkles,
  Flame,
  User,
  Coins,
  Gamepad2,
  MousePointer,
  RefreshCw,
  Grid,
} from 'lucide-react';

export type AssetCategory = 'image' | 'text' | 'sfx' | 'bgm' | 'video' | '3d' | 'tile';
export type PlacementSystemTarget = 'stage_entity' | 'tilemap_system' | 'ui_layer' | 'scene_bg' | 'world_bgm';

interface AssetPlacementSheetProps {
  project: GameProject;
  initialAsset?: any;
  initialCategory?: AssetCategory;
  onUpdateProject: (updatedProject: GameProject) => void;
  onSelectEntity?: (entityId: string) => void;
  onClose: () => void;
}

// Preset Library Collections
const PRESET_IMAGES: Array<{ name: string; presetKey: string; icon: string; defaultType: EntityType }> = [
  { name: 'Karakter Hero Pixel', presetKey: 'hero', icon: '👤', defaultType: 'player' },
  { name: 'Koin Emas Retro', presetKey: 'coin', icon: '🪙', defaultType: 'coin' },
  { name: 'Monster Alien', presetKey: 'monster', icon: '👾', defaultType: 'enemy' },
  { name: 'Duri / Spike', presetKey: 'spike', icon: '🔥', defaultType: 'hazard' },
  { name: 'Kotak Kayu', presetKey: 'box', icon: '📦', defaultType: 'platform' },
  { name: 'Bintang Bonus', presetKey: 'star', icon: '⭐', defaultType: 'coin' },
  { name: 'Cyber Grid BG', presetKey: 'cyber_grid_bg', icon: '🌌', defaultType: 'platform' },
  { name: 'Dinding Bata', presetKey: 'brick_wall_bg', icon: '🧱', defaultType: 'platform' },
];

const PRESET_UI_ELEMENTS: Array<{ title: string; content: string; type: EntityType; color: string; action: ActionType }> = [
  { title: 'Teks Skor Dinamik', content: 'SKOR: {score}', type: 'ui_text', color: '#38bdf8', action: 'ADD_SCORE' },
  { title: 'Tombol Lompat (HUD)', content: '🦘 LOMPAT', type: 'ui_text', color: '#10b981', action: 'JUMP' },
  { title: 'Tombol Maju Kanan', content: '➔ KANAN', type: 'ui_text', color: '#f59e0b', action: 'MOVE_RIGHT' },
  { title: 'Tombol Tembak / Action', content: '🔥 TEMBAK', type: 'ui_text', color: '#ef4444', action: 'EMIT_PARTICLES' },
  { title: 'Banner Dialog / Monolog', content: 'Sistem Terhubung! Tekan untuk lanjut...', type: 'ui_text', color: '#a855f7', action: 'SHOW_DIALOGUE' },
];

const PRESET_SFX_LIST = [
  { name: 'Suara Lompat (Jump)', presetKey: 'jump' },
  { name: 'Suara Koin (Coin)', presetKey: 'coin' },
  { name: 'Suara Tabrakan (Hit)', presetKey: 'hit' },
  { name: 'Suara Laser (Laser)', presetKey: 'laser' },
  { name: 'Suara Ledakan (Explosion)', presetKey: 'explosion' },
  { name: 'Suara Victory (Win)', presetKey: 'win' },
];

const PRESET_BGM_LIST = [
  { name: 'Retro Cyber Theme', presetKey: 'cyber_theme' },
  { name: 'Pixel Bounce Beats', presetKey: 'pixel_bounce' },
  { name: 'Retro March Chiptune', presetKey: 'retro_march' },
];

const PRESET_VIDEO_LIST = [
  { name: 'Cyber Grid Loop', presetKey: 'cyber_grid_loop' },
  { name: 'Space Nebula Cutscene', presetKey: 'space_nebula_loop' },
  { name: 'Matrix Rain Code', presetKey: 'matrix_rain_loop' },
];

const PRESET_3D_LIST = [
  { name: 'Kubus Cyber 3D', nameTag: 'Cyber Cube 3D' },
  { name: 'Piramida Energi 3D', nameTag: 'Energy Pyramid 3D' },
];

export const AssetPlacementSheet: React.FC<AssetPlacementSheetProps> = ({
  project,
  initialAsset,
  initialCategory = 'image',
  onUpdateProject,
  onSelectEntity,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<AssetCategory>(initialCategory);
  const [targetSystem, setTargetSystem] = useState<PlacementSystemTarget>('stage_entity');

  // Selected asset detail
  const [selectedAsset, setSelectedAsset] = useState<any>(initialAsset || null);
  const [objectName, setObjectName] = useState<string>(initialAsset?.name || 'Aset Game Baru');

  // Physics State
  const [enablePhysics, setEnablePhysics] = useState<boolean>(true);
  const [bodyType, setBodyType] = useState<BodyType>('static');
  const [colliderType, setColliderType] = useState<'box' | 'circle'>('box');
  const [isTrigger, setIsTrigger] = useState<boolean>(false);
  const [gravityScale, setGravityScale] = useState<number>(0);
  const [mass, setMass] = useState<number>(1);
  const [restitution, setRestitution] = useState<number>(0);
  const [friction, setFriction] = useState<number>(0.9);

  // Logic & Script Rules State
  const [presetLogic, setPresetLogic] = useState<'none' | 'coin_collect' | 'sfx_trigger' | 'hazard' | 'bounce_pad' | 'ui_action'>('none');
  const [customTrigger, setCustomTrigger] = useState<TriggerType>('ON_TAP');
  const [customAction, setCustomAction] = useState<ActionType>('PLAY_SOUND');
  const [actionParamString, setActionParamString] = useState<string>('coin');
  const [actionParamNumber, setActionParamNumber] = useState<number>(10);

  // UI Text / Content State
  const [textContent, setTextContent] = useState<string>('Teks Objek Game');
  const [textColor, setTextColor] = useState<string>('#38bdf8');
  const [textSize, setTextSize] = useState<number>(18);

  // Status & Upload File Refs
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change category handler & set smart defaults
  const handleCategoryChange = (cat: AssetCategory) => {
    setActiveCategory(cat);
    setSelectedAsset(null);
    AndroidEngine.triggerHaptic(15);

    if (cat === 'image') {
      setObjectName('Aset Gambar');
      setTargetSystem('stage_entity');
      setEnablePhysics(true);
      setBodyType('static');
      setGravityScale(0);
      setIsTrigger(false);
    } else if (cat === 'text') {
      setObjectName('Label Teks UI');
      setTargetSystem('ui_layer');
      setEnablePhysics(false);
    } else if (cat === 'sfx') {
      setObjectName('Pemicu SFX');
      setTargetSystem('stage_entity');
      setEnablePhysics(true);
      setBodyType('static');
      setIsTrigger(true);
      setPresetLogic('sfx_trigger');
    } else if (cat === 'bgm') {
      setObjectName('Musik Latar BGM');
      setTargetSystem('world_bgm');
      setEnablePhysics(false);
    } else if (cat === 'video') {
      setObjectName('Video Loop Background');
      setTargetSystem('scene_bg');
      setEnablePhysics(false);
    } else if (cat === '3d') {
      setObjectName('Objek Isometrik 3D');
      setTargetSystem('stage_entity');
      setEnablePhysics(true);
      setBodyType('static');
      setGravityScale(0);
    } else if (cat === 'tile') {
      setObjectName('Tile Ubin Baru');
      setTargetSystem('tilemap_system');
      setEnablePhysics(false);
    }
  };

  // Upload file handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadMessage(' Mengompresi & memproses file aset...');

    try {
      if (activeCategory === 'image' || activeCategory === 'tile') {
        const res = await mediaConverterEngine.processImageUpload(file, { maxDimension: 512 });
        setSelectedAsset(res.asset);
        setObjectName(file.name.replace(/\.[^/.]+$/, ''));
        const existingImages = project.assets?.images || [];
        onUpdateProject({
          ...project,
          assets: { ...project.assets, audio: project.assets?.audio || [], images: [...existingImages, res.asset] },
        });
        setUploadMessage(` Gambar terkompresi (${res.compressedSizeKb} KB). Siap dipasang!`);
      } else if (activeCategory === 'sfx' || activeCategory === 'bgm') {
        const res = await mediaConverterEngine.processAudioUpload(file);
        setSelectedAsset(res.asset);
        setObjectName(file.name.replace(/\.[^/.]+$/, ''));
        const existingAudio = project.assets?.audio || [];
        onUpdateProject({
          ...project,
          assets: { ...project.assets, audio: [...existingAudio, res.asset] },
        });
        setUploadMessage(` Audio teroptimasi (${res.compressedSizeKb} KB). Siap dipasang!`);
      } else if (activeCategory === 'video') {
        const res = await mediaConverterEngine.processVideoUpload(file);
        setSelectedAsset(res.asset);
        setObjectName(file.name.replace(/\.[^/.]+$/, ''));
        const existingVideo = project.assets?.video || [];
        onUpdateProject({
          ...project,
          assets: { ...project.assets, audio: project.assets?.audio || [], video: [...existingVideo, res.asset] },
        });
        setUploadMessage(` Video terkompresi (${res.compressedSizeKb} KB). Siap dipasang!`);
      } else if (activeCategory === '3d') {
        const res = await mediaConverterEngine.process3DModelUpload(file);
        setSelectedAsset(res.asset);
        setObjectName(file.name.replace(/\.[^/.]+$/, ''));
        const existingModels = project.assets?.models3d || [];
        onUpdateProject({
          ...project,
          assets: { ...project.assets, audio: project.assets?.audio || [], models3d: [...existingModels, res.asset] },
        });
        setUploadMessage(` Model 3D ter-proyeksi ke Isometric Sprite (${res.compressedSizeKb} KB).`);
      }
      AndroidEngine.triggerHaptic(25);
    } catch (err: any) {
      setUploadMessage('❌ Gagal mengunggah file: ' + (err?.message || 'Error'));
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Preview Audio
  const handlePreviewAudio = (presetKeyOrUrl: string) => {
    soundEngine.playSfx(presetKeyOrUrl);
    AndroidEngine.triggerHaptic(10);
  };

  // Build Logic Rules for Entity
  const buildLogicRules = (): LogicRule[] => {
    if (presetLogic === 'coin_collect') {
      return [
        {
          id: 'rule_' + Date.now() + '_1',
          enabled: true,
          name: 'Ambil Skor & Suara Koin',
          trigger: 'ON_COLLISION_ENTER',
          action: 'ADD_SCORE',
          paramNumber: 10,
        },
        {
          id: 'rule_' + Date.now() + '_2',
          enabled: true,
          name: 'Efek Suara Koin',
          trigger: 'ON_COLLISION_ENTER',
          action: 'PLAY_SOUND',
          paramString: 'coin',
        },
        {
          id: 'rule_' + Date.now() + '_3',
          enabled: true,
          name: 'Hancurkan Diri Saat Diambil',
          trigger: 'ON_COLLISION_ENTER',
          action: 'DESTROY_SELF',
        },
      ];
    } else if (presetLogic === 'sfx_trigger') {
      return [
        {
          id: 'rule_' + Date.now(),
          enabled: true,
          name: 'Putar Suara Saat Sentuh/Tap',
          trigger: customTrigger,
          action: 'PLAY_SOUND',
          paramString: actionParamString || 'coin',
        },
      ];
    } else if (presetLogic === 'hazard') {
      return [
        {
          id: 'rule_' + Date.now() + '_1',
          enabled: true,
          name: 'Reset Level Saat Tabrak',
          trigger: 'ON_COLLISION_ENTER',
          action: 'RESTART_LEVEL',
        },
        {
          id: 'rule_' + Date.now() + '_2',
          enabled: true,
          name: 'Percikan Partikel Duri',
          trigger: 'ON_COLLISION_ENTER',
          action: 'EMIT_PARTICLES',
        },
      ];
    } else if (presetLogic === 'bounce_pad') {
      return [
        {
          id: 'rule_' + Date.now(),
          enabled: true,
          name: 'Lompatan Trampolin',
          trigger: 'ON_COLLISION_ENTER',
          action: 'JUMP',
        },
      ];
    } else if (presetLogic === 'ui_action') {
      return [
        {
          id: 'rule_' + Date.now(),
          enabled: true,
          name: 'Aksi Tombol UI',
          trigger: 'ON_TAP',
          action: customAction,
          paramString: actionParamString,
          paramNumber: actionParamNumber,
        },
      ];
    } else {
      // Custom rule if selected
      return [
        {
          id: 'rule_' + Date.now(),
          enabled: true,
          name: 'Aturan Logika Kustom',
          trigger: customTrigger,
          action: customAction,
          paramString: actionParamString,
          paramNumber: actionParamNumber,
        },
      ];
    }
  };

  // Main Action: Confirm & Place Asset into Game System
  const handleConfirmPlacement = () => {
    AndroidEngine.triggerHaptic(30);

    // 1. Placement as World BGM
    if (targetSystem === 'world_bgm') {
      const bgmId = selectedAsset?.id || selectedAsset?.presetKey || 'cyber_theme';
      onUpdateProject({
        ...project,
        world: {
          ...project.world,
          bgmAssetId: bgmId,
        },
      });
      soundEngine.playBgm(bgmId);
      onClose();
      return;
    }

    // 2. Placement as Scene Background
    if (targetSystem === 'scene_bg') {
      const bgUrl = selectedAsset?.url || selectedAsset?.presetKey;
      onUpdateProject({
        ...project,
        world: {
          ...project.world,
          backgroundImageUrl: bgUrl,
          backgroundVideoAssetId: activeCategory === 'video' ? selectedAsset?.id : undefined,
        },
      });
      onClose();
      return;
    }

    // 3. Placement into Tilemap System
    if (targetSystem === 'tilemap_system') {
      const tileId = 'tile_custom_' + Date.now();
      const newTile: TilesetTile = {
        id: tileId,
        name: objectName || 'Custom Tile',
        type: 'custom',
        pixelData: selectedAsset?.pixelData || Array(16).fill(Array(16).fill('#38bdf8')),
        collisionType: isTrigger ? 'pass_through' : 'solid',
      };

      const existingTileset = project.world.showGridSnap
        ? project.entities.find((e) => e.sprite.type === 'tilemap')?.sprite.tilemap?.customTileset
        : undefined;

      const updatedTileset = {
        id: existingTileset?.id || 'tileset_user_custom',
        name: existingTileset?.name || 'Koleksi Tile User',
        tileSize: 16,
        theme: 'custom' as const,
        tiles: [...(existingTileset?.tiles || []), newTile],
      };

      // Add to tilemap entity or create one
      const updatedEntities = project.entities.map((e) => {
        if (e.sprite.type === 'tilemap' && e.sprite.tilemap) {
          return {
            ...e,
            sprite: {
              ...e.sprite,
              tilemap: {
                ...e.sprite.tilemap,
                customTileset: updatedTileset,
              },
            },
          };
        }
        return e;
      });

      onUpdateProject({
        ...project,
        entities: updatedEntities,
      });
      onClose();
      return;
    }

    // 4. Default: Placement as Game Entity (Stage Entity or UI Layer)
    const newId = 'ent_' + activeCategory + '_' + Date.now();
    let defaultW = activeCategory === 'text' ? 140 : activeCategory === '3d' ? 64 : 40;
    let defaultH = activeCategory === 'text' ? 36 : activeCategory === '3d' ? 64 : 40;

    let spriteColor = '#38bdf8';
    if (activeCategory === 'sfx') spriteColor = '#a855f7';
    if (activeCategory === 'video') spriteColor = '#ec4899';
    if (activeCategory === '3d') spriteColor = '#f59e0b';

    const entityType: EntityType =
      activeCategory === 'text'
        ? 'ui_text'
        : presetLogic === 'hazard'
        ? 'hazard'
        : presetLogic === 'coin_collect'
        ? 'coin'
        : bodyType === 'static'
        ? 'platform'
        : 'player';

    const rules = buildLogicRules();

    const newEntity: Entity = {
      id: newId,
      name: objectName || 'Aset Objek Game',
      type: entityType,
      visible: true,
      locked: false,
      transform: {
        x: targetSystem === 'ui_layer' ? 100 : 180,
        y: targetSystem === 'ui_layer' ? 50 : 320,
        width: defaultW,
        height: defaultH,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: project.entities.length + 1,
      },
      sprite: {
        type:
          activeCategory === 'text'
            ? 'color'
            : activeCategory === 'video'
            ? 'video'
            : selectedAsset?.pixelData
            ? 'pixel'
            : 'preset',
        presetIcon: selectedAsset?.presetKey || (activeCategory === 'sfx' ? 'hero' : 'box'),
        color: textColor || spriteColor,
        imageAssetId: selectedAsset?.id || selectedAsset?.url,
        videoAssetId: activeCategory === 'video' ? selectedAsset?.id || selectedAsset?.presetKey : undefined,
        pixelData: selectedAsset?.pixelData,
        borderRadius: activeCategory === 'text' ? 8 : 4,
        opacity: 1,
      },
      text:
        activeCategory === 'text'
          ? {
              content: textContent,
              fontSize: textSize,
              color: textColor,
              align: 'center',
            }
          : undefined,
      audioSource:
        activeCategory === 'sfx' || selectedAsset?.presetKey || selectedAsset?.type === 'sfx'
          ? {
              soundOnStart: presetLogic === 'sfx_trigger' ? selectedAsset?.id || selectedAsset?.presetKey : undefined,
              soundOnCollision: selectedAsset?.id || selectedAsset?.presetKey,
              volume: 1,
            }
          : undefined,
      rigidbody: enablePhysics
        ? {
            bodyType: bodyType,
            mass: mass,
            gravityScale: gravityScale,
            velocityX: 0,
            velocityY: 0,
            friction: friction,
            restitution: restitution,
            isGrounded: false,
            fixedRotation: true,
          }
        : undefined,
      collider: enablePhysics
        ? {
            enabled: true,
            type: colliderType,
            isTrigger: isTrigger,
            offsetX: 0,
            offsetY: 0,
            width: defaultW,
            height: defaultH,
            radius: defaultW / 2,
          }
        : undefined,
      script: {
        rules: rules,
        tag: activeCategory,
      },
    };

    const updatedEntities = [...project.entities, newEntity];
    onUpdateProject({
      ...project,
      entities: updatedEntities,
    });

    if (onSelectEntity) {
      onSelectEntity(newId);
    }

    onClose();
  };

  return (
    <div className="flex flex-col h-full text-white bg-slate-900 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-sm text-cyan-400">
            Smart Asset Picker & Placement System
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs Header */}
      <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'image' as AssetCategory, label: 'Gambar', icon: ImageIcon, color: 'text-cyan-400' },
          { id: 'text' as AssetCategory, label: 'Teks & UI', icon: Type, color: 'text-emerald-400' },
          { id: 'sfx' as AssetCategory, label: 'Suara SFX', icon: Volume2, color: 'text-purple-400' },
          { id: 'bgm' as AssetCategory, label: 'Musik BGM', icon: Music, color: 'text-amber-400' },
          { id: 'video' as AssetCategory, label: 'Film Video', icon: Video, color: 'text-rose-400' },
          { id: '3d' as AssetCategory, label: 'Model 3D', icon: Box, color: 'text-blue-400' },
          { id: 'tile' as AssetCategory, label: 'Tilemap', icon: Grid, color: 'text-yellow-400' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleCategoryChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800 border border-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Upload Message Feedback */}
      {uploadMessage && (
        <div className="bg-cyan-500/10 border-b border-cyan-500/30 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 flex items-center justify-between">
          <span>{uploadMessage}</span>
          <button onClick={() => setUploadMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {/* STEP 1: PICK OR UPLOAD ASSET */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> 1. Pilih atau Unggah Aset ({activeCategory.toUpperCase()})
            </span>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept={
                activeCategory === 'image' || activeCategory === 'tile'
                  ? 'image/*'
                  : activeCategory === 'sfx' || activeCategory === 'bgm'
                  ? 'audio/*'
                  : activeCategory === 'video'
                  ? 'video/*,.gif'
                  : activeCategory === '3d'
                  ? '.obj,.gltf,.glb'
                  : '*'
              }
            />
            {activeCategory !== 'text' && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
            )}
          </div>

          {/* Asset Selection Grid or UI Text Editor */}
          {activeCategory === 'text' ? (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Isi Teks / Formula</label>
                  <input
                    type="text"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono text-xs focus:border-cyan-500 outline-none"
                    placeholder="E.g. SKOR: {score}"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Ukuran Font (PX)</label>
                  <input
                    type="number"
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono text-xs focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              {/* Preset UI Templates */}
              <div className="pt-2">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Atau Pilih Preset UI Template:</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {PRESET_UI_ELEMENTS.map((ui, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTextContent(ui.content);
                        setTextColor(ui.color);
                        setObjectName(ui.title);
                        setCustomAction(ui.action);
                        setPresetLogic('ui_action');
                        AndroidEngine.triggerHaptic(10);
                      }}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer"
                    >
                      <span className="font-bold text-[11px] block text-white">{ui.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate block">{ui.content}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : activeCategory === 'image' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              {PRESET_IMAGES.map((img, idx) => {
                const isSelected = selectedAsset?.presetKey === img.presetKey;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAsset(img);
                      setObjectName(img.name);
                      if (img.defaultType === 'coin') setPresetLogic('coin_collect');
                      if (img.defaultType === 'hazard') setPresetLogic('hazard');
                      AndroidEngine.triggerHaptic(10);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xl">{img.icon}</span>
                    <div className="truncate">
                      <span className="text-xs block leading-snug">{img.name}</span>
                      <span className="text-[9px] text-slate-400 font-mono">Preset Sprite</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : activeCategory === 'sfx' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {PRESET_SFX_LIST.map((sfx, idx) => {
                const isSelected = selectedAsset?.presetKey === sfx.presetKey;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedAsset(sfx);
                        setObjectName(sfx.name);
                        setActionParamString(sfx.presetKey);
                        setPresetLogic('sfx_trigger');
                        AndroidEngine.triggerHaptic(10);
                      }}
                      className="text-left flex-1 truncate cursor-pointer"
                    >
                      <span className="text-xs block truncate">{sfx.name}</span>
                    </button>
                    <button
                      onClick={() => handlePreviewAudio(sfx.presetKey)}
                      className="p-1 rounded bg-slate-800 text-purple-400 hover:bg-purple-600 hover:text-white cursor-pointer ml-1"
                      title="Tes Suara"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : activeCategory === 'bgm' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {PRESET_BGM_LIST.map((bgm, idx) => {
                const isSelected = selectedAsset?.presetKey === bgm.presetKey;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedAsset(bgm);
                        setObjectName(bgm.name);
                        AndroidEngine.triggerHaptic(10);
                      }}
                      className="text-left flex-1 truncate cursor-pointer"
                    >
                      <span className="text-xs block truncate">{bgm.name}</span>
                    </button>
                    <button
                      onClick={() => handlePreviewAudio(bgm.presetKey)}
                      className="p-1 rounded bg-slate-800 text-amber-400 hover:bg-amber-600 hover:text-white cursor-pointer ml-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : activeCategory === 'video' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {PRESET_VIDEO_LIST.map((v, idx) => {
                const isSelected = selectedAsset?.presetKey === v.presetKey;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAsset(v);
                      setObjectName(v.name);
                      AndroidEngine.triggerHaptic(10);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs font-bold block">{v.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">Looping Procedural Video</span>
                  </button>
                );
              })}
            </div>
          ) : activeCategory === '3d' ? (
            <div className="grid grid-cols-2 gap-2">
              {PRESET_3D_LIST.map((m, idx) => {
                const isSelected = selectedAsset?.name === m.nameTag;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAsset(m);
                      setObjectName(m.name);
                      AndroidEngine.triggerHaptic(10);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm font-bold block">🧊 {m.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">Proj. Isometric Sprite 3D</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-400 text-xs p-2">
              Pilih gambar untuk dikonversi menjadi Ubin (Tile) kustom pada sistem Tilemap.
            </div>
          )}
        </div>

        {/* STEP 2: PLACEMENT TARGET SYSTEM */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
            <Gamepad2 className="w-3.5 h-3.5" /> 2. Target Penempatan Sistem Game
          </span>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { id: 'stage_entity' as PlacementSystemTarget, label: 'Satu Objek Game (Stage)', desc: 'Spawns pada kanvas game' },
              { id: 'tilemap_system' as PlacementSystemTarget, label: 'Tilemap System', desc: 'Tambahkan ke atlas ubin' },
              { id: 'ui_layer' as PlacementSystemTarget, label: 'Lapis UI / HUD', desc: 'Penempatan layar overlay' },
              { id: 'scene_bg' as PlacementSystemTarget, label: 'Background Scene', desc: 'Atur gambar/video latar' },
              { id: 'world_bgm' as PlacementSystemTarget, label: 'Musik Latar BGM', desc: 'Atur musik dunia game' },
            ].map((tgt) => (
              <button
                key={tgt.id}
                onClick={() => {
                  setTargetSystem(tgt.id);
                  AndroidEngine.triggerHaptic(10);
                }}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  targetSystem === tgt.id
                    ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold block text-white">{tgt.label}</span>
                <span className="text-[9px] text-slate-400">{tgt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 3: PHYSICS CONFIGURATION */}
        {targetSystem === 'stage_entity' && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> 3. Penempatan Physics / Fisika Objek
              </span>
              <button
                onClick={() => setEnablePhysics(!enablePhysics)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  enablePhysics ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {enablePhysics ? 'FISIKA AKTIF' : 'TANPA FISIKA'}
              </button>
            </div>

            {enablePhysics && (
              <div className="space-y-2 pt-1">
                {/* Body Type */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Tipe Bodi (Body Type)</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { type: 'static' as BodyType, label: '🧱 Static', desc: 'Pijakan/Dinding' },
                      { type: 'dynamic' as BodyType, label: '⚽ Dynamic', desc: 'Hero/Musuh/Koin' },
                      { type: 'kinematic' as BodyType, label: '🛸 Kinematic', desc: 'Platform Bergerak' },
                    ].map((b) => (
                      <button
                        key={b.type}
                        onClick={() => {
                          setBodyType(b.type);
                          if (b.type === 'static') setGravityScale(0);
                          if (b.type === 'dynamic') setGravityScale(1);
                          AndroidEngine.triggerHaptic(10);
                        }}
                        className={`p-1.5 rounded text-center border transition-all cursor-pointer ${
                          bodyType === b.type
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="text-xs block font-bold">{b.label}</span>
                        <span className="text-[9px] block text-slate-400">{b.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collider Shape & Is Trigger */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Bentuk Collider</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setColliderType('box')}
                        className={`flex-1 py-1 rounded text-center text-xs font-bold border cursor-pointer ${
                          colliderType === 'box' ? 'bg-slate-800 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        📦 Kotak (Box)
                      </button>
                      <button
                        onClick={() => setColliderType('circle')}
                        className={`flex-1 py-1 rounded text-center text-xs font-bold border cursor-pointer ${
                          colliderType === 'circle' ? 'bg-slate-800 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        🔴 Lingkaran
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Mode Sensor Trigger</label>
                    <button
                      onClick={() => setIsTrigger(!isTrigger)}
                      className={`w-full py-1 rounded text-center text-xs font-bold border cursor-pointer ${
                        isTrigger ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {isTrigger ? '⚡ Trigger (Sensor Tanpa Halangan)' : '🧱 Solid (Penghalang Padat)'}
                    </button>
                  </div>
                </div>

                {/* Physics Sliders */}
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>Skala Gravitasi</span>
                      <span>{gravityScale}x</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.5"
                      value={gravityScale}
                      onChange={(e) => setGravityScale(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>Restitusi (Membal)</span>
                      <span>{restitution}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={restitution}
                      onChange={(e) => setRestitution(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: LOGIC & SCRIPT RULES CONFIGURATION */}
        {targetSystem === 'stage_entity' && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
            <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> 4. Logika Perilaku & Pemicu (Script Rules)
            </span>

            {/* Quick Logic Presets */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {[
                { id: 'none', title: 'Tanpa Logika', desc: 'Objek standar' },
                { id: 'coin_collect', title: '🪙 Item Koleksi (+10 Poin)', desc: 'Sentuh -> Tambah Skor + Suara + Hancur' },
                { id: 'sfx_trigger', title: '🔊 Pemicu Suara (SFX)', desc: 'Sentuh/Tap -> Putar Efek Suara' },
                { id: 'hazard', title: '🔥 Duri / Bahaya', desc: 'Sentuh -> Reset Level' },
                { id: 'bounce_pad', title: '🦘 Trampolin Membal', desc: 'Sentuh -> Lompat Tinggi' },
                { id: 'ui_action', title: '🎮 Tombol Aksi Custom', desc: 'Tap -> Eksekusi Aksi Custom' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPresetLogic(p.id as any);
                    AndroidEngine.triggerHaptic(10);
                  }}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    presetLogic === p.id
                      ? 'bg-purple-500/20 border-purple-500 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block text-white">{p.title}</span>
                  <span className="text-[9px] text-slate-400 block">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Action Button */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white truncate max-w-[180px]">{objectName || 'Aset Game'}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            Target: {targetSystem.toUpperCase()}
          </span>
        </div>

        <button
          onClick={handleConfirmPlacement}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>Pasang ke System Game</span>
        </button>
      </div>
    </div>
  );
};
