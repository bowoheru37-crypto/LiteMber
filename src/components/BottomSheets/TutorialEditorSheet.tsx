import React, { useState } from 'react';
import { TutorialSequence, TutorialStep, GestureHintType } from '../../types/engine';
import { BookOpen, Play, Plus, Trash2, X, Sparkles, Check, HelpCircle, ChevronRight, Volume2 } from 'lucide-react';
import { TutorialEngine } from '../../engine/TutorialEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';

interface TutorialEditorSheetProps {
  tutorials?: TutorialSequence[];
  onUpdateTutorials: (updatedTutorials: TutorialSequence[]) => void;
  onStartTutorial: (sequence: TutorialSequence) => void;
  onClose: () => void;
}

export const TutorialEditorSheet: React.FC<TutorialEditorSheetProps> = ({
  tutorials = [],
  onUpdateTutorials,
  onStartTutorial,
  onClose,
}) => {
  const initialList = tutorials.length > 0 ? tutorials : TutorialEngine.getDefaultTutorialSequences();
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>(initialList[0].id);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);

  const activeSequence = initialList.find((s) => s.id === selectedSequenceId) || initialList[0];
  const activeStep = activeSequence?.steps[selectedStepIndex] || activeSequence?.steps[0];

  const handleStepUpdate = (updatedStep: TutorialStep) => {
    const updatedSteps = [...activeSequence.steps];
    updatedSteps[selectedStepIndex] = updatedStep;

    const updatedSequence = { ...activeSequence, steps: updatedSteps };
    const newList = initialList.map((s) => (s.id === updatedSequence.id ? updatedSequence : s));
    onUpdateTutorials(newList);
  };

  const handleAddStep = () => {
    const newStep: TutorialStep = {
      id: `step_${Date.now()}`,
      title: 'Langkah Baru',
      description: 'Jelaskan instruksi petunjuk untuk pemain di sini.',
      gestureHint: 'tap',
      hapticPattern: 'light',
      audioHint: 'coin',
    };

    const updatedSequence = {
      ...activeSequence,
      steps: [...activeSequence.steps, newStep],
    };

    const newList = initialList.map((s) => (s.id === updatedSequence.id ? updatedSequence : s));
    onUpdateTutorials(newList);
    setSelectedStepIndex(updatedSequence.steps.length - 1);
    AndroidEngine.triggerHaptic(15);
  };

  const gestureHintsList: { name: string; key: GestureHintType; icon: string }[] = [
    { name: 'Sentuh (Tap)', key: 'tap', icon: '👆' },
    { name: 'Double Tap', key: 'double_tap', icon: '✌️' },
    { name: 'Geser Kiri', key: 'swipe_left', icon: '👈' },
    { name: 'Geser Kanan', key: 'swipe_right', icon: '👉' },
    { name: 'Tarik (Drag)', key: 'drag', icon: '✊' },
    { name: 'Cubit (Pinch)', key: 'pinch', icon: '🤏' },
  ];

  return (
    <div className="flex flex-col h-full text-white bg-slate-900 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm">Sistem Panduan & Tutorial Interactive</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onStartTutorial(activeSequence);
              onClose();
            }}
            className="bg-amber-500 text-slate-950 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow hover:bg-amber-400 active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Jalankan Panduan</span>
          </button>
          <button onClick={onClose} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Steps List */}
        <div className="w-1/3 bg-slate-950 border-r border-slate-800 p-2 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Tahapan Langkah</span>
            <button
              onClick={handleAddStep}
              className="p-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {activeSequence.steps.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setSelectedStepIndex(idx)}
                className={`w-full text-left p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                  idx === selectedStepIndex
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px] truncate">
                  <span className="text-amber-400 font-mono">{idx + 1}.</span>
                  <span className="truncate">{step.title}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{step.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Step Editor Panel */}
        {activeStep && (
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            {/* Step Title */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Judul Petunjuk</label>
              <input
                type="text"
                value={activeStep.title}
                onChange={(e) => handleStepUpdate({ ...activeStep, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-amber-400 outline-none font-bold text-xs"
              />
            </div>

            {/* Step Description */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Deskripsi Instruksi</label>
              <textarea
                rows={3}
                value={activeStep.description}
                onChange={(e) => handleStepUpdate({ ...activeStep, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-amber-400 outline-none text-xs"
              />
            </div>

            {/* Gesture Hint */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Indikator Gestur Layar Sentuh</label>
              <div className="grid grid-cols-3 gap-1.5">
                {gestureHintsList.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => handleStepUpdate({ ...activeStep, gestureHint: g.key })}
                    className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 cursor-pointer ${
                      activeStep.gestureHint === g.key
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="text-sm">{g.icon}</span>
                    <span className="text-[9px] truncate">{g.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Cue */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-amber-400" /> Suara Cepat (SFX Cue)
              </label>
              <select
                value={activeStep.audioHint || 'coin'}
                onChange={(e) => handleStepUpdate({ ...activeStep, audioHint: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-amber-400 outline-none text-xs"
              >
                <option value="coin">Coin (Koin Retro)</option>
                <option value="jump">Jump (Lompat)</option>
                <option value="powerup">Powerup (Bonus)</option>
                <option value="laser">Laser (Tembakan)</option>
                <option value="synth">Synth Beep</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
