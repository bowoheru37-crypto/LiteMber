import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Copy,
  Move,
  Sliders,
  Layers,
  Magnet,
  Grid,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  RotateCw,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronsUp,
  ChevronsDown,
  Smartphone,
  Monitor,
  Square,
  GripVertical,
  X,
  Plus,
  Minus,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  LayoutGrid,
  CheckSquare,
  Wand2,
} from 'lucide-react';
import { Entity, GameProject, WorldSettings } from '../types/engine';
import { CoreEngine } from '../engine/CoreEngine';
import { AndroidEngine } from '../engine/AndroidEngine';
import { snappingEngine } from '../engine/SnappingEngine';
import { AspectPreset, ToolsDockTab } from '../hooks/useWorkspaceLayout';

interface WorkspaceToolsDockProps {
  project: GameProject;
  selectedEntityId: string | null;
  selectedEntityIds?: string[];
  engineRef: React.MutableRefObject<CoreEngine | null>;
  onSelectEntity: (id: string | null, isMultiToggle?: boolean) => void;
  onSelectAllEntities?: () => void;
  onClearSelection?: () => void;
  onUpdateEntity?: (entity: Entity) => void;
  onDuplicateEntity?: (id: string) => void;
  onDeleteEntity?: (id: string) => void;
  onMassDuplicate?: (ids: string[]) => void;
  onMassDelete?: (ids: string[]) => void;
  onMassMove?: (ids: string[], dx: number, dy: number) => void;
  onMassResize?: (ids: string[], scaleFactor: number) => void;
  onMassLockToggle?: (ids: string[]) => void;
  onUpdateWorld?: (world: WorldSettings) => void;
  activeTab: ToolsDockTab;
  onTabChange: (tab: ToolsDockTab) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
  pos: { x: number; y: number };
  onPosChange: (pos: { x: number; y: number }) => void;
  aspectPreset: AspectPreset;
  onAspectPresetChange: (preset: AspectPreset) => void;
  lowEndMode?: boolean;
}

export const WorkspaceToolsDock: React.FC<WorkspaceToolsDockProps> = ({
  project,
  selectedEntityId,
  selectedEntityIds = [],
  engineRef,
  onSelectEntity,
  onSelectAllEntities,
  onClearSelection,
  onUpdateEntity,
  onDuplicateEntity,
  onDeleteEntity,
  onMassDuplicate,
  onMassDelete,
  onMassMove,
  onMassResize,
  onMassLockToggle,
  onUpdateWorld,
  activeTab,
  onTabChange,
  isMinimized,
  onToggleMinimize,
  onClose,
  pos,
  onPosChange,
  aspectPreset,
  onAspectPresetChange,
  lowEndMode = false,
}) => {
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [nudgeStep, setNudgeStep] = useState<number>(10);
  const [snapConfig, setSnapConfig] = useState(() => snappingEngine.getConfig());
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; initialX: number; initialY: number }>({
    clientX: 0,
    clientY: 0,
    initialX: 0,
    initialY: 0,
  });

  const entities = project?.entities || [];
  const world = project?.world || { viewportWidth: 360, viewportHeight: 640 };
  const selectedEntity = entities.find((e) => e.id === selectedEntityId) || null;
  const isMultiSelected = selectedEntityIds.length > 1;

  // Poll Zoom State from engine
  useEffect(() => {
    const timer = setInterval(() => {
      if (engineRef.current) {
        setZoomPercent(Math.round(engineRef.current.getZoom() * 100));
      }
    }, 400);
    return () => clearInterval(timer);
  }, [engineRef]);

  // Pointer Drag Handler for Moving the Floating Tools Dock
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
    };
    AndroidEngine.triggerHaptic(15);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    const nextX = Math.max(4, Math.min(window.innerWidth - 240, dragStartRef.current.initialX + dx));
    const nextY = Math.max(40, Math.min(window.innerHeight - 200, dragStartRef.current.initialY + dy));
    onPosChange({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
  };

  // Zoom Operations
  const handleZoomIn = () => {
    if (engineRef.current) {
      engineRef.current.zoomBy(1.15);
      setZoomPercent(Math.round(engineRef.current.getZoom() * 100));
      AndroidEngine.triggerHaptic(15);
    }
  };

  const handleZoomOut = () => {
    if (engineRef.current) {
      engineRef.current.zoomBy(0.85);
      setZoomPercent(Math.round(engineRef.current.getZoom() * 100));
      AndroidEngine.triggerHaptic(15);
    }
  };

  const handleResetZoom = () => {
    if (engineRef.current) {
      engineRef.current.resetView();
      setZoomPercent(100);
      AndroidEngine.triggerHaptic(25);
    }
  };

  const handleFitToScreen = () => {
    if (engineRef.current) {
      engineRef.current.resetView();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const worldW = project.world.viewportWidth || 360;
      const worldH = project.world.viewportHeight || 640;
      const scaleW = (vw * 0.92) / worldW;
      const scaleH = (vh * 0.65) / worldH;
      const bestScale = Math.max(0.4, Math.min(2.5, Math.min(scaleW, scaleH)));
      engineRef.current.setZoom(bestScale);
      setZoomPercent(Math.round(bestScale * 100));
      AndroidEngine.triggerHaptic(30);
    }
  };

  // Aspect Ratio & Resolution Preset Switcher
  const handleSetAspect = (preset: AspectPreset) => {
    onAspectPresetChange(preset);
    let targetW = 360;
    let targetH = 640;
    if (preset === 'itel_a70') {
      // itel A70 / 20:9 Tall Portrait (720x1612 scaled)
      targetW = 400;
      targetH = 800;
    } else if (preset === 'android_portrait') {
      targetW = 360;
      targetH = 640;
    } else if (preset === 'android_hd') {
      targetW = 720;
      targetH = 1280;
    } else if (preset === 'landscape_16_9') {
      targetW = 640;
      targetH = 360;
    } else if (preset === 'square_1_1') {
      targetW = 480;
      targetH = 480;
    } else if (preset === 'responsive_fit') {
      targetW = window.innerWidth < 480 ? window.innerWidth : 360;
      targetH = Math.round(window.innerHeight * 0.7);
    }

    if (onUpdateWorld) {
      onUpdateWorld({
        ...project.world,
        viewportWidth: targetW,
        viewportHeight: targetH,
      });
    }
    AndroidEngine.triggerHaptic(25);
  };

  // Salin / Duplicate Tool
  const handleDuplicate = () => {
    if (isMultiSelected && onMassDuplicate) {
      onMassDuplicate(selectedEntityIds);
    } else if (selectedEntityId && onDuplicateEntity) {
      onDuplicateEntity(selectedEntityId);
    }
    AndroidEngine.triggerHaptic(30);
  };

  // Nudge Move Tool
  const handleNudge = (dx: number, dy: number) => {
    if (isMultiSelected && onMassMove) {
      onMassMove(selectedEntityIds, dx, dy);
    } else if (selectedEntity && onUpdateEntity) {
      const updated: Entity = {
        ...selectedEntity,
        transform: {
          ...selectedEntity.transform,
          x: Math.round(selectedEntity.transform.x + dx),
          y: Math.round(selectedEntity.transform.y + dy),
        },
      };
      onUpdateEntity(updated);
    }
    AndroidEngine.triggerHaptic(12);
  };

  // Resize Multiplier Tool
  const handleScaleMultiplier = (factor: number) => {
    if (isMultiSelected && onMassResize) {
      onMassResize(selectedEntityIds, factor);
    } else if (selectedEntity && onUpdateEntity) {
      const newW = Math.max(8, Math.round(selectedEntity.transform.width * factor));
      const newH = Math.max(8, Math.round(selectedEntity.transform.height * factor));
      const updated: Entity = {
        ...selectedEntity,
        transform: {
          ...selectedEntity.transform,
          width: newW,
          height: newH,
        },
        collider: selectedEntity.collider
          ? {
              ...selectedEntity.collider,
              width: newW,
              height: newH,
              radius: newW / 2,
            }
          : undefined,
      };
      onUpdateEntity(updated);
    }
    AndroidEngine.triggerHaptic(20);
  };

  // Layer Z-Index Reordering
  const handleBringToFront = () => {
    if (engineRef.current && selectedEntityId) {
      engineRef.current.bringToFront(selectedEntityId);
    } else if (selectedEntity && onUpdateEntity) {
      const maxZ = Math.max(...entities.map((e) => e.transform.zIndex || 0), 0);
      onUpdateEntity({
        ...selectedEntity,
        transform: { ...selectedEntity.transform, zIndex: maxZ + 1 },
      });
    }
    AndroidEngine.triggerHaptic(25);
  };

  const handleSendToBack = () => {
    if (engineRef.current && selectedEntityId) {
      engineRef.current.sendToBack(selectedEntityId);
    } else if (selectedEntity && onUpdateEntity) {
      const minZ = Math.min(...entities.map((e) => e.transform.zIndex || 0), 0);
      onUpdateEntity({
        ...selectedEntity,
        transform: { ...selectedEntity.transform, zIndex: minZ - 1 },
      });
    }
    AndroidEngine.triggerHaptic(25);
  };

  const handleStepZ = (delta: number) => {
    if (engineRef.current && selectedEntityId) {
      engineRef.current.shiftZIndex(delta, selectedEntityId);
    } else if (selectedEntity && onUpdateEntity) {
      onUpdateEntity({
        ...selectedEntity,
        transform: {
          ...selectedEntity.transform,
          zIndex: Math.max(-100, (selectedEntity.transform.zIndex || 0) + delta),
        },
      });
    }
    AndroidEngine.triggerHaptic(15);
  };

  // Alignment Tools
  const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const targetIds = isMultiSelected ? selectedEntityIds : selectedEntityId ? [selectedEntityId] : [];
    if (targetIds.length === 0) return;

    const targets = entities.filter((e) => targetIds.includes(e.id));
    if (targets.length === 0) return;

    let refVal = 0;
    const worldW = world.viewportWidth;
    const worldH = world.viewportHeight;

    if (isMultiSelected) {
      // Align relative to selection bounds
      if (type === 'left') {
        refVal = Math.min(...targets.map((e) => e.transform.x - e.transform.width / 2));
      } else if (type === 'center') {
        const minX = Math.min(...targets.map((e) => e.transform.x - e.transform.width / 2));
        const maxX = Math.max(...targets.map((e) => e.transform.x + e.transform.width / 2));
        refVal = (minX + maxX) / 2;
      } else if (type === 'right') {
        refVal = Math.max(...targets.map((e) => e.transform.x + e.transform.width / 2));
      } else if (type === 'top') {
        refVal = Math.min(...targets.map((e) => e.transform.y - e.transform.height / 2));
      } else if (type === 'middle') {
        const minY = Math.min(...targets.map((e) => e.transform.y - e.transform.height / 2));
        const maxY = Math.max(...targets.map((e) => e.transform.y + e.transform.height / 2));
        refVal = (minY + maxY) / 2;
      } else if (type === 'bottom') {
        refVal = Math.max(...targets.map((e) => e.transform.y + e.transform.height / 2));
      }
    } else {
      // Single entity aligns to canvas center/edges
      if (type === 'left') refVal = 0;
      else if (type === 'center') refVal = worldW / 2;
      else if (type === 'right') refVal = worldW;
      else if (type === 'top') refVal = 0;
      else if (type === 'middle') refVal = worldH / 2;
      else if (type === 'bottom') refVal = worldH;
    }

    targets.forEach((ent) => {
      if (ent.locked) return;
      let newX = ent.transform.x;
      let newY = ent.transform.y;

      if (type === 'left') newX = refVal + ent.transform.width / 2;
      else if (type === 'center') newX = refVal;
      else if (type === 'right') newX = refVal - ent.transform.width / 2;
      else if (type === 'top') newY = refVal + ent.transform.height / 2;
      else if (type === 'middle') newY = refVal;
      else if (type === 'bottom') newY = refVal - ent.transform.height / 2;

      onUpdateEntity?.({
        ...ent,
        transform: { ...ent.transform, x: Math.round(newX), y: Math.round(newY) },
      });
    });

    AndroidEngine.triggerHaptic(25);
  };

  // If Minimized, render floating compact pill
  if (isMinimized) {
    return (
      <div
        id="workspace-tools-dock-minimized"
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        }}
        className="fixed z-40 select-none touch-manipulation"
      >
        <div className="flex items-center gap-1 bg-slate-900/95 border border-cyan-500/50 rounded-full shadow-2xl p-1 text-white backdrop-blur-md">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="p-1 text-slate-400 hover:text-cyan-400 cursor-grab active:cursor-grabbing touch-none"
            title="Geser Posisi Widget"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          <button
            onClick={onToggleMinimize}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="Buka Panel Alat Workspace"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono">Tools ({zoomPercent}%)</span>
          </button>

          <button
            onClick={handleZoomIn}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-300 active:text-cyan-400 cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleZoomOut}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-300 active:text-cyan-400 cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="workspace-tools-dock"
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        width: window.innerWidth < 380 ? '280px' : '310px',
      }}
      className={`fixed z-40 select-none bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl text-white overflow-hidden flex flex-col transition-shadow duration-200 ${
        lowEndMode ? '' : 'backdrop-blur-xl'
      }`}
    >
      {/* Header Bar with Grab Handle & Quick Controls */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full bg-slate-950/80 px-2.5 py-1.5 flex items-center justify-between border-b border-slate-800 cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="flex items-center gap-1.5">
          <GripVertical className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300 tracking-tight flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Canvas Tools
          </span>
          <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full border border-slate-700">
            {zoomPercent}%
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize();
            }}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            title="Minimize Panel"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-lg bg-slate-800 hover:bg-red-500/30 text-slate-400 hover:text-red-400 cursor-pointer"
            title="Tutup Panel Tools"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tabs Selector Bar */}
      <div className="flex items-center bg-slate-950/50 p-1 border-b border-slate-800/80 gap-0.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'scaler_zoom', label: 'Zoom & Resolusi', icon: ZoomIn },
          { id: 'transform', label: 'Salin & Ukuran', icon: Copy },
          { id: 'nudge', label: 'D-Pad Nudge', icon: Move },
          { id: 'align', label: 'Rata & Sejajar', icon: AlignCenter },
          { id: 'layer', label: 'Layer Z', icon: Layers },
          { id: 'grid_snap', label: 'Grid & Snap', icon: Magnet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as ToolsDockTab)}
              className={`flex-1 py-1 px-1.5 rounded-lg text-[9.5px] font-bold flex items-center justify-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="p-2.5 flex flex-col gap-2 max-h-[300px] overflow-y-auto no-scrollbar">
        {/* Tab 1: Zoom & Scaler / Resolution */}
        {activeTab === 'scaler_zoom' && (
          <div className="flex flex-col gap-2 animate-in fade-in duration-150">
            {/* Zoom Steppers & Fit Screen */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={handleZoomOut}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1 text-xs active:scale-95 border border-slate-700 cursor-pointer"
                title="Zoom Out (-15%)"
              >
                <ZoomOut className="w-3.5 h-3.5 text-cyan-400" />
                <span>-</span>
              </button>

              <button
                onClick={handleResetZoom}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold flex items-center justify-center text-xs active:scale-95 border border-slate-700 cursor-pointer"
                title="Reset Zoom 100%"
              >
                100%
              </button>

              <button
                onClick={handleZoomIn}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1 text-xs active:scale-95 border border-slate-700 cursor-pointer"
                title="Zoom In (+15%)"
              >
                <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>+</span>
              </button>

              <button
                onClick={handleFitToScreen}
                className="py-2 rounded-xl bg-gradient-to-r from-cyan-500/30 to-blue-500/30 hover:from-cyan-500 hover:to-blue-600 text-cyan-300 hover:text-slate-950 font-bold flex items-center justify-center gap-1 text-[10px] active:scale-95 border border-cyan-500/40 cursor-pointer"
                title="Fit to Screen (Sesuaikan Layar Otomatis)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fit</span>
              </button>
            </div>

            {/* Resolution & Aspect Ratio Preset Switcher */}
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-800">
              <span className="text-[9.5px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                Preset Layar & Rasio (itel A70 / HP)
              </span>
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <button
                  onClick={() => handleSetAspect('itel_a70')}
                  className={`py-1.5 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    aspectPreset === 'itel_a70'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-bold">itel A70</span>
                  <span className="text-[8px] font-mono opacity-70">20:9 (400x800)</span>
                </button>

                <button
                  onClick={() => handleSetAspect('android_portrait')}
                  className={`py-1.5 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    aspectPreset === 'android_portrait'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold">Android 16:9</span>
                  <span className="text-[8px] font-mono opacity-70">360x640</span>
                </button>

                <button
                  onClick={() => handleSetAspect('landscape_16_9')}
                  className={`py-1.5 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    aspectPreset === 'landscape_16_9'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold">Landscape</span>
                  <span className="text-[8px] font-mono opacity-70">640x360</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Salin (Duplicate) & Transform */}
        {activeTab === 'transform' && (
          <div className="flex flex-col gap-2 animate-in fade-in duration-150">
            {/* 1-Tap Duplicate / Salin Button */}
            <button
              onClick={handleDuplicate}
              disabled={!selectedEntity && !isMultiSelected}
              className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md ${
                selectedEntity || isMultiSelected
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-amber-500/20'
                  : 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>
                {isMultiSelected
                  ? `Salin / Duplikat (${selectedEntityIds.length} Objek Terpilih)`
                  : selectedEntity
                  ? `Salin Objek: ${selectedEntity.name}`
                  : 'Pilih Objek untuk Disalin'}
              </span>
            </button>

            {/* Quick Resize Multipliers */}
            <div className="flex flex-col gap-1">
              <span className="text-[9.5px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                Skala Cepat (Scaler)
              </span>
              <div className="grid grid-cols-5 gap-1 text-[10px]">
                {[
                  { label: '0.5x', factor: 0.5 },
                  { label: '0.8x', factor: 0.8 },
                  { label: '1.2x', factor: 1.2 },
                  { label: '1.5x', factor: 1.5 },
                  { label: '2.0x', factor: 2.0 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleScaleMultiplier(item.factor)}
                    disabled={!selectedEntity && !isMultiSelected}
                    className="py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 font-mono font-bold text-center border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions (Lock, Hide, Delete) */}
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800">
              <button
                onClick={() => {
                  if (isMultiSelected && onMassLockToggle) {
                    onMassLockToggle(selectedEntityIds);
                  } else if (selectedEntity && onUpdateEntity) {
                    onUpdateEntity({ ...selectedEntity, locked: !selectedEntity.locked });
                  }
                  AndroidEngine.triggerHaptic(20);
                }}
                disabled={!selectedEntity && !isMultiSelected}
                className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-700 cursor-pointer disabled:opacity-40"
              >
                {selectedEntity?.locked ? <Unlock className="w-3 h-3 text-amber-400" /> : <Lock className="w-3 h-3 text-slate-400" />}
                <span>{selectedEntity?.locked ? 'Buka Kunci' : 'Kunci'}</span>
              </button>

              <button
                onClick={() => {
                  if (selectedEntity && onUpdateEntity) {
                    onUpdateEntity({ ...selectedEntity, visible: !selectedEntity.visible });
                  }
                  AndroidEngine.triggerHaptic(20);
                }}
                disabled={!selectedEntity}
                className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-700 cursor-pointer disabled:opacity-40"
              >
                {selectedEntity?.visible ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-emerald-400" />}
                <span>{selectedEntity?.visible ? 'Sembunyi' : 'Tampil'}</span>
              </button>

              <button
                onClick={() => {
                  if (isMultiSelected && onMassDelete) {
                    onMassDelete(selectedEntityIds);
                  } else if (selectedEntityId && onDeleteEntity) {
                    onDeleteEntity(selectedEntityId);
                  }
                  AndroidEngine.triggerHaptic(30);
                }}
                disabled={!selectedEntity && !isMultiSelected}
                className="py-1.5 px-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-bold flex items-center justify-center gap-1 border border-red-500/30 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: D-Pad Nudge (Geser Presisi) */}
        {activeTab === 'nudge' && (
          <div className="flex flex-col items-center gap-2 animate-in fade-in duration-150">
            {/* Step Size Selector */}
            <div className="flex items-center gap-1 w-full bg-slate-950 p-1 rounded-xl border border-slate-800">
              <span className="text-[9px] font-mono text-slate-400 pl-1 font-bold">Langkah:</span>
              {[
                { label: '1px (Mikro)', step: 1 },
                { label: '10px (Standar)', step: 10 },
                { label: '50px (Jauh)', step: 50 },
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => setNudgeStep(s.step)}
                  className={`flex-1 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition-all ${
                    nudgeStep === s.step
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 4-Way D-Pad Layout */}
            <div className="grid grid-cols-3 gap-1.5 w-44 pt-1">
              <div />
              <button
                onClick={() => handleNudge(0, -nudgeStep)}
                disabled={!selectedEntity && !isMultiSelected}
                className="h-10 rounded-xl bg-slate-800 hover:bg-cyan-500 active:bg-cyan-400 text-cyan-300 active:text-slate-950 font-bold flex items-center justify-center border border-slate-700 shadow-md active:scale-90 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Geser Atas"
              >
                <ArrowUp className="w-5 h-5 stroke-[2.5]" />
              </button>
              <div />

              <button
                onClick={() => handleNudge(-nudgeStep, 0)}
                disabled={!selectedEntity && !isMultiSelected}
                className="h-10 rounded-xl bg-slate-800 hover:bg-cyan-500 active:bg-cyan-400 text-cyan-300 active:text-slate-950 font-bold flex items-center justify-center border border-slate-700 shadow-md active:scale-90 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Geser Kiri"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              <div className="flex flex-col items-center justify-center text-[8px] font-mono text-cyan-400 font-bold">
                {selectedEntity ? `X:${Math.round(selectedEntity.transform.x)}` : 'D-Pad'}
                {selectedEntity && <span className="text-[8px] text-slate-400">Y:{Math.round(selectedEntity.transform.y)}</span>}
              </div>

              <button
                onClick={() => handleNudge(nudgeStep, 0)}
                disabled={!selectedEntity && !isMultiSelected}
                className="h-10 rounded-xl bg-slate-800 hover:bg-cyan-500 active:bg-cyan-400 text-cyan-300 active:text-slate-950 font-bold flex items-center justify-center border border-slate-700 shadow-md active:scale-90 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Geser Kanan"
              >
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>

              <div />
              <button
                onClick={() => handleNudge(0, nudgeStep)}
                disabled={!selectedEntity && !isMultiSelected}
                className="h-10 rounded-xl bg-slate-800 hover:bg-cyan-500 active:bg-cyan-400 text-cyan-300 active:text-slate-950 font-bold flex items-center justify-center border border-slate-700 shadow-md active:scale-90 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Geser Bawah"
              >
                <ArrowDown className="w-5 h-5 stroke-[2.5]" />
              </button>
              <div />
            </div>
          </div>
        )}

        {/* Tab 4: Align & Distribute */}
        {activeTab === 'align' && (
          <div className="flex flex-col gap-2 animate-in fade-in duration-150">
            <span className="text-[9.5px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              Perataan Posisi (Alignment)
            </span>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <button
                onClick={() => handleAlign('left')}
                disabled={!selectedEntity && !isMultiSelected}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1 border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <AlignLeft className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kiri</span>
              </button>

              <button
                onClick={() => handleAlign('center')}
                disabled={!selectedEntity && !isMultiSelected}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1 border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <AlignCenter className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tengah</span>
              </button>

              <button
                onClick={() => handleAlign('right')}
                disabled={!selectedEntity && !isMultiSelected}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1 border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <AlignRight className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kanan</span>
              </button>

              <button
                onClick={() => handleAlign('top')}
                disabled={!selectedEntity && !isMultiSelected}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1 border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <AlignVerticalJustifyStart className="w-3.5 h-3.5 text-amber-400" />
                <span>Atas</span>
              </button>

              <button
                onClick={() => handleAlign('middle')}
                disabled={!selectedEntity && !isMultiSelected}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1 border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <AlignVerticalJustifyCenter className="w-3.5 h-3.5 text-amber-400" />
                <span>Tengah Y</span>
              </button>

              <button
                onClick={() => handleAlign('bottom')}
                disabled={!selectedEntity && !isMultiSelected}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1 border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <AlignVerticalJustifyEnd className="w-3.5 h-3.5 text-amber-400" />
                <span>Bawah</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: Layer Z-Index */}
        {activeTab === 'layer' && (
          <div className="flex flex-col gap-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 font-bold">Layer Z Aktif:</span>
              <span className="text-sm font-mono font-black text-cyan-300">
                {selectedEntity ? selectedEntity.transform.zIndex || 0 : '-'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={handleBringToFront}
                disabled={!selectedEntity}
                className="py-2 px-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-xs flex items-center justify-center gap-1 border border-cyan-500/40 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <ChevronsUp className="w-4 h-4" />
                <span>Paling Depan</span>
              </button>

              <button
                onClick={handleSendToBack}
                disabled={!selectedEntity}
                className="py-2 px-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-xs flex items-center justify-center gap-1 border border-cyan-500/40 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <ChevronsDown className="w-4 h-4" />
                <span>Paling Belakang</span>
              </button>

              <button
                onClick={() => handleStepZ(1)}
                disabled={!selectedEntity}
                className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Naik 1 Layer</span>
              </button>

              <button
                onClick={() => handleStepZ(-1)}
                disabled={!selectedEntity}
                className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>Turun 1 Layer</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 6: Grid & Snapping */}
        {activeTab === 'grid_snap' && (
          <div className="flex flex-col gap-2 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  const next = !snapConfig.gridSnap;
                  snappingEngine.setConfig({ gridSnap: next });
                  setSnapConfig(snappingEngine.getConfig());
                  AndroidEngine.triggerHaptic(25);
                }}
                className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer ${
                  snapConfig.gridSnap
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Grid Snap {snapConfig.gridSnap ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => {
                  const next = !snapConfig.objectSnap;
                  snappingEngine.setConfig({ objectSnap: next });
                  setSnapConfig(snappingEngine.getConfig());
                  AndroidEngine.triggerHaptic(25);
                }}
                className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer ${
                  snapConfig.objectSnap
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Magnet className="w-4 h-4" />
                <span>Smart Snap {snapConfig.objectSnap ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Grid Pitch Size Selector */}
            <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 font-bold">Ukuran Grid:</span>
              <div className="flex items-center gap-1">
                {[8, 16, 32, 64].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      snappingEngine.setConfig({ gridSize: size, gridSnap: true });
                      setSnapConfig(snappingEngine.getConfig());
                      AndroidEngine.triggerHaptic(20);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold cursor-pointer ${
                      snapConfig.gridSize === size
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Quick Selection Bar */}
      <div className="bg-slate-950/90 px-2.5 py-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectAllEntities?.()}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
          >
            <CheckSquare className="w-3 h-3 text-cyan-400" />
            <span>Pilih Semua</span>
          </button>
          {selectedEntityIds.length > 0 && (
            <button
              onClick={() => onClearSelection?.()}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              Batal
            </button>
          )}
        </div>

        <span className="font-mono text-cyan-400 font-bold">
          {entities.length} Objek di Scene
        </span>
      </div>
    </div>
  );
};
