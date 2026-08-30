import React, { useState } from 'react';
import { Scene, SceneTransitionType, GameProject } from '../../types/engine';
import { Layers, Plus, Copy, Trash2, Play, Check, X, Film, Sparkles } from 'lucide-react';
import { SceneEngine } from '../../engine/SceneEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';

interface SceneManagerSheetProps {
  project: GameProject;
  onUpdateProject: (updatedProject: GameProject) => void;
  onTestSceneTransition: (sceneId: string, transition: SceneTransitionType) => void;
  onClose: () => void;
}

export const SceneManagerSheet: React.FC<SceneManagerSheetProps> = ({
  project,
  onUpdateProject,
  onTestSceneTransition,
  onClose,
}) => {
  const [newSceneName, setNewSceneName] = useState<string>('');
  const [selectedTransition, setSelectedTransition] = useState<SceneTransitionType>('fade_black');

  const scenesList = project.scenes || [];
  const activeSceneId = project.activeSceneId || (scenesList[0]?.id || 'default');

  const handleCreateScene = () => {
    if (!newSceneName.trim()) return;

    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      name: newSceneName.trim(),
      entities: JSON.parse(JSON.stringify(project.entities || [])),
      world: JSON.parse(JSON.stringify(project.world)),
    };

    const updatedScenes = [...scenesList, newScene];
    onUpdateProject({
      ...project,
      scenes: updatedScenes,
      activeSceneId: newScene.id,
    });

    setNewSceneName('');
    AndroidEngine.triggerHaptic(20);
  };

  const handleDuplicateScene = (sceneId: string) => {
    const sceneToCopy = scenesList.find((s) => s.id === sceneId);
    if (!sceneToCopy) return;

    const duplicated: Scene = {
      ...JSON.parse(JSON.stringify(sceneToCopy)),
      id: `scene_${Date.now()}`,
      name: `${sceneToCopy.name} (Salinan)`,
    };

    const updatedScenes = [...scenesList, duplicated];
    onUpdateProject({
      ...project,
      scenes: updatedScenes,
    });

    AndroidEngine.triggerHaptic(15);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (scenesList.length <= 1) return;

    const updatedScenes = scenesList.filter((s) => s.id !== sceneId);
    const newActiveId = activeSceneId === sceneId ? updatedScenes[0].id : activeSceneId;

    onUpdateProject({
      ...project,
      scenes: updatedScenes,
      activeSceneId: newActiveId,
    });

    AndroidEngine.triggerHaptic(15);
  };

  const transitionsList: { name: string; key: SceneTransitionType; icon: string }[] = [
    { name: 'Fade Black', key: 'fade_black', icon: '🕶️' },
    { name: 'Wipe Kiri', key: 'wipe_left', icon: '↔️' },
    { name: 'Slide Atas', key: 'slide_up', icon: '⬆️' },
    { name: 'Zoom In', key: 'zoom_in', icon: '🔍' },
  ];

  return (
    <div className="flex flex-col h-full text-white bg-slate-900 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm">Scene Manager & Multi-Adegan</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {/* Create Scene Input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nama Scene Baru (misal: Boss_Level, GameOver)..."
            value={newSceneName}
            onChange={(e) => setNewSceneName(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-400"
          />
          <button
            onClick={handleCreateScene}
            className="bg-purple-500 hover:bg-purple-400 text-white font-bold px-3 py-2 rounded-lg flex items-center gap-1 shadow cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Scene</span>
          </button>
        </div>

        {/* Transition FX Selector */}
        <div className="space-y-1.5 p-3 bg-slate-950 rounded-xl border border-slate-800">
          <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
            <Film className="w-3.5 h-3.5 text-purple-400" /> Efek Transisi Adegan
          </label>
          <div className="grid grid-cols-4 gap-2">
            {transitionsList.map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedTransition(t.key)}
                className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                  selectedTransition === t.key
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <span className="block text-sm mb-0.5">{t.icon}</span>
                <span className="text-[10px]">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scenes List */}
        <div className="space-y-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Daftar Scene Aktif ({scenesList.length})</span>
          <div className="space-y-2">
            {scenesList.map((scene) => {
              const isActive = scene.id === activeSceneId;
              return (
                <div
                  key={scene.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-purple-500/10 border-purple-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">{scene.name}</div>
                      <div className="text-[10px] text-slate-400">{scene.entities?.length || 0} Objek</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onTestSceneTransition(scene.id, selectedTransition)}
                      className="bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-purple-500/30 cursor-pointer active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-purple-300" />
                      <span>Buka</span>
                    </button>
                    <button
                      onClick={() => handleDuplicateScene(scene.id)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {scenesList.length > 1 && (
                      <button
                        onClick={() => handleDeleteScene(scene.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
