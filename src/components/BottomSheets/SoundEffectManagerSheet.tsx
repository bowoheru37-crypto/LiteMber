import React, { useState } from 'react';
import { GameProject, Entity, LogicRule, TriggerType, AudioAsset } from '../../types/engine';
import { soundEngine, CustomSynthConfig } from '../../engine/AudioEngine';
import {
  Volume2,
  Play,
  Plus,
  Trash2,
  X,
  Zap,
  Sliders,
  Sparkles,
  Music,
  Disc,
  CheckCircle2,
  Layers,
  Radio,
  Flame,
  Wand2,
  ArrowRight,
  Gauge,
  RefreshCw,
} from 'lucide-react';

interface SoundEffectManagerSheetProps {
  project: GameProject;
  selectedEntity: Entity | null;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

// Preset Quick Event Templates
const QUICK_EVENT_TEMPLATES = [
  {
    id: 'coin_collect',
    title: '🪙 Ambil Koin (Coin Collect)',
    description: 'Bunyi efek koin saat pemain menyentuh/menabrak objek koin.',
    targetTag: 'coin',
    trigger: 'ON_COLLISION_ENTER' as TriggerType,
    soundKey: 'coin',
  },
  {
    id: 'obstacle_hit',
    title: '💥 Tabrakan Bahaya (Obstacle Hit)',
    description: 'Bunyi efek benturan saat terkena rintangan / duri / musuh.',
    targetTag: 'hazard',
    trigger: 'ON_COLLISION_ENTER' as TriggerType,
    soundKey: 'hit',
  },
  {
    id: 'player_jump',
    title: '🦘 Lompatan Karakter (Jump Impulse)',
    description: 'Bunyi efek pegas saat menekan tombol Space / Tap untuk lompat.',
    targetTag: 'player',
    trigger: 'ON_KEY_PRESS' as TriggerType,
    triggerKey: 'Space',
    soundKey: 'jump',
  },
  {
    id: 'laser_shoot',
    title: '⚡ Tembakan Laser (Laser Shoot)',
    description: 'Bunyi laser saat menembak atau tap tombol aksi.',
    targetTag: 'player',
    trigger: 'ON_TAP' as TriggerType,
    soundKey: 'laser',
  },
  {
    id: 'powerup_bonus',
    title: '🌟 Bonus Powerup (Powerup Grab)',
    description: 'Melodi gembira saat mendapatkan bonus item.',
    targetTag: 'coin',
    trigger: 'ON_TOUCH_DOWN' as TriggerType,
    soundKey: 'powerup',
  },
];

export const SoundEffectManagerSheet: React.FC<SoundEffectManagerSheetProps> = ({
  project,
  selectedEntity,
  onUpdateProject,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'triggers' | 'synth' | 'mixer'>('triggers');
  const [logMessage, setLogMessage] = useState<string | null>(null);

  // Custom Synth Form state
  const [synthName, setSynthName] = useState('Suara Efek Kustom');
  const [synthWave, setSynthWave] = useState<OscillatorType>('sine');
  const [synthStartFreq, setSynthStartFreq] = useState(880);
  const [synthEndFreq, setSynthEndFreq] = useState(1320);
  const [synthDuration, setSynthDuration] = useState(200);
  const [synthRamp, setSynthRamp] = useState<'exponential' | 'linear' | 'none'>('exponential');
  const [synthVolume, setSynthVolume] = useState(0.8);

  // Event Trigger Attachment State
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    selectedEntity?.id || project.entities[0]?.id || ''
  );
  const [newTriggerType, setNewTriggerType] = useState<TriggerType>('ON_COLLISION_ENTER');
  const [newTriggerKey, setNewTriggerKey] = useState<string>('Space');
  const [newSoundKey, setNewSoundKey] = useState<string>('coin');

  const audioAssets = project.assets?.audio || [];

  // Extract all active sound triggers across the project entities
  const activeSoundRules: { entity: Entity; rule: LogicRule; ruleIndex: number }[] = [];
  project.entities.forEach((ent) => {
    ent.script?.rules?.forEach((rule, idx) => {
      if (rule.action === 'PLAY_SOUND') {
        activeSoundRules.push({ entity: ent, rule, ruleIndex: idx });
      }
    });
  });

  // Helper to trigger notification log
  const showLog = (msg: string) => {
    setLogMessage(msg);
    setTimeout(() => setLogMessage(null), 3500);
  };

  // 1. Attach a sound trigger to an entity
  const handleAttachSoundTrigger = () => {
    const targetEnt = project.entities.find((e) => e.id === selectedEntityId);
    if (!targetEnt) return;

    const newRule: LogicRule = {
      id: 'rule_sfx_' + Date.now(),
      enabled: true,
      name: `Suara: ${newSoundKey.toUpperCase()} (${newTriggerType})`,
      trigger: newTriggerType,
      triggerKey: newTriggerType.includes('KEY') ? newTriggerKey : undefined,
      action: 'PLAY_SOUND',
      paramString: newSoundKey,
    };

    const existingRules = targetEnt.script?.rules || [];
    const updatedEntity: Entity = {
      ...targetEnt,
      script: {
        tag: targetEnt.script?.tag || targetEnt.type,
        rules: [...existingRules, newRule],
      },
    };

    const updatedEntities = project.entities.map((e) => (e.id === targetEnt.id ? updatedEntity : e));
    onUpdateProject({ ...project, entities: updatedEntities });
    soundEngine.play(newSoundKey, audioAssets);
    showLog(`✨ Trigger suara '${newSoundKey}' berhasil dipasang ke objek '${targetEnt.name}'!`);
  };

  // 2. Remove sound trigger rule
  const handleRemoveSoundTrigger = (entityId: string, ruleId: string) => {
    const updatedEntities = project.entities.map((ent) => {
      if (ent.id === entityId && ent.script?.rules) {
        return {
          ...ent,
          script: {
            ...ent.script,
            rules: ent.script.rules.filter((r) => r.id !== ruleId),
          },
        };
      }
      return ent;
    });
    onUpdateProject({ ...project, entities: updatedEntities });
    showLog('🗑️ Trigger suara berhasil dihapus.');
  };

  // 3. Quick Apply Template to matching entities
  const handleApplyQuickTemplate = (template: typeof QUICK_EVENT_TEMPLATES[0]) => {
    let affectedCount = 0;
    const updatedEntities = project.entities.map((ent) => {
      // Check if entity matches tag or type
      const isMatch =
        ent.type === template.targetTag ||
        ent.script?.tag?.toLowerCase() === template.targetTag.toLowerCase() ||
        ent.name.toLowerCase().includes(template.targetTag.toLowerCase());

      if (isMatch) {
        affectedCount++;
        const newRule: LogicRule = {
          id: 'rule_sfx_tmpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          enabled: true,
          name: `Auto SFX: ${template.soundKey.toUpperCase()}`,
          trigger: template.trigger,
          triggerKey: template.triggerKey,
          action: 'PLAY_SOUND',
          paramString: template.soundKey,
        };

        const currentRules = ent.script?.rules || [];
        // Avoid exact duplicate rule
        const hasDuplicate = currentRules.some(
          (r) => r.action === 'PLAY_SOUND' && r.trigger === template.trigger && r.paramString === template.soundKey
        );

        if (!hasDuplicate) {
          return {
            ...ent,
            script: {
              tag: ent.script?.tag || ent.type,
              rules: [...currentRules, newRule],
            },
          };
        }
      }
      return ent;
    });

    if (affectedCount > 0) {
      onUpdateProject({ ...project, entities: updatedEntities });
      soundEngine.play(template.soundKey, audioAssets);
      showLog(`🚀 Template '${template.title}' berhasil diterapkan ke ${affectedCount} objek!`);
    } else {
      // Apply to currently selected entity as fallback
      if (selectedEntity) {
        const newRule: LogicRule = {
          id: 'rule_sfx_tmpl_' + Date.now(),
          enabled: true,
          name: `Auto SFX: ${template.soundKey.toUpperCase()}`,
          trigger: template.trigger,
          triggerKey: template.triggerKey,
          action: 'PLAY_SOUND',
          paramString: template.soundKey,
        };
        const updated = project.entities.map((e) =>
          e.id === selectedEntity.id
            ? { ...e, script: { tag: e.script?.tag || e.type, rules: [...(e.script?.rules || []), newRule] } }
            : e
        );
        onUpdateProject({ ...project, entities: updated });
        soundEngine.play(template.soundKey, audioAssets);
        showLog(`🚀 Template '${template.title}' dipasang ke objek '${selectedEntity.name}'!`);
      } else {
        showLog(`⚠️ Tidak ada objek '${template.targetTag}' ditemukan. Pilih objek di stage terlebih dahulu.`);
      }
    }
  };

  // 4. Test Custom Web Audio API Synthesis
  const handleTestCustomSynth = () => {
    const config: CustomSynthConfig = {
      waveType: synthWave,
      startFreq: synthStartFreq,
      endFreq: synthEndFreq,
      durationMs: synthDuration,
      pitchRamp: synthRamp,
      volume: synthVolume,
    };
    soundEngine.playCustomSynthSound(config);
  };

  // 5. Save Custom Synth as AudioAsset preset
  const handleSaveCustomSynthAsset = () => {
    const presetKey = 'custom_' + Date.now();
    const newAsset: AudioAsset = {
      id: 'aud_synth_' + Date.now(),
      name: synthName || 'Suara Synthesizer Kustom',
      type: 'sfx',
      format: 'synth',
      presetKey: presetKey,
      volume: synthVolume,
      fileSizeKb: 8,
      isOptimized: true,
    };

    onUpdateProject({
      ...project,
      assets: {
        ...project.assets,
        audio: [...audioAssets, newAsset],
      },
    });

    handleTestCustomSynth();
    showLog(`🎵 Suara sintetis '${newAsset.name}' berhasil disimpan ke Proyek!`);
  };

  return (
    <div className="p-3 h-full flex flex-col text-slate-100 select-none bg-slate-900 border-t border-slate-800">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1.5">
              <span>Manajer Suara & Trigger Efek Event</span>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono px-1.5 py-0.2 rounded-full">
                Web Audio API
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">Atur pemicu suara tabrakan, koin & sintesis frekuensi audio realtime</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Log Banner */}
      {logMessage && (
        <div className="mb-2 p-2 bg-slate-950 border border-cyan-500/40 rounded-xl text-cyan-300 text-[11px] font-mono flex items-center gap-2 animate-pulse">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate">{logMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-950 p-1 rounded-xl mb-3 border border-slate-800 text-xs gap-1">
        <button
          onClick={() => setActiveTab('triggers')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'triggers'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px]">Trigger Event ({activeSoundRules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('synth')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'synth'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px]">Studio Sintesis Audio</span>
        </button>

        <button
          onClick={() => setActiveTab('mixer')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'mixer'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="text-[10px] sm:text-[11px]">Mixer Volume</span>
        </button>
      </div>

      {/* TAB 1: EVENT TRIGGERS ATTACHMENT */}
      {activeTab === 'triggers' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Quick Preset Templates */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Template Pemicu Cepat (1-Click Presets):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_EVENT_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-cyan-500/40 rounded-xl flex items-center justify-between gap-2 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block truncate">{tmpl.title}</span>
                    <p className="text-[9px] text-slate-400 leading-tight truncate">{tmpl.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => soundEngine.play(tmpl.soundKey, audioAssets)}
                      className="p-1 rounded bg-slate-800 text-cyan-400 hover:bg-slate-700 cursor-pointer text-[10px]"
                      title="Tes Suara"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                    <button
                      onClick={() => handleApplyQuickTemplate(tmpl)}
                      className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-[10px] cursor-pointer shadow"
                    >
                      Pasang
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Sound Attachment Creator */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Pasang Trigger Suara Manual ke Objek:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {/* Select Entity */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Objek Target Game:</label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                >
                  {project.entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name} ({ent.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Event Trigger */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Pemicu Event (Trigger):</label>
                <select
                  value={newTriggerType}
                  onChange={(e) => setNewTriggerType(e.target.value as TriggerType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                >
                  <optgroup label="Fisika & Tabrakan">
                    <option value="ON_COLLISION_ENTER">Tabrakan Benturan (Collision)</option>
                    <option value="ON_OUT_OF_BOUNDS">Jatuh Ke Luar Layar</option>
                    <option value="ON_START">Saat Level Dimulai</option>
                  </optgroup>
                  <optgroup label="Sentuhan & Gestur">
                    <option value="ON_TOUCH_DOWN">Sentuhan Awal (Touch Down)</option>
                    <option value="ON_TAP">Tap Singkat</option>
                    <option value="ON_SWIPE_UP">Swipe Ke Atas</option>
                    <option value="ON_SWIPE_DOWN">Swipe Ke Bawah</option>
                  </optgroup>
                  <optgroup label="Keyboard Controls">
                    <option value="ON_KEY_PRESS">Tombol Ditekan (Key Press)</option>
                  </optgroup>
                </select>
              </div>

              {/* Select Sound Effect */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Efek Suara (SFX):</label>
                <select
                  value={newSoundKey}
                  onChange={(e) => setNewSoundKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                >
                  <optgroup label="Preset Web Audio API Synthesizer">
                    <option value="coin">🪙 Koin (Coin Collect)</option>
                    <option value="jump">🦘 Lompat (Jump Impulse)</option>
                    <option value="hit">💥 Benturan / Tabrakan (Hit)</option>
                    <option value="laser">⚡ Laser (Shoot)</option>
                    <option value="explosion">💣 Ledakan (Explode)</option>
                    <option value="powerup">🌟 Powerup Bonus</option>
                    <option value="win">🏆 Kemenangan (Victory)</option>
                    <option value="bounce">👟 Langkah / Pantulan</option>
                  </optgroup>
                  {audioAssets.length > 0 && (
                    <optgroup label="Aset Audio Ungguhan Proyek">
                      {audioAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          🎵 {asset.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => soundEngine.play(newSoundKey, audioAssets)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Tes Audio</span>
              </button>

              <button
                onClick={handleAttachSoundTrigger}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simpan & Pasang Trigger</span>
              </button>
            </div>
          </div>

          {/* Active Sound Triggers List */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Daftar Trigger Suara Aktif di Proyek ({activeSoundRules.length}):
            </span>

            {activeSoundRules.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                Belum ada trigger suara terpasang di objek mana pun. Gunakan panel di atas atau template cepat.
              </div>
            ) : (
              activeSoundRules.map(({ entity, rule }, idx) => (
                <div
                  key={rule.id || idx}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      onClick={() => soundEngine.play(rule.paramString || 'coin', audioAssets)}
                      className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 flex items-center justify-center shrink-0 cursor-pointer"
                      title="Tes Suara"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{entity.name}</span>
                        <span className="text-[9px] bg-slate-800 text-cyan-300 px-1.5 py-0.2 rounded font-mono">
                          {rule.trigger}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Efek Sound: <strong className="text-amber-300">{rule.paramString || 'coin'}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveSoundTrigger(entity.id, rule.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Hapus Trigger"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WEB AUDIO SYNTHESIS STUDIO */}
      {activeTab === 'synth' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Wand2 className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs text-white">Sintesis Audio Prosedural (Web Audio Oscillators)</span>
              </div>
              <span className="text-[9px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                0 KB Network
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Nama Efek Suara:</label>
                <input
                  type="text"
                  value={synthName}
                  onChange={(e) => setSynthName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Bentuk Gelombang (Oscillator Wave):</label>
                <select
                  value={synthWave}
                  onChange={(e) => setSynthWave(e.target.value as OscillatorType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                >
                  <option value="sine">Sine Wave (Suara Murni / Soft / Coin)</option>
                  <option value="square">Square Wave (Retro 8-Bit Chiptune / Jump)</option>
                  <option value="sawtooth">Sawtooth Wave (Tajam / Laser / Hit)</option>
                  <option value="triangle">Triangle Wave (Lembut / Bass / Boom)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-0.5">
                  <span>Frekuensi Awal (Pitch Start)</span>
                  <span className="font-mono text-amber-400 font-bold">{synthStartFreq} Hz</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2500"
                  step="25"
                  value={synthStartFreq}
                  onChange={(e) => setSynthStartFreq(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-0.5">
                  <span>Frekuensi Akhir (Pitch Slide)</span>
                  <span className="font-mono text-cyan-400 font-bold">{synthEndFreq} Hz</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2500"
                  step="25"
                  value={synthEndFreq}
                  onChange={(e) => setSynthEndFreq(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-0.5">
                  <span>Durasi Suara</span>
                  <span className="font-mono text-emerald-400 font-bold">{synthDuration} ms</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="1200"
                  step="10"
                  value={synthDuration}
                  onChange={(e) => setSynthDuration(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Pitch Ramp Mode:</label>
                <select
                  value={synthRamp}
                  onChange={(e) => setSynthRamp(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                >
                  <option value="exponential">Exponential (Sangat Alami / Jump / Laser)</option>
                  <option value="linear">Linear (Ramp Konstan)</option>
                  <option value="none">Tanpa Ramp (Pitch Tetap)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={handleTestCustomSynth}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Uji Sintesis Suara</span>
              </button>

              <button
                onClick={handleSaveCustomSynthAsset}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simpan Ke Aset Proyek</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HARDWARE MIXER & VOLUME NORMALIZATION */}
      {activeTab === 'mixer' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                <Gauge className="w-4 h-4" /> Centralized Audio Normalizer & Speaker Protection
              </span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                Dynamics Compressor Active
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Master Volume */}
              <div className="p-2 bg-slate-900/60 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-xs text-slate-200 font-semibold">
                  <span>Volume Master (Keseluruhan)</span>
                  <span className="font-mono text-cyan-400 font-bold">{Math.round(soundEngine.getVolumes().master * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue={soundEngine.getVolumes().master}
                  onChange={(e) => soundEngine.setMasterVolume(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* BGM Volume */}
              <div className="p-2 bg-slate-900/60 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-xs text-slate-200 font-semibold">
                  <span>Volume Musik Latar (BGM)</span>
                  <span className="font-mono text-amber-400 font-bold">{Math.round(soundEngine.getVolumes().bgm * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue={soundEngine.getVolumes().bgm}
                  onChange={(e) => soundEngine.setBgmVolume(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* SFX Volume */}
              <div className="p-2 bg-slate-900/60 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-xs text-slate-200 font-semibold">
                  <span>Volume Efek Suara Event (SFX)</span>
                  <span className="font-mono text-emerald-400 font-bold">{Math.round(soundEngine.getVolumes().sfx * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue={soundEngine.getVolumes().sfx}
                  onChange={(e) => soundEngine.setSfxVolume(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
