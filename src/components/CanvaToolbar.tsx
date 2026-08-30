import React, { useState, useEffect, useRef } from 'react';
import { Entity, EntityType, GameProject, WorldSettings } from '../types/engine';
import { LiteOptimizationEngine } from '../engine/LiteOptimizationEngine';
import { AndroidEngine } from '../engine/AndroidEngine';
import { useResponsiveToolbarScale } from '../hooks/useResponsiveToolbarScale';
import { WorkspaceLayoutConfig, LayoutMode, ToolbarPosition } from '../hooks/useWorkspaceLayout';
import { AddElementSheet } from './BottomSheets/AddElementSheet';
import { HierarchySheet } from './BottomSheets/HierarchySheet';
import { InspectorSheet } from './BottomSheets/InspectorSheet';
import { LogicSheet } from './BottomSheets/LogicSheet';
import { WorldSettingsSheet } from './BottomSheets/WorldSettingsSheet';
import { PixelEditorSheet } from './BottomSheets/PixelEditorSheet';
import { AudioLibrarySheet } from './BottomSheets/AudioLibrarySheet';
import { AnimationParticleSheet } from './BottomSheets/AnimationParticleSheet';
import { DialogueEditorSheet } from './BottomSheets/DialogueEditorSheet';
import { SceneManagerSheet } from './BottomSheets/SceneManagerSheet';
import { TutorialEditorSheet } from './BottomSheets/TutorialEditorSheet';
import { TilemapAtlasSheet } from './BottomSheets/TilemapAtlasSheet';
import { IsometricSheet } from './BottomSheets/IsometricSheet';
import { AssetManagerSheet } from './BottomSheets/AssetManagerSheet';
import { ShaderEditorSheet } from './BottomSheets/ShaderEditorSheet';
import { VirtualInputSheet } from './BottomSheets/VirtualInputSheet';
import { ProceduralLevelSheet } from './BottomSheets/ProceduralLevelSheet';
import { SoundEffectManagerSheet } from './BottomSheets/SoundEffectManagerSheet';
import { SaveLoadManagerSheet } from './BottomSheets/SaveLoadManagerSheet';
import { SpriteAtlasCompressorSheet } from './BottomSheets/SpriteAtlasCompressorSheet';
import { SpriteSheetSlicerSheet } from './BottomSheets/SpriteSheetSlicerSheet';
import { BatchPropertySheet } from './BottomSheets/BatchPropertySheet';

import { LayerOrderingSheet } from './BottomSheets/LayerOrderingSheet';
import { AssetPlacementSheet } from './BottomSheets/AssetPlacementSheet';
import { PrefabLibrarySheet } from './BottomSheets/PrefabLibrarySheet';
import { SavePrefabModal } from './BottomSheets/SavePrefabModal';
import { GameVariablesSheet } from './BottomSheets/GameVariablesSheet';
import { AssetBrowserModal } from './BottomSheets/AssetBrowserModal';
import { WebEcosystemSheet } from './BottomSheets/WebEcosystemSheet';
import { SmartAssetImporterSheet } from './BottomSheets/SmartAssetImporterSheet';
import { PhysicsPresetSheet } from './BottomSheets/PhysicsPresetSheet';
import { LightingSheet } from './BottomSheets/LightingSheet';
import { ConstraintsSheet } from './BottomSheets/ConstraintsSheet';
import { UltraRealitySheet } from './BottomSheets/UltraRealitySheet';

import {
  Plus,
  Layers,
  Sliders,
  Zap,
  Activity,
  Link2,
  Paintbrush,
  Globe,
  Volume2,
  Sparkles,
  MessageSquare,
  BookOpen,
  Grid,
  Box,
  Database,
  Gamepad2,
  Wand2,
  Copy,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Lock,
  Unlock,
  Trash2,
  Camera,
  HardDrive,
  Maximize2,
  Minimize2,
  Layout,
  Move,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  GripVertical,
  ZoomIn,
  ZoomOut,
  CheckSquare,
  X,
  Variable,
  FolderOpen,
  Sun,
  Scissors,
  Minus,
} from 'lucide-react';

interface CanvaToolbarProps {
  project: GameProject;
  selectedEntityId: string | null;
  selectedEntityIds?: string[];
  onSelectEntity: (id: string | null, isMultiToggle?: boolean) => void;
  onSelectAllEntities?: () => void;
  onClearSelection?: () => void;
  onAddEntity: (type: EntityType) => void;
  onUpdateEntity: (entity: Entity) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicateEntity: (id: string) => void;
  onDeleteEntity: (id: string) => void;
  onMassDelete?: (ids: string[]) => void;
  onMassDuplicate?: (ids: string[]) => void;
  onMassMove?: (ids: string[], dx: number, dy: number) => void;
  onMassResize?: (ids: string[], scaleFactor: number) => void;
  onMassLockToggle?: (ids: string[]) => void;
  onUpdateWorld: (world: WorldSettings) => void;
  onUpdateProject: (project: GameProject) => void;
  onOpenFullscreenPreview?: () => void;
  onOpenProfiler?: () => void;
  layoutConfig?: WorkspaceLayoutConfig;
  onUpdateLayoutConfig?: (patch: Partial<WorkspaceLayoutConfig>) => void;
  onOpenLayoutCustomizer?: () => void;
}

type ActiveSheetType = 'none' | 'add' | 'ultra_reality' | 'smart_asset_importer' | 'physics_preset' | 'constraints' | 'batch_property' | 'lighting' | 'hierarchy' | 'layer_ordering' | 'asset_placement' | 'asset_browser' | 'prefab_library' | 'save_prefab' | 'inspector' | 'logic' | 'game_variables' | 'web_ecosystem' | 'pixel' | 'audio' | 'sfx_manager' | 'save_manager' | 'atlas_compressor' | 'sprite_slicer' | 'anim_particle' | 'dialogue' | 'scenes' | 'tutorial' | 'tilemap_atlas' | 'isometric' | 'asset_manager' | 'shader' | 'virtual_input' | 'procedural_level' | 'world';

export const CanvaToolbar: React.FC<CanvaToolbarProps> = ({
  project,
  selectedEntityId,
  selectedEntityIds = [],
  onSelectEntity,
  onSelectAllEntities,
  onClearSelection,
  onAddEntity,
  onUpdateEntity,
  onToggleVisibility,
  onToggleLock,
  onDuplicateEntity,
  onDeleteEntity,
  onMassDelete,
  onMassDuplicate,
  onMassMove,
  onMassResize,
  onMassLockToggle,
  onUpdateWorld,
  onUpdateProject,
  onOpenFullscreenPreview,
  onOpenProfiler,
  layoutConfig,
  onUpdateLayoutConfig,
  onOpenLayoutCustomizer,
}) => {
  const [activeSheet, setActiveSheet] = useState<ActiveSheetType>('none');
  const [workflowCategory, setWorkflowCategory] = useState<'all' | 'visual' | 'physics_logic' | 'audio_fx' | 'world_system' | 'ultra_reality'>('all');

  const {
    viewportWidth,
    viewportHeight,
    isTouchDevice,
    isCompact,
    isTablet,
    isDesktop,
    isLandscape,
    touchTargetMinPx,
    buttonMinHeight,
    buttonMinWidth,
    iconSizeClass,
    labelSizeClass,
    sheetDrawerMaxHeight,
    sheetDrawerHeightPx,
    categoryChipPadding,
    floatingButtonSize,
  } = useResponsiveToolbarScale();

  // Layout mode & panel states
  const currentLayoutMode: LayoutMode = layoutConfig?.layoutMode || 'bottom_dock';
  const isPanelMinimized = layoutConfig?.isPanelMinimized ?? false;
  const isLowEnd = layoutConfig?.lowEndDeviceOptimized ?? false;

  // Custom Resizable Height for Bottom Drawer
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);
  const [isResizingHeight, setIsResizingHeight] = useState<boolean>(false);
  const resizeStartRef = useRef<{ startY: number; startHeight: number }>({ startY: 0, startHeight: 0 });

  // Floating PiP Drag Position
  const [pipPos, setPipPos] = useState<{ x: number; y: number }>({
    x: Math.max(10, (window.innerWidth - 340) / 2),
    y: Math.max(60, window.innerHeight * 0.25),
  });
  const [isPipDragging, setIsPipDragging] = useState<boolean>(false);
  const pipDragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  useEffect(() => {
    LiteOptimizationEngine.setUiSheetActive(activeSheet !== 'none' && !isPanelMinimized);
  }, [activeSheet, isPanelMinimized]);

  const entities = project?.entities || [];
  const selectedEntity = entities.find((e) => e.id === selectedEntityId) || null;

  const toggleSheet = (sheet: ActiveSheetType) => {
    if (activeSheet === sheet) {
      if (isPanelMinimized) {
        onUpdateLayoutConfig?.({ isPanelMinimized: false });
      } else {
        setActiveSheet('none');
      }
    } else {
      setActiveSheet(sheet);
      onUpdateLayoutConfig?.({ isPanelMinimized: false });
    }
  };

  // Height Resizing Handlers for Bottom Drawer
  const handleHeightResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsResizingHeight(true);
    const initialH = dynamicHeight || sheetDrawerHeightPx;
    resizeStartRef.current = {
      startY: e.clientY,
      startHeight: initialH,
    };
    AndroidEngine.triggerHaptic(15);
  };

  const handleHeightResizeMove = (e: React.PointerEvent) => {
    if (!isResizingHeight) return;
    const dy = resizeStartRef.current.startY - e.clientY; // Dragging UP expands height
    const newHeight = Math.max(160, Math.min(window.innerHeight * 0.85, resizeStartRef.current.startHeight + dy));
    setDynamicHeight(newHeight);
  };

  const handleHeightResizeEnd = (e: React.PointerEvent) => {
    if (!isResizingHeight) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsResizingHeight(false);
  };

  // Floating PiP Drag Handlers
  const handlePipDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsPipDragging(true);
    pipDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pipPos.x,
      initialY: pipPos.y,
    };
    AndroidEngine.triggerHaptic(15);
  };

  const handlePipDragMove = (e: React.PointerEvent) => {
    if (!isPipDragging) return;
    const dx = e.clientX - pipDragStartRef.current.startX;
    const dy = e.clientY - pipDragStartRef.current.startY;
    const nextX = Math.max(6, Math.min(window.innerWidth - 300, pipDragStartRef.current.initialX + dx));
    const nextY = Math.max(50, Math.min(window.innerHeight - 200, pipDragStartRef.current.initialY + dy));
    setPipPos({ x: nextX, y: nextY });
  };

  const handlePipDragEnd = (e: React.PointerEvent) => {
    if (!isPipDragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsPipDragging(false);
  };

  // Sheet Title helper
  const getSheetTitle = (type: ActiveSheetType): string => {
    switch (type) {
      case 'add': return 'Tambah Objek & Prefab';
      case 'smart_asset_importer': return 'Smart Asset Importer';
      case 'physics_preset': return 'Preset Fisika';
      case 'constraints': return 'Physics Constraints';
      case 'batch_property': return 'Multi Properti Terpilih';
      case 'lighting': return 'Lighting & Bayangan';
      case 'hierarchy': return 'Hirarki Objek Scene';
      case 'layer_ordering': return 'Urutan Layer & Z-Index';
      case 'asset_placement': return 'Penempatan Aset';
      case 'asset_browser': return 'Browser Aset';
      case 'prefab_library': return 'Pustaka Prefab';
      case 'save_prefab': return 'Simpan Prefab';
      case 'inspector': return 'Properti Objek';
      case 'logic': return 'Visual Scripting';
      case 'game_variables': return 'Variabel Game Global';
      case 'web_ecosystem': return 'Web Unified Engine';
      case 'pixel': return 'Pixel Art Studio';
      case 'audio': return 'Pustaka BGM & Audio';
      case 'sfx_manager': return 'Generator SFX 8-Bit';
      case 'save_manager': return 'Save / Load Data';
      case 'atlas_compressor': return 'Atlas Compressor';
      case 'sprite_slicer': return 'Pemotong Sprite Sheet';
      case 'anim_particle': return 'Partikel & VFX';
      case 'dialogue': return 'Editor Dialog';
      case 'scenes': return 'Manajer Multi-Scene';
      case 'tutorial': return 'Panduan Engine';
      case 'tilemap_atlas': return 'Tilemap & Grid Painter';
      case 'isometric': return 'Isometric 2.5D';
      case 'asset_manager': return 'Manajer Aset';
      case 'shader': return 'GPU GLSL Shader';
      case 'virtual_input': return 'Virtual Controller D-Pad';
      case 'procedural_level': return 'Generator Level';
      case 'world': return 'Pengaturan Dunia';
      case 'ultra_reality': return 'Ultra Reality (12 Layer)';
      default: return 'Panel Editor';
    }
  };

  const effectiveDrawerHeight = dynamicHeight || sheetDrawerHeightPx;

  return (
    <div id="canva-navigation-system" className="sticky bottom-0 z-50 pointer-events-none select-none flex flex-col justify-end">
      {/* Sliding Canva Bottom Sheet Drawer or Floating PiP Window */}
      {activeSheet !== 'none' && (
        <>
          {/* Minimized Floating / Docked Mini Bar */}
          {isPanelMinimized ? (
            <div className="pointer-events-auto self-center mb-2 px-3 py-1.5 bg-slate-900/95 border border-cyan-500/60 rounded-full shadow-2xl flex items-center gap-2 text-white backdrop-blur-md animate-in slide-in-from-bottom-2">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>{getSheetTitle(activeSheet)}</span>
              </span>

              <div className="w-px h-3.5 bg-slate-700" />

              <button
                onClick={() => onUpdateLayoutConfig?.({ isPanelMinimized: false })}
                className="p-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Buka / Maksimalkan Panel"
              >
                <ChevronsUp className="w-3.5 h-3.5" />
                <span className="text-[10px]">Buka</span>
              </button>

              <button
                onClick={() => setActiveSheet('none')}
                className="p-1 rounded-full bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                title="Tutup Sheet"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              id={currentLayoutMode === 'floating_pip' ? 'canva-floating-sheet' : 'canva-bottom-sheet'}
              style={
                currentLayoutMode === 'floating_pip'
                  ? {
                      transform: `translate3d(${pipPos.x}px, ${pipPos.y}px, 0)`,
                      width: window.innerWidth < 420 ? '94vw' : '360px',
                      height: `${Math.min(520, window.innerHeight * 0.75)}px`,
                    }
                  : { height: `${effectiveDrawerHeight}px`, maxHeight: sheetDrawerMaxHeight }
              }
              className={
                currentLayoutMode === 'floating_pip'
                  ? `fixed pointer-events-auto z-50 bg-slate-900/95 border border-cyan-500/50 rounded-2xl shadow-2xl flex flex-col text-white overflow-hidden ${
                      isLowEnd ? '' : 'backdrop-blur-xl'
                    }`
                  : `pointer-events-auto bg-slate-900/95 border-t border-slate-700/80 rounded-t-3xl shadow-2xl transition-all duration-200 animate-in slide-in-from-bottom-6 overflow-hidden flex flex-col text-white pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] ${
                      isLowEnd ? '' : 'backdrop-blur-xl'
                    }`
              }
            >
              {/* Header Bar */}
              {currentLayoutMode === 'floating_pip' ? (
                <div
                  onPointerDown={handlePipDragStart}
                  onPointerMove={handlePipDragMove}
                  onPointerUp={handlePipDragEnd}
                  onPointerCancel={handlePipDragEnd}
                  className="w-full bg-slate-950/90 px-3 py-2 border-b border-slate-800 flex items-center justify-between cursor-grab active:cursor-grabbing touch-none shrink-0"
                >
                  <div className="flex items-center gap-1.5">
                    <GripVertical className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-extrabold text-cyan-300 truncate max-w-[170px]">
                      {getSheetTitle(activeSheet)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateLayoutConfig?.({ isPanelMinimized: true });
                      }}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      title="Minimize Panel"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateLayoutConfig?.({ layoutMode: 'bottom_dock' });
                      }}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      title="Kembalikan ke Dock Bawah"
                    >
                      <Layout className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSheet('none');
                      }}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-red-500/30 text-slate-400 hover:text-red-400 cursor-pointer"
                      title="Tutup Sheet"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-slate-950/80 px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
                  {/* Drag to Resize Height Handle */}
                  <div
                    onPointerDown={handleHeightResizeStart}
                    onPointerMove={handleHeightResizeMove}
                    onPointerUp={handleHeightResizeEnd}
                    onPointerCancel={handleHeightResizeEnd}
                    className="flex-1 py-1 flex items-center justify-center cursor-ns-resize touch-none min-h-[36px] group"
                    title="Tarik ke atas / bawah untuk ubah tinggi panel"
                  >
                    <div className="w-14 h-1.5 bg-slate-600 group-hover:bg-cyan-400 transition-colors rounded-full" />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="text-[11px] font-bold text-cyan-300 hidden xs:inline truncate max-w-[150px]">
                      {getSheetTitle(activeSheet)}
                    </span>

                    <button
                      onClick={() => onUpdateLayoutConfig?.({ isPanelMinimized: true })}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      title="Minimize Panel (Bebaskan Canvas)"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onUpdateLayoutConfig?.({ layoutMode: 'floating_pip' })}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 cursor-pointer hidden sm:flex"
                      title="Ubah ke Mode Jendela Mengambang (Floating PiP)"
                    >
                      <Move className="w-3.5 h-3.5" />
                    </button>

                    {onOpenLayoutCustomizer && (
                      <button
                        onClick={onOpenLayoutCustomizer}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 cursor-pointer"
                        title="Kustomisasi Tata Letak"
                      >
                        <Layout className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => setActiveSheet('none')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="Tutup Sheet"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sheet Content Render */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {activeSheet === 'add' && (
              <AddElementSheet
                onClose={() => setActiveSheet('none')}
                onAddEntity={onAddEntity}
                onOpenAssetPlacement={() => setActiveSheet('asset_placement')}
                onOpenPrefabLibrary={() => setActiveSheet('prefab_library')}
                onOpenAssetBrowser={() => setActiveSheet('asset_browser')}
                onOpenSmartImporter={() => setActiveSheet('smart_asset_importer')}
              />
            )}

            {activeSheet === 'smart_asset_importer' && (
              <SmartAssetImporterSheet
                project={project}
                onAddEntity={onAddEntity}
                onUpdateProject={onUpdateProject}
                onSelectEntity={(id) => onSelectEntity(id)}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'physics_preset' && (
              <PhysicsPresetSheet
                project={project}
                selectedEntityId={selectedEntityId}
                selectedEntityIds={selectedEntityIds}
                onUpdateEntity={onUpdateEntity}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'constraints' && (
              <ConstraintsSheet
                project={project}
                selectedEntityId={selectedEntityId}
                selectedEntityIds={selectedEntityIds}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'batch_property' && (
              <BatchPropertySheet
                project={project}
                selectedEntityId={selectedEntityId}
                selectedEntityIds={selectedEntityIds}
                onSelectEntity={onSelectEntity}
                onUpdateEntity={onUpdateEntity}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'hierarchy' && (
              <HierarchySheet
                entities={project.entities}
                groups={project.groups || []}
                selectedEntityId={selectedEntityId}
                selectedEntityIds={selectedEntityIds}
                project={project}
                onSelectEntity={(id, isMultiToggle) => {
                  onSelectEntity(id, isMultiToggle);
                  if (!isMultiToggle && selectedEntityIds.length <= 1) {
                    setActiveSheet('inspector'); // Switch to inspector on single tap
                  }
                }}
                onSelectAllEntities={onSelectAllEntities}
                onClearSelection={onClearSelection}
                onUpdateEntity={onUpdateEntity}
                onUpdateEntities={(updated) => onUpdateProject({ ...project, entities: updated })}
                onUpdateGroups={(updated) => onUpdateProject({ ...project, groups: updated })}
                onUpdateProject={onUpdateProject}
                onToggleVisibility={onToggleVisibility}
                onToggleLock={onToggleLock}
                onDuplicateEntity={onDuplicateEntity}
                onDeleteEntity={onDeleteEntity}
                onOpenSavePrefab={() => setActiveSheet('save_prefab')}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'layer_ordering' && (
              <LayerOrderingSheet
                entities={project.entities}
                groups={project.groups || []}
                selectedEntityId={selectedEntityId}
                selectedEntityIds={selectedEntityIds}
                project={project}
                onSelectEntity={(id, isMultiToggle) => onSelectEntity(id, isMultiToggle)}
                onUpdateEntity={onUpdateEntity}
                onUpdateEntities={(updated) => onUpdateProject({ ...project, entities: updated })}
                onUpdateGroups={(updated) => onUpdateProject({ ...project, groups: updated })}
                onUpdateProject={onUpdateProject}
                onToggleVisibility={onToggleVisibility}
                onToggleLock={onToggleLock}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'asset_placement' && (
              <AssetPlacementSheet
                project={project}
                onUpdateProject={onUpdateProject}
                onSelectEntity={(id) => onSelectEntity(id)}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'asset_browser' && (
              <AssetBrowserModal
                project={project}
                selectedEntity={selectedEntity}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'web_ecosystem' && (
              <WebEcosystemSheet
                project={project}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'ultra_reality' && (
              <UltraRealitySheet
                project={project}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'prefab_library' && (
              <PrefabLibrarySheet
                project={project}
                onUpdateProject={onUpdateProject}
                onSelectEntity={(id) => onSelectEntity(id)}
                onOpenSavePrefab={() => setActiveSheet('save_prefab')}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'save_prefab' && (
              <SavePrefabModal
                selectedEntities={
                  selectedEntityIds.length > 0
                    ? project.entities.filter((e) => selectedEntityIds.includes(e.id))
                    : selectedEntity
                    ? [selectedEntity]
                    : []
                }
                project={project}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
                onSuccess={() => setActiveSheet('prefab_library')}
              />
            )}

            {activeSheet === 'inspector' && (
              <InspectorSheet
                entity={selectedEntity}
                world={project.world}
                onUpdateEntity={onUpdateEntity}
                onUpdateWorld={onUpdateWorld}
                onOpenSavePrefab={() => setActiveSheet('save_prefab')}
                onOpenPhysicsPresets={() => setActiveSheet('physics_preset')}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'logic' && (
              <LogicSheet
                entity={selectedEntity}
                project={project}
                onUpdateEntity={onUpdateEntity}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'game_variables' && (
              <GameVariablesSheet
                project={project}
                entities={project.entities}
                selectedEntity={selectedEntity}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'pixel' && (
              <PixelEditorSheet
                entity={selectedEntity}
                onUpdateEntity={onUpdateEntity}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'audio' && (
              <AudioLibrarySheet
                project={project}
                selectedEntity={selectedEntity}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'sfx_manager' && (
              <SoundEffectManagerSheet
                project={project}
                selectedEntity={selectedEntity}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'save_manager' && (
              <SaveLoadManagerSheet
                project={project}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'atlas_compressor' && (
              <SpriteAtlasCompressorSheet
                project={project}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'sprite_slicer' && (
              <SpriteSheetSlicerSheet
                project={project}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'anim_particle' && (
              <AnimationParticleSheet
                entity={selectedEntity}
                onUpdateEntity={onUpdateEntity}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'dialogue' && (
              <DialogueEditorSheet
                dialogues={project.dialogues}
                onUpdateDialogues={(updated) => onUpdateProject({ ...project, dialogues: updated })}
                onTestDialogue={(tree) => {
                  setActiveSheet('none');
                }}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'scenes' && (
              <SceneManagerSheet
                project={project}
                onUpdateProject={onUpdateProject}
                onTestSceneTransition={(sceneId, transition) => {
                  onUpdateProject({ ...project, activeSceneId: sceneId });
                  setActiveSheet('none');
                }}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'tutorial' && (
              <TutorialEditorSheet
                tutorials={project.tutorials}
                onUpdateTutorials={(updated) => onUpdateProject({ ...project, tutorials: updated })}
                onStartTutorial={(seq) => {
                  setActiveSheet('none');
                }}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'tilemap_atlas' && (
              <TilemapAtlasSheet
                project={project}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'isometric' && (
              <IsometricSheet
                project={project}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'asset_manager' && (
              <AssetManagerSheet
                project={project}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'shader' && (
              <ShaderEditorSheet
                project={project}
                selectedEntity={selectedEntity}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'virtual_input' && (
              <VirtualInputSheet
                project={project}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'procedural_level' && (
              <ProceduralLevelSheet
                project={project}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'lighting' && (
              <LightingSheet
                world={project.world}
                onUpdateWorld={onUpdateWorld}
                onClose={() => setActiveSheet('none')}
              />
            )}

            {activeSheet === 'world' && (
              <WorldSettingsSheet
                world={project.world}
                project={project}
                entities={project.entities}
                onUpdateWorld={onUpdateWorld}
                onUpdateProject={onUpdateProject}
                onClose={() => setActiveSheet('none')}
              />
            )}
          </div>
        </div>
      )}
    </>
  )}

      {/* Floating Multi-Selection Mass Action Bar */}
      {selectedEntityIds.length > 1 && activeSheet === 'none' && (
        <div className="pointer-events-auto self-center mb-2 px-3 py-2 bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl shadow-2xl flex flex-wrap items-center justify-center gap-2 text-xs z-30 animate-in fade-in slide-in-from-bottom-2 max-w-[95vw]">
          {/* Multi Badge */}
          <div className="flex items-center gap-1.5 bg-cyan-500/20 text-cyan-300 font-bold px-2.5 py-1.5 rounded-xl border border-cyan-500/40">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] whitespace-nowrap">{selectedEntityIds.length} Objek Terpilih</span>
          </div>

          <div className="w-px h-5 bg-slate-700" />

          {/* Mass Nudge Move */}
          {onMassMove && (
            <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                onClick={() => onMassMove(selectedEntityIds, -10, 0)}
                className={`${floatingButtonSize} flex items-center justify-center hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 rounded-lg cursor-pointer transition-all touch-manipulation active:scale-95`}
                title="Geser Kiri -10px"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onMassMove(selectedEntityIds, 10, 0)}
                className={`${floatingButtonSize} flex items-center justify-center hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 rounded-lg cursor-pointer transition-all touch-manipulation active:scale-95`}
                title="Geser Kanan +10px"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onMassMove(selectedEntityIds, 0, -10)}
                className={`${floatingButtonSize} flex items-center justify-center hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 rounded-lg cursor-pointer transition-all touch-manipulation active:scale-95`}
                title="Geser Atas -10px"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onMassMove(selectedEntityIds, 0, 10)}
                className={`${floatingButtonSize} flex items-center justify-center hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 rounded-lg cursor-pointer transition-all touch-manipulation active:scale-95`}
                title="Geser Bawah +10px"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mass Resize */}
          {onMassResize && (
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => onMassResize(selectedEntityIds, 1.15)}
                className="flex items-center justify-center min-h-[36px] gap-1 px-2 py-1 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200 font-bold text-[10px] rounded-lg cursor-pointer transition-all touch-manipulation active:scale-95"
                title="Perbesar Ukuran (+15%)"
              >
                <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>+15%</span>
              </button>
              <button
                onClick={() => onMassResize(selectedEntityIds, 0.85)}
                className="flex items-center justify-center min-h-[36px] gap-1 px-2 py-1 hover:bg-amber-500/20 hover:text-amber-300 text-slate-200 font-bold text-[10px] rounded-lg cursor-pointer transition-all touch-manipulation active:scale-95"
                title="Perkecil Ukuran (-15%)"
              >
                <ZoomOut className="w-3.5 h-3.5 text-amber-400" />
                <span>-15%</span>
              </button>
            </div>
          )}

          <div className="w-px h-5 bg-slate-700" />

          {/* Mass Layer Ordering */}
          <button
            onClick={() => {
              const maxZ = Math.max(...entities.map((e) => e.transform.zIndex || 0), 0);
              const updatedEntities = entities.map((e, idx) => {
                if (selectedEntityIds.includes(e.id)) {
                  return {
                    ...e,
                    transform: { ...e.transform, zIndex: maxZ + 1 + idx },
                  };
                }
                return e;
              });
              onUpdateProject({ ...project, entities: updatedEntities });
              AndroidEngine.triggerHaptic(30);
            }}
            className="min-h-[36px] px-2 py-1 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-xl border border-cyan-500/40 transition-all cursor-pointer flex items-center justify-center gap-1 touch-manipulation active:scale-95"
            title="Pindahkan Semua Objek Terpilih ke Layer Paling Depan (Bring to Front)"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold hidden sm:inline">Front</span>
          </button>

          <button
            onClick={() => {
              const minZ = Math.min(...entities.map((e) => e.transform.zIndex || 0), 0);
              const updatedEntities = entities.map((e, idx) => {
                if (selectedEntityIds.includes(e.id)) {
                  return {
                    ...e,
                    transform: { ...e.transform, zIndex: minZ - 1 - idx },
                  };
                }
                return e;
              });
              onUpdateProject({ ...project, entities: updatedEntities });
              AndroidEngine.triggerHaptic(30);
            }}
            className="min-h-[36px] px-2 py-1 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-xl border border-cyan-500/40 transition-all cursor-pointer flex items-center justify-center gap-1 touch-manipulation active:scale-95"
            title="Pindahkan Semua Objek Terpilih ke Layer Paling Belakang (Send to Back)"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold hidden sm:inline">Back</span>
          </button>

          {/* Mass Duplicate */}
          {onMassDuplicate && (
            <button
              onClick={() => onMassDuplicate(selectedEntityIds)}
              className="min-h-[36px] px-2 py-1 text-slate-300 hover:text-cyan-300 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition-all cursor-pointer flex items-center justify-center gap-1 touch-manipulation active:scale-95"
              title="Duplikat Semua Objek Terpilih"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-semibold hidden sm:inline">Duplikat</span>
            </button>
          )}

          {/* Mass Lock */}
          {onMassLockToggle && (
            <button
              onClick={() => onMassLockToggle(selectedEntityIds)}
              className="min-h-[36px] px-2 py-1 text-slate-300 hover:text-amber-300 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition-all cursor-pointer flex items-center justify-center gap-1 touch-manipulation active:scale-95"
              title="Kunci / Buka Kunci Objek Terpilih"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-semibold hidden sm:inline">Kunci</span>
            </button>
          )}

          {/* Mass Delete */}
          {onMassDelete && (
            <button
              onClick={() => onMassDelete(selectedEntityIds)}
              className="min-h-[36px] px-2 py-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl border border-rose-500/40 transition-all cursor-pointer flex items-center justify-center gap-1 touch-manipulation active:scale-95"
              title="Hapus Semua Objek Terpilih"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Hapus</span>
            </button>
          )}

          {/* Clear Selection */}
          {onClearSelection && (
            <button
              onClick={onClearSelection}
              className={`${floatingButtonSize} flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95`}
              title="Batal Pilih"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Floating Quick Action Bar for Selected Entity */}
      {selectedEntity && selectedEntityIds.length <= 1 && activeSheet === 'none' && (
        <div className="pointer-events-auto self-center mb-2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-full shadow-xl flex items-center gap-1.5 sm:gap-2 text-xs z-30 animate-in fade-in slide-in-from-bottom-2">
          <span className="text-[11px] font-bold text-cyan-400 max-w-[90px] truncate pl-1">
            {selectedEntity.name}
          </span>
          <div className="w-px h-4 bg-slate-700" />

          {/* Camera Focus Target Toggle */}
          <button
            onClick={() => {
              const isCurrentTarget = project.world.cameraFollowEntityId === selectedEntity.id;
              onUpdateWorld({
                ...project.world,
                cameraFollowEntityId: isCurrentTarget ? undefined : selectedEntity.id,
              });
            }}
            className={`${floatingButtonSize} flex items-center justify-center rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95 ${
              project.world.cameraFollowEntityId === selectedEntity.id
                ? 'text-amber-400 bg-amber-500/20 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800'
            }`}
            title={
              project.world.cameraFollowEntityId === selectedEntity.id
                ? 'Camera Focus Target Aktif (Klik untuk lepas)'
                : 'Jadikan Camera Focus Target'
            }
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Duplicate Button */}
          <button
            onClick={() => onDuplicateEntity(selectedEntity.id)}
            className={`${floatingButtonSize} flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95`}
            title="Duplikat Objek"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Bring to Front */}
          <button
            onClick={() => {
              const maxZ = Math.max(...entities.map((e) => e.transform.zIndex || 0), 0);
              onUpdateEntity({
                ...selectedEntity,
                transform: { ...selectedEntity.transform, zIndex: maxZ + 1 },
              });
              AndroidEngine.triggerHaptic(25);
            }}
            className={`${floatingButtonSize} flex items-center justify-center text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95`}
            title="Bring to Front (Pindahkan ke Layer Paling Depan)"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
          </button>

          {/* Layer Up (+1) */}
          <button
            onClick={() => {
              onUpdateEntity({
                ...selectedEntity,
                transform: { ...selectedEntity.transform, zIndex: (selectedEntity.transform.zIndex || 0) + 1 },
              });
              AndroidEngine.triggerHaptic(15);
            }}
            className={`${floatingButtonSize} flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95`}
            title="Bring Forward (Z-Index +1)"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          {/* Z-Index Badge + Open Layer Ordering */}
          <button
            onClick={() => toggleSheet('layer_ordering')}
            className={`px-2 py-1 min-h-[32px] rounded text-[9.5px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center touch-manipulation active:scale-95 ${
              activeSheet === 'layer_ordering'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                : 'text-cyan-300 bg-slate-950/80 border border-cyan-500/30 hover:bg-cyan-500/20'
            }`}
            title="Buka Panel Urutan Layer & Z-Index Detail"
          >
            Z:{selectedEntity.transform.zIndex || 0}
          </button>

          {/* Layer Down (-1) */}
          <button
            onClick={() => {
              onUpdateEntity({
                ...selectedEntity,
                transform: { ...selectedEntity.transform, zIndex: Math.max(-100, (selectedEntity.transform.zIndex || 0) - 1) },
              });
              AndroidEngine.triggerHaptic(15);
            }}
            className={`${floatingButtonSize} flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95`}
            title="Send Backward (Z-Index -1)"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Send to Back */}
          <button
            onClick={() => {
              const minZ = Math.min(...entities.map((e) => e.transform.zIndex || 0), 0);
              onUpdateEntity({
                ...selectedEntity,
                transform: { ...selectedEntity.transform, zIndex: minZ - 1 },
              });
              AndroidEngine.triggerHaptic(25);
            }}
            className={`${floatingButtonSize} flex items-center justify-center text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95`}
            title="Send to Back (Pindahkan ke Layer Paling Belakang)"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>

          {/* Lock / Unlock */}
          <button
            onClick={() => onToggleLock(selectedEntity.id)}
            className={`${floatingButtonSize} flex items-center justify-center rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95 ${
              selectedEntity.locked ? 'text-amber-400 bg-amber-500/20' : 'text-slate-300 hover:text-amber-400'
            }`}
            title={selectedEntity.locked ? 'Buka Kunci' : 'Kunci Objek'}
          >
            {selectedEntity.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Physics Preset Quick Action */}
          <button
            onClick={() => toggleSheet('physics_preset')}
            className={`px-2.5 py-1 min-h-[36px] rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer touch-manipulation active:scale-95 ${
              activeSheet === 'physics_preset'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
            }`}
            title="Terapkan Preset Fisika (Bouncy, Heavy, Ice, Wall)"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Preset Fisika</span>
          </button>

          {/* Save as Prefab */}
          <button
            onClick={() => toggleSheet('save_prefab')}
            className="px-2.5 py-1 min-h-[36px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer touch-manipulation active:scale-95"
            title="Simpan Objek ini sebagai Reusable Prefab"
          >
            <Box className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Simpan Prefab</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => onDeleteEntity(selectedEntity.id)}
            className={`${floatingButtonSize} flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95`}
            title="Hapus Objek"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Workflow Category Navigation Bar (Refined Game Dev Steps) */}
      <div className="pointer-events-auto bg-slate-950/90 border-t border-slate-800/80 px-2 py-1 flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar z-50">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold text-slate-400 px-1 uppercase tracking-wider hidden sm:inline">
            Workflow:
          </span>
          <button
            onClick={() => setWorkflowCategory('all')}
            className={`${categoryChipPadding} min-h-[38px] sm:min-h-[32px] rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
              workflowCategory === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Semua Tool</span>
          </button>
          <button
            onClick={() => setWorkflowCategory('visual')}
            className={`${categoryChipPadding} min-h-[38px] sm:min-h-[32px] rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
              workflowCategory === 'visual'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                : 'text-amber-300/80 hover:text-amber-300 hover:bg-amber-950/30'
            }`}
          >
            <Paintbrush className="w-3 h-3" />
            <span>1. Visual & Aset</span>
          </button>
          <button
            onClick={() => setWorkflowCategory('physics_logic')}
            className={`${categoryChipPadding} min-h-[38px] sm:min-h-[32px] rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
              workflowCategory === 'physics_logic'
                ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                : 'text-cyan-300/80 hover:text-cyan-300 hover:bg-cyan-950/30'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>2. Fisika & Logika</span>
          </button>
          <button
            onClick={() => setWorkflowCategory('audio_fx')}
            className={`${categoryChipPadding} min-h-[38px] sm:min-h-[32px] rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
              workflowCategory === 'audio_fx'
                ? 'bg-purple-500 text-slate-950 shadow-sm shadow-purple-500/20'
                : 'text-purple-300/80 hover:text-purple-300 hover:bg-purple-950/30'
            }`}
          >
            <Volume2 className="w-3 h-3" />
            <span>3. Audio & Efek</span>
          </button>
          <button
            onClick={() => setWorkflowCategory('world_system')}
            className={`${categoryChipPadding} min-h-[38px] sm:min-h-[32px] rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
              workflowCategory === 'world_system'
                ? 'bg-indigo-500 text-slate-950 shadow-sm shadow-indigo-500/20'
                : 'text-indigo-300/80 hover:text-indigo-300 hover:bg-indigo-950/30'
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>4. Hirarki & Dunia</span>
          </button>
          <button
            onClick={() => {
              setWorkflowCategory('ultra_reality');
              toggleSheet('ultra_reality');
            }}
            className={`${categoryChipPadding} min-h-[38px] sm:min-h-[32px] rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
              workflowCategory === 'ultra_reality'
                ? 'bg-gradient-to-r from-cyan-400 to-indigo-400 text-slate-950 shadow-md shadow-cyan-500/30 font-black'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
            }`}
          >
            <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>5. Ultra Reality (12 Layer) ✨</span>
          </button>
        </div>
      </div>

      {/* Main Canva Bottom Action Bar */}
      <nav id="canva-bottom-bar" className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-white px-1.5 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] flex items-center gap-1.5 overflow-x-auto no-scrollbar z-50 shadow-2xl">
        {/* Always Pinned Essential Quick Actions */}
        <button
          onClick={() => toggleSheet('ultra_reality')}
          id="btn-canva-ultra-reality-quick"
          className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 text-slate-950 font-black shadow-md shadow-cyan-500/30 touch-manipulation active:scale-95 ${
            activeSheet === 'ultra_reality' ? 'ring-2 ring-cyan-300' : ''
          }`}
          title="Buka Matriks Ultra Reality 12 Layer (54 Sistem Simulasi)"
        >
          <Sparkles className={`${iconSizeClass} stroke-[2.5]`} />
          <span className={`${labelSizeClass} font-black whitespace-nowrap`}>Ultra Reality</span>
        </button>

        <button
          onClick={() => toggleSheet('add')}
          id="btn-canva-add"
          className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
            activeSheet === 'add'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30'
          }`}
        >
          <Plus className={`${iconSizeClass} stroke-[2.5]`} />
          <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Tambah</span>
        </button>

        {/* Fullscreen Preview Launcher */}
        {onOpenFullscreenPreview && (
          <button
            onClick={onOpenFullscreenPreview}
            id="btn-canva-fullscreen-preview"
            className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400 font-extrabold shadow-md shadow-amber-500/20 touch-manipulation active:scale-95`}
            title="Buka Pratinjau Layar Penuh (Fullscreen Preview)"
          >
            <Maximize2 className={`${iconSizeClass} stroke-[2.5]`} />
            <span className={`${labelSizeClass} font-extrabold whitespace-nowrap`}>Fullscreen</span>
          </button>
        )}

        {/* Engine Hub & Auto-Tuner Quick Launcher */}
        {onOpenProfiler && (
          <button
            onClick={onOpenProfiler}
            id="btn-canva-autotune-hub"
            className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 bg-gradient-to-br from-cyan-600 to-blue-600 text-white font-extrabold shadow-md shadow-cyan-500/20 hover:from-cyan-500 hover:to-blue-500 touch-manipulation active:scale-95`}
            title="Buka Unified Engine Hub & 1-Click Hardware Auto-Tuner"
          >
            <Zap className={`${iconSizeClass} text-cyan-200 animate-pulse`} />
            <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Auto-Tune</span>
          </button>
        )}

        {/* Layout & Workspace Customizer Launcher */}
        {onOpenLayoutCustomizer && (
          <button
            onClick={onOpenLayoutCustomizer}
            id="btn-canva-layout-customizer"
            className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm touch-manipulation active:scale-95`}
            title="Kustomisasi Tata Letak, Mode Layar Penuh Canvas, & Minimasi Panel"
          >
            <Layout className={`${iconSizeClass} text-cyan-400`} />
            <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Tata Letak</span>
          </button>
        )}

        {/* Visual Category Tools */}
        {(workflowCategory === 'all' || workflowCategory === 'visual') && (
          <>
            <button
              onClick={() => toggleSheet('smart_asset_importer')}
              id="btn-canva-smart-importer"
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'smart_asset_importer'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Smart Asset Importer (Pilih & Impor Sprite Preset Visual)"
            >
              <Wand2 className={`${iconSizeClass} text-amber-300`} />
              <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Smart Importer</span>
            </button>

            <button
              onClick={() => toggleSheet('asset_placement')}
              id="btn-canva-asset-placement"
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'asset_placement'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Pick, Upload & Pasang Aset ke Sprite/Tile System"
            >
              <Sparkles className={`${iconSizeClass} text-amber-300`} />
              <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Aset ke Game</span>
            </button>

            <button
              onClick={() => toggleSheet('asset_browser')}
              id="btn-canva-asset-browser"
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'asset_browser'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
              }`}
              title="Buka Centralized Asset Browser & Impor Batch"
            >
              <FolderOpen className={`${iconSizeClass} text-cyan-300`} />
              <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Browser Aset</span>
            </button>

            <button
              onClick={() => toggleSheet('prefab_library')}
              id="btn-canva-prefab-library"
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'prefab_library'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Buka Koleksi Prefab Module Reusable"
            >
              <Box className={`${iconSizeClass} text-amber-300`} />
              <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Library Prefab</span>
            </button>

            <button
              onClick={() => toggleSheet('pixel')}
              id="btn-canva-pixel"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'pixel'
                  ? 'text-emerald-400 bg-slate-800 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Paintbrush className={`${iconSizeClass} text-emerald-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Pixel Editor</span>
            </button>

            <button
              onClick={() => toggleSheet('sprite_slicer')}
              id="btn-canva-sprite-slicer"
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'sprite_slicer'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Automated Sprite Sheet Slicer (Potong Sprite Sheet & Hemat VRAM Memori)"
            >
              <Scissors className={`${iconSizeClass} text-amber-300 stroke-[2.5]`} />
              <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Sprite Slicer ✂️</span>
            </button>

            <button
              onClick={() => toggleSheet('tilemap_atlas')}
              id="btn-canva-tilemap-atlas"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'tilemap_atlas'
                  ? 'text-amber-400 bg-slate-800 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Grid className={`${iconSizeClass} text-amber-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Tile & Atlas</span>
            </button>
          </>
        )}

        {/* Physics & Logic Category Tools */}
        {(workflowCategory === 'all' || workflowCategory === 'physics_logic') && (
          <>
            <button
              onClick={() => toggleSheet('physics_preset')}
              id="btn-canva-physics-preset"
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'physics_preset'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Physics Presets (Terapkan Profil Fisika Bouncy, Heavy, Ice/Slippery, Wall)"
            >
              <Activity className={`${iconSizeClass} text-amber-300`} />
              <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Preset Fisika</span>
            </button>

            <button
              onClick={() => toggleSheet('constraints')}
              id="btn-canva-constraints"
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'constraints'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
              }`}
              title="Sendi & Constraints Fisika (Hubungkan Distance Joint & Hinge Antar Objek)"
            >
              <Link2 className={`${iconSizeClass} text-cyan-300 stroke-[2.5]`} />
              <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Sendi Fisika 🔗</span>
            </button>

            <button
              onClick={() => toggleSheet('batch_property')}
              id="btn-canva-batch-property"
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'batch_property'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Batch Property Editor (Update Gesekan, Gravitasi, dan Pantulan Banyak Entitas Sekaligus)"
            >
              <Sliders className={`${iconSizeClass} text-amber-300 stroke-[2.5]`} />
              <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Batch Property ⚡</span>
            </button>

            <button
              onClick={() => toggleSheet('logic')}
              id="btn-canva-logic"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'logic'
                  ? 'text-amber-400 bg-slate-800 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Zap className={`${iconSizeClass} text-amber-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Logika</span>
            </button>

            <button
              onClick={() => toggleSheet('game_variables')}
              id="btn-canva-game-variables"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'game_variables'
                  ? 'text-purple-400 bg-slate-800 font-semibold border border-purple-500/30 shadow-sm'
                  : 'text-purple-400/80 hover:text-purple-300 hover:bg-purple-950/30'
              }`}
            >
              <Variable className={`${iconSizeClass} text-purple-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Variabel</span>
            </button>

            <button
              onClick={() => toggleSheet('virtual_input')}
              id="btn-canva-virtual-input"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'virtual_input'
                  ? 'text-cyan-400 bg-slate-800 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Gamepad2 className={`${iconSizeClass} text-cyan-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Input Control</span>
            </button>

            <button
              onClick={() => toggleSheet('procedural_level')}
              id="btn-canva-procedural-level"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'procedural_level'
                  ? 'text-indigo-400 bg-slate-800 font-semibold border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Wand2 className={`${iconSizeClass} text-indigo-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Gen Map</span>
            </button>
          </>
        )}

        {/* Audio & Effects Category Tools */}
        {(workflowCategory === 'all' || workflowCategory === 'audio_fx') && (
          <>
            <button
              onClick={() => toggleSheet('audio')}
              id="btn-canva-audio"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'audio'
                  ? 'text-cyan-400 bg-slate-800 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Volume2 className={`${iconSizeClass} text-amber-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Aset Media</span>
            </button>

            <button
              onClick={() => toggleSheet('sfx_manager')}
              id="btn-canva-sfx-manager"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'sfx_manager'
                  ? 'text-cyan-400 bg-slate-800 font-semibold border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Zap className={`${iconSizeClass} text-cyan-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Trigger SFX</span>
            </button>

            <button
              onClick={() => toggleSheet('anim_particle')}
              id="btn-canva-anim-particle"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'anim_particle'
                  ? 'text-amber-400 bg-slate-800 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className={`${iconSizeClass} text-amber-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Efek Partikel</span>
            </button>

            <button
              onClick={() => toggleSheet('shader')}
              id="btn-canva-shader"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'shader'
                  ? 'text-amber-400 bg-slate-800 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className={`${iconSizeClass} text-amber-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Shader GPU</span>
            </button>

            <button
              onClick={() => toggleSheet('lighting')}
              id="btn-canva-lighting"
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'lighting'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title="Atur Warna Ambient, Intensititas Cahaya & Bayangan Objek (Lighting)"
            >
              <Sun className={`${iconSizeClass} text-amber-300`} />
              <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Lighting</span>
            </button>

            <button
              onClick={() => toggleSheet('dialogue')}
              id="btn-canva-dialogue"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'dialogue'
                  ? 'text-sky-400 bg-slate-800 font-semibold border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <MessageSquare className={`${iconSizeClass} text-sky-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Dialog</span>
            </button>
          </>
        )}

        {/* Hierarchy & World System Category Tools */}
        {(workflowCategory === 'all' || workflowCategory === 'world_system') && (
          <>
            <button
              onClick={() => toggleSheet('hierarchy')}
              id="btn-canva-hierarchy"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'hierarchy'
                  ? 'text-cyan-400 bg-slate-800 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className={`${iconSizeClass} text-cyan-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Hirarki</span>
            </button>

            <button
              onClick={() => toggleSheet('layer_ordering')}
              id="btn-canva-layer-ordering"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'layer_ordering'
                  ? 'text-cyan-400 bg-slate-800 font-semibold border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ArrowUpDown className={`${iconSizeClass} text-cyan-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Layer Z</span>
            </button>

            <button
              onClick={() => toggleSheet('inspector')}
              id="btn-canva-inspector"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'inspector'
                  ? 'text-cyan-400 bg-slate-800 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sliders className={`${iconSizeClass} text-cyan-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Properti</span>
            </button>

            <button
              onClick={() => toggleSheet('scenes')}
              id="btn-canva-scenes"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'scenes'
                  ? 'text-purple-400 bg-slate-800 font-semibold border border-purple-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className={`${iconSizeClass} text-purple-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Scene</span>
            </button>

            <button
              onClick={() => toggleSheet('web_ecosystem')}
              id="btn-canva-web-ecosystem"
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-xl transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'web_ecosystem'
                  ? 'bg-indigo-500 text-slate-950 font-bold shadow-md shadow-indigo-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30'
              }`}
              title="Web Unified Engine (Web1, Web2, Web3, WASM)"
            >
              <Globe className={`${iconSizeClass} text-indigo-300`} />
              <span className={`${labelSizeClass} font-bold whitespace-nowrap`}>Web Unified</span>
            </button>

            <button
              onClick={() => toggleSheet('save_manager')}
              id="btn-canva-save-manager"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'save_manager'
                  ? 'text-emerald-400 bg-slate-800 font-semibold border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <HardDrive className={`${iconSizeClass} text-emerald-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Save/Load</span>
            </button>

            <button
              onClick={() => toggleSheet('world')}
              id="btn-canva-world"
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${buttonMinHeight} ${buttonMinWidth} rounded-lg transition-all cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                activeSheet === 'world'
                  ? 'text-cyan-400 bg-slate-800 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Globe className={`${iconSizeClass} text-cyan-400`} />
              <span className={`${labelSizeClass} whitespace-nowrap`}>Dunia</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
};
