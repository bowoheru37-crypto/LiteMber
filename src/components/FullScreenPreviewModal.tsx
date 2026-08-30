import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  X,
  Gamepad2,
  ShieldCheck,
  Trophy,
  Gauge,
  Sparkles,
  Sliders,
  RefreshCw,
  ArrowLeft,
  Tv,
} from 'lucide-react';
import { GameProject, Entity, VirtualInputLayout } from '../types/engine';
import { CoreEngine } from '../engine/CoreEngine';
import { InputMappingEngine, DEFAULT_INPUT_PRESETS } from '../engine/InputMappingEngine';
import { soundEngine } from '../engine/AudioEngine';
import { AndroidEngine } from '../engine/AndroidEngine';

interface FullScreenPreviewModalProps {
  project: GameProject;
  onUpdateScore?: (score: number) => void;
  onClose: () => void;
}

export const FullScreenPreviewModal: React.FC<FullScreenPreviewModalProps> = ({
  project,
  onUpdateScore,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CoreEngine | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [score, setScore] = useState<number>(project.score || 0);
  const [fps, setFps] = useState<number>(60);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [aspectRatioMode, setAspectRatioMode] = useState<'portrait' | 'landscape' | 'fit'>('portrait');
  const [activeTouchCodes, setActiveTouchCodes] = useState<Record<string, boolean>>({});
  const [isNativeFullscreen, setIsNativeFullscreen] = useState<boolean>(false);

  // Auto-hide top control bar after inactivity
  const [showControls, setShowControls] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  useEffect(() => {
    resetControlsTimeout();
    const handlePointerMove = () => resetControlsTimeout();
    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Attempt Native HTML5 Fullscreen on Mount
  useEffect(() => {
    const el = containerRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen()
        .then(() => setIsNativeFullscreen(true))
        .catch(() => {
          // Fallback to full viewport overlay if fullscreen permission is denied (e.g. inside iframe)
          setIsNativeFullscreen(false);
        });
    }

    const handleFullscreenChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Handle ESC key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Canvas Viewport Dimension Calculations
  const getCanvasDimensions = () => {
    if (aspectRatioMode === 'portrait') {
      return { width: 360, height: 640, aspect: '9/16' };
    } else if (aspectRatioMode === 'landscape') {
      return { width: 640, height: 360, aspect: '16/9' };
    } else {
      return { width: 480, height: 640, aspect: '3/4' };
    }
  };

  const canvasDim = getCanvasDimensions();

  // Initialize Core Engine Instance inside Fullscreen Modal
  useEffect(() => {
    if (!canvasRef.current) return;

    const customWorld = {
      ...project.world,
      viewportWidth: canvasDim.width,
      viewportHeight: canvasDim.height,
    };

    const engine = new CoreEngine(canvasRef.current, customWorld);
    engine.setEntities(project.entities);
    engine.setConstraints(project.constraints || project.joints || []);
    engine.setAudioAssets(project.assets?.audio || []);
    engine.setGameVariables(project.variables || []);
    engine.setDialogues(project.dialogues || []);
    engine.setTutorials(project.tutorials || []);

    engine.onScoreChange = (newScore) => {
      setScore(newScore);
      onUpdateScore?.(newScore);
    };

    engine.run();
    engine.startPlayMode();
    engineRef.current = engine;

    // Update FPS loop
    const fpsInterval = setInterval(() => {
      if (engineRef.current) {
        setFps(engineRef.current.stats.fps);
      }
    }, 500);

    return () => {
      clearInterval(fpsInterval);
      engine.destroy();
      engineRef.current = null;
    };
  }, [aspectRatioMode]);

  // Handle Play / Pause / Restart
  const handleTogglePlay = () => {
    if (!engineRef.current) return;
    if (isPaused) {
      engineRef.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      engineRef.current.pause();
      setIsPaused(true);
    }
    soundEngine.play('click');
  };

  const handleRestart = () => {
    if (!engineRef.current) return;
    engineRef.current.stopPlayMode(project.entities);
    engineRef.current.setEntities(project.entities);
    engineRef.current.startPlayMode();
    setScore(0);
    setIsPaused(false);
    setIsPlaying(true);
    soundEngine.play('level_start');
    AndroidEngine.triggerHaptic(40);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMasterVolume(next ? 0 : 0.8);
    AndroidEngine.triggerHaptic(20);
  };

  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Virtual Controls Pointer Handlers
  const handlePointerDown = (code: string) => (e: React.PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setActiveTouchCodes((prev) => ({ ...prev, [code]: true }));
    InputMappingEngine.registerPointer(e.pointerId, code, e.clientX, e.clientY);
  };

  const handlePointerUp = (code: string) => (e: React.PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    setActiveTouchCodes((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
    InputMappingEngine.unregisterPointer(e.pointerId);
  };

  const activeControls =
    project.world.inputLayout?.controls || DEFAULT_INPUT_PRESETS.platformer_classic.controls;

  return (
    <div
      ref={containerRef}
      id="fullscreen-preview-modal"
      className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col items-center justify-center overflow-hidden select-none animate-in fade-in duration-200"
    >
      {/* Top Floating Glassmorphic Control Bar (HUD) */}
      <div
        className={`fixed top-3 inset-x-3 md:inset-x-6 z-50 flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-700/80 p-2 sm:p-2.5 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Left: Game Title & Score */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Trophy className="w-4 h-4 text-slate-950 font-black" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[120px] sm:max-w-[200px]">
              {project.name}
            </span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="font-mono text-amber-300 font-bold">Skor: {score}</span>
              <span className="text-slate-500">•</span>
              <span className={`font-mono font-bold ${fps >= 55 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {fps} FPS
              </span>
            </div>
          </div>
        </div>

        {/* Center: Play, Pause, Restart Controls */}
        <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-full border border-slate-700/80 shadow-inner">
          <button
            onClick={handleTogglePlay}
            className={`p-2 rounded-full font-bold text-xs transition-all cursor-pointer ${
              isPaused
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
            }`}
            title={isPaused ? 'Lanjutkan Game' : 'Jeda Game'}
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={handleRestart}
            className="p-2 rounded-full bg-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-600 transition-all cursor-pointer"
            title="Ulangi/Reset Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-700/80 my-auto" />

          {/* Orientation Selector */}
          <button
            onClick={() => setAspectRatioMode('portrait')}
            className={`p-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              aspectRatioMode === 'portrait'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Mode Potret (9:16)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Potret</span>
          </button>

          <button
            onClick={() => setAspectRatioMode('landscape')}
            className={`p-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              aspectRatioMode === 'landscape'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Mode Lanskap (16:9)"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lanskap</span>
          </button>
        </div>

        {/* Right: Sound, Fullscreen & Exit */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={isMuted ? 'Nyalakan Suara' : 'Mute Suara'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleNativeFullscreen}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isNativeFullscreen ? 'Keluar Native Fullscreen' : 'Native Fullscreen (F11)'}
          >
            {isNativeFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close / Exit Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-extrabold text-xs shadow-lg shadow-rose-500/20 transition-all active:scale-95 cursor-pointer"
            title="Keluar dari Fullscreen Preview (ESC)"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>

      {/* Main Fullscreen Stage Area */}
      <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Dynamic Aspect Ratio Canvas Wrapper */}
        <div
          className="relative bg-slate-900 rounded-2xl border-2 border-slate-800/80 shadow-2xl overflow-hidden flex items-center justify-center transition-all duration-300"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: canvasDim.aspect,
            width: aspectRatioMode === 'landscape' ? 'min(100%, 1100px)' : 'min(100%, 500px)',
            height: 'auto',
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasDim.width}
            height={canvasDim.height}
            className="w-full h-full object-contain cursor-crosshair touch-none"
          />

          {/* Virtual Touch Controls Layer in Fullscreen Mode */}
          <div className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden">
            {activeControls.map((ctrl) => {
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
                    width: `${ctrl.sizePx * 1.15}px`,
                    height: `${ctrl.sizePx * 1.15}px`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: isPressed ? ctrl.color : `${ctrl.color}33`,
                    borderColor: ctrl.color,
                  }}
                  className={`absolute pointer-events-auto rounded-full border-2 flex flex-col items-center justify-center transition-transform active:scale-90 shadow-xl backdrop-blur-md cursor-pointer ${
                    isPressed ? 'scale-95 shadow-cyan-500/50 text-slate-950 font-black' : 'text-white font-bold'
                  }`}
                  title={`${ctrl.name} (${ctrl.mappedKey})`}
                >
                  <span className="text-[11px] leading-tight text-center px-1 font-mono uppercase truncate max-w-full">
                    {ctrl.name}
                  </span>
                  <span className="text-[8.5px] opacity-70 font-mono font-normal">[{ctrl.mappedKey}]</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Shortcut Guidance Toast */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-slate-800 text-slate-400 text-[10.5px] font-mono px-3 py-1 rounded-full shadow-lg backdrop-blur-md z-40 pointer-events-none flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Arahkan kursor / sentuh layar untuk menampilkan kontrol • Tekan [ESC] untuk Keluar</span>
      </div>
    </div>
  );
};
