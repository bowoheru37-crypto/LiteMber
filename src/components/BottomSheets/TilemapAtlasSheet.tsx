import React, { useState, useRef } from 'react';
import {
  GameProject,
  TilemapComponent,
  TilemapLayer,
  TileType,
  TilesetDefinition,
  TilesetTile,
  TileCollisionType,
  SpriteAtlas,
  SpritesheetAtlas,
  SpriteClip,
} from '../../types/engine';
import {
  Grid,
  Layers,
  Paintbrush,
  Eraser,
  PaintBucket,
  Square,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  Upload,
  ArrowUp,
  ArrowDown,
  Film,
  Box,
  Sliders,
  Check,
  Shield,
  Zap,
  Pipette,
  Crop,
  CheckSquare,
  FolderPlus,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';
import { tilemapAtlasEngine } from '../../engine/TilemapAtlasEngine';
import { generateTilePixelData, generatePresetSpriteClips, createEmptyGrid } from '../../engine/AutoTileEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';
import { SmartAtlasBuilder, SmartAtlasTile, TileSetEditor, TileMap } from '../../engine/SmartAtlasEngine';

interface TilemapAtlasSheetProps {
  project: GameProject;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

type TabType = 'painter' | 'smart_builder' | 'tileset' | 'spritesheet' | 'atlas';
type DrawTool = 'brush' | 'eraser' | 'fill' | 'rect' | 'picker';
type SelectMode = 'manual' | 'row' | 'col';

export const TilemapAtlasSheet: React.FC<TilemapAtlasSheetProps> = ({
  project,
  onUpdateProject,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('painter');

  // --- TILEMAP STATE ---
  const activeEntity = project.entities.find((e) => e.sprite.type === 'tilemap' || e.sprite.tilemap);
  const defaultTilemap: TilemapComponent = activeEntity?.sprite.tilemap || {
    tileSize: 16,
    cols: 16,
    rows: 10,
    data: Array(10).fill(null).map(() => Array(16).fill('empty')),
    theme: 'grass_dirt',
    layers: [
      {
        id: 'layer_bg',
        name: 'Background',
        visible: true,
        locked: false,
        opacity: 0.8,
        zIndex: -1,
        data: Array(10).fill(null).map(() => Array(16).fill('empty')),
      },
      {
        id: 'layer_ground',
        name: 'Ground/Solid',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 0,
        isCollisionLayer: true,
        data: Array(10).fill(null).map(() => Array(16).fill('empty')),
      },
      {
        id: 'layer_fg',
        name: 'Foreground',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 1,
        data: Array(10).fill(null).map(() => Array(16).fill('empty')),
      },
    ],
    activeLayerId: 'layer_ground',
  };

  const [tilemap, setTilemap] = useState<TilemapComponent>(defaultTilemap);
  const [selectedTool, setSelectedTool] = useState<DrawTool>('brush');
  const [selectedTile, setSelectedTile] = useState<TileType | string>('grass_top');
  const [rectStart, setRectStart] = useState<{ r: number; c: number } | null>(null);

  // --- SMART ATLAS BUILDER V3.0 STATE ---
  const [smartBuilder] = useState<SmartAtlasBuilder>(new SmartAtlasBuilder());
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [parsedTiles, setParsedTiles] = useState<SmartAtlasTile[]>([]);
  const [tileSize, setTileSize] = useState<number>(32);
  const [selectMode, setSelectMode] = useState<SelectMode>('manual');
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [jsonExportOutput, setJsonExportOutput] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active layer
  const activeLayer =
    tilemap.layers?.find((l) => l.id === tilemap.activeLayerId) ||
    tilemap.layers?.[0] || {
      id: 'default_layer',
      name: 'Main',
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 0,
      data: tilemap.data,
    };

  // Save Tilemap changes to Project
  const saveTilemap = (updatedTilemap: TilemapComponent) => {
    setTilemap(updatedTilemap);
    tilemapAtlasEngine.clearCanvasCache();

    let updatedEntities = [...project.entities];
    if (activeEntity) {
      updatedEntities = updatedEntities.map((e) =>
        e.id === activeEntity.id
          ? { ...e, sprite: { ...e.sprite, tilemap: updatedTilemap } }
          : e
      );
    } else {
      const newTilemapEnt = {
        id: `tilemap_${Date.now()}`,
        name: 'Level Tilemap World',
        type: 'platform' as const,
        visible: true,
        locked: false,
        transform: { x: 0, y: 0, width: 800, height: 450, rotation: 0, scaleX: 1, scaleY: 1, zIndex: -10 },
        sprite: {
          type: 'tilemap' as const,
          color: '#ffffff',
          opacity: 1,
          tilemap: updatedTilemap,
        },
      };
      updatedEntities.push(newTilemapEnt);
    }

    onUpdateProject({ ...project, entities: updatedEntities });
  };

  // Tool Drawing Handlers
  const handleCellClick = (r: number, c: number) => {
    if (activeLayer.locked || !activeLayer.visible) return;

    let newLayerData = activeLayer.data.map((row) => [...row]);

    if (selectedTool === 'brush') {
      newLayerData[r][c] = selectedTile;
    } else if (selectedTool === 'eraser') {
      newLayerData[r][c] = 'empty';
    } else if (selectedTool === 'fill') {
      newLayerData = tilemapAtlasEngine.floodFillLayer(newLayerData, r, c, selectedTile);
    } else if (selectedTool === 'picker') {
      const picked = newLayerData[r][c];
      if (picked) setSelectedTile(picked);
      setSelectedTool('brush');
      return;
    } else if (selectedTool === 'rect') {
      if (!rectStart) {
        setRectStart({ r, c });
        return;
      } else {
        newLayerData = tilemapAtlasEngine.drawRectLayer(
          newLayerData,
          rectStart.r,
          rectStart.c,
          r,
          c,
          selectedTile
        );
        setRectStart(null);
      }
    }

    const updatedLayers = (tilemap.layers || []).map((l) =>
      l.id === activeLayer.id ? { ...l, data: newLayerData } : l
    );

    saveTilemap({ ...tilemap, layers: updatedLayers, data: updatedLayers[0]?.data || tilemap.data });
    AndroidEngine.triggerHaptic(8);
  };

  // Layer Management
  const handleAddLayer = () => {
    const newLayer: TilemapLayer = {
      id: `layer_${Date.now()}`,
      name: `Layer ${(tilemap.layers?.length || 0) + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: tilemap.layers?.length || 0,
      data: Array(tilemap.rows).fill(null).map(() => Array(tilemap.cols).fill('empty')),
    };

    const updatedLayers = [...(tilemap.layers || []), newLayer];
    saveTilemap({ ...tilemap, layers: updatedLayers, activeLayerId: newLayer.id });
    AndroidEngine.triggerHaptic(15);
  };

  const handleToggleLayerVisible = (layerId: string) => {
    const updatedLayers = (tilemap.layers || []).map((l) =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    );
    saveTilemap({ ...tilemap, layers: updatedLayers });
  };

  const handleToggleLayerLock = (layerId: string) => {
    const updatedLayers = (tilemap.layers || []).map((l) =>
      l.id === layerId ? { ...l, locked: !l.locked } : l
    );
    saveTilemap({ ...tilemap, layers: updatedLayers });
  };

  const handleRemoveLayer = (layerId: string) => {
    if ((tilemap.layers?.length || 0) <= 1) return;
    const updatedLayers = (tilemap.layers || []).filter((l) => l.id !== layerId);
    saveTilemap({ ...tilemap, layers: updatedLayers, activeLayerId: updatedLayers[0].id });
    AndroidEngine.triggerHaptic(15);
  };

  // --- SMART ATLAS IMAGE UPLOADER & SCAN AUTOMATION ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setUploadedImageSrc(src);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          smartBuilder.loadFromCanvas(canvas);
          setTileSize(smartBuilder.getTileSize());
          setParsedTiles([...smartBuilder.getTiles()]);
          AndroidEngine.triggerHaptic(20);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleRunScanAutomation = () => {
    if (!smartBuilder.sourceCanvas) {
      alert('Unggah gambar spritesheet/tileset terlebih dahulu!');
      return;
    }
    smartBuilder.autoDetectTileSize();
    smartBuilder.sliceAndDeduplicate();
    setTileSize(smartBuilder.getTileSize());
    setParsedTiles([...smartBuilder.getTiles()]);
    AndroidEngine.triggerHaptic(25);
  };

  const handleSelectByRow = (rowIdx: number) => {
    smartBuilder.selectRow(rowIdx);
    setParsedTiles([...smartBuilder.getTiles()]);
  };

  const handleSelectByCol = (colIdx: number) => {
    smartBuilder.selectCol(colIdx);
    setParsedTiles([...smartBuilder.getTiles()]);
  };

  const handleToggleTileSelection = (tileId: number) => {
    const t = smartBuilder.getTiles().find((tile) => tile.id === tileId);
    if (t) {
      t.selected = !t.selected;
      setParsedTiles([...smartBuilder.getTiles()]);
    }
  };

  const handleSetCategoryForSelected = (category: number) => {
    smartBuilder.getTiles().forEach((t) => {
      if (t.selected) t.category = category;
    });
    setParsedTiles([...smartBuilder.getTiles()]);
  };

  const handleExportSmartAtlas = () => {
    const jsonStr = smartBuilder.exportJson();
    setJsonExportOutput(jsonStr);

    // Build Atlas Canvas & convert to PNG Data URL
    const atlasCanvas = smartBuilder.buildAtlas(2);
    const pngUrl = atlasCanvas.toDataURL('image/png');

    // Register into active Tileset
    const selected = smartBuilder.getTiles().filter((t) => t.selected);
    const newTilesetTiles: TilesetTile[] = selected.map((t) => ({
      id: `tile_smart_${t.id}_${Date.now()}`,
      name: t.name || `Tile #${t.id}`,
      type: `custom_cat_${t.category}`,
      pixelData: t.pixelData || createEmptyGrid(16),
      collisionType: 'solid',
    }));

    const updatedTileset: TilesetDefinition = {
      id: `tileset_smart_${Date.now()}`,
      name: `Smart Atlas (${selected.length} Tiles)`,
      tileSize: smartBuilder.getTileSize(),
      theme: 'custom',
      tiles: newTilesetTiles,
    };

    setActiveTileset(updatedTileset);

    // Save project
    onUpdateProject({
      ...project,
      assets: {
        ...project.assets,
        audio: project.assets?.audio || [],
        tilesets: [...(project.assets?.tilesets || []), updatedTileset],
        spritesheets: project.assets?.spritesheets || [],
        atlases: project.assets?.atlases || [],
      },
    });

    AndroidEngine.triggerHaptic(30);
  };

  // --- TILESET CREATOR STATE ---
  const defaultTileset: TilesetDefinition = project.assets?.tilesets?.[0] || {
    id: 'tileset_custom_1',
    name: 'Custom Tileset 16x16',
    tileSize: 16,
    theme: 'custom',
    tiles: [
      {
        id: 't_grass',
        name: 'Grass Top',
        type: 'grass_top',
        pixelData: generateTilePixelData('grass_top', 'grass_dirt', { top: false, bottom: true, left: true, right: true }),
        collisionType: 'solid',
      },
      {
        id: 't_dirt',
        name: 'Dirt Center',
        type: 'dirt_center',
        pixelData: generateTilePixelData('dirt_center', 'grass_dirt', { top: true, bottom: true, left: true, right: true }),
        collisionType: 'solid',
      },
      {
        id: 't_spike',
        name: 'Red Hazard Spike',
        type: 'spike',
        pixelData: generateTilePixelData('spike', 'grass_dirt', { top: false, bottom: false, left: false, right: false }),
        collisionType: 'hazard',
      },
      {
        id: 't_water',
        name: 'Animated Water',
        type: 'water',
        pixelData: generateTilePixelData('water', 'water_zone', { top: false, bottom: true, left: true, right: true }),
        collisionType: 'water',
        animatedFrames: [
          generateTilePixelData('water', 'water_zone', { top: false, bottom: true, left: true, right: true }),
          generateTilePixelData('water', 'cyber_neon', { top: false, bottom: true, left: true, right: true }),
        ],
      },
    ],
  };

  const [activeTileset, setActiveTileset] = useState<TilesetDefinition>(defaultTileset);
  const [selectedTilesetTile, setSelectedTilesetTile] = useState<TilesetTile>(defaultTileset.tiles[0]);

  // --- SPRITESHEET & ATLAS STATE ---
  const [spritesheets] = useState<SpritesheetAtlas[]>(
    project.assets?.spritesheets || [
      {
        id: 'sheet_hero',
        name: 'Hero Character Sheet',
        frameWidth: 16,
        frameHeight: 16,
        columns: 4,
        rows: 4,
        clips: generatePresetSpriteClips('hero', '#06b6d4', '#3b82f6'),
      },
    ]
  );
  const [selectedSheetId] = useState<string>(spritesheets[0]?.id || 'sheet_hero');
  const activeSheet = spritesheets.find((s) => s.id === selectedSheetId) || spritesheets[0];
  const [previewClipKey, setPreviewClipKey] = useState<string>('idle');

  // --- TEXTURE ATLAS STATE ---
  const [atlases, setAtlases] = useState<SpriteAtlas[]>(project.assets?.atlases || []);

  const handlePackTextureAtlas = () => {
    const tileFrames = activeTileset.tiles.map((t) => ({
      name: t.name,
      pixelData: t.pixelData,
    }));

    const newAtlas = tilemapAtlasEngine.packTextureAtlas('Master Packed Atlas', tileFrames);
    const updatedAtlases = [...atlases, newAtlas];
    setAtlases(updatedAtlases);

    onUpdateProject({
      ...project,
      assets: {
        ...project.assets,
        audio: project.assets?.audio || [],
        tilesets: [activeTileset],
        spritesheets,
        atlases: updatedAtlases,
      },
    });

    AndroidEngine.triggerHaptic(25);
  };

  const tileTypesList: { name: string; key: TileType }[] = [
    { name: 'Grass Top', key: 'grass_top' },
    { name: 'Grass Center', key: 'grass_center' },
    { name: 'Dirt Center', key: 'dirt_center' },
    { name: 'Stone Wall', key: 'stone_wall' },
    { name: 'Brick Block', key: 'brick' },
    { name: 'Water', key: 'water' },
    { name: 'Lava', key: 'lava' },
    { name: 'Red Spike', key: 'spike' },
    { name: 'Gold Coin', key: 'coin' },
  ];

  return (
    <div className="flex flex-col h-full text-white bg-slate-900 border-t border-slate-800 select-none">
      {/* Header Sticky Navigation Bar - Optimized for Mobile Screen width (itel A70) */}
      <div className="flex items-center justify-between p-2 border-b border-slate-800 bg-slate-950 sticky top-0 z-20">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-[85%]">
          <button
            onClick={() => setActiveTab('painter')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'painter'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Painter</span>
          </button>

          <button
            onClick={() => setActiveTab('smart_builder')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'smart_builder'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SmartAtlas v3.0</span>
          </button>

          <button
            onClick={() => setActiveTab('tileset')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'tileset'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Tileset</span>
          </button>

          <button
            onClick={() => setActiveTab('spritesheet')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'spritesheet'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Spritesheet</span>
          </button>

          <button
            onClick={() => setActiveTab('atlas')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'atlas'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Atlas</span>
          </button>
        </div>

        <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================================= */}
        {/* TAB 1: TILEMAP PAINTER & LAYERS */}
        {/* ========================================================================= */}
        {activeTab === 'painter' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Drawing Canvas & Grid */}
            <div className="flex-1 flex flex-col p-2 bg-slate-950 items-center justify-center overflow-auto border-r border-slate-800 relative">
              {/* Floating Toolbar */}
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg backdrop-blur z-10 shadow-lg">
                <button
                  onClick={() => setSelectedTool('brush')}
                  className={`p-1.5 rounded cursor-pointer ${
                    selectedTool === 'brush' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Kuas Lukis (Brush)"
                >
                  <Paintbrush className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedTool('eraser')}
                  className={`p-1.5 rounded cursor-pointer ${
                    selectedTool === 'eraser' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Penghapus (Eraser)"
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedTool('fill')}
                  className={`p-1.5 rounded cursor-pointer ${
                    selectedTool === 'fill' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ember Cat (Flood Fill)"
                >
                  <PaintBucket className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedTool('rect')}
                  className={`p-1.5 rounded cursor-pointer ${
                    selectedTool === 'rect' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Kotak Area (Rect Fill)"
                >
                  <Square className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedTool('picker')}
                  className={`p-1.5 rounded cursor-pointer ${
                    selectedTool === 'picker' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Pipet Warna (Eyedropper)"
                >
                  <Pipette className="w-4 h-4" />
                </button>
              </div>

              {/* Grid Matrix */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-xl p-1 shadow-2xl overflow-auto max-w-full max-h-full">
                <div
                  className="grid gap-0.5 bg-slate-950 p-1 rounded"
                  style={{
                    gridTemplateColumns: `repeat(${tilemap.cols}, minmax(18px, 1fr))`,
                  }}
                >
                  {activeLayer.data.map((row, r) =>
                    row.map((tileVal, c) => (
                      <button
                        key={`${r}_${c}`}
                        onClick={() => handleCellClick(r, c)}
                        className={`w-5 h-5 md:w-6 md:h-6 rounded-xs border border-slate-800/50 flex items-center justify-center transition-all cursor-pointer hover:border-amber-400 ${
                          rectStart?.r === r && rectStart?.c === c ? 'ring-2 ring-amber-400' : ''
                        }`}
                        style={{
                          backgroundColor:
                            tileVal === 'grass_top'
                              ? '#22c55e'
                              : tileVal === 'dirt_center'
                              ? '#78350f'
                              : tileVal === 'stone_wall'
                              ? '#64748b'
                              : tileVal === 'brick'
                              ? '#b91c1c'
                              : tileVal === 'water'
                              ? '#0284c7'
                              : tileVal === 'lava'
                              ? '#f97316'
                              : tileVal === 'spike'
                              ? '#ef4444'
                              : tileVal === 'coin'
                              ? '#facc15'
                              : 'transparent',
                        }}
                      >
                        {tileVal === 'spike' && <span className="text-[8px]">▲</span>}
                        {tileVal === 'coin' && <span className="text-[8px]">★</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Layer Manager & Tile Palette */}
            <div className="w-full md:w-80 bg-slate-900 p-2.5 overflow-y-auto space-y-3 border-t md:border-t-0 md:border-l border-slate-800 text-xs">
              {/* Layer Manager */}
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-amber-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Layer Peta ({tilemap.layers?.length || 1})
                  </span>
                  <button
                    onClick={handleAddLayer}
                    className="bg-amber-500/20 text-amber-300 p-1 rounded hover:bg-amber-500/30 cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                  >
                    <Plus className="w-3 h-3" /> Tambah Layer
                  </button>
                </div>

                <div className="space-y-1">
                  {(tilemap.layers || []).map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => saveTilemap({ ...tilemap, activeLayerId: layer.id })}
                      className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        layer.id === activeLayer.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLayerVisible(layer.id);
                          }}
                          className="p-0.5 hover:text-white"
                        >
                          {layer.visible ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLayerLock(layer.id);
                          }}
                          className="p-0.5 hover:text-white"
                        >
                          {layer.locked ? <Lock className="w-3.5 h-3.5 text-red-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
                        </button>

                        <span className="font-semibold text-[11px] truncate">{layer.name}</span>
                        {layer.isCollisionLayer && (
                          <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1 rounded font-mono">SOLID</span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveLayer(layer.id);
                        }}
                        className="p-0.5 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Palette Selector */}
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-[11px] text-amber-400 flex items-center gap-1">
                  <Grid className="w-3.5 h-3.5" /> Palet Tile
                </span>

                <div className="grid grid-cols-3 gap-1.5">
                  {tileTypesList.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setSelectedTile(t.key)}
                      className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        selectedTile === t.key
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded border border-slate-700 shadow-inner"
                        style={{
                          backgroundColor:
                            t.key === 'grass_top'
                              ? '#22c55e'
                              : t.key === 'dirt_center'
                              ? '#78350f'
                              : t.key === 'stone_wall'
                              ? '#64748b'
                              : t.key === 'brick'
                              ? '#b91c1c'
                              : t.key === 'water'
                              ? '#0284c7'
                              : t.key === 'lava'
                              ? '#f97316'
                              : t.key === 'spike'
                              ? '#ef4444'
                              : t.key === 'coin'
                              ? '#facc15'
                              : '#334155',
                        }}
                      />
                      <span className="text-[9px] truncate w-full text-center">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SMART ATLAS BUILDER V3.0 (UPLOAD, SCAN, EASY PICKER, CATEGORIES) */}
        {/* ========================================================================= */}
        {activeTab === 'smart_builder' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto p-3 gap-3 text-xs bg-slate-900">
            {/* Left Box: Image Uploader & Automation Controls */}
            <div className="w-full md:w-80 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs border-b border-slate-800 pb-2">
                <Sparkles className="w-4 h-4" /> SmartAtlasBuilder v3.0
              </div>

              {/* Upload Input Dropzone */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">1. Upload Gambar Spritesheet</span>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-slate-900 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-slate-800/80"
                >
                  <Upload className="w-6 h-6 text-amber-400 animate-bounce" />
                  <span className="font-bold text-amber-300 text-xs">Pilih Gambar Dari Galeri</span>
                  <span className="text-[9px] text-slate-500">Support PNG / JPG / WebP</span>
                </button>
              </div>

              {/* Scan Automation Button */}
              <div className="space-y-1.5 border-t border-slate-800 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">2. Scan Automation Tile Size</span>
                <button
                  onClick={handleRunScanAutomation}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all active:scale-95 text-xs"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Jalankan Auto-Scan Tile ({tileSize}px)</span>
                </button>
              </div>

              {/* Easy Picker Mode Controls */}
              <div className="space-y-1.5 border-t border-slate-800 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">3. Easy Pick & Selection</span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setSelectMode('manual')}
                    className={`p-1.5 rounded-md border font-semibold text-[10px] ${
                      selectMode === 'manual' ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    👆 Manual
                  </button>
                  <button
                    onClick={() => setSelectMode('row')}
                    className={`p-1.5 rounded-md border font-semibold text-[10px] ${
                      selectMode === 'row' ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    ↔️ Pilih Baris
                  </button>
                  <button
                    onClick={() => setSelectMode('col')}
                    className={`p-1.5 rounded-md border font-semibold text-[10px] ${
                      selectMode === 'col' ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    ↕️ Pilih Kolom
                  </button>
                </div>
              </div>

              {/* Category Assignment */}
              <div className="space-y-1.5 border-t border-slate-800 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">4. Kategori & Export</span>
                <div className="flex gap-1.5">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 text-white rounded p-1.5 text-xs font-bold flex-1"
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
                      <option key={c} value={c}>
                        Kategori #{c}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSetCategoryForSelected(selectedCategory)}
                    className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-[10px] font-bold text-purple-300 hover:bg-slate-700 cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>

                <button
                  onClick={handleExportSmartAtlas}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all active:scale-95 text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Atlas JSON & PNG</span>
                </button>
              </div>
            </div>

            {/* Right Box: Live Tile Inspector Grid */}
            <div className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400 text-xs flex items-center gap-1">
                  <Crop className="w-4 h-4" /> Hasil Trim & Deduplikasi ({parsedTiles.length} Tile)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Tile Size: {tileSize}px
                </span>
              </div>

              {/* Uploaded Preview Image canvas */}
              {uploadedImageSrc && (
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 max-h-48 overflow-auto flex justify-center">
                  <img src={uploadedImageSrc} alt="Source Atlas" className="max-w-full h-auto object-contain rounded" />
                </div>
              )}

              {/* Extracted Smart Tiles Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {parsedTiles.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (selectMode === 'row') handleSelectByRow(t.category);
                      else if (selectMode === 'col') handleSelectByCol(Math.floor(t.srcX / tileSize));
                      else handleToggleTileSelection(t.id);
                    }}
                    className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 cursor-pointer transition-all relative ${
                      t.selected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    {/* Checkbox indicator */}
                    <div className="absolute top-1 left-1">
                      {t.selected ? (
                        <CheckSquare className="w-3 h-3 text-amber-400" />
                      ) : (
                        <div className="w-3 h-3 border border-slate-600 rounded-xs" />
                      )}
                    </div>

                    {/* Tile Thumbnail */}
                    <div className="w-8 h-8 bg-slate-950 border border-slate-800 rounded flex items-center justify-center overflow-hidden">
                      {t.pixelData ? (
                        <div className="grid grid-cols-16 grid-rows-16 w-full h-full">
                          {t.pixelData.map((row, rIdx) =>
                            row.map((color, cIdx) => (
                              <div
                                key={`${rIdx}_${cIdx}`}
                                style={{ backgroundColor: color !== 'transparent' ? color : 'transparent' }}
                              />
                            ))
                          )}
                        </div>
                      ) : (
                        <span className="text-[8px] font-mono">#{t.id}</span>
                      )}
                    </div>

                    <span className="text-[8px] font-mono font-bold">Cat #{t.category}</span>
                  </div>
                ))}
              </div>

              {/* Export JSON Code Preview Box */}
              {jsonExportOutput && (
                <div className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5" /> Output JSON Smart Atlas
                  </span>
                  <pre className="text-[9px] font-mono text-emerald-300 bg-slate-950 p-2 rounded max-h-36 overflow-auto">
                    {jsonExportOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TILESET CREATOR STUDIO */}
        {/* ========================================================================= */}
        {activeTab === 'tileset' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-3 gap-3 text-xs">
            {/* Tiles List */}
            <div className="w-full md:w-1/3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-xs">Daftar Tile Custom</span>
                <button
                  onClick={() => {
                    const newTile: TilesetTile = {
                      id: `tile_${Date.now()}`,
                      name: 'Tile Baru',
                      type: 'custom_block',
                      pixelData: createEmptyGrid(16),
                      collisionType: 'solid',
                    };
                    setActiveTileset({ ...activeTileset, tiles: [...activeTileset.tiles, newTile] });
                    setSelectedTilesetTile(newTile);
                  }}
                  className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Tambah Tile
                </button>
              </div>

              <div className="space-y-1">
                {activeTileset.tiles.map((tile) => (
                  <button
                    key={tile.id}
                    onClick={() => setSelectedTilesetTile(tile)}
                    className={`w-full p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer ${
                      tile.id === selectedTilesetTile.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
                        <div className="grid grid-cols-4 w-full h-full">
                          {tile.pixelData.slice(0, 4).map((r, ri) =>
                            r.slice(0, 4).map((c, ci) => (
                              <div key={`${ri}_${ci}`} style={{ backgroundColor: c !== 'transparent' ? c : '#1e293b' }} />
                            ))
                          )}
                        </div>
                      </div>
                      <span className="truncate">{tile.name}</span>
                    </div>

                    <span className="bg-slate-800 text-[9px] px-1.5 py-0.5 rounded font-mono text-slate-400 uppercase">
                      {tile.collisionType}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tile Property Inspector */}
            {selectedTilesetTile && (
              <div className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3 overflow-y-auto">
                <h4 className="font-bold text-amber-400 text-sm border-b border-slate-800 pb-2">
                  Pengaturan Properties Tile: {selectedTilesetTile.name}
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Nama Tile</label>
                    <input
                      type="text"
                      value={selectedTilesetTile.name}
                      onChange={(e) => {
                        const updated = { ...selectedTilesetTile, name: e.target.value };
                        setSelectedTilesetTile(updated);
                        setActiveTileset({
                          ...activeTileset,
                          tiles: activeTileset.tiles.map((t) => (t.id === updated.id ? updated : t)),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Tipe Fisika / Tabrakan</label>
                    <select
                      value={selectedTilesetTile.collisionType}
                      onChange={(e) => {
                        const updated = { ...selectedTilesetTile, collisionType: e.target.value as TileCollisionType };
                        setSelectedTilesetTile(updated);
                        setActiveTileset({
                          ...activeTileset,
                          tiles: activeTileset.tiles.map((t) => (t.id === updated.id ? updated : t)),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-bold text-xs"
                    >
                      <option value="solid">🔴 Solid / Tembok Keras</option>
                      <option value="hazard">⚡ Hazard / Bahaya Duri</option>
                      <option value="ladder">🪜 Tangga / Climbing</option>
                      <option value="water">🌊 Water / Air Berenang</option>
                      <option value="pass_through">🟢 Tembus (Pass Through)</option>
                      <option value="empty">⚪ Kosong</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SPRITESHEET STUDIO */}
        {/* ========================================================================= */}
        {activeTab === 'spritesheet' && activeSheet && (
          <div className="flex-1 flex flex-col md:flex-row p-3 gap-3 overflow-hidden text-xs">
            <div className="w-full md:w-1/3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 overflow-y-auto space-y-2">
              <span className="font-bold text-amber-400 text-xs uppercase">Klip Animasi Character</span>

              <div className="space-y-1">
                {Object.entries(activeSheet.clips).map(([key, rawClip]) => {
                  const clip = rawClip as SpriteClip;
                  return (
                    <button
                      key={key}
                      onClick={() => setPreviewClipKey(key)}
                      className={`w-full p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer ${
                        previewClipKey === key
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="capitalize">{clip.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{clip.frames.length} Frame • {clip.fps} FPS</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center space-y-3">
              <div className="w-24 h-24 bg-slate-900 rounded-xl border-2 border-amber-400/50 flex items-center justify-center p-2 shadow-inner">
                <Play className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
              <span className="font-bold text-amber-300 text-xs uppercase">
                Pratinjau Animasi: {previewClipKey}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: TEXTURE ATLAS STUDIO */}
        {/* ========================================================================= */}
        {activeTab === 'atlas' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-amber-400 text-sm">Optimasi Texture Atlas Single-Draw-Call</h4>
                  <p className="text-[10px] text-slate-400">
                    Menggabungkan semua sprite tile dan karakter menjadi 1 gambar buffer untuk performa 60 FPS di HP Android itel A70.
                  </p>
                </div>
                <button
                  onClick={handlePackTextureAtlas}
                  className="bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-amber-400 active:scale-95 cursor-pointer shadow"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Jalankan Auto-Pack Atlas</span>
                </button>
              </div>
            </div>

            {atlases.map((atlas) => (
              <div key={atlas.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{atlas.name} ({atlas.width}x{atlas.height}px)</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    1 DRAW CALL SAVED
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900 rounded-lg border border-slate-800">
                  {atlas.frames.map((frame) => (
                    <div
                      key={frame.id}
                      className="px-2 py-1 bg-slate-950 rounded border border-slate-800 text-[10px] text-slate-300 font-mono"
                    >
                      {frame.name} ({frame.x},{frame.y})
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
