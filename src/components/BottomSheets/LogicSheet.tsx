import React from 'react';
import { Entity, GameProject, LogicRule, TriggerType, ActionType } from '../../types/engine';
import { UnifiedSheetHeader } from '../Common/UnifiedSheetHeader';
import { Zap, Plus, Trash2, Volume2, Play, Variable, Filter } from 'lucide-react';
import { soundEngine } from '../../engine/AudioEngine';
import { VariableManager } from '../../engine/VariableManager';

interface LogicSheetProps {
  entity: Entity | null;
  project?: GameProject;
  onUpdateEntity: (updated: Entity) => void;
  onClose: () => void;
}

export const LogicSheet: React.FC<LogicSheetProps> = ({ entity, project, onUpdateEntity, onClose }) => {
  if (!entity) {
    return (
      <div className="flex flex-col h-full text-white">
        <UnifiedSheetHeader
          title="Logika Visual Rules"
          subtitle="Aturan pemicu & aksi tanpa koding"
          icon={Zap}
          iconColor="text-amber-400"
          onClose={onClose}
        />
        <div className="p-8 text-center text-slate-400 text-xs font-medium">
          Pilih objek di panggung terlebih dahulu untuk menambahkan logika event visual.
        </div>
      </div>
    );
  }

  const rules = entity.script?.rules || [];
  const audioAssets = project?.assets?.audio || [];
  const projectVariables = project ? VariableManager.ensureProjectVariables(project) : VariableManager.getDefaultVariables();

  const handleAddRule = () => {
    const newRule: LogicRule = {
      id: 'rule_' + Date.now(),
      enabled: true,
      name: 'Aturan Baru ' + (rules.length + 1),
      trigger: 'ON_KEY_PRESS',
      triggerKey: 'Space',
      action: 'JUMP',
      paramNumber: -400,
      paramString: 'jump',
    };

    const updatedRules = [...rules, newRule];
    onUpdateEntity({
      ...entity,
      script: {
        tag: entity.script?.tag || entity.type,
        rules: updatedRules,
      },
    });
  };

  const handleUpdateRule = (index: number, updatedRule: LogicRule) => {
    const updatedRules = [...rules];
    updatedRules[index] = updatedRule;
    onUpdateEntity({
      ...entity,
      script: {
        tag: entity.script?.tag || entity.type,
        rules: updatedRules,
      },
    });
  };

  const handleDeleteRule = (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    onUpdateEntity({
      ...entity,
      script: {
        tag: entity.script?.tag || entity.type,
        rules: updatedRules,
      },
    });
  };

  return (
    <div className="flex flex-col h-full text-white">
      <UnifiedSheetHeader
        title={`Logika Visual (${entity.name})`}
        subtitle="Aturan pemicu & aksi interaktif entitas"
        icon={Zap}
        iconColor="text-amber-400"
        action={
          <button
            onClick={handleAddRule}
            className="min-h-[40px] px-3 py-1.5 bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Rules</span>
          </button>
        }
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-2">Belum ada logika event untuk {entity.name}.</p>
            <button
              onClick={handleAddRule}
              className="inline-flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Aturan Logika</span>
            </button>
          </div>
        ) : (
          rules.map((rule, idx) => (
            <div
              key={rule.id}
              className="p-3 bg-slate-800/90 border border-slate-700/80 rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={rule.name}
                  onChange={(e) => handleUpdateRule(idx, { ...rule, name: e.target.value })}
                  className="bg-transparent font-bold text-xs text-cyan-400 focus:outline-none border-b border-cyan-500/30 pb-0.5"
                />
                <button
                  onClick={() => handleDeleteRule(idx)}
                  className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                  title="Hapus Aturan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Trigger */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-amber-400 font-semibold block mb-0.5">JIKA (PEMICU):</span>
                  <select
                    value={rule.trigger}
                    onChange={(e) =>
                      handleUpdateRule(idx, { ...rule, trigger: e.target.value as TriggerType })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <optgroup label="Keyboard & Tombol">
                      <option value="ON_KEY_PRESS">Tombol Sekali Tekan (Key Press)</option>
                      <option value="ON_KEY_HOLD">Tombol Ditahan (Key Hold / WASD)</option>
                    </optgroup>
                    <optgroup label="Gestur Sentuh & Swipe">
                      <option value="ON_TAP">Sentuhan Tap Singkat</option>
                      <option value="ON_SWIPE_UP">Gestur Swipe Ke Atas (Atas)</option>
                      <option value="ON_SWIPE_DOWN">Gestur Swipe Ke Bawah (Bawah)</option>
                      <option value="ON_SWIPE_LEFT">Gestur Swipe Ke Kiri (Kiri)</option>
                      <option value="ON_SWIPE_RIGHT">Gestur Swipe Ke Kanan (Kanan)</option>
                      <option value="ON_TOUCH_DOWN">Sentuhan Awal (Touch Down)</option>
                      <option value="ON_TOUCH_UP">Sentuhan Dilepas (Touch Up)</option>
                    </optgroup>
                    <optgroup label="Fisika & Game Event">
                      <option value="ON_COLLISION_ENTER">Tabrakan Objek (Collision)</option>
                      <option value="ON_OUT_OF_BOUNDS">Jatuh Ke Luar Layar</option>
                      <option value="ON_START">Game Dimulai (On Start)</option>
                      <option value="ON_TIMER">Loop Waktu (Timer Continuous)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Action */}
                <div>
                  <span className="text-[10px] text-emerald-400 font-semibold block mb-0.5">MAKA (AKSI):</span>
                  <select
                    value={rule.action}
                    onChange={(e) =>
                      handleUpdateRule(idx, { ...rule, action: e.target.value as ActionType })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <optgroup label="Gerakan & Fisika Engine">
                      <option value="MOVE_LEFT">Bergerak Ke Kiri (Velocity X -)</option>
                      <option value="MOVE_RIGHT">Bergerak Ke Kanan (Velocity X +)</option>
                      <option value="MOVE_UP">Bergerak Ke Atas (Velocity Y -)</option>
                      <option value="MOVE_DOWN">Bergerak Ke Bawah (Velocity Y +)</option>
                      <option value="JUMP">Lompat Ke Atas (Impulse Y)</option>
                      <option value="DASH">Dash Cepat (Sprint)</option>
                      <option value="TELEPORT">Teleportasi (Lompat Jarak)</option>
                      <option value="SET_VELOCITY_X">Set Kecepatan X Eksplisit</option>
                      <option value="SET_VELOCITY_Y">Set Kecepatan Y Eksplisit</option>
                    </optgroup>
                    <optgroup label="Interaksi & Skor">
                      <option value="ADD_SCORE">Tambah Skor Game</option>
                      <option value="PLAY_SOUND">Putar Suara Efek / Musik</option>
                      <option value="EMIT_PARTICLES">Munculkan Efek Ledakan Partikel</option>
                      <option value="RESTART_LEVEL">Reset & Ulangi Game</option>
                      <option value="DESTROY_SELF">Hancurkan Diri Sendiri</option>
                      <option value="DESTROY_OTHER">Hancurkan Objek Yang Ditabrak</option>
                      <option value="TOGGLE_VISIBILITY">Sembunyikan / Tampilkan</option>
                      <option value="CHANGE_COLOR">Ubah Warna Sprite</option>
                    </optgroup>
                    <optgroup label="Variabel & State Game">
                      <option value="SET_VARIABLE">Set Nilai Variabel</option>
                      <option value="ADD_VARIABLE">Tambah Nilai Variabel (+)</option>
                      <option value="TOGGLE_VARIABLE">Toggle Boolean (True/False)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Parameter Settings for Variables */}
              {(rule.action === 'SET_VARIABLE' || rule.action === 'ADD_VARIABLE' || rule.action === 'TOGGLE_VARIABLE') && (
                <div className="space-y-2 bg-slate-900/80 p-2.5 rounded-xl border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-purple-300 font-semibold flex items-center gap-1">
                      <Variable className="w-3.5 h-3.5 text-purple-400" /> Target Variabel Game:
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={rule.varName || (projectVariables[0]?.name || 'coinsCount')}
                      onChange={(e) => handleUpdateRule(idx, { ...rule, varName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-purple-300"
                    >
                      {projectVariables.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name} ({v.type})
                        </option>
                      ))}
                    </select>

                    {rule.action !== 'TOGGLE_VARIABLE' && (
                      <input
                        type="text"
                        placeholder="Nilai Operan (e.g. 10 atau true)"
                        value={rule.varValue !== undefined ? String(rule.varValue) : String(rule.paramNumber || 1)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = Number(val);
                          handleUpdateRule(idx, {
                            ...rule,
                            varValue: !isNaN(num) && val.trim() !== '' ? num : val,
                            paramNumber: !isNaN(num) ? num : undefined,
                          });
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Optional Variable Condition Guard (e.g. IF coinsCount >= 10) */}
              <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Filter className="w-3 h-3 text-amber-400" /> Syarat Variabel (Opsional IF):
                  </span>
                  {rule.varName && rule.varOperator && (
                    <button
                      onClick={() => handleUpdateRule(idx, { ...rule, varOperator: undefined })}
                      className="text-[9px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Hapus Syarat
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <select
                    value={rule.varName || ''}
                    onChange={(e) =>
                      handleUpdateRule(idx, {
                        ...rule,
                        varName: e.target.value || undefined,
                        varOperator: e.target.value ? (rule.varOperator || '>=') : undefined,
                      })
                    }
                    className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[10px] font-mono text-purple-300"
                  >
                    <option value="">-- Tanpa Syarat --</option>
                    {projectVariables.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rule.varOperator || '>='}
                    disabled={!rule.varName}
                    onChange={(e) =>
                      handleUpdateRule(idx, {
                        ...rule,
                        varOperator: e.target.value as any,
                      })
                    }
                    className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-amber-300 disabled:opacity-50"
                  >
                    <option value="==">Sama Dengan (==)</option>
                    <option value="!=" font-mono>Beda (!=)</option>
                    <option value=">">Lebih Dari (&gt;)</option>
                    <option value="<">Kurang Dari (&lt;)</option>
                    <option value=">=">Lebih Sama (&gt;=)</option>
                    <option value="<=">Kurang Sama (&lt;=)</option>
                  </select>

                  <input
                    type="text"
                    disabled={!rule.varName}
                    placeholder="Nilai Target"
                    value={rule.varValue !== undefined ? String(rule.varValue) : '0'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = Number(val);
                      handleUpdateRule(idx, {
                        ...rule,
                        varValue: !isNaN(num) && val.trim() !== '' ? num : val,
                      });
                    }}
                    className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[10px] font-mono text-emerald-300 disabled:opacity-50"
                  />
                </div>
              </div>
              {rule.action === 'JUMP' && (
                <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-300">Kekuatan Lompat (Piksel)</span>
                  <input
                    type="number"
                    value={rule.paramNumber || -400}
                    onChange={(e) =>
                      handleUpdateRule(idx, { ...rule, paramNumber: parseFloat(e.target.value) || -400 })
                    }
                    className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-cyan-400 text-right"
                  />
                </div>
              )}

              {rule.action === 'ADD_SCORE' && (
                <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-300">Poin Ditambahkan</span>
                  <input
                    type="number"
                    value={rule.paramNumber || 10}
                    onChange={(e) =>
                      handleUpdateRule(idx, { ...rule, paramNumber: parseFloat(e.target.value) || 10 })
                    }
                    className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-emerald-400 text-right"
                  />
                </div>
              )}

              {rule.action === 'PLAY_SOUND' && (
                <div className="space-y-1 bg-slate-900/60 p-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-300 font-semibold flex items-center gap-1">
                      <Volume2 className="w-3 h-3 text-cyan-400" /> Suara / Musik Ditembak:
                    </span>
                    <button
                      onClick={() => soundEngine.play(rule.paramString || 'jump', audioAssets)}
                      className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-[10px] hover:bg-cyan-500/40 flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" /> tes
                    </button>
                  </div>
                  <select
                    value={rule.paramString || 'jump'}
                    onChange={(e) => handleUpdateRule(idx, { ...rule, paramString: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <optgroup label="Aset Audio Proyek">
                      {audioAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          🎵 {asset.name} ({asset.type.toUpperCase()})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Preset Synthesizer 8-Bit">
                      <option value="jump">Lompat (Jump)</option>
                      <option value="coin">Koin (Coin)</option>
                      <option value="hit">Tabrakan (Hit)</option>
                      <option value="laser">Laser (Shoot)</option>
                      <option value="explosion">Ledakan (Explode)</option>
                      <option value="powerup">Powerup (Bonus)</option>
                      <option value="win">Menang (Victory)</option>
                      <option value="bounce">Langkah / Pantul</option>
                    </optgroup>
                  </select>
                </div>
              )}
            </div>
          ))
        )}

        {rules.length > 0 && (
          <button
            onClick={handleAddRule}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Aturan Logika Lain</span>
          </button>
        )}
      </div>
    </div>
  );
};
