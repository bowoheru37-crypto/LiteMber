import React, { useState, useEffect, useRef } from 'react';
import { Entity, AnimationTimelineTrack, AnimationKeyframe } from '../types/engine';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Volume2,
  Layers,
  Sliders,
  Eye,
  Activity,
  Flame,
  Zap,
  Clock,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
} from 'lucide-react';
import { soundEngine } from '../engine/AudioEngine';
import { AndroidEngine } from '../engine/AndroidEngine';

interface AnimationTimelineProps {
  entity: Entity | null;
  onUpdateEntity: (updated: Entity) => void;
  onClose?: () => void;
}

export const AnimationTimeline: React.FC<AnimationTimelineProps> = ({
  entity,
  onUpdateEntity,
  onClose,
}) => {
  const [activeTrackId, setActiveTrackId] = useState<string>('walk_cycle');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const [onionSkinning, setOnionSkinning] = useState<boolean>(true);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  if (!entity) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs">
        Pilih objek karakter di layar untuk membuka Frame-Based Animation Timeline.
      </div>
    );
  }

  // Ensure entity has default timelineTracks
  const tracks: Record<string, AnimationTimelineTrack> = entity.sprite?.timelineTracks || {
    walk_cycle: {
      id: 'walk_cycle',
      name: 'Walk Cycle',
      fps: 12,
      durationMs: 800,
      loop: true,
      keyframes: [
        {
          id: 'kf_0',
          timeMs: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          opacity: 1,
          easing: 'linear',
          sfxPreset: 'step',
        },
        {
          id: 'kf_200',
          timeMs: 200,
          scaleX: 1.1,
          scaleY: 0.9,
          rotation: 5,
          opacity: 1,
          easing: 'easeInOutQuad',
        },
        {
          id: 'kf_400',
          timeMs: 400,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          opacity: 1,
          easing: 'linear',
          sfxPreset: 'step',
        },
        {
          id: 'kf_600',
          timeMs: 600,
          scaleX: 0.9,
          scaleY: 1.1,
          rotation: -5,
          opacity: 1,
          easing: 'easeInOutQuad',
        },
      ],
    },
  };

  const currentTrack: AnimationTimelineTrack = tracks[activeTrackId] || Object.values(tracks)[0] || {
    id: 'default',
    name: 'Default Track',
    fps: 12,
    durationMs: 1000,
    loop: true,
    keyframes: [],
  };

  const selectedKf = currentTrack.keyframes.find((k) => k.id === selectedKeyframeId) || currentTrack.keyframes[0] || null;

  // Sync active track ID
  useEffect(() => {
    if (!tracks[activeTrackId] && Object.keys(tracks).length > 0) {
      setActiveTrackId(Object.keys(tracks)[0]);
    }
  }, [tracks, activeTrackId]);

  // Timeline Playback Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setCurrentTimeMs((prev) => {
        const next = prev + delta;
        if (next >= currentTrack.durationMs) {
          if (currentTrack.loop) {
            return next % currentTrack.durationMs;
          } else {
            setIsPlaying(false);
            return currentTrack.durationMs;
          }
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, currentTrack]);

  // Update entity live during preview
  useEffect(() => {
    if (!isPlaying) return;

    // Evaluate current track state on entity
    const updatedEntity = { ...entity };
    if (!updatedEntity.sprite.timelineTracks) {
      updatedEntity.sprite.timelineTracks = tracks;
    }
    updatedEntity.sprite.activeTimelineTrackId = currentTrack.id;

    // Apply live values for playback preview
    const sortedKf = [...currentTrack.keyframes].sort((a, b) => a.timeMs - b.timeMs);
    if (sortedKf.length > 0) {
      let curr = sortedKf[0];
      let next = sortedKf[sortedKf.length - 1];

      for (let i = 0; i < sortedKf.length; i++) {
        if (sortedKf[i].timeMs <= currentTimeMs) {
          curr = sortedKf[i];
          next = sortedKf[(i + 1) % sortedKf.length];
        }
      }

      if (curr.pixelData) updatedEntity.sprite.pixelData = curr.pixelData;
      if (curr.scaleX !== undefined) updatedEntity.transform.scaleX = curr.scaleX;
      if (curr.scaleY !== undefined) updatedEntity.transform.scaleY = curr.scaleY;
      if (curr.rotation !== undefined) updatedEntity.transform.rotation = curr.rotation;
      if (curr.opacity !== undefined) updatedEntity.sprite.opacity = curr.opacity;
    }

    onUpdateEntity(updatedEntity);
  }, [currentTimeMs, isPlaying]);

  const updateTrackInEntity = (updatedTrack: AnimationTimelineTrack) => {
    const newTracks = { ...tracks, [updatedTrack.id]: updatedTrack };
    onUpdateEntity({
      ...entity,
      sprite: {
        ...entity.sprite,
        timelineTracks: newTracks,
        activeTimelineTrackId: updatedTrack.id,
      },
    });
  };

  const handleAddKeyframe = () => {
    const newKf: AnimationKeyframe = {
      id: 'kf_' + Date.now(),
      timeMs: Math.round(currentTimeMs),
      scaleX: selectedKf?.scaleX ?? 1,
      scaleY: selectedKf?.scaleY ?? 1,
      rotation: selectedKf?.rotation ?? 0,
      opacity: selectedKf?.opacity ?? 1,
      pixelData: entity.sprite?.pixelData,
      easing: 'easeInOutQuad',
    };

    const newKeyframes = [...currentTrack.keyframes, newKf].sort((a, b) => a.timeMs - b.timeMs);
    const updatedTrack = { ...currentTrack, keyframes: newKeyframes };
    updateTrackInEntity(updatedTrack);
    setSelectedKeyframeId(newKf.id);
    AndroidEngine.triggerHaptic(15);
  };

  const handleDeleteKeyframe = (id: string) => {
    if (currentTrack.keyframes.length <= 1) {
      alert('Keyframe minimal tersisa 1.');
      return;
    }
    const newKeyframes = currentTrack.keyframes.filter((k) => k.id !== id);
    const updatedTrack = { ...currentTrack, keyframes: newKeyframes };
    updateTrackInEntity(updatedTrack);
    setSelectedKeyframeId(newKeyframes[0]?.id || null);
    AndroidEngine.triggerHaptic(10);
  };

  const handleUpdateSelectedKf = (patch: Partial<AnimationKeyframe>) => {
    if (!selectedKf) return;
    const newKeyframes = currentTrack.keyframes.map((k) => (k.id === selectedKf.id ? { ...k, ...patch } : k));
    updateTrackInEntity({ ...currentTrack, keyframes: newKeyframes });
  };

  const handleCreateNewTrack = () => {
    const name = prompt('Masukkan nama animasi baru (misal: Jump, Attack, Spin):', 'Animasi_Baru');
    if (!name) return;
    const id = 'track_' + Date.now();
    const newTrack: AnimationTimelineTrack = {
      id,
      name,
      fps: 12,
      durationMs: 1000,
      loop: true,
      keyframes: [
        {
          id: 'kf_init',
          timeMs: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          opacity: 1,
          pixelData: entity.sprite?.pixelData,
          easing: 'easeInOutQuad',
        },
      ],
    };

    updateTrackInEntity(newTrack);
    setActiveTrackId(id);
    setSelectedKeyframeId('kf_init');
  };

  const handleLoadPreset = (presetType: 'squash_jump' | 'spin_coin' | 'float_wobble' | 'hurt_flash' | 'spin_3d_coin' | 'flip_3d_card' | 'tilt_3d_floating' | 'spring_boing_ui') => {
    let presetTrack: AnimationTimelineTrack;

    if (presetType === 'spring_boing_ui') {
      presetTrack = {
        id: 'preset_spring_' + Date.now(),
        name: 'Spring Physics Bounce',
        fps: 24,
        durationMs: 700,
        loop: true,
        keyframes: [
          { id: 'k1', timeMs: 0, scaleX: 0.6, scaleY: 0.6, easing: 'springBouncy', sfxPreset: 'powerup' },
          { id: 'k2', timeMs: 350, scaleX: 1.25, scaleY: 1.25, easing: 'springBouncy' },
          { id: 'k3', timeMs: 700, scaleX: 1.0, scaleY: 1.0, easing: 'springBouncy' },
        ],
      };
    } else if (presetType === 'squash_jump') {
      presetTrack = {
        id: 'preset_jump_' + Date.now(),
        name: 'Squash & Stretch Jump',
        fps: 16,
        durationMs: 800,
        loop: true,
        keyframes: [
          { id: 'k1', timeMs: 0, scaleX: 1, scaleY: 1, rotation: 0, easing: 'easeOutBounce' },
          { id: 'k2', timeMs: 150, scaleX: 1.3, scaleY: 0.7, rotation: 0, easing: 'easeOutElastic', sfxPreset: 'jump' },
          { id: 'k3', timeMs: 400, scaleX: 0.8, scaleY: 1.3, rotation: 0, easing: 'easeInOutQuad' },
          { id: 'k4', timeMs: 650, scaleX: 1.2, scaleY: 0.8, rotation: 0, easing: 'easeOutBounce', sfxPreset: 'land' },
        ],
      };
    } else if (presetType === 'spin_3d_coin') {
      presetTrack = {
        id: 'preset_3d_coin_' + Date.now(),
        name: '3D Y-Axis Coin Spin',
        fps: 24,
        durationMs: 1000,
        loop: true,
        keyframes: [
          { id: 'k1', timeMs: 0, rotationY: 0, depthZ: 0, easing: 'linear' },
          { id: 'k2', timeMs: 250, rotationY: 90, depthZ: 25, easing: 'linear', sfxPreset: 'coin' },
          { id: 'k3', timeMs: 500, rotationY: 180, depthZ: 0, easing: 'linear' },
          { id: 'k4', timeMs: 750, rotationY: 270, depthZ: -25, easing: 'linear' },
        ],
      };
    } else if (presetType === 'flip_3d_card') {
      presetTrack = {
        id: 'preset_3d_card_' + Date.now(),
        name: '3D Card Flip',
        fps: 20,
        durationMs: 800,
        loop: true,
        keyframes: [
          { id: 'k1', timeMs: 0, rotationY: 0, depthZ: 0, easing: 'easeInOutQuad' },
          { id: 'k2', timeMs: 400, rotationY: 180, depthZ: 40, easing: 'easeInOutQuad', sfxPreset: 'powerup' },
        ],
      };
    } else if (presetType === 'tilt_3d_floating') {
      presetTrack = {
        id: 'preset_3d_tilt_' + Date.now(),
        name: '3D Perspective Float',
        fps: 16,
        durationMs: 1200,
        loop: true,
        keyframes: [
          { id: 'k1', timeMs: 0, rotationX: -15, rotationY: -10, depthZ: -20, easing: 'easeOutSine' },
          { id: 'k2', timeMs: 600, rotationX: 15, rotationY: 10, depthZ: 30, easing: 'easeOutSine' },
        ],
      };
    } else if (presetType === 'spin_coin') {
      presetTrack = {
        id: 'preset_spin_' + Date.now(),
        name: '360° Spin Star',
        fps: 24,
        durationMs: 1000,
        loop: true,
        keyframes: [
          { id: 'k1', timeMs: 0, rotation: 0, scaleX: 1, scaleY: 1, easing: 'linear' },
          { id: 'k2', timeMs: 250, rotation: 90, scaleX: 1.1, scaleY: 1.1, easing: 'linear', sfxPreset: 'coin' },
          { id: 'k3', timeMs: 500, rotation: 180, scaleX: 1, scaleY: 1, easing: 'linear' },
          { id: 'k4', timeMs: 750, rotation: 270, scaleX: 1.1, scaleY: 1.1, easing: 'linear' },
        ],
      };
    } else if (presetType === 'float_wobble') {
      presetTrack = {
        id: 'preset_float_' + Date.now(),
        name: 'Floating Float',
        fps: 12,
        durationMs: 1200,
        loop: true,
        keyframes: [
          { id: 'k1', timeMs: 0, rotation: -3, scaleX: 1, scaleY: 1, opacity: 1, easing: 'easeOutSine' },
          { id: 'k2', timeMs: 600, rotation: 3, scaleX: 1.05, scaleY: 0.95, opacity: 0.9, easing: 'easeOutSine' },
        ],
      };
    } else {
      presetTrack = {
        id: 'preset_hurt_' + Date.now(),
        name: 'Hurt & Flash',
        fps: 20,
        durationMs: 600,
        loop: false,
        keyframes: [
          { id: 'k1', timeMs: 0, opacity: 1, scaleX: 1, scaleY: 1, rotation: 0, sfxPreset: 'hit' },
          { id: 'k2', timeMs: 150, opacity: 0.2, scaleX: 1.2, scaleY: 0.8, rotation: -15, easing: 'easeOutBack' },
          { id: 'k3', timeMs: 300, opacity: 1, scaleX: 0.9, scaleY: 1.1, rotation: 10 },
          { id: 'k4', timeMs: 450, opacity: 0.4, scaleX: 1, scaleY: 1, rotation: 0 },
        ],
      };
    }

    updateTrackInEntity(presetTrack);
    setActiveTrackId(presetTrack.id);
    setSelectedKeyframeId(presetTrack.keyframes[0]?.id || null);
    AndroidEngine.triggerHaptic(20);
  };

  // Canvas preview renderer for keyframe pixel art thumbnail
  const renderPixelThumbnail = (pixelGrid?: string[][]) => {
    if (!pixelGrid || pixelGrid.length === 0) {
      return (
        <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-slate-500 text-[10px]">
          [Preset]
        </div>
      );
    }

    return (
      <div className="w-12 h-12 bg-slate-950 border border-slate-700 rounded-lg p-0.5 grid grid-cols-16 grid-rows-16 gap-0 overflow-hidden shadow-inner">
        {pixelGrid.flatMap((row, rIdx) =>
          row.map((color, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className="w-full h-full"
              style={{ backgroundColor: color === 'transparent' ? 'rgba(255,255,255,0.05)' : color }}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-t border-slate-800 text-white select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-2.5 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-xs text-white">Frame-Based Animation Timeline</h3>
        </div>

        {/* Track Selector & Add Track */}
        <div className="flex items-center gap-1.5">
          <select
            value={activeTrackId}
            onChange={(e) => setActiveTrackId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-purple-300 font-bold px-2 py-1 rounded-lg text-xs"
          >
            {Object.values(tracks).map((t) => (
              <option key={t.id} value={t.id}>
                🎬 {t.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateNewTrack}
            className="p-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title="Tambah Track Animasi Baru"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Track Baru</span>
          </button>
        </div>
      </div>

      {/* Main Controls & Scrubber Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-xs gap-2">
        {/* Playback Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsPlaying(!isPlaying);
              AndroidEngine.triggerHaptic(10);
            }}
            className={`p-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isPlaying ? 'bg-amber-500 text-slate-950 shadow' : 'bg-purple-600 text-white hover:bg-purple-500 shadow'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-slate-950" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isPlaying ? 'Jeda' : 'Putar'}</span>
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTimeMs(0);
            }}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            title="Reset ke Awal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Loop Toggle */}
          <button
            onClick={() => updateTrackInEntity({ ...currentTrack, loop: !currentTrack.loop })}
            className={`px-2 py-1 rounded-lg border font-bold text-[11px] cursor-pointer ${
              currentTrack.loop ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {currentTrack.loop ? '🔁 Loop' : '➡️ Once'}
          </button>
        </div>

        {/* Time Display */}
        <div className="font-mono text-[11px] text-purple-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-purple-400" />
          <span>{(currentTimeMs / 1000).toFixed(2)}s</span>
          <span className="text-slate-500">/</span>
          <span>{(currentTrack.durationMs / 1000).toFixed(2)}s</span>
        </div>

        {/* FPS & Preset Templates */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">FPS:</span>
            <select
              value={currentTrack.fps}
              onChange={(e) => updateTrackInEntity({ ...currentTrack, fps: Number(e.target.value) })}
              className="bg-slate-800 border border-slate-700 text-white rounded px-1.5 py-0.5 text-xs"
            >
              {[4, 8, 12, 16, 24, 30, 60].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setOnionSkinning(!onionSkinning)}
            className={`p-1 rounded-lg border text-xs cursor-pointer ${
              onionSkinning ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Onion Skinning (Tampilkan Bayangan Keyframe Sebelum/Sesudah)"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Visual Keyframe Sequence Timeline Track */}
      <div className="p-3 bg-slate-950 space-y-2 border-b border-slate-800 overflow-x-auto">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-300 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> Jalur Keyframe Timeline
          </span>

          <button
            onClick={handleAddKeyframe}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 text-[11px] shadow cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>+ Keyframe di Playhead</span>
          </button>
        </div>

        {/* Timeline Ruler & Keyframe Track */}
        <div className="relative bg-slate-900 rounded-xl p-2.5 border border-slate-800 min-w-[320px]">
          {/* Time Scrubber Slider */}
          <input
            type="range"
            min={0}
            max={currentTrack.durationMs}
            value={currentTimeMs}
            onChange={(e) => {
              setCurrentTimeMs(Number(e.target.value));
              setIsPlaying(false);
            }}
            className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          {/* Keyframe Nodes along axis */}
          <div className="relative h-14 mt-2 flex items-center gap-2 overflow-x-auto py-1">
            {currentTrack.keyframes.map((kf) => {
              const leftPercent = (kf.timeMs / currentTrack.durationMs) * 100;
              const isSelected = kf.id === selectedKeyframeId;

              return (
                <div
                  key={kf.id}
                  onClick={() => {
                    setSelectedKeyframeId(kf.id);
                    setCurrentTimeMs(kf.timeMs);
                    setIsPlaying(false);
                    AndroidEngine.triggerHaptic(10);
                  }}
                  className={`flex flex-col items-center cursor-pointer transition-all p-1 rounded-lg border ${
                    isSelected ? 'bg-purple-500/30 border-purple-400 shadow-md scale-105' : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {renderPixelThumbnail(kf.pixelData)}
                  <span className={`text-[9px] font-mono mt-1 font-bold ${isSelected ? 'text-purple-300' : 'text-slate-400'}`}>
                    {kf.timeMs}ms
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preset Templates Quick Generator */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-semibold text-[10px] whitespace-nowrap">Template Preset:</span>
          <button
            onClick={() => handleLoadPreset('spring_boing_ui')}
            className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 cursor-pointer whitespace-nowrap"
          >
            🌀 Pegas Membal (Spring)
          </button>
          <button
            onClick={() => handleLoadPreset('spin_3d_coin')}
            className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-300 cursor-pointer whitespace-nowrap"
          >
            🪙 3D Spin (Yaw)
          </button>
          <button
            onClick={() => handleLoadPreset('flip_3d_card')}
            className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-blue-500/30 text-blue-300 cursor-pointer whitespace-nowrap"
          >
            🃏 3D Card Flip
          </button>
          <button
            onClick={() => handleLoadPreset('tilt_3d_floating')}
            className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-indigo-500/30 text-indigo-300 cursor-pointer whitespace-nowrap"
          >
            📐 3D Perspective
          </button>
          <button
            onClick={() => handleLoadPreset('squash_jump')}
            className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-purple-500/30 text-purple-300 cursor-pointer whitespace-nowrap"
          >
            🦘 Squash Jump
          </button>
          <button
            onClick={() => handleLoadPreset('spin_coin')}
            className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 cursor-pointer whitespace-nowrap"
          >
            ⭐ 360° Spin
          </button>
          <button
            onClick={() => handleLoadPreset('float_wobble')}
            className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 text-cyan-300 cursor-pointer whitespace-nowrap"
          >
            🎈 Floating Float
          </button>
          <button
            onClick={() => handleLoadPreset('hurt_flash')}
            className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-rose-500/30 text-rose-300 cursor-pointer whitespace-nowrap"
          >
            ⚡ Hurt Flash
          </button>
        </div>
      </div>

      {/* Keyframe Property Inspector */}
      {selectedKf && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-400 flex items-center gap-1 text-[11px]">
              <Sliders className="w-3.5 h-3.5" /> Inspector Property Keyframe ({selectedKf.timeMs} ms)
            </span>

            <button
              onClick={() => handleDeleteKeyframe(selectedKf.id)}
              className="text-rose-400 hover:bg-rose-500/10 p-1 rounded-md flex items-center gap-1 text-[10px] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Keyframe
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Scale X & Scale Y (Squash & Stretch) */}
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-300">Squash & Stretch (Skala)</span>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Scale X:</span>
                  <span className="font-mono text-purple-300">{selectedKf.scaleX?.toFixed(2) ?? '1.00'}</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={2.0}
                  step={0.05}
                  value={selectedKf.scaleX ?? 1}
                  onChange={(e) => handleUpdateSelectedKf({ scaleX: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />

                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Scale Y:</span>
                  <span className="font-mono text-purple-300">{selectedKf.scaleY?.toFixed(2) ?? '1.00'}</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={2.0}
                  step={0.05}
                  value={selectedKf.scaleY ?? 1}
                  onChange={(e) => handleUpdateSelectedKf({ scaleY: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            {/* 3D Euler Angles & Depth Projection */}
            <div className="p-2.5 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-2">
              <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Transformasi 3D Pseudo
              </span>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Pitch (3D Rotasi X):</span>
                  <span className="font-mono text-indigo-300">{selectedKf.rotationX ?? 0}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={5}
                  value={selectedKf.rotationX ?? 0}
                  onChange={(e) => handleUpdateSelectedKf({ rotationX: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />

                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Yaw (3D Rotasi Y):</span>
                  <span className="font-mono text-indigo-300">{selectedKf.rotationY ?? 0}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={5}
                  value={selectedKf.rotationY ?? 0}
                  onChange={(e) => handleUpdateSelectedKf({ rotationY: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />

                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Depth Z (Kedalaman):</span>
                  <span className="font-mono text-indigo-300">{selectedKf.depthZ ?? 0}px</span>
                </div>
                <input
                  type="range"
                  min={-200}
                  max={200}
                  step={5}
                  value={selectedKf.depthZ ?? 0}
                  onChange={(e) => handleUpdateSelectedKf({ depthZ: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-300">Rotasi & Transparansi</span>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Rotasi (°):</span>
                  <span className="font-mono text-cyan-300">{selectedKf.rotation ?? 0}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={5}
                  value={selectedKf.rotation ?? 0}
                  onChange={(e) => handleUpdateSelectedKf({ rotation: parseInt(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />

                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Opasitas:</span>
                  <span className="font-mono text-cyan-300">{selectedKf.opacity?.toFixed(2) ?? '1.00'}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={selectedKf.opacity ?? 1}
                  onChange={(e) => handleUpdateSelectedKf({ opacity: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Easing & Sound Effect Trigger */}
          <div className="grid grid-cols-2 gap-3">
            {/* Easing to Next Keyframe */}
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Kurva Transisi Easing
              </span>
              <select
                value={selectedKf.easing || 'easeInOutQuad'}
                onChange={(e) => handleUpdateSelectedKf({ easing: e.target.value as any })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-1.5 text-xs"
              >
                <option value="linear">Linear</option>
                <option value="easeInOutQuad">Quad Smooth</option>
                <option value="springBouncy">🌀 Pegas Membal (Bouncy)</option>
                <option value="springSnappy">⚡ Pegas Cepat (Snappy)</option>
                <option value="springLoose">🍃 Pegas Halus (Loose)</option>
                <option value="springCharacter">🐘 Impact Berat (Heavy)</option>
                <option value="easeOutBounce">Pantulan Bounce</option>
                <option value="easeOutElastic">Karet Elastic</option>
                <option value="easeOutBack">Back Pull</option>
                <option value="easeOutSine">Sine Wave</option>
              </select>
            </div>

            {/* Audio Event Trigger on Keyframe */}
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-emerald-400" /> SFX Event di Keyframe
              </span>
              <select
                value={selectedKf.sfxPreset || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handleUpdateSelectedKf({ sfxPreset: val || undefined });
                  if (val) soundEngine.playSynthPreset(val);
                }}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-1.5 text-xs"
              >
                <option value="">(Tanpa Suara)</option>
                <option value="step">👟 Langkah Kaki (Step)</option>
                <option value="jump">🦘 Melompat (Jump)</option>
                <option value="land">💥 Mendarat (Land)</option>
                <option value="coin">⭐ Koin / Item (Coin)</option>
                <option value="hit">⚔️ Serang / Hit</option>
                <option value="laser">⚡ Laser / Magic</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
