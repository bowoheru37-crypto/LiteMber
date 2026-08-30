import React, { useState, useEffect, useRef } from 'react';
import {
  GameProject,
  IsometricMapConfig,
  ProceduralIsoTerrainParams,
  TilemapComponent,
} from '../../types/engine';
import {
  Box,
  Layers,
  Sparkles,
  Mountain,
  Waves,
  Zap,
  RotateCcw,
  Plus,
  Minus,
  X,
  Play,
  Save,
  Grid,
  Paintbrush,
  Sun,
  Eye,
  Sliders,
} from 'lucide-react';
import { isometricEngine } from '../../engine/IsometricEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';

interface IsometricSheetProps {
  project: GameProject;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

type IsoToolMode = 'extrude_up' | 'extrude_down' | 'paint_material' | 'picker';

export const IsometricSheet: React.FC<IsometricSheetProps> = ({
  project,
  onUpdateProject,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active tilemap entity
  const activeEntity = project.entities.find((e) => e.sprite.type === 'tilemap' || e.sprite.tilemap);
  const existingIsoConfig = activeEntity?.sprite.tilemap?.isometricConfig;

  // Isometric Config State
  const [isoConfig, setIsoConfig] = useState<IsometricMapConfig>(
    existingIsoConfig ||
      isometricEngine.generateProceduralTerrain(12, 12, {
        seed: 42,
        roughness: 1.2,
        waterLevel: 0,
        mountainHeight: 4,
        preset: 'hills',
      })
  );

  // Procedural Generator Controls
  const [terrainPreset, setTerrainPreset] = useState<ProceduralIsoTerrainParams['preset']>('hills');
  const [seed, setSeed] = useState<number>(42);
  const [roughness, setRoughness] = useState<number>(1.2);
  const [mountainHeight, setMountainHeight] = useState<number>(4);
  const [waterLevel, setWaterLevel] = useState<number>(0);

  // Interactive Paint Tools
  const [toolMode, setToolMode] = useState<IsoToolMode>('extrude_up');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('grass');
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);

  // Re-generate Procedural Map
  const handleGenerateProcedural = () => {
    const generated = isometricEngine.generateProceduralTerrain(isoConfig.rows, isoConfig.cols, {
      seed,
      roughness,
      waterLevel,
      mountainHeight,
      preset: terrainPreset,
    });
    setIsoConfig(generated);
    AndroidEngine.triggerHaptic(20);
  };

  // Render 2.5D Isometric World Preview onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid atmosphere
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render Isometric World Map
    const originX = canvas.width / 2;
    const originY = 120;
    isometricEngine.renderIsometricMap(ctx, isoConfig, originX, originY);

    // Render Hover Indicator
    if (hoveredCell) {
      const h = isoConfig.heightmap[hoveredCell.row]?.[hoveredCell.col] || 0;
      const { x, y } = isometricEngine.gridToIsoScreen(
        hoveredCell.col,
        hoveredCell.row,
        h,
        originX,
        originY,
        isoConfig.tileWidth,
        isoConfig.tileHeight,
        isoConfig.blockHeight
      );

      ctx.save();
      ctx.strokeStyle = '#f59e0b'; // Amber highlight
      ctx.lineWidth = 2.5;
      const hw = isoConfig.tileWidth / 2;
      const hh = isoConfig.tileHeight / 2;

      ctx.beginPath();
      ctx.moveTo(x, y - hh);
      ctx.lineTo(x + hw, y);
      ctx.lineTo(x, y + hh);
      ctx.lineTo(x - hw, y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }, [isoConfig, hoveredCell]);

  // Handle Canvas Click to Modify Terrain
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const originX = canvas.width / 2;
    const originY = 120;

    const cell = isometricEngine.isoScreenToGrid(
      screenX,
      screenY,
      originX,
      originY,
      isoConfig.tileWidth,
      isoConfig.tileHeight
    );

    if (cell.col >= 0 && cell.col < isoConfig.cols && cell.row >= 0 && cell.row < isoConfig.rows) {
      const newHeightmap = isoConfig.heightmap.map((r) => [...r]);
      const newTileTypes = isoConfig.tileTypes.map((r) => [...r]);

      if (toolMode === 'extrude_up') {
        newHeightmap[cell.row][cell.col] = Math.min(8, (newHeightmap[cell.row][cell.col] || 0) + 1);
      } else if (toolMode === 'extrude_down') {
        newHeightmap[cell.row][cell.col] = Math.max(0, (newHeightmap[cell.row][cell.col] || 0) - 1);
      } else if (toolMode === 'paint_material') {
        newTileTypes[cell.row][cell.col] = selectedMaterial;
      } else if (toolMode === 'picker') {
        const mat = newTileTypes[cell.row][cell.col];
        if (mat) setSelectedMaterial(mat);
        setToolMode('paint_material');
        return;
      }

      setIsoConfig({ ...isoConfig, heightmap: newHeightmap, tileTypes: newTileTypes });
      AndroidEngine.triggerHaptic(10);
    }
  };

  // Handle Mouse Hover / Raycast
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const originX = canvas.width / 2;
    const originY = 120;

    const cell = isometricEngine.isoScreenToGrid(
      screenX,
      screenY,
      originX,
      originY,
      isoConfig.tileWidth,
      isoConfig.tileHeight
    );

    if (cell.col >= 0 && cell.col < isoConfig.cols && cell.row >= 0 && cell.row < isoConfig.rows) {
      setHoveredCell(cell);
    } else {
      setHoveredCell(null);
    }
  };

  // Save Isometric World into Game Project State
  const handleSaveToProject = () => {
    let updatedEntities = [...project.entities];

    if (activeEntity) {
      updatedEntities = updatedEntities.map((e) =>
        e.id === activeEntity.id
          ? {
              ...e,
              sprite: {
                ...e.sprite,
                tilemap: {
                  ...(e.sprite.tilemap || {
                    tileSize: 16,
                    cols: isoConfig.cols,
                    rows: isoConfig.rows,
                    data: [],
                    theme: 'grass_dirt',
                  }),
                  isometricConfig: isoConfig,
                  isIsometric: true,
                },
              },
            }
          : e
      );
    } else {
      // Create new Isometric Tilemap Entity
      const newIsoEntity = {
        id: `iso_world_${Date.now()}`,
        name: '2.5D Isometric World',
        type: 'platform' as const,
        visible: true,
        locked: false,
        transform: { x: 0, y: 0, width: 800, height: 450, rotation: 0, scaleX: 1, scaleY: 1, zIndex: -10 },
        sprite: {
          type: 'tilemap' as const,
          color: '#ffffff',
          opacity: 1,
          tilemap: {
            tileSize: 16,
            cols: isoConfig.cols,
            rows: isoConfig.rows,
            data: [],
            theme: 'grass_dirt' as const,
            isometricConfig: isoConfig,
            isIsometric: true,
          },
        },
      };
      updatedEntities.push(newIsoEntity);
    }

    onUpdateProject({ ...project, entities: updatedEntities });
    AndroidEngine.triggerHaptic(25);
    onClose();
  };

  const materialList = [
    { name: 'Grass 🌿', key: 'grass', color: '#22c55e' },
    { name: 'Dirt 🪵', key: 'dirt', color: '#b45309' },
    { name: 'Stone 🪨', key: 'stone', color: '#94a3b8' },
    { name: 'Sand 🏖️', key: 'sand', color: '#fde047' },
    { name: 'Water 🌊', key: 'water', color: '#38bdf8' },
    { name: 'Snow ❄️', key: 'snow', color: '#f8fafc' },
    { name: 'Lava 🌋', key: 'lava', color: '#f97316' },
    { name: 'Cyber ⚡', key: 'cyber', color: '#06b6d4' },
    { name: 'Brick 🧱', key: 'brick', color: '#ef4444' },
  ];

  return (
    <div className="flex flex-col h-full text-white bg-slate-900 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-2.5 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-amber-400 fill-amber-400/20" />
          <span className="font-bold text-sm text-amber-400">2.5D Isometric Engine & Terrain Studio</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveToProject}
            className="bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-amber-400 cursor-pointer shadow"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan World</span>
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Interactive Canvas Preview */}
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-2 relative overflow-hidden">
          {/* Floating Tool Bar */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl backdrop-blur shadow-xl z-10 text-xs">
            <button
              onClick={() => setToolMode('extrude_up')}
              className={`p-1.5 rounded-lg flex items-center gap-1 cursor-pointer font-bold ${
                toolMode === 'extrude_up' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title="Tambah Ketinggian Block (+Z)"
            >
              <Plus className="w-4 h-4" />
              <span>Extrude +Z</span>
            </button>

            <button
              onClick={() => setToolMode('extrude_down')}
              className={`p-1.5 rounded-lg flex items-center gap-1 cursor-pointer font-bold ${
                toolMode === 'extrude_down' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title="Kurangi Ketinggian Block (-Z)"
            >
              <Minus className="w-4 h-4" />
              <span>Extrude -Z</span>
            </button>

            <button
              onClick={() => setToolMode('paint_material')}
              className={`p-1.5 rounded-lg flex items-center gap-1 cursor-pointer font-bold ${
                toolMode === 'paint_material' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title="Cat Material Tile"
            >
              <Paintbrush className="w-4 h-4" />
              <span>Material</span>
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={600}
            height={360}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredCell(null)}
            className="w-full h-full max-w-2xl max-h-[380px] bg-slate-950 rounded-xl border border-slate-800 shadow-2xl cursor-crosshair"
          />

          {hoveredCell && (
            <div className="absolute bottom-2 left-2 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-mono text-amber-300 backdrop-blur">
              Target Cell: Col {hoveredCell.col}, Row {hoveredCell.row} • Height: {isoConfig.heightmap[hoveredCell.row]?.[hoveredCell.col] || 0}
            </div>
          )}
        </div>

        {/* Right Procedural Controls & Material Inspector */}
        <div className="w-full md:w-80 bg-slate-900 p-3 overflow-y-auto space-y-3 border-t md:border-t-0 md:border-l border-slate-800 text-xs">
          {/* Procedural Terrain Generator Controls */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Generator Medan Prosedural
              </span>
              <button
                onClick={handleGenerateProcedural}
                className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-amber-500/30 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Re-Generate
              </button>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase">Preset Topografi</label>
              <select
                value={terrainPreset}
                onChange={(e) => setTerrainPreset(e.target.value as ProceduralIsoTerrainParams['preset'])}
                className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-bold text-xs"
              >
                <option value="hills">🏔️ Perbukitan & Gunung (Hills)</option>
                <option value="island">🏝️ Pulau Lautan (Island)</option>
                <option value="pyramid">📐 Piramida Bertingkat (Pyramid)</option>
                <option value="canyon">🏜️ Ngarai Dalam (Canyon)</option>
                <option value="dungeon">🏰 Benteng Dungeon (Dungeon)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400 font-bold">Tinggi Maksimum Mountain:</span>
                <span className="font-mono text-amber-300 font-bold">{mountainHeight} Level</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                value={mountainHeight}
                onChange={(e) => setMountainHeight(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400 font-bold">Kekasaran Perlin Noise:</span>
                <span className="font-mono text-amber-300 font-bold">{roughness}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.1}
                value={roughness}
                onChange={(e) => setRoughness(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400 font-bold">Seed Acak (Randomness):</span>
                <span className="font-mono text-amber-300 font-bold">{seed}</span>
              </div>
              <input
                type="range"
                min={1}
                max={999}
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Material Palette Selector */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Paintbrush className="w-3.5 h-3.5" /> Palet Tekstur Isometric
            </span>

            <div className="grid grid-cols-3 gap-1.5">
              {materialList.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setSelectedMaterial(m.key);
                    setToolMode('paint_material');
                  }}
                  className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    selectedMaterial === m.key
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded border border-slate-700 shadow-inner"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="text-[9px] truncate w-full text-center">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
