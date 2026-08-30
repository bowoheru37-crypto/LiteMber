import React, { useState } from 'react';
import { GameProject, GameVariable, GameVariableType, GameVariableScope, Entity } from '../../types/engine';
import { VariableManager } from '../../engine/VariableManager';
import {
  Variable,
  Plus,
  Trash2,
  X,
  Search,
  RotateCcw,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Hash,
  Type as TypeIcon,
  Globe,
  Box,
  Copy,
  Check,
  Edit2,
  Info,
} from 'lucide-react';

interface GameVariablesSheetProps {
  project: GameProject;
  entities?: Entity[];
  selectedEntity?: Entity | null;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

export const GameVariablesSheet: React.FC<GameVariablesSheetProps> = ({
  project,
  entities = [],
  selectedEntity = null,
  onUpdateProject,
  onClose,
}) => {
  const variables = VariableManager.ensureProjectVariables(project);

  const [activeTab, setActiveTab] = useState<'all' | 'global' | 'local'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedVarName, setCopiedVarName] = useState<string | null>(null);

  // Form State for creating/editing variable
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVarId, setEditingVarId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<GameVariableType>('number');
  const [formScope, setFormScope] = useState<GameVariableScope>('global');
  const [formDefaultValue, setFormDefaultValue] = useState<string | number | boolean>(0);
  const [formDescription, setFormDescription] = useState('');
  const [formEntityId, setFormEntityId] = useState<string>(selectedEntity?.id || (entities[0]?.id || ''));

  const filteredVariables = variables.filter((v) => {
    if (activeTab === 'global' && v.scope !== 'global') return false;
    if (activeTab === 'local' && v.scope !== 'local') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return v.name.toLowerCase().includes(q) || (v.description && v.description.toLowerCase().includes(q));
    }
    return true;
  });

  const handleOpenNewForm = () => {
    setEditingVarId(null);
    setFormName('');
    setFormType('number');
    setFormScope('global');
    setFormDefaultValue(0);
    setFormDescription('');
    setFormEntityId(selectedEntity?.id || (entities[0]?.id || ''));
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (v: GameVariable) => {
    setEditingVarId(v.id);
    setFormName(v.name);
    setFormType(v.type);
    setFormScope(v.scope);
    setFormDefaultValue(v.defaultValue);
    setFormDescription(v.description || '');
    setFormEntityId(v.entityId || (selectedEntity?.id || (entities[0]?.id || '')));
    setIsFormOpen(true);
  };

  const handleSaveVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let finalDefVal: string | number | boolean = formDefaultValue;
    if (formType === 'number') finalDefVal = Number(formDefaultValue) || 0;
    if (formType === 'boolean') finalDefVal = Boolean(formDefaultValue);
    if (formType === 'string') finalDefVal = String(formDefaultValue);

    let updatedVariables = [...variables];

    if (editingVarId) {
      // Edit existing
      updatedVariables = updatedVariables.map((v) => {
        if (v.id === editingVarId) {
          return {
            ...v,
            name: formName.trim().replace(/\s+/g, '_'),
            type: formType,
            scope: formScope,
            defaultValue: finalDefVal,
            value: finalDefVal,
            description: formDescription,
            entityId: formScope === 'local' ? formEntityId : undefined,
          };
        }
        return v;
      });
    } else {
      // Create new
      const newVar = VariableManager.createVariable(
        formName,
        formType,
        formScope,
        finalDefVal,
        formDescription,
        formEntityId
      );
      updatedVariables.push(newVar);
    }

    onUpdateProject({
      ...project,
      variables: updatedVariables,
    });

    setIsFormOpen(false);
  };

  const handleDeleteVariable = (id: string) => {
    const updatedVariables = variables.filter((v) => v.id !== id);
    onUpdateProject({
      ...project,
      variables: updatedVariables,
    });
  };

  const handleToggleValue = (v: GameVariable) => {
    if (v.type === 'boolean') {
      const updatedVariables = VariableManager.setVariableValue(variables, v.id, !v.value);
      onUpdateProject({
        ...project,
        variables: updatedVariables,
      });
    }
  };

  const handleChangeNumericValue = (v: GameVariable, delta: number) => {
    if (v.type === 'number') {
      const curNum = Number(v.value) || 0;
      const updatedVariables = VariableManager.setVariableValue(variables, v.id, curNum + delta);
      onUpdateProject({
        ...project,
        variables: updatedVariables,
      });
    }
  };

  const handleResetDefaults = () => {
    const resetVars = VariableManager.resetVariablesToDefaults(variables);
    onUpdateProject({
      ...project,
      variables: resetVars,
    });
  };

  const handleAddPreset = (preset: { name: string; type: GameVariableType; scope: GameVariableScope; def: any; desc: string }) => {
    const exists = variables.some((v) => v.name === preset.name);
    if (exists) return;

    const newVar = VariableManager.createVariable(
      preset.name,
      preset.type,
      preset.scope,
      preset.def,
      preset.desc,
      selectedEntity?.id
    );

    onUpdateProject({
      ...project,
      variables: [...variables, newVar],
    });
  };

  const handleCopyTag = (varName: string) => {
    const tag = `{${varName}}`;
    navigator.clipboard.writeText(tag);
    setCopiedVarName(varName);
    setTimeout(() => setCopiedVarName(null), 1500);
  };

  const presetsList = [
    { name: 'coinsCount', type: 'number' as GameVariableType, scope: 'global' as GameVariableScope, def: 0, desc: 'Jumlah koin yang dikumpulkan' },
    { name: 'playerLives', type: 'number' as GameVariableType, scope: 'global' as GameVariableScope, def: 3, desc: 'Sisa nyawa pemain' },
    { name: 'isDoorUnlocked', type: 'boolean' as GameVariableType, scope: 'global' as GameVariableScope, def: false, desc: 'Status pintu level unlocked' },
    { name: 'playerState', type: 'string' as GameVariableType, scope: 'global' as GameVariableScope, def: 'idle', desc: 'Status mode pergerakan pemain' },
    { name: 'isShieldActive', type: 'boolean' as GameVariableType, scope: 'global' as GameVariableScope, def: false, desc: 'Status perisai pelindung aktif' },
  ];

  return (
    <div className="flex flex-col h-full text-white bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Variable className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              Pengelola Variabel Game
              <span className="text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono px-2 py-0.5 rounded-md">
                {variables.length} VAR
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Ubah nilai angka, boolean & string secara dinamis dari logika game, HUD UI & dialog
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Top Controls & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua ({variables.length})
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'global' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3 h-3" />
              Global
            </button>
            <button
              onClick={() => setActiveTab('local')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'local' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3 h-3" />
              Lokal
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Reset Semua Nilai ke Default"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Reset Default</span>
            </button>
            <button
              onClick={handleOpenNewForm}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/30 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Variabel</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama variabel atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Preset Quick Add Bar */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset Variabel Cepat Tambahkan:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presetsList.map((preset) => {
              const isAdded = variables.some((v) => v.name === preset.name);
              return (
                <button
                  key={preset.name}
                  onClick={() => handleAddPreset(preset)}
                  disabled={isAdded}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border flex items-center gap-1 transition-all cursor-pointer ${
                    isAdded
                      ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-purple-950/40 hover:bg-purple-900/60 border-purple-800/50 text-purple-300'
                  }`}
                >
                  <span>{preset.type === 'number' ? '🔢' : preset.type === 'boolean' ? '🔘' : '🔤'}</span>
                  <span>{preset.name}</span>
                  {isAdded && <Check className="w-3 h-3 text-emerald-400 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Variables List */}
        {filteredVariables.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl p-6 bg-slate-950/40 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Variable className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-300">Tidak ada variabel ditemukan</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery
                  ? 'Coba kata kunci pencarian lain.'
                  : 'Klik tombol "Tambah Variabel" di atas untuk membuat variabel baru.'}
              </p>
            </div>
            <button
              onClick={handleOpenNewForm}
              className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-purple-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Variabel Pertama</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredVariables.map((v) => {
              const entityName = entities.find((e) => e.id === v.entityId)?.name;

              return (
                <div
                  key={v.id}
                  className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5 relative group hover:border-purple-500/50 transition-all shadow-md"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                          v.type === 'number'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : v.type === 'boolean'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {v.type === 'number' ? <Hash className="w-3.5 h-3.5" /> : v.type === 'boolean' ? <ToggleLeft className="w-3.5 h-3.5" /> : <TypeIcon className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-purple-300">{v.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                              v.scope === 'global'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {v.scope === 'global' ? 'Global' : `Lokal (${entityName || 'Entity'})`}
                          </span>
                        </div>
                        {v.description && <p className="text-[10px] text-slate-400 line-clamp-1">{v.description}</p>}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyTag(v.name)}
                        className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title={`Salin Tag HUD: {${v.name}}`}
                      >
                        {copiedVarName === v.name ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleOpenEditForm(v)}
                        className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Edit Variabel"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteVariable(v.id)}
                        className="p-1 rounded-lg bg-slate-800/80 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                        title="Hapus Variabel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Value Interactive Control */}
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
                    <div className="text-[10px] text-slate-400">
                      <span>Default: </span>
                      <span className="font-mono text-slate-200">{String(v.defaultValue)}</span>
                    </div>

                    {v.type === 'number' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleChangeNumericValue(v, -1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-xs text-cyan-400 min-w-[36px] text-center px-1">
                          {String(v.value)}
                        </span>
                        <button
                          onClick={() => handleChangeNumericValue(v, 1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {v.type === 'boolean' && (
                      <button
                        onClick={() => handleToggleValue(v)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          v.value
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {v.value ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-rose-400" />}
                        <span>{v.value ? 'TRUE' : 'FALSE'}</span>
                      </button>
                    )}

                    {v.type === 'string' && (
                      <div className="font-mono font-bold text-xs text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        "{String(v.value)}"
                      </div>
                    )}
                  </div>

                  {/* Usage Tip Tag */}
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/40">
                    <Info className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>
                      Tag Teks HUD: <code className="text-purple-300 font-mono font-bold bg-slate-950 px-1 rounded">{`{${v.name}}`}</code>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal for Creating/Editing Variable */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm flex items-center gap-2 text-white">
                <Variable className="w-4 h-4 text-purple-400" />
                <span>{editingVarId ? 'Edit Variabel Game' : 'Tambah Variabel Baru'}</span>
              </h4>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVariable} className="space-y-3 text-xs">
              {/* Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Variabel (Identifier)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. coinsCount, isDoorUnlocked"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Type & Scope Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipe Data</label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      const newType = e.target.value as GameVariableType;
                      setFormType(newType);
                      if (newType === 'number') setFormDefaultValue(0);
                      if (newType === 'boolean') setFormDefaultValue(false);
                      if (newType === 'string') setFormDefaultValue('');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="number">🔢 Angka (Number)</option>
                    <option value="boolean">🔘 True / False (Boolean)</option>
                    <option value="string">🔤 Teks (String)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cakupan (Scope)</label>
                  <select
                    value={formScope}
                    onChange={(e) => setFormScope(e.target.value as GameVariableScope)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="global">🌐 Global (Seluruh Game)</option>
                    <option value="local">📦 Lokal Objek (Entity)</option>
                  </select>
                </div>
              </div>

              {/* Entity Selector if Scope is Local */}
              {formScope === 'local' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Objek Pemilik Variabel Lokal</label>
                  <select
                    value={formEntityId}
                    onChange={(e) => setFormEntityId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    {entities.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Default Value Input */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nilai Awal / Default</label>
                {formType === 'number' && (
                  <input
                    type="number"
                    value={Number(formDefaultValue) || 0}
                    onChange={(e) => setFormDefaultValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                )}
                {formType === 'boolean' && (
                  <button
                    type="button"
                    onClick={() => setFormDefaultValue(!formDefaultValue)}
                    className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      formDefaultValue
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                    }`}
                  >
                    {formDefaultValue ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-rose-400" />}
                    <span>{formDefaultValue ? 'TRUE (AKTIFF)' : 'FALSE (NONAKTIF)'}</span>
                  </button>
                )}
                {formType === 'string' && (
                  <input
                    type="text"
                    value={String(formDefaultValue)}
                    onChange={(e) => setFormDefaultValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Keterangan Singkat</label>
                <input
                  type="text"
                  placeholder="e.g. Digunakan untuk syarat membuka gerbang boss"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/30 transition-all cursor-pointer active:scale-95"
                >
                  Simpan Variabel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
