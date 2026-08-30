import React, { useState } from 'react';
import { Entity, TileType, TilemapComponent, SpriteClip } from '../../types/engine';
import { generatePresetSpriteClips, generatePresetLevelTilemap, generateTilePixelData, createEmptyGrid } from '../../engine/AutoTileEngine';
import {
  Paintbrush,
  Eraser,
  RotateCcw,
  Check,
  X,
  Film,
  Grid3X3,
  Plus,
  Trash2,
  Sparkles,
  Play,
  Pause,
} from 'lucide-react';

interface PixelEditorSheetProps {
  entity: Entity | null;
  onUpdateEntity: (entity: Entity) => void;
  onClose: () => void;
}

export const PixelEditorSheet: React.FC<PixelEditorSheetProps> = ({
  entity,
  onUpdateEntity,
  onClose,
}) => {
  const gridSize = 16;
  const initialGrid = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill('transparent'));

  const [mode, setMode] = useState<'pixel' | 'spritesheet' | 'tilemap'>(
    entity?.sprite.type === 'spritesheet' ? 'spritesheet' : entity?.sprite.type === 'tilemap' ? 'tilemap' : 'pixel'
  );

  // Single Pixel Frame State
  const [grid, setGrid] = useState<string[][]>(entity?.sprite.pixelData || initialGrid);
  const [selectedColor, setSelectedColor] = useState('#38bdf8');
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');

  // Spritesheet Clips State
  const [clips, setClips] = useState<Record<string, SpriteClip>>(() =>
    entity?.sprite.clips || generatePresetSpriteClips('Hero', '#06b6d4', '#3b82f6')
  );
  const [activeClipName, setActiveClipName] = useState<string>('run');
  const [activeFrameIdx, setActiveFrameIdx] = useState<number>(0);
  const [clipFps, setClipFps] = useState<number>(10);
  const [isPlayingAnim, setIsPlayingAnim] = useState<boolean>(true);

  // Tilemap Painter State
  const [tileTheme, setTileTheme] = useState<TilemapComponent['theme']>(
    entity?.sprite.tilemap?.theme || 'grass_dirt'
  );
  const [tilemapGrid, setTilemapGrid] = useState<TileType[][]>(
    entity?.sprite.tilemap?.data || generatePresetLevelTilemap('simple_platformer', 16, 10)
  );
  const [activeTileBrush, setActiveTileBrush] = useState<TileType>('grass_top');

  if (!entity) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs">
        Pilih objek di stage terlebih dahulu untuk membuka Studio Editor Graphics & Tilemap.
      </div>
    );
  }

  const palette = [
    '#38bdf8', '#facc15', '#ef4444', '#22c55e', '#a855f7', '#f97316', '#ffffff', '#000000', 'transparent'
  ];

  // Cell Click Handler for Pixel Grid
  const handleCellClick = (r: number, c: number) => {
    if (mode === 'pixel') {
      const newGrid = grid.map((row, ri) =>
        row.map((col, ci) => {
          if (ri === r && ci === c) {
            return tool === 'eraser' ? 'transparent' : selectedColor;
          }
          return col;
        })
      );
      setGrid(newGrid);
    } else if (mode === 'spritesheet') {
      const clip = clips[activeClipName];
      if (!clip || !clip.frames[activeFrameIdx]) return;
      const currentFrame = clip.frames[activeFrameIdx];
      const newFrame = currentFrame.map((row, ri) =>
        row.map((col, ci) => {
          if (ri === r && ci === c) {
            return tool === 'eraser' ? 'transparent' : selectedColor;
          }
          return col;
        })
      );

      const updatedFrames = [...clip.frames];
      updatedFrames[activeFrameIdx] = newFrame;
      setClips({
        ...clips,
        [activeClipName]: { ...clip, frames: updatedFrames },
      });
    }
  };

  // Tilemap Cell Click Handler
  const handleTilemapCellClick = (r: number, c: number) => {
    const newTilemapGrid = tilemapGrid.map((row, ri) =>
      row.map((tile, ci) => {
        if (ri === r && ci === c) {
          return tool === 'eraser' ? 'empty' : activeTileBrush;
        }
        return tile;
      })
    );
    setTilemapGrid(newTilemapGrid);
  };

  const handleClear = () => {
    if (mode === 'pixel') setGrid(initialGrid);
    else if (mode === 'tilemap') setTilemapGrid(Array(10).fill(null).map(() => Array(16).fill('empty')));
  };

  const handleSave = () => {
    if (mode === 'pixel') {
      onUpdateEntity({
        ...entity,
        sprite: {
          ...entity.sprite,
          type: 'pixel',
          pixelData: grid,
        },
      });
    } else if (mode === 'spritesheet') {
      onUpdateEntity({
        ...entity,
        sprite: {
          ...entity.sprite,
          type: 'spritesheet',
          currentClip: activeClipName,
          clips,
        },
      });
    } else if (mode === 'tilemap') {
      onUpdateEntity({
        ...entity,
        sprite: {
          ...entity.sprite,
          type: 'tilemap',
          tilemap: {
            tileSize: 32,
            cols: 16,
            rows: 10,
            data: tilemapGrid,
            theme: tileTheme,
            autoTiled: true,
          },
        },
      });
    }
    onClose();
  };

  return (
    <div className="flex flex-col h-full text-white bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-bold text-sm">Studio Editor Sprite & Tilemap</h3>
            <span className="text-[10px] text-slate-400">Objek: {entity.name}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 gap-2 pt-2">
        <button
          onClick={() => setMode('pixel')}
          className={`py-1.5 px-3 text-xs font-bold rounded-t-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            mode === 'pixel' ? 'bg-slate-900 text-cyan-400 border-t border-x border-slate-800' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Paintbrush className="w-3.5 h-3.5" />
          <span>Pixel Frame 16x16</span>
        </button>
        <button
          onClick={() => setMode('spritesheet')}
          className={`py-1.5 px-3 text-xs font-bold rounded-t-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            mode === 'spritesheet' ? 'bg-slate-900 text-purple-400 border-t border-x border-slate-800' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Spritesheet Clips</span>
        </button>
        <button
          onClick={() => setMode('tilemap')}
          className={`py-1.5 px-3 text-xs font-bold rounded-t-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            mode === 'tilemap' ? 'bg-slate-900 text-emerald-400 border-t border-x border-slate-800' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          <span>Tilemap Painter</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4">
        {/* MODE 1 & 2: PIXEL / SPRITESHEET FRAME CANVAS */}
        {(mode === 'pixel' || mode === 'spritesheet') && (
          <div className="flex flex-col items-center gap-3">
            {mode === 'spritesheet' && (
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full justify-between text-xs">
                {/* Select Clip */}
                <div className="flex gap-1">
                  {Object.keys(clips).map((clipKey) => (
                    <button
                      key={clipKey}
                      onClick={() => {
                        setActiveClipName(clipKey);
                        setActiveFrameIdx(0);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold capitalize cursor-pointer ${
                        activeClipName === clipKey ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {clipKey}
                    </button>
                  ))}
                </div>

                {/* Frame Selector */}
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  <span>Frame {activeFrameIdx + 1}/{clips[activeClipName]?.frames.length || 1}</span>
                  <button
                    onClick={() => {
                      const clip = clips[activeClipName];
                      if (!clip) return;
                      const newFrames = [...clip.frames, createEmptyGrid(16)];
                      setClips({ ...clips, [activeClipName]: { ...clip, frames: newFrames } });
                      setActiveFrameIdx(newFrames.length - 1);
                    }}
                    className="p-1 bg-purple-600/30 text-purple-300 rounded hover:bg-purple-600/50 cursor-pointer"
                    title="Tambah Frame"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Pixel Grid Canvas */}
            <div className="bg-slate-950 p-2 rounded-2xl border-2 border-slate-800 shadow-xl inline-block">
              <div className="grid grid-cols-16 gap-0.5 bg-slate-900 p-1 rounded-xl">
                {(() => {
                  const displayGrid =
                    mode === 'pixel'
                      ? grid
                      : clips[activeClipName]?.frames[activeFrameIdx] || initialGrid;

                  return displayGrid.map((row, r) =>
                    row.map((color, c) => (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => handleCellClick(r, c)}
                        className="w-4 h-4 border border-slate-800/40 rounded-sm cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: color === 'transparent' ? 'rgba(255,255,255,0.05)' : color }}
                      />
                    ))
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: TILEMAP PAINTER GRID */}
        {mode === 'tilemap' && (
          <div className="w-full flex flex-col items-center gap-3">
            <div className="flex items-center justify-between w-full max-w-sm text-xs bg-slate-950 p-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Tema Auto-Tile:</span>
                <select
                  value={tileTheme}
                  onChange={(e) => setTileTheme(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white"
                >
                  <option value="grass_dirt">🌿 Grass & Dirt</option>
                  <option value="cyber_neon">⚡ Cyber Neon</option>
                  <option value="retro_brick">🧱 Retro Brick</option>
                  <option value="dungeon_stone">🏰 Dungeon Stone</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                {[
                  { type: 'grass_top', label: 'Top' },
                  { type: 'dirt_center', label: 'Dirt' },
                  { type: 'brick', label: 'Brick' },
                  { type: 'spike', label: 'Spike' },
                  { type: 'coin', label: 'Coin' },
                ].map((b) => (
                  <button
                    key={b.type}
                    onClick={() => {
                      setActiveTileBrush(b.type as any);
                      setTool('pencil');
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                      activeTileBrush === b.type && tool === 'pencil' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tilemap Paint Canvas */}
            <div className="bg-slate-950 p-2 rounded-2xl border-2 border-slate-800 shadow-xl w-full max-w-sm">
              <div className="grid grid-cols-16 gap-0.5 bg-slate-900 p-1 rounded-xl">
                {tilemapGrid.map((row, r) =>
                  row.map((tileType, c) => {
                    const isSolid = tileType !== 'empty';
                    const isSpike = tileType === 'spike';
                    const isCoin = tileType === 'coin';

                    let color = 'rgba(255,255,255,0.03)';
                    if (isSpike) color = '#ef4444';
                    else if (isCoin) color = '#facc15';
                    else if (isSolid) color = tileTheme === 'cyber_neon' ? '#06b6d4' : tileTheme === 'retro_brick' ? '#b91c1c' : '#22c55e';

                    return (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => handleTilemapCellClick(r, c)}
                        className="w-full aspect-square border border-slate-800/30 rounded-xs cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: color }}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Common Palette & Save Controls */}
        <div className="w-full max-w-xs space-y-3">
          {mode !== 'tilemap' && (
            <>
              {/* Tool toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTool('pencil')}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    tool === 'pencil' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>Pensil</span>
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    tool === 'eraser' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Penghapus</span>
                </button>
                <button
                  onClick={handleClear}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 cursor-pointer"
                  title="Bersihkan Canvas"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Color Palette */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {palette.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color);
                      setTool('pencil');
                    }}
                    className={`w-7 h-7 rounded-full border border-white/20 cursor-pointer ${
                      selectedColor === color && tool === 'pencil' ? 'ring-2 ring-cyan-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color === 'transparent' ? '#1e293b' : color }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Simpan & Terapkan Ke Engine</span>
          </button>
        </div>
      </div>
    </div>
  );
};
