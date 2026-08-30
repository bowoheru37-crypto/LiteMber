import React, { useState, useRef, useEffect } from 'react';
import { GameProject, Entity, EntityType, WorldSettings } from './types/engine';
import { PRESET_PROJECTS } from './data/presetProjects';
import { CoreEngine } from './engine/CoreEngine';
import { soundEngine } from './engine/AudioEngine';
import { AndroidEngine } from './engine/AndroidEngine';
import { historyEngine } from './engine/HistoryEngine';
import { SaveLoadEngine } from './engine/SaveLoadEngine';
import { Undo2, Redo2 } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { GameCanvas } from './components/GameCanvas';
import { CanvaToolbar } from './components/CanvaToolbar';
import { WorkspaceToolsDock } from './components/WorkspaceToolsDock';
import { LayoutCustomizerModal } from './components/LayoutCustomizerModal';
import { HardwareProfilerModal } from './components/HardwareProfilerModal';
import { ExportModal } from './components/ExportModal';
import { AiStudioModal } from './components/AiStudioModal';
import { FullScreenPreviewModal } from './components/FullScreenPreviewModal';
import { useWorkspaceLayout } from './hooks/useWorkspaceLayout';

export default function App() {
  const [projects, setProjects] = useState<GameProject[]>(PRESET_PROJECTS);
  const [currentProject, setCurrentProject] = useState<GameProject>(PRESET_PROJECTS[0]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
    PRESET_PROJECTS[0].entities[0]?.id || null
  );
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>(
    PRESET_PROJECTS[0].entities[0]?.id ? [PRESET_PROJECTS[0].entities[0].id] : []
  );

  const [fps, setFps] = useState<number>(60);
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  const [showProfiler, setShowProfiler] = useState<boolean>(false);
  const [showExport, setShowExport] = useState<boolean>(false);
  const [showAiStudio, setShowAiStudio] = useState<boolean>(false);
  const [showFullscreenPreview, setShowFullscreenPreview] = useState<boolean>(false);
  const [showLayoutCustomizer, setShowLayoutCustomizer] = useState<boolean>(false);

  // Modular Workspace Layout & Block Placement State
  const {
    config: layoutConfig,
    updateConfig: updateLayoutConfig,
    resetToDefaultLayout: resetToDefaults,
  } = useWorkspaceLayout();

  // Undo / Redo History State
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [undoActionLabel, setUndoActionLabel] = useState<string | undefined>();
  const [redoActionLabel, setRedoActionLabel] = useState<string | undefined>();
  const [historyToast, setHistoryToast] = useState<{ message: string; icon: 'undo' | 'redo' } | null>(null);

  const engineRef = useRef<CoreEngine | null>(null);

  // Zoom helpers
  const handleZoomIn = () => {
    if (engineRef.current) {
      engineRef.current.zoomBy(1.2);
      setCanvasZoom(engineRef.current.getZoom());
      AndroidEngine.triggerHaptic(15);
    }
  };

  const handleZoomOut = () => {
    if (engineRef.current) {
      engineRef.current.zoomBy(0.8);
      setCanvasZoom(engineRef.current.getZoom());
      AndroidEngine.triggerHaptic(15);
    }
  };

  const handleResetZoom = () => {
    if (engineRef.current) {
      engineRef.current.resetView();
      setCanvasZoom(1.0);
      AndroidEngine.triggerHaptic(25);
    }
  };

  // Update loop for FPS badge in navbar
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current) {
        setFps(engineRef.current.stats.fps);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Restore saved projects & active project state from LocalStorage on mount
  useEffect(() => {
    try {
      const activeProject = SaveLoadEngine.loadActiveProjectFromLocalStorage();
      const savedMetas = SaveLoadEngine.listSavedProjectsFromLocalStorage();

      const presetMap = new Map(PRESET_PROJECTS.map((p) => [p.id, p]));
      let loadedProjects = [...PRESET_PROJECTS];

      if (savedMetas.length > 0) {
        savedMetas.forEach((meta) => {
          const proj = SaveLoadEngine.loadProjectFromLocalStorage(meta.id);
          if (proj && !presetMap.has(proj.id)) {
            loadedProjects.unshift(proj);
          }
        });
      }

      if (activeProject && activeProject.id) {
        const matching = loadedProjects.find((p) => p.id === activeProject.id);
        const toSet = matching ? JSON.parse(JSON.stringify(matching)) : activeProject;
        if (toSet && Array.isArray(toSet.entities)) {
          setCurrentProject(toSet);
          const firstId = toSet.entities.length > 0 ? toSet.entities[0]?.id || null : null;
          setSelectedEntityId(firstId);
          setSelectedEntityIds(firstId ? [firstId] : []);
        }
      }

      setProjects(loadedProjects);
    } catch (e) {
      console.warn('Failed to load project state from LocalStorage:', e);
    }
  }, []);

  // Debounced Auto-Save current project state to LocalStorage
  useEffect(() => {
    if (!currentProject) return;
    const timer = setTimeout(() => {
      try {
        SaveLoadEngine.saveProjectToLocalStorage(currentProject, true);
      } catch (e) {
        // Silently catch quota or write errors
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [currentProject]);

  // Immediately save project state before window close/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentProject) {
        try {
          SaveLoadEngine.saveProjectToLocalStorage(currentProject, true);
        } catch (e) {
          // ignore
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentProject]);

  // Initialize and subscribe to HistoryEngine
  useEffect(() => {
    historyEngine.init(currentProject);
    const unsubscribe = historyEngine.subscribe((undoable, redoable) => {
      setCanUndo(undoable);
      setCanRedo(redoable);
      setUndoActionLabel(historyEngine.getUndoActionLabel());
      setRedoActionLabel(historyEngine.getRedoActionLabel());
    });
    return unsubscribe;
  }, [currentProject.id]);

  // Handlers for Undo & Redo Actions
  const handleUndo = () => {
    const res = historyEngine.undo();
    if (res) {
      setCurrentProject(res.project);
      setProjects((prev) => prev.map((p) => (p.id === res.project.id ? res.project : p)));
      if (res.project.entities.length > 0 && !res.project.entities.some((e) => e.id === selectedEntityId)) {
        setSelectedEntityId(res.project.entities[0].id);
      }
      soundEngine.play('click');
      AndroidEngine.triggerHaptic(20);
      setHistoryToast({
        message: `Undo: ${res.actionLabel || 'Batalkan Perubahan'}`,
        icon: 'undo',
      });
      setTimeout(() => setHistoryToast(null), 2200);
    }
  };

  const handleRedo = () => {
    const res = historyEngine.redo();
    if (res) {
      setCurrentProject(res.project);
      setProjects((prev) => prev.map((p) => (p.id === res.project.id ? res.project : p)));
      if (res.project.entities.length > 0 && !res.project.entities.some((e) => e.id === selectedEntityId)) {
        setSelectedEntityId(res.project.entities[0].id);
      }
      soundEngine.play('click');
      AndroidEngine.triggerHaptic(20);
      setHistoryToast({
        message: `Redo: ${res.actionLabel || 'Pulihkan Perubahan'}`,
        icon: 'redo',
      });
      setTimeout(() => setHistoryToast(null), 2200);
    }
  };

  // Keyboard Shortcuts Listener (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return; // Allow standard input text undo/redo

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProject, selectedEntityId]);

  // Handlers for Project & Entity Mutation
  const handleSelectProject = (proj: GameProject) => {
    const fresh = JSON.parse(JSON.stringify(proj));
    setCurrentProject(fresh);
    const firstId = fresh.entities && fresh.entities.length > 0 ? fresh.entities[0].id : null;
    setSelectedEntityId(firstId);
    setSelectedEntityIds(firstId ? [firstId] : []);
    setIsPlaying(false);
    setIsPaused(false);
    setCanvasZoom(1);
    historyEngine.init(fresh);
    if (engineRef.current) {
      engineRef.current.loadProject(fresh);
    }
  };

  const handleImportProject = (importedProj: GameProject) => {
    const fresh = JSON.parse(JSON.stringify(importedProj));
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === fresh.id);
      if (exists) {
        return prev.map((p) => (p.id === fresh.id ? fresh : p));
      }
      return [fresh, ...prev];
    });
    setCurrentProject(fresh);
    const firstId = fresh.entities && fresh.entities.length > 0 ? fresh.entities[0].id : null;
    setSelectedEntityId(firstId);
    setSelectedEntityIds(firstId ? [firstId] : []);
    setIsPlaying(false);
    setIsPaused(false);
    setCanvasZoom(1);
    historyEngine.init(fresh);
    if (engineRef.current) {
      engineRef.current.loadProject(fresh);
    }
  };

  const handleUpdateCurrentProject = (
    updated: GameProject,
    options?: { skipHistory?: boolean; actionLabel?: string }
  ) => {
    setCurrentProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (!options?.skipHistory) {
      historyEngine.pushState(updated, options?.actionLabel);
    }
  };

  const handleDragStart = (entityId: string) => {
    historyEngine.startBatch();
  };

  const handleDragEnd = (entityId: string) => {
    const ent = currentProject.entities.find((e) => e.id === entityId);
    historyEngine.endBatch(currentProject, `Geser Posisi ${ent?.name || 'Objek'}`);
  };

  const handleAddEntity = (type: EntityType) => {
    const newId = 'ent_' + Date.now();
    let defaultName = 'Objek Baru';
    let defaultColor = '#38bdf8';
    let defaultW = 36;
    let defaultH = 36;

    if (type === 'player') {
      defaultName = 'Hero Baru';
      defaultColor = '#38bdf8';
    } else if (type === 'platform') {
      defaultName = 'Tanah Platform';
      defaultColor = '#475569';
      defaultW = 120;
      defaultH = 24;
    } else if (type === 'coin') {
      defaultName = 'Koin Emas';
      defaultColor = '#facc15';
      defaultW = 24;
      defaultH = 24;
    } else if (type === 'hazard') {
      defaultName = 'Rintangan Duri';
      defaultColor = '#ef4444';
      defaultW = 32;
      defaultH = 24;
    } else if (type === 'enemy') {
      defaultName = 'Musuh Alien';
      defaultColor = '#a855f7';
    }

    const newEntity: Entity = {
      id: newId,
      name: defaultName,
      type: type,
      visible: true,
      locked: false,
      transform: {
        x: 180,
        y: 320,
        width: defaultW,
        height: defaultH,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: currentProject.entities.length + 1,
      },
      sprite: {
        type: 'preset',
        presetIcon: type === 'coin' ? 'coin' : type === 'hazard' ? 'spike' : 'hero',
        color: defaultColor,
        borderRadius: 8,
        opacity: 1,
      },
      rigidbody: {
        bodyType: type === 'platform' ? 'static' : 'dynamic',
        mass: 1,
        gravityScale: type === 'platform' ? 0 : 1,
        velocityX: 0,
        velocityY: 0,
        friction: 0.9,
        restitution: 0,
        isGrounded: false,
        fixedRotation: true,
      },
      collider: {
        enabled: true,
        type: type === 'coin' ? 'circle' : 'box',
        isTrigger: type === 'coin' || type === 'hazard',
        offsetX: 0,
        offsetY: 0,
        width: defaultW,
        height: defaultH,
        radius: defaultW / 2,
      },
    };

    const updatedEntities = [...currentProject.entities, newEntity];
    handleUpdateCurrentProject(
      { ...currentProject, entities: updatedEntities },
      { actionLabel: `Tambah ${defaultName}` }
    );
    setSelectedEntityId(newId);
  };

  const handleUpdateEntity = (updatedEntity: Entity) => {
    const updatedEntities = currentProject.entities.map((e) =>
      e.id === updatedEntity.id ? updatedEntity : e
    );
    handleUpdateCurrentProject(
      { ...currentProject, entities: updatedEntities },
      { actionLabel: `Ubah ${updatedEntity.name}` }
    );
  };

  const handleToggleVisibility = (id: string) => {
    const target = currentProject.entities.find((e) => e.id === id);
    const updatedEntities = currentProject.entities.map((e) =>
      e.id === id ? { ...e, visible: !e.visible } : e
    );
    handleUpdateCurrentProject(
      { ...currentProject, entities: updatedEntities },
      { actionLabel: `Visibilitas ${target?.name || 'Objek'}` }
    );
  };

  const handleToggleLock = (id: string) => {
    const target = currentProject.entities.find((e) => e.id === id);
    const updatedEntities = currentProject.entities.map((e) =>
      e.id === id ? { ...e, locked: !e.locked } : e
    );
    handleUpdateCurrentProject(
      { ...currentProject, entities: updatedEntities },
      { actionLabel: `Kunci ${target?.name || 'Objek'}` }
    );
  };

  const handleDuplicateEntity = (id: string) => {
    const target = currentProject.entities.find((e) => e.id === id);
    if (!target) return;

    const dup: Entity = JSON.parse(JSON.stringify(target));
    dup.id = 'ent_' + Date.now();
    dup.name = target.name + ' (Copy)';
    dup.transform.x += 20;
    dup.transform.y += 20;

    const updatedEntities = [...currentProject.entities, dup];
    handleUpdateCurrentProject(
      { ...currentProject, entities: updatedEntities },
      { actionLabel: `Duplikat ${target.name}` }
    );
    setSelectedEntityId(dup.id);
  };

  const handleSelectEntity = (id: string | null, isMultiToggle?: boolean) => {
    if (!id) {
      setSelectedEntityId(null);
      setSelectedEntityIds([]);
      if (engineRef.current) engineRef.current.clearMultiSelection();
      return;
    }

    if (isMultiToggle) {
      setSelectedEntityIds((prev) => {
        let updated: string[];
        if (prev.includes(id)) {
          updated = prev.filter((i) => i !== id);
        } else {
          updated = [...prev, id];
          if (selectedEntityId && !updated.includes(selectedEntityId)) {
            updated.push(selectedEntityId);
          }
        }
        setSelectedEntityId(updated.length > 0 ? updated[updated.length - 1] : null);
        if (engineRef.current) engineRef.current.setSelectedEntityIds(updated);
        return updated;
      });
    } else {
      setSelectedEntityId(id);
      setSelectedEntityIds([id]);
      if (engineRef.current) engineRef.current.setSelectedEntityId(id);
    }
  };

  const handleSelectMultiEntities = (ids: string[]) => {
    setSelectedEntityIds(ids);
    setSelectedEntityId(ids.length > 0 ? ids[ids.length - 1] : null);
  };

  const handleSelectAllEntities = () => {
    const allIds = currentProject.entities.map((e) => e.id);
    setSelectedEntityIds(allIds);
    setSelectedEntityId(allIds.length > 0 ? allIds[0] : null);
    if (engineRef.current) engineRef.current.setSelectedEntityIds(allIds);
  };

  const handleClearSelection = () => {
    setSelectedEntityIds([]);
    setSelectedEntityId(null);
    if (engineRef.current) engineRef.current.clearMultiSelection();
  };

  const handleMassDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    const count = ids.length;
    const updatedEntities = currentProject.entities.filter((e) => !ids.includes(e.id));
    handleUpdateCurrentProject(
      { ...currentProject, entities: updatedEntities },
      { actionLabel: `Hapus Massal (${count} Objek)` }
    );
    setSelectedEntityIds([]);
    setSelectedEntityId(updatedEntities[0]?.id || null);
    if (engineRef.current) engineRef.current.clearMultiSelection();
    soundEngine.play('click');
    AndroidEngine.triggerHaptic(30);
  };

  const handleMassDuplicate = (ids: string[]) => {
    if (ids.length === 0) return;
    const targets = currentProject.entities.filter((e) => ids.includes(e.id));
    const copies: Entity[] = targets.map((target) => {
      const dup: Entity = JSON.parse(JSON.stringify(target));
      dup.id = 'ent_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      dup.name = target.name + ' (Copy)';
      dup.transform.x += 20;
      dup.transform.y += 20;
      return dup;
    });

    const updatedEntities = [...currentProject.entities, ...copies];
    const newIds = copies.map((c) => c.id);
    handleUpdateCurrentProject(
      { ...currentProject, entities: updatedEntities },
      { actionLabel: `Duplikat Massal (${targets.length} Objek)` }
    );
    setSelectedEntityIds(newIds);
    setSelectedEntityId(newIds[0] || null);
    if (engineRef.current) engineRef.current.setSelectedEntityIds(newIds);
    soundEngine.play('click');
    AndroidEngine.triggerHaptic(20);
  };

  const handleMassMove = (ids: string[], dx: number, dy: number) => {
    if (ids.length === 0) return;
    const updatedEntities = currentProject.entities.map((e) => {
      if (ids.includes(e.id) && !e.locked) {
        return {
          ...e,
          transform: {
            ...e.transform,
            x: e.transform.x + dx,
            y: e.transform.y + dy,
          },
        };
      }
      return e;
    });

    handleUpdateCurrentProject(
      { ...currentProject, entities: updatedEntities },
      { actionLabel: `Geser Massal (${ids.length} Objek)` }
    );
  };

  const handleMassResize = (ids: string[], scaleFactor: number) => {
    if (ids.length === 0) return;
    const updatedEntities = currentProject.entities.map((e) => {
      if (ids.includes(e.id) && !e.locked) {
        const newW = Math.max(10, Math.round(e.transform.width * scaleFactor));
        const newH = Math.max(10, Math.round(e.transform.height * scaleFactor));
        return {
          ...e,
          transform: {
            ...e.transform,
            width: newW,
            height: newH,
          },
          collider: e.collider
            ? {
                ...e.collider,
                width: newW,
                height: newH,
                radius: newW / 2,
              }
            : undefined,
        };
      }
      return e;
    });

    handleUpdateCurrentProject(
      { ...currentProject, entities: updatedEntities },
      { actionLabel: `Resize Massal (${ids.length} Objek)` }
    );
    soundEngine.play('click');
  };

  const handleMassLockToggle = (ids: string[]) => {
    if (ids.length === 0) return;
    const targets = currentProject.entities.filter((e) => ids.includes(e.id));
    const allLocked = targets.every((e) => e.locked);
    const shouldLock = !allLocked;

    const updatedEntities = currentProject.entities.map((e) => {
      if (ids.includes(e.id)) {
        return { ...e, locked: shouldLock };
      }
      return e;
    });

    handleUpdateCurrentProject(
      { ...currentProject, entities: updatedEntities },
      { actionLabel: `${shouldLock ? 'Kunci' : 'Buka Kunci'} Massal (${ids.length} Objek)` }
    );
  };

  const handleDeleteEntity = (id: string) => {
    const target = currentProject.entities.find((e) => e.id === id);
    const updatedEntities = currentProject.entities.filter((e) => e.id !== id);
    handleUpdateCurrentProject(
      { ...currentProject, entities: updatedEntities },
      { actionLabel: `Hapus ${target?.name || 'Objek'}` }
    );
    if (selectedEntityId === id) {
      setSelectedEntityId(updatedEntities[0]?.id || null);
    }
  };

  const handleUpdateWorld = (updatedWorld: WorldSettings) => {
    handleUpdateCurrentProject(
      { ...currentProject, world: updatedWorld },
      { actionLabel: 'Pengaturan Dunia' }
    );
  };

  return (
    <div id="lite-engine-root" className="flex flex-col h-screen w-screen bg-slate-950 font-sans text-slate-100 overflow-hidden select-none relative">
      {/* Floating Undo / Redo Toast Notification */}
      {historyToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-cyan-500/60 text-cyan-200 font-bold text-xs px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none">
          {historyToast.icon === 'undo' ? (
            <Undo2 className="w-4 h-4 text-cyan-400" />
          ) : (
            <Redo2 className="w-4 h-4 text-amber-400" />
          )}
          <span>{historyToast.message}</span>
        </div>
      )}

      {/* Navbar Top Bar */}
      <Navbar
        currentProject={currentProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        onImportProject={handleImportProject}
        isPlaying={isPlaying}
        isPaused={isPaused}
        onStartPlay={() => {
          setIsPlaying(true);
          setIsPaused(false);
        }}
        onStopPlay={() => {
          setIsPlaying(false);
          setIsPaused(false);
        }}
        onTogglePause={() => setIsPaused(!isPaused)}
        onOpenProfiler={() => setShowProfiler(true)}
        onOpenExport={() => setShowExport(true)}
        onOpenAiStudio={() => setShowAiStudio(true)}
        onOpenFullscreenPreview={() => setShowFullscreenPreview(true)}
        onOpenLayoutCustomizer={() => setShowLayoutCustomizer(true)}
        aspectPreset={layoutConfig.aspectPreset}
        layoutMode={layoutConfig.layoutMode}
        fps={fps}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        undoActionLabel={undoActionLabel}
        redoActionLabel={redoActionLabel}
      />

      {/* Main Viewport & Canvas Stage */}
      <GameCanvas
        project={currentProject}
        isPlaying={isPlaying}
        selectedEntityId={selectedEntityId}
        selectedEntityIds={selectedEntityIds}
        onSelectEntity={handleSelectEntity}
        onSelectMultiEntities={handleSelectMultiEntities}
        onUpdateEntity={handleUpdateEntity}
        onUpdateScore={(score) =>
          handleUpdateCurrentProject({ ...currentProject, score }, { skipHistory: true })
        }
        engineRef={engineRef}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />

      {/* Floating / Docked Custom Workspace Tools (Zoom, Scaler, Salin, Duplikat, Hapus, etc.) */}
      {!isPlaying && layoutConfig.toolsDockOpen && (
        <WorkspaceToolsDock
          project={currentProject}
          selectedEntityId={selectedEntityId}
          selectedEntityIds={selectedEntityIds}
          engineRef={engineRef}
          onSelectEntity={handleSelectEntity}
          onSelectAllEntities={handleSelectAllEntities}
          onClearSelection={handleClearSelection}
          onUpdateEntity={handleUpdateEntity}
          onDuplicateEntity={handleDuplicateEntity}
          onDeleteEntity={handleDeleteEntity}
          onMassDuplicate={handleMassDuplicate}
          onMassDelete={handleMassDelete}
          onMassMove={handleMassMove}
          onMassResize={handleMassResize}
          onMassLockToggle={handleMassLockToggle}
          onUpdateWorld={handleUpdateWorld}
          activeTab={layoutConfig.toolsDockActiveTab}
          onTabChange={(tab) => updateLayoutConfig({ toolsDockActiveTab: tab })}
          isMinimized={layoutConfig.toolsDockMinimized}
          onToggleMinimize={() =>
            updateLayoutConfig({ toolsDockMinimized: !layoutConfig.toolsDockMinimized })
          }
          onClose={() => updateLayoutConfig({ toolsDockOpen: false })}
          pos={layoutConfig.toolsDockPos}
          onPosChange={(pos) => updateLayoutConfig({ toolsDockPos: pos })}
          aspectPreset={layoutConfig.aspectPreset}
          onAspectPresetChange={(preset) => updateLayoutConfig({ aspectPreset: preset })}
          lowEndMode={layoutConfig.lowEndDeviceOptimized}
        />
      )}

      {/* Canva-Style Bottom Navigation Toolbar */}
      <CanvaToolbar
        project={currentProject}
        selectedEntityId={selectedEntityId}
        selectedEntityIds={selectedEntityIds}
        onSelectEntity={handleSelectEntity}
        onSelectAllEntities={handleSelectAllEntities}
        onClearSelection={handleClearSelection}
        onAddEntity={handleAddEntity}
        onUpdateEntity={handleUpdateEntity}
        onToggleVisibility={handleToggleVisibility}
        onToggleLock={handleToggleLock}
        onDuplicateEntity={handleDuplicateEntity}
        onDeleteEntity={handleDeleteEntity}
        onMassDelete={handleMassDelete}
        onMassDuplicate={handleMassDuplicate}
        onMassMove={handleMassMove}
        onMassResize={handleMassResize}
        onMassLockToggle={handleMassLockToggle}
        onUpdateWorld={handleUpdateWorld}
        onUpdateProject={handleUpdateCurrentProject}
        onOpenFullscreenPreview={() => setShowFullscreenPreview(true)}
        onOpenProfiler={() => setShowProfiler(true)}
        layoutConfig={layoutConfig}
        onUpdateLayoutConfig={updateLayoutConfig}
        onOpenLayoutCustomizer={() => setShowLayoutCustomizer(true)}
      />

      {/* Modals */}
      {showLayoutCustomizer && (
        <LayoutCustomizerModal
          isOpen={showLayoutCustomizer}
          onClose={() => setShowLayoutCustomizer(false)}
          layoutConfig={layoutConfig}
          onUpdateConfig={updateLayoutConfig}
          onResetToDefaults={resetToDefaults}
        />
      )}

      {showFullscreenPreview && (
        <FullScreenPreviewModal
          project={currentProject}
          onUpdateScore={(score) =>
            handleUpdateCurrentProject({ ...currentProject, score }, { skipHistory: true })
          }
          onClose={() => setShowFullscreenPreview(false)}
        />
      )}
      {showProfiler && engineRef.current && (
        <HardwareProfilerModal
          stats={engineRef.current.stats}
          onClose={() => setShowProfiler(false)}
        />
      )}

      {showExport && (
        <ExportModal
          project={currentProject}
          onClose={() => setShowExport(false)}
        />
      )}

      {showAiStudio && (
        <AiStudioModal
          project={currentProject}
          selectedEntity={currentProject?.entities ? (currentProject.entities.find((e) => e.id === selectedEntityId) || null) : null}
          onUpdateProject={handleUpdateCurrentProject}
          onClose={() => setShowAiStudio(false)}
        />
      )}
    </div>
  );
}
