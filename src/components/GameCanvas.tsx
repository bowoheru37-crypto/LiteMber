import React, { useEffect, useRef, useState } from 'react';
import { CoreEngine } from '../engine/CoreEngine';
import { InputMappingEngine, DEFAULT_INPUT_PRESETS } from '../engine/InputMappingEngine';
import { AndroidEngine } from '../engine/AndroidEngine';
import { snappingEngine } from '../engine/SnappingEngine';
import { GameProject, WorldSettings, Entity, VirtualInputLayout } from '../types/engine';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Play,
  Hand,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  Flame,
  Gamepad2,
  Crosshair,
  Sliders,
  Move,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  RotateCw,
  Plus,
  Minus,
  X,
  Edit3,
  Settings,
  Grid,
  Magnet,
  Undo2,
  Redo2,
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

interface GameCanvasProps {
  project: GameProject;
  isPlaying: boolean;
  selectedEntityId: string | null;
  selectedEntityIds?: string[];
  onSelectEntity: (id: string | null) => void;
  onSelectMultiEntities?: (ids: string[]) => void;
  onUpdateEntity?: (entity: Entity) => void;
  onUpdateScore: (score: number) => void;
  engineRef: React.MutableRefObject<CoreEngine | null>;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onDragStart?: (entityId: string) => void;
  onDragEnd?: (entityId: string) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  project,
  isPlaying,
  selectedEntityId,
  selectedEntityIds = [],
  onSelectEntity,
  onSelectMultiEntities,
  onUpdateEntity,
  onUpdateScore,
  engineRef,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onDragStart,
  onDragEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevProjectIdRef = useRef<string>(project.id);
  const [zoomDisplay, setZoomDisplay] = useState<number>(100);
  const [snapState, setSnapState] = useState(() => snappingEngine.getConfig());
  const [activeTouchCodes, setActiveTouchCodes] = useState<Record<string, boolean>>({});
  const [gestureInfo, setGestureInfo] = useState<{ active: boolean; label: string }>({
    active: false,
    label: '',
  });

  const [quickEditState, setQuickEditState] = useState<{
    isOpen: boolean;
    entity: Entity | null;
    posX: number;
    posY: number;
  }>({
    isOpen: false,
    entity: null,
    posX: 0,
    posY: 0,
  });

  // Selected Entity Z-Index Drag Handle State
  const [isZDragging, setIsZDragging] = useState(false);
  const [zDragStart, setZDragStart] = useState({ clientY: 0, initialZ: 0 });
  const [liveDragZ, setLiveDragZ] = useState<number | null>(null);

  const entities = project?.entities || [];
  const selectedEntity = entities.find((e) => e.id === selectedEntityId);

  const handleZDragStart = (e: React.PointerEvent, currentZ: number) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsZDragging(true);
    setZDragStart({ clientY: e.clientY, initialZ: currentZ });
    setLiveDragZ(currentZ);
    AndroidEngine.triggerHaptic(20);
  };

  const handleZDragMove = (e: React.PointerEvent) => {
    if (!isZDragging) return;
    const dy = zDragStart.clientY - e.clientY; // Dragging UP increases Z
    const step = Math.round(dy / 10); // Every 10px = 1 layer Z step
    const nextZ = Math.max(-100, Math.min(999, zDragStart.initialZ + step));
    if (nextZ !== liveDragZ) {
      setLiveDragZ(nextZ);
      AndroidEngine.triggerHaptic(10);
    }
  };

  const handleZDragEnd = (e: React.PointerEvent) => {
    if (!isZDragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsZDragging(false);
    if (liveDragZ !== null && selectedEntity) {
      const updated = {
        ...selectedEntity,
        transform: { ...selectedEntity.transform, zIndex: liveDragZ },
      };
      onUpdateEntity?.(updated);
      if (engineRef.current) {
        engineRef.current.setEntityZIndex(liveDragZ, selectedEntity.id);
      }
      AndroidEngine.triggerHaptic(30);
    }
    setLiveDragZ(null);
  };

  // Compute bounding box layer overlay position
  let boxOverlayPos = { left: '180px', top: '120px', display: false, currentZ: 0 };
  if (selectedEntity && !isPlaying && engineRef.current) {
    const coords = engineRef.current.worldToCanvasCoords(
      selectedEntity.transform.x,
      selectedEntity.transform.y
    );
    const zoom = engineRef.current.getZoom();
    const halfH = ((selectedEntity.transform.height || 32) * (selectedEntity.transform.scaleY ?? 1) * zoom) / 2;

    const posX = Math.max(90, Math.min(270, coords.rawX));
    const posY = Math.max(40, Math.min(600, coords.rawY - halfH - 22));

    boxOverlayPos = {
      left: `${posX}px`,
      top: `${posY}px`,
      display: true,
      currentZ: liveDragZ !== null ? liveDragZ : selectedEntity.transform.zIndex || 0,
    };
  }

  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showGestureToast = (label: string) => {
    setGestureInfo({ active: true, label });
    if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
    gestureTimeoutRef.current = setTimeout(() => {
      setGestureInfo((prev) => ({ ...prev, active: false }));
    }, 1200);
  };

  const toggleGridSnap = () => {
    const next = !snapState.gridSnap;
    snappingEngine.setConfig({ gridSnap: next });
    setSnapState(snappingEngine.getConfig());
    showGestureToast(next ? `🧲 Grid Snap: ${snapState.gridSize}px` : '🔓 Grid Snap: OFF');
    AndroidEngine.triggerHaptic(30);
  };

  const cycleGridSize = () => {
    const sizes = [16, 32, 64];
    const nextIdx = (sizes.indexOf(snapState.gridSize) + 1) % sizes.length;
    const nextSize = sizes[nextIdx];
    snappingEngine.setConfig({ gridSize: nextSize, gridSnap: true });
    setSnapState(snappingEngine.getConfig());
    showGestureToast(`📐 Grid Size: ${nextSize}px`);
    AndroidEngine.triggerHaptic(30);
  };

  const toggleObjectSnap = () => {
    const next = !snapState.objectSnap;
    snappingEngine.setConfig({ objectSnap: next });
    setSnapState(snappingEngine.getConfig());
    showGestureToast(next ? '🎯 Smart Guides: ON' : '🔓 Smart Guides: OFF');
    AndroidEngine.triggerHaptic(30);
  };


  const handlePointerDown = (code: string) => (e: React.PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
    setActiveTouchCodes((prev) => ({ ...prev, [code]: true }));
    InputMappingEngine.registerPointer(e.pointerId, code, e.clientX, e.clientY);
  };

  const handlePointerUp = (code: string) => (e: React.PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
    setActiveTouchCodes((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
    InputMappingEngine.unregisterPointer(e.pointerId);
  };

  // Initialize & Bind Engine Loop
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new CoreEngine(canvasRef.current, project.world);
    engine.setEntities(project.entities);
    engine.setConstraints(project.constraints || project.joints || []);
    engine.setAudioAssets(project.assets?.audio || []);
    engine.setGameVariables(project.variables || []);
    engine.onScoreChange = onUpdateScore;
    engine.onSelectEntity = onSelectEntity;
    engine.onUpdateEntity = onUpdateEntity;
    engine.run();

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Gesture Recognition Layer for Pinch-To-Zoom and Two-Finger Pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isTwoFingerGesture = false;
    let lastTouchDist = 0;
    let lastMidpoint = { x: 0, y: 0 };

    // Attach specialized InputMappingEngine Touch Gesture Recognizer
    const detachGestures = InputMappingEngine.attachGestureListeners(canvas);

    const unsubPinch = InputMappingEngine.onPinchZoom((evt) => {
      const engine = engineRef.current;
      if (!engine) return;
      const rect = canvas.getBoundingClientRect();
      const focalX = ((evt.centerX - rect.left) / rect.width) * project.world.viewportWidth;
      const focalY = ((evt.centerY - rect.top) / rect.height) * project.world.viewportHeight;
      const scaleRatio = evt.scale;
      if (Math.abs(scaleRatio - 1) > 0.002) {
        engine.zoomBy(evt.deltaScale > 0 ? 1.03 : 0.97, focalX, focalY);
        const zoomPercent = Math.round(engine.getZoom() * 100);
        setZoomDisplay(zoomPercent);
        showGestureToast(`🔍 Pinch Zoom: ${zoomPercent}%`);
      }
    });

    const unsubPan = InputMappingEngine.onTwoFingerPan((evt) => {
      const engine = engineRef.current;
      if (!engine) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = project.world.viewportWidth / rect.width;
      const scaleY = project.world.viewportHeight / rect.height;
      engine.panBy(evt.deltaX * scaleX, evt.deltaY * scaleY);
      showGestureToast(`✌️ Two-Finger Pan`);
    });

    const unsubSwipe = InputMappingEngine.onSwipeDelete((evt) => {
      if ((evt.direction === 'left' || evt.direction === 'right') && selectedEntityId) {
        showGestureToast(`🗑️ Hapus Aset (Swipe ${evt.direction.toUpperCase()})`);
        AndroidEngine.triggerHaptic(30);
      }
    });

    const unsubLongPress = InputMappingEngine.onLongPress((evt) => {
      if (isPlaying) return;
      const engine = engineRef.current;
      if (!engine) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = ((evt.clientX - rect.left) / rect.width) * project.world.viewportWidth;
      const canvasY = ((evt.clientY - rect.top) / rect.height) * project.world.viewportHeight;

      // Hit test entities or fallback to selectedEntityId or first entity
      const hitEntity =
        entities.find((e) => {
          const halfW = ((e.width || 32) * (e.scaleX ?? 1)) / 2;
          const halfH = ((e.height || 32) * (e.scaleY ?? 1)) / 2;
          return (
            canvasX >= e.x - halfW - 14 &&
            canvasX <= e.x + halfW + 14 &&
            canvasY >= e.y - halfH - 14 &&
            canvasY <= e.y + halfH + 14
          );
        }) || entities.find((e) => e.id === selectedEntityId) || entities[0];

      if (hitEntity) {
        onSelectEntity(hitEntity.id);
        setQuickEditState({
          isOpen: true,
          entity: hitEntity,
          posX: Math.min(Math.max(evt.clientX - 140, 12), window.innerWidth - 300),
          posY: Math.min(Math.max(evt.clientY - 120, 12), window.innerHeight - 340),
        });
        showGestureToast(`⚡ Quick-Edit: ${hitEntity.name}`);
        AndroidEngine.triggerHaptic(50);
      }
    });

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isTwoFingerGesture = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const mid = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        lastTouchDist = dist;
        lastMidpoint = mid;

        if (e.cancelable) e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isTwoFingerGesture) {
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const mid = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        const engine = engineRef.current;
        if (engine && lastTouchDist > 0) {
          // 1. Pinch to Zoom
          const scaleRatio = dist / lastTouchDist;
          if (Math.abs(scaleRatio - 1) > 0.003) {
            const rect = canvas.getBoundingClientRect();
            const canvasFocalX = ((mid.x - rect.left) / rect.width) * project.world.viewportWidth;
            const canvasFocalY = ((mid.y - rect.top) / rect.height) * project.world.viewportHeight;

            engine.zoomBy(scaleRatio, canvasFocalX, canvasFocalY);
            const zoomPercent = Math.round(engine.getZoom() * 100);
            setZoomDisplay(zoomPercent);
            showGestureToast(`🔍 Pinch Zoom: ${zoomPercent}%`);
          }

          // 2. Two-finger Pan
          const dx = mid.x - lastMidpoint.x;
          const dy = mid.y - lastMidpoint.y;
          if (Math.hypot(dx, dy) > 0.3) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = project.world.viewportWidth / rect.width;
            const scaleY = project.world.viewportHeight / rect.height;
            engine.panBy(dx * scaleX, dy * scaleY);
            showGestureToast(`✌️ Two-Finger Pan`);
          }
        }

        lastTouchDist = dist;
        lastMidpoint = mid;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isTwoFingerGesture = false;
        lastTouchDist = 0;
      }
    };

    // Wheel & Trackpad Gesture Handler
    const handleWheel = (e: WheelEvent) => {
      if (e.cancelable) e.preventDefault();
      const engine = engineRef.current;
      if (!engine) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * project.world.viewportWidth;
      const mouseY = ((e.clientY - rect.top) / rect.height) * project.world.viewportHeight;

      if (e.ctrlKey || Math.abs(e.deltaY) < 40) {
        // Pinch gesture on touchpad or Ctrl + Scroll
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        engine.zoomBy(zoomFactor, mouseX, mouseY);
        const zoomPercent = Math.round(engine.getZoom() * 100);
        setZoomDisplay(zoomPercent);
        showGestureToast(`🔍 Zoom: ${zoomPercent}%`);
      } else {
        // Two-finger trackpad scroll / Mouse wheel Pan
        const scaleX = project.world.viewportWidth / rect.width;
        const scaleY = project.world.viewportHeight / rect.height;
        engine.panBy(-e.deltaX * scaleX * 0.5, -e.deltaY * scaleY * 0.5);
        showGestureToast(`✌️ Panning Scene`);
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      detachGestures();
      unsubPinch();
      unsubPan();
      unsubSwipe();
      unsubLongPress();
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      canvas.removeEventListener('wheel', handleWheel);
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
    };
  }, [project.world.viewportWidth, project.world.viewportHeight]);

  // Update Entities & Settings when project changes or edits happen
  useEffect(() => {
    if (engineRef.current) {
      if (prevProjectIdRef.current !== project.id) {
        prevProjectIdRef.current = project.id;
        engineRef.current.loadProject(project);
      } else {
        if (!isPlaying) {
          engineRef.current.setEntities(project.entities);
        }
        engineRef.current.setWorldSettings(project.world);
        engineRef.current.setConstraints(project.constraints || project.joints || []);
        engineRef.current.setAudioAssets(project.assets?.audio || []);
        engineRef.current.setGameVariables(project.variables || []);
        engineRef.current.setDialogues(project.dialogues || []);
        engineRef.current.setTutorials(project.tutorials || []);
      }
      if (selectedEntityIds && selectedEntityIds.length > 0) {
        engineRef.current.setSelectedEntityIds(selectedEntityIds);
      } else {
        engineRef.current.setSelectedEntityId(selectedEntityId);
      }
      engineRef.current.onUpdateEntity = onUpdateEntity;
      engineRef.current.onSelectMultiEntities = onSelectMultiEntities;
      engineRef.current.onDragStart = onDragStart;
      engineRef.current.onDragEnd = onDragEnd;
    }
  }, [
    project.id,
    project.entities,
    project.world,
    project.assets,
    project.variables,
    project.dialogues,
    project.tutorials,
    project.constraints,
    selectedEntityId,
    selectedEntityIds,
    isPlaying,
    onUpdateEntity,
    onSelectMultiEntities,
    onDragStart,
    onDragEnd,
  ]);

  // Handle Play Mode Toggle
  useEffect(() => {
    if (engineRef.current) {
      if (isPlaying) {
        engineRef.current.startPlayMode();
      } else {
        engineRef.current.stopPlayMode(project.entities);
      }
    }
  }, [isPlaying]);

  return (
    <div id="canvas-viewport-container" className="relative flex-1 bg-slate-950 flex items-center justify-center p-2 sm:p-4 overflow-hidden select-none">
      {/* Phone Canvas Container Frame (Portrait 9:16 aspect ratio) */}
      <div
        id="phone-stage-frame"
        className="relative bg-slate-900 rounded-3xl border-4 border-slate-800 shadow-2xl flex flex-col items-center overflow-hidden"
        style={{
          width: '360px',
          height: '640px',
          maxHeight: 'calc(100vh - 170px)',
          aspectRatio: '9 / 16',
        }}
      >
        {/* Phone Notch Bar */}
        <div className="w-full bg-slate-900 py-1 px-4 flex items-center justify-between text-[10px] text-slate-400 font-mono z-20 border-b border-slate-800/60">
          <span className="flex items-center gap-1 text-cyan-400">
            <ShieldCheck className="w-3 h-3" />
            itel A70 Stage
          </span>
          <span>360 x 640 @ 60 FPS</span>
        </div>

        {/* Floating Top-Left Snapping & History Control HUD in Editor Mode */}
        {!isPlaying && (
          <div className="absolute top-8 left-2 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-lg z-20 select-none">
            {/* Quick Touch Undo & Redo */}
            <div className="flex items-center gap-0.5 border-r border-slate-700/80 pr-1 mr-0.5">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-1 rounded-lg transition-all cursor-pointer ${
                  canUndo
                    ? 'bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 active:scale-90'
                    : 'bg-slate-900/50 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-40'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-1 rounded-lg transition-all cursor-pointer ${
                  canRedo
                    ? 'bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 active:scale-90'
                    : 'bg-slate-900/50 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-40'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={toggleGridSnap}
              className={`p-1 px-1.5 rounded-lg flex items-center gap-1 text-[10px] font-bold transition-all cursor-pointer ${
                snapState.gridSnap
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle Grid Snap"
            >
              <Grid className="w-3.5 h-3.5 text-cyan-400" />
              <span>{snapState.gridSnap ? `${snapState.gridSize}px` : 'Grid OFF'}</span>
            </button>

            {snapState.gridSnap && (
              <button
                onClick={cycleGridSize}
                className="p-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-[9px] font-bold cursor-pointer"
                title="Ubah Ukuran Grid (16px / 32px / 64px)"
              >
                {snapState.gridSize}px
              </button>
            )}

            <button
              onClick={toggleObjectSnap}
              className={`p-1 px-1.5 rounded-lg flex items-center gap-1 text-[10px] font-bold transition-all cursor-pointer ${
                snapState.objectSnap
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle Smart Object Guides"
            >
              <Magnet className="w-3.5 h-3.5 text-amber-400" />
              <span>{snapState.objectSnap ? 'Guide ON' : 'Guide OFF'}</span>
            </button>
          </div>
        )}


        {/* Viewport Zoom & Pan Floating Controls Overlay */}
        <div className="absolute top-8 right-2 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-lg z-20">
          <button
            onClick={() => {
              if (engineRef.current) {
                engineRef.current.zoomBy(1 / 1.2);
                setZoomDisplay(Math.round(engineRef.current.getZoom() * 100));
              }
            }}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] font-mono font-bold text-cyan-300 px-1 min-w-[36px] text-center">
            {zoomDisplay}%
          </span>

          <button
            onClick={() => {
              if (engineRef.current) {
                engineRef.current.zoomBy(1.2);
                setZoomDisplay(Math.round(engineRef.current.getZoom() * 100));
              }
            }}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (engineRef.current) {
                engineRef.current.resetView();
                setZoomDisplay(100);
              }
            }}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            title="Reset View (100%)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active Gesture HUD Indicator Toast */}
        {gestureInfo.active && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-cyan-500/50 text-cyan-300 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-md z-30 flex items-center gap-1.5 pointer-events-none transition-all">
            <Hand className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>{gestureInfo.label}</span>
          </div>
        )}

        {/* Real Canvas element */}
        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          className="w-full h-full object-contain cursor-crosshair touch-none"
        />

        {/* Selected Entity Bounding Box Layer Handles (Bring to Front / Send to Back / Drag Layer) */}
        {boxOverlayPos.display && selectedEntity && !isPlaying && (
          <div
            id="bounding-box-layer-overlay"
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex items-center gap-1 bg-slate-900/95 border border-cyan-500/60 p-1 rounded-2xl shadow-2xl backdrop-blur-md text-white select-none transition-all duration-75"
            style={{
              left: boxOverlayPos.left,
              top: boxOverlayPos.top,
            }}
          >
            {/* Bring to Front Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (engineRef.current) {
                  engineRef.current.bringToFront(selectedEntity.id);
                } else {
                  const maxZ = Math.max(...entities.map((ent) => ent.transform.zIndex || 0), 0);
                  onUpdateEntity?.({
                    ...selectedEntity,
                    transform: { ...selectedEntity.transform, zIndex: maxZ + 1 },
                  });
                }
              }}
              className="p-1 px-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-extrabold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-cyan-500/40"
              title="Bring to Front (Pindahkan ke Layer Paling Depan)"
            >
              <ChevronsUp className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Front</span>
            </button>

            {/* Step Up (+1) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (engineRef.current) {
                  engineRef.current.shiftZIndex(1, selectedEntity.id);
                } else {
                  onUpdateEntity?.({
                    ...selectedEntity,
                    transform: { ...selectedEntity.transform, zIndex: (selectedEntity.transform.zIndex || 0) + 1 },
                  });
                }
              }}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer active:scale-90"
              title="Naik 1 Layer (Z-Index +1)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

            {/* Z-Index Display Badge */}
            <div className="flex flex-col items-center justify-center px-1.5 py-0.5 bg-slate-950/90 rounded-lg border border-cyan-500/30 min-w-[32px]">
              <span className="text-[7.5px] uppercase tracking-wider font-mono text-slate-400 font-bold">Layer Z</span>
              <span className="text-[11px] font-mono font-black text-cyan-300 leading-none">
                {boxOverlayPos.currentZ}
              </span>
            </div>

            {/* Step Down (-1) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (engineRef.current) {
                  engineRef.current.shiftZIndex(-1, selectedEntity.id);
                } else {
                  onUpdateEntity?.({
                    ...selectedEntity,
                    transform: { ...selectedEntity.transform, zIndex: Math.max(-100, (selectedEntity.transform.zIndex || 0) - 1) },
                  });
                }
              }}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer active:scale-90"
              title="Turun 1 Layer (Z-Index -1)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>

            {/* Send to Back Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (engineRef.current) {
                  engineRef.current.sendToBack(selectedEntity.id);
                } else {
                  const minZ = Math.min(...entities.map((ent) => ent.transform.zIndex || 0), 0);
                  onUpdateEntity?.({
                    ...selectedEntity,
                    transform: { ...selectedEntity.transform, zIndex: minZ - 1 },
                  });
                }
              }}
              className="p-1 px-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-extrabold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-cyan-500/40"
              title="Send to Back (Pindahkan ke Layer Paling Belakang)"
            >
              <ChevronsDown className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Back</span>
            </button>

            {/* Interactive Drag-and-Drop Vertical Handle */}
            <div
              onPointerDown={(e) => handleZDragStart(e, selectedEntity.transform.zIndex || 0)}
              onPointerMove={handleZDragMove}
              onPointerUp={handleZDragEnd}
              onPointerCancel={handleZDragEnd}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl cursor-grab active:cursor-grabbing border transition-all ${
                isZDragging
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-lg shadow-amber-500/40 scale-105'
                  : 'bg-slate-800/90 text-amber-400 border-amber-500/40 hover:bg-amber-500/20'
              }`}
              title="Tarik Atas/Bawah untuk Atur Layer Z-Index Objek Secara Langsung"
            >
              <GripVertical className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[9.5px] font-bold whitespace-nowrap">
                {isZDragging ? `Drag Z: ${liveDragZ}` : 'Geser Layer'}
              </span>
            </div>
          </div>
        )}

        {/* On-Screen Virtual Input Mapping Overlay in Play Mode */}
        {isPlaying && (
          <div id="virtual-mobile-controls" className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden">
            {/* Gesture Tip & Status HUD */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-full py-1 px-3 text-[10px] text-cyan-300 font-semibold text-center shadow-md flex items-center gap-1.5 pointer-events-none">
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {InputMappingEngine.isGamepadConnected()
                  ? `🎮 ${InputMappingEngine.getGamepadName()}`
                  : `Virtual Input Mapping: ${project.world.inputLayout?.name || DEFAULT_INPUT_PRESETS.platformer_classic.name}`}
              </span>
            </div>

            {/* Dynamic Button Layer */}
            {(project.world.inputLayout?.controls || DEFAULT_INPUT_PRESETS.platformer_classic.controls).map((ctrl) => {
              const isPressed = activeTouchCodes[ctrl.mappedKey];
              return (
                <button
                  key={ctrl.id}
                  onPointerDown={handlePointerDown(ctrl.mappedKey)}
                  onPointerUp={handlePointerUp(ctrl.mappedKey)}
                  onPointerLeave={handlePointerUp(ctrl.mappedKey)}
                  onPointerCancel={handlePointerUp(ctrl.mappedKey)}
                  style={{
                    left: `${ctrl.posX}%`,
                    top: `${ctrl.posY}%`,
                    width: `${ctrl.sizePx}px`,
                    height: `${ctrl.sizePx}px`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: isPressed ? ctrl.color : `${ctrl.color}33`,
                    borderColor: ctrl.color,
                  }}
                  className={`absolute pointer-events-auto rounded-full border-2 flex flex-col items-center justify-center transition-transform active:scale-90 shadow-lg backdrop-blur-sm cursor-pointer ${
                    isPressed ? 'scale-95 shadow-cyan-500/50 text-slate-950 font-black' : 'text-white font-bold'
                  }`}
                  title={`${ctrl.name} (${ctrl.mappedKey})`}
                >
                  <span className="text-[10px] leading-tight text-center px-1 font-mono uppercase truncate max-w-full">
                    {ctrl.name}
                  </span>
                  <span className="text-[8px] opacity-70 font-mono font-normal">[{ctrl.mappedKey}]</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quick-Edit Entity Floating Modal / Popover triggered by Long-Press */}
        {quickEditState.isOpen && quickEditState.entity && !isPlaying && (
          <div
            id="quick-edit-popover"
            className="absolute z-40 w-72 bg-slate-900/95 border border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-md p-3 text-white flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 select-none"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                  style={{ backgroundColor: quickEditState.entity.color || '#38bdf8' }}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-cyan-300 leading-tight truncate max-w-[170px]">
                    {quickEditState.entity.name}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 capitalize">
                    {quickEditState.entity.type} • ID: {quickEditState.entity.id.slice(0, 6)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setQuickEditState((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Position X/Y Nudge Controls */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {/* X Position */}
              <div className="flex flex-col gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                <span className="font-mono text-slate-400 text-[9px]">Posisi X (px)</span>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (!quickEditState.entity) return;
                      const nextX = Math.round((quickEditState.entity.x || 0) - 10);
                      const updated = { ...quickEditState.entity, x: nextX };
                      setQuickEditState((prev) => ({ ...prev, entity: updated }));
                      onUpdateEntity?.(updated);
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-800 active:bg-cyan-500 text-slate-200 active:text-slate-950 font-bold flex items-center justify-center cursor-pointer"
                  >
                    -10
                  </button>
                  <span className="font-mono font-bold text-cyan-300">{Math.round(quickEditState.entity.x || 0)}</span>
                  <button
                    onClick={() => {
                      if (!quickEditState.entity) return;
                      const nextX = Math.round((quickEditState.entity.x || 0) + 10);
                      const updated = { ...quickEditState.entity, x: nextX };
                      setQuickEditState((prev) => ({ ...prev, entity: updated }));
                      onUpdateEntity?.(updated);
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-800 active:bg-cyan-500 text-slate-200 active:text-slate-950 font-bold flex items-center justify-center cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Y Position */}
              <div className="flex flex-col gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                <span className="font-mono text-slate-400 text-[9px]">Posisi Y (px)</span>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (!quickEditState.entity) return;
                      const nextY = Math.round((quickEditState.entity.y || 0) - 10);
                      const updated = { ...quickEditState.entity, y: nextY };
                      setQuickEditState((prev) => ({ ...prev, entity: updated }));
                      onUpdateEntity?.(updated);
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-800 active:bg-cyan-500 text-slate-200 active:text-slate-950 font-bold flex items-center justify-center cursor-pointer"
                  >
                    -10
                  </button>
                  <span className="font-mono font-bold text-cyan-300">{Math.round(quickEditState.entity.y || 0)}</span>
                  <button
                    onClick={() => {
                      if (!quickEditState.entity) return;
                      const nextY = Math.round((quickEditState.entity.y || 0) + 10);
                      const updated = { ...quickEditState.entity, y: nextY };
                      setQuickEditState((prev) => ({ ...prev, entity: updated }));
                      onUpdateEntity?.(updated);
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-800 active:bg-cyan-500 text-slate-200 active:text-slate-950 font-bold flex items-center justify-center cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>
            </div>

            {/* Scale & Rotation Adjustments */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {/* Scale */}
              <div className="flex flex-col gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                <span className="font-mono text-slate-400 text-[9px]">Ukuran (Scale)</span>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (!quickEditState.entity) return;
                      const nextS = Math.max(0.2, Number(((quickEditState.entity.scaleX ?? 1) - 0.1).toFixed(1)));
                      const updated = { ...quickEditState.entity, scaleX: nextS, scaleY: nextS };
                      setQuickEditState((prev) => ({ ...prev, entity: updated }));
                      onUpdateEntity?.(updated);
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-800 active:bg-cyan-500 text-slate-200 active:text-slate-950 font-bold flex items-center justify-center cursor-pointer"
                  >
                    -0.1
                  </button>
                  <span className="font-mono font-bold text-amber-300">{(quickEditState.entity.scaleX ?? 1).toFixed(1)}x</span>
                  <button
                    onClick={() => {
                      if (!quickEditState.entity) return;
                      const nextS = Math.min(5.0, Number(((quickEditState.entity.scaleX ?? 1) + 0.1).toFixed(1)));
                      const updated = { ...quickEditState.entity, scaleX: nextS, scaleY: nextS };
                      setQuickEditState((prev) => ({ ...prev, entity: updated }));
                      onUpdateEntity?.(updated);
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-800 active:bg-cyan-500 text-slate-200 active:text-slate-950 font-bold flex items-center justify-center cursor-pointer"
                  >
                    +0.1
                  </button>
                </div>
              </div>

              {/* Rotation */}
              <div className="flex flex-col gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                <span className="font-mono text-slate-400 text-[9px]">Rotasi (Deg)</span>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (!quickEditState.entity) return;
                      const nextR = (quickEditState.entity.rotation || 0) - 45;
                      const updated = { ...quickEditState.entity, rotation: nextR };
                      setQuickEditState((prev) => ({ ...prev, entity: updated }));
                      onUpdateEntity?.(updated);
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-800 active:bg-cyan-500 text-slate-200 active:text-slate-950 font-bold flex items-center justify-center cursor-pointer"
                  >
                    -45°
                  </button>
                  <span className="font-mono font-bold text-emerald-300">{quickEditState.entity.rotation || 0}°</span>
                  <button
                    onClick={() => {
                      if (!quickEditState.entity) return;
                      const nextR = (quickEditState.entity.rotation || 0) + 45;
                      const updated = { ...quickEditState.entity, rotation: nextR };
                      setQuickEditState((prev) => ({ ...prev, entity: updated }));
                      onUpdateEntity?.(updated);
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-800 active:bg-cyan-500 text-slate-200 active:text-slate-950 font-bold flex items-center justify-center cursor-pointer"
                  >
                    +45°
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
              <button
                onClick={() => {
                  if (!quickEditState.entity) return;
                  const updated = { ...quickEditState.entity, visible: !(quickEditState.entity.visible ?? true) };
                  setQuickEditState((prev) => ({ ...prev, entity: updated }));
                  onUpdateEntity?.(updated);
                }}
                className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                {(quickEditState.entity.visible ?? true) ? (
                  <>
                    <EyeOff className="w-3 h-3 text-amber-400" /> Sembunyi
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-emerald-400" /> Tampil
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setQuickEditState((prev) => ({ ...prev, isOpen: false }));
                  window.dispatchEvent(new CustomEvent('canva-open-sheet', { detail: 'inspector' }));
                }}
                className="flex-1 py-1.5 px-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3 h-3" /> Inspector
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
