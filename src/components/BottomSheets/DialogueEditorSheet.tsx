import React, { useState } from 'react';
import {
  DialogueTree,
  DialogueNode,
  DialogueOption,
  DialogueMode,
  DialogueMood,
  ActionType,
} from '../../types/engine';
import {
  MessageSquare,
  Play,
  Plus,
  Trash2,
  X,
  Sparkles,
  Layers,
  Variable,
  Sliders,
  Copy,
  RefreshCw,
  Film,
  Cloud,
  Terminal,
  Check,
} from 'lucide-react';
import { DialogueEngine } from '../../engine/DialogueEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';

interface DialogueEditorSheetProps {
  dialogues?: DialogueTree[];
  onUpdateDialogues: (updatedDialogues: DialogueTree[]) => void;
  onTestDialogue: (tree: DialogueTree) => void;
  onClose: () => void;
}

export const DialogueEditorSheet: React.FC<DialogueEditorSheetProps> = ({
  dialogues = [],
  onUpdateDialogues,
  onTestDialogue,
  onClose,
}) => {
  // Ensure we have trees
  const initialTrees = dialogues.length > 0 ? dialogues : [DialogueEngine.getPresetDialogueTree()];
  const [trees, setTrees] = useState<DialogueTree[]>(initialTrees);
  const [selectedTreeId, setSelectedTreeId] = useState<string>(initialTrees[0].id);

  const activeTree = trees.find((t) => t.id === selectedTreeId) || trees[0];
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    activeTree?.initialNodeId || Object.keys(activeTree?.nodes || {})[0] || ''
  );

  const [activeTab, setActiveTab] = useState<'nodes' | 'variables' | 'simulator'>('nodes');

  // Simulator Local Testing State
  const [simEngine] = useState(() => new DialogueEngine());
  const [simIsRunning, setSimIsRunning] = useState(false);

  const activeNode =
    activeTree?.nodes[selectedNodeId] ||
    (Object.values(activeTree?.nodes || {})[0] as DialogueNode | undefined);

  // Sync back changes to parent app state
  const saveTrees = (updatedList: DialogueTree[]) => {
    setTrees(updatedList);
    onUpdateDialogues(updatedList);
  };

  const handleUpdateTree = (updatedTree: DialogueTree) => {
    const updatedList = trees.map((t) => (t.id === updatedTree.id ? updatedTree : t));
    saveTrees(updatedList);
  };

  const handleNodeUpdate = (updatedNode: DialogueNode) => {
    if (!activeTree) return;
    const updatedTree = {
      ...activeTree,
      nodes: {
        ...activeTree.nodes,
        [updatedNode.id]: updatedNode,
      },
    };
    handleUpdateTree(updatedTree);
  };

  const handleAddTree = () => {
    const newId = `dt_tree_${Date.now()}`;
    const newTree: DialogueTree = {
      id: newId,
      title: `Dialog / Monolog Baru #${trees.length + 1}`,
      initialNodeId: 'node_start',
      variables: {
        player_name: 'Satria Hero',
        gold: 100,
        score: 0,
      },
      nodes: {
        node_start: {
          id: 'node_start',
          speakerName: 'NPC / Hero',
          portraitPreset: 'hero',
          mode: 'dialogue_box',
          mood: 'happy',
          text: 'Halo! Selamat datang di cerita interaktif dinamis ini.',
          options: [],
        },
      },
    };

    const updatedList = [...trees, newTree];
    saveTrees(updatedList);
    setSelectedTreeId(newId);
    setSelectedNodeId('node_start');
    AndroidEngine.triggerHaptic(15);
  };

  const handleDuplicateTree = () => {
    if (!activeTree) return;
    const dupId = `dt_tree_${Date.now()}`;
    const dupTree: DialogueTree = {
      ...JSON.parse(JSON.stringify(activeTree)),
      id: dupId,
      title: `${activeTree.title} (Salinan)`,
    };

    const updatedList = [...trees, dupTree];
    saveTrees(updatedList);
    setSelectedTreeId(dupId);
    AndroidEngine.triggerHaptic(12);
  };

  const handleDeleteTree = (idToDelete: string) => {
    if (trees.length <= 1) return;
    const updatedList = trees.filter((t) => t.id !== idToDelete);
    saveTrees(updatedList);
    setSelectedTreeId(updatedList[0].id);
    setSelectedNodeId(updatedList[0].initialNodeId);
    AndroidEngine.triggerHaptic(20);
  };

  const handleAddNode = (mode: DialogueMode = 'dialogue_box') => {
    if (!activeTree) return;
    const newNodeId = `node_${Date.now()}`;
    const newNode: DialogueNode = {
      id: newNodeId,
      speakerName: mode === 'monologue_thought' ? 'Pikiran Hero' : 'Pembicara NPC',
      portraitPreset: mode === 'monologue_thought' ? 'hero' : 'wizard',
      mode,
      mood: 'neutral',
      text:
        mode === 'monologue_thought'
          ? 'Aku harus mempertimbangkan langkah selanjutnya...'
          : mode === 'cinematic_banner'
          ? 'Di sebuah negeri jauh, kegelapan mulai membangkang...'
          : 'Halo! Ada yang bisa kubantu?',
      typewriterFps: 28,
      beepSound: mode === 'monologue_thought' ? 'synth' : 'coin',
      options: [],
    };

    const updatedTree = {
      ...activeTree,
      nodes: {
        ...activeTree.nodes,
        [newNodeId]: newNode,
      },
    };

    handleUpdateTree(updatedTree);
    setSelectedNodeId(newNodeId);
    AndroidEngine.triggerHaptic(15);
  };

  const handleDeleteNode = (nodeIdToDelete: string) => {
    if (!activeTree || Object.keys(activeTree.nodes).length <= 1) return;

    const updatedNodes = { ...activeTree.nodes };
    delete updatedNodes[nodeIdToDelete];

    let newInitial = activeTree.initialNodeId;
    if (newInitial === nodeIdToDelete) {
      newInitial = Object.keys(updatedNodes)[0];
    }

    const updatedTree = {
      ...activeTree,
      initialNodeId: newInitial,
      nodes: updatedNodes,
    };

    handleUpdateTree(updatedTree);
    setSelectedNodeId(newInitial);
    AndroidEngine.triggerHaptic(20);
  };

  const handleAddOption = () => {
    if (!activeNode) return;
    const newOpt: DialogueOption = {
      id: `opt_${Date.now()}`,
      text: 'Pilihan Jawaban Baru',
      action: 'ADD_SCORE',
      actionParam: '10',
    };

    const updatedNode = {
      ...activeNode,
      options: [...(activeNode.options || []), newOpt],
    };

    handleNodeUpdate(updatedNode);
  };

  const portraitPresetsList: { name: string; key: DialogueNode['portraitPreset']; icon: string }[] = [
    { name: 'Ksatria Hero', key: 'hero', icon: '⚔️' },
    { name: 'Penyihir', key: 'wizard', icon: '🧙‍♂️' },
    { name: 'Cyborg', key: 'cyborg', icon: '🤖' },
    { name: 'Raja', key: 'king', icon: '👑' },
    { name: 'Penjahat', key: 'villain', icon: '🦹‍♂️' },
    { name: 'Robot', key: 'robot', icon: '🦾' },
    { name: 'Hantu', key: 'ghost', icon: '👻' },
    { name: 'Pemandu', key: 'guide', icon: '🧚' },
  ];

  const moodPresetsList: { name: string; key: DialogueMood; emoji: string }[] = [
    { name: 'Netral', key: 'neutral', emoji: '😐' },
    { name: 'Senang', key: 'happy', emoji: '😊' },
    { name: 'Marah', key: 'angry', emoji: '😡' },
    { name: 'Terkejut', key: 'surprised', emoji: '😲' },
    { name: 'Sedih', key: 'sad', emoji: '😢' },
    { name: 'Misterius', key: 'mysterious', emoji: '🔮' },
  ];

  const modePresetsList: { name: string; key: DialogueMode; icon: React.ReactNode; desc: string }[] = [
    { name: 'Box Dialog RPG', key: 'dialogue_box', icon: <MessageSquare className="w-3.5 h-3.5" />, desc: 'Kotak dialog klasik bawah layar + avatar' },
    { name: 'Monolog Batin', key: 'monologue_thought', icon: <Cloud className="w-3.5 h-3.5" />, desc: 'Awan pikiran batin karakter' },
    { name: 'Banner Sinematik', key: 'cinematic_banner', icon: <Film className="w-3.5 h-3.5" />, desc: 'Letterbox hitam atas-bawah narasi' },
  ];

  const insertVariableTag = (tagName: string) => {
    if (!activeNode) return;
    const tag = `{${tagName}}`;
    handleNodeUpdate({
      ...activeNode,
      text: activeNode.text + ' ' + tag,
    });
  };

  // Start Simulation
  const startSimulation = () => {
    if (!activeTree) return;
    simEngine.startDialogue(activeTree);
    setSimIsRunning(true);
  };

  return (
    <div className="flex flex-col h-full text-white bg-slate-900 border-t border-slate-800 font-sans">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="font-bold text-sm leading-tight">Engine Story & Dialog Interaktif</h3>
            <p className="text-[10px] text-slate-400">Teknikal Dialog, Monolog, Dynamic Tags & Branching Story Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Action Test Dialogue in Game */}
          <button
            onClick={() => onTestDialogue(activeTree)}
            className="bg-sky-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow hover:bg-sky-400 active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Uji di Canvas Game</span>
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tree Selector Bar & Sub-Tabs */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        {/* Tree Selector Dropdown */}
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <select
            value={selectedTreeId}
            onChange={(e) => {
              setSelectedTreeId(e.target.value);
              const t = trees.find((x) => x.id === e.target.value);
              if (t) setSelectedNodeId(t.initialNodeId);
            }}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 font-semibold text-sky-300 focus:outline-none"
          >
            {trees.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({Object.keys(t.nodes || {}).length} node)
              </option>
            ))}
          </select>

          <button
            onClick={handleAddTree}
            title="Buat Cerita Baru"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDuplicateTree}
            title="Salin Cerita"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {trees.length > 1 && (
            <button
              onClick={() => handleDeleteTree(selectedTreeId)}
              title="Hapus Cerita"
              className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Editor View Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('nodes')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
              activeTab === 'nodes' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Editor Node</span>
          </button>
          <button
            onClick={() => setActiveTab('variables')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
              activeTab === 'variables' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Variable className="w-3.5 h-3.5" />
            <span>Variabel Cerita</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('simulator');
              startSimulation();
            }}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
              activeTab === 'simulator' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Simulator Tes</span>
          </button>
        </div>
      </div>

      {/* Main Tab View Content */}
      <div className="flex-1 overflow-hidden">
        {/* TAB 1: NODES EDITOR */}
        {activeTab === 'nodes' && (
          <div className="flex h-full overflow-hidden">
            {/* Left Column: Nodes Navigation List */}
            <div className="w-1/3 bg-slate-950 border-r border-slate-800 p-2.5 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Node Percakapan ({Object.keys(activeTree.nodes).length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAddNode('dialogue_box')}
                    title="Tambah Box Dialog"
                    className="p-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Node Types Quick Creators */}
              <div className="grid grid-cols-3 gap-1 py-1">
                <button
                  onClick={() => handleAddNode('dialogue_box')}
                  className="p-1 bg-slate-900 border border-slate-800 rounded hover:border-sky-500 text-[10px] flex flex-col items-center gap-0.5 text-sky-300 cursor-pointer"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Dialog</span>
                </button>
                <button
                  onClick={() => handleAddNode('monologue_thought')}
                  className="p-1 bg-slate-900 border border-slate-800 rounded hover:border-indigo-500 text-[10px] flex flex-col items-center gap-0.5 text-indigo-300 cursor-pointer"
                >
                  <Cloud className="w-3 h-3" />
                  <span>Monolog</span>
                </button>
                <button
                  onClick={() => handleAddNode('cinematic_banner')}
                  className="p-1 bg-slate-900 border border-slate-800 rounded hover:border-amber-500 text-[10px] flex flex-col items-center gap-0.5 text-amber-300 cursor-pointer"
                >
                  <Film className="w-3 h-3" />
                  <span>Sinematik</span>
                </button>
              </div>

              {/* Nodes List */}
              <div className="space-y-1.5 pt-1">
                {(Object.values(activeTree.nodes) as DialogueNode[]).map((node) => {
                  const isInitial = activeTree.initialNodeId === node.id;
                  const mode = node.mode || 'dialogue_box';
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`group relative text-left p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        node.id === selectedNodeId
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[11px] truncate flex items-center gap-1.5">
                          {mode === 'monologue_thought' && '💭'}
                          {mode === 'cinematic_banner' && '🎬'}
                          {mode === 'dialogue_box' && '💬'}
                          {node.speakerName}
                        </span>
                        <div className="flex items-center gap-1">
                          {isInitial && (
                            <span className="px-1 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] rounded font-mono">
                              START
                            </span>
                          )}
                          {Object.keys(activeTree.nodes).length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNode(node.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-300 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5 italic">
                        "{node.text}"
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Detailed Node Inspector */}
            {activeNode ? (
              <div className="flex-1 p-3.5 overflow-y-auto space-y-4 text-xs">
                {/* Node Top Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      ID: {activeNode.id}
                    </span>
                    {activeTree.initialNodeId !== activeNode.id && (
                      <button
                        onClick={() => handleUpdateTree({ ...activeTree, initialNodeId: activeNode.id })}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" /> Set Sebagai Node Awal
                      </button>
                    )}
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">
                    Mode Tampilan Dialog / Monolog
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {modePresetsList.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => handleNodeUpdate({ ...activeNode, mode: m.key })}
                        className={`p-2 rounded-lg border text-left flex flex-col gap-1 cursor-pointer ${
                          (activeNode.mode || 'dialogue_box') === m.key
                            ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          {m.icon}
                          <span>{m.name}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-normal leading-tight">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speaker Name & Mood Expression */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Nama Pembicara</label>
                    <input
                      type="text"
                      value={activeNode.speakerName}
                      onChange={(e) => handleNodeUpdate({ ...activeNode, speakerName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-sky-400 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Ekspresi Mood</label>
                    <select
                      value={activeNode.mood || 'neutral'}
                      onChange={(e) => handleNodeUpdate({ ...activeNode, mood: e.target.value as DialogueMood })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-sky-400 outline-none cursor-pointer"
                    >
                      {moodPresetsList.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.emoji} {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Avatar Portrait Preset Selection */}
                {activeNode.mode !== 'cinematic_banner' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Avatar / Portrait Preset</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {portraitPresetsList.map((p) => (
                        <button
                          key={p.key}
                          onClick={() => handleNodeUpdate({ ...activeNode, portraitPreset: p.key })}
                          className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                            activeNode.portraitPreset === p.key
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-base">{p.icon}</span>
                          <span className="text-[9px] truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Dialogue Text Content & Helper Chips */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">
                      Teks Cerita / Dialog
                    </label>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span>Insert Dynamic Tag:</span>
                      <button
                        onClick={() => insertVariableTag('player_name')}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded font-mono"
                      >
                        &#123;player_name&#125;
                      </button>
                      <button
                        onClick={() => insertVariableTag('gold')}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-mono"
                      >
                        &#123;gold&#125;
                      </button>
                      <button
                        onClick={() => insertVariableTag('score')}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded font-mono"
                      >
                        &#123;score&#125;
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={activeNode.text}
                    onChange={(e) => handleNodeUpdate({ ...activeNode, text: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-sky-400 outline-none font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* Typewriter Speed & Sound Controls */}
                <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold">Kecepatan Typewriter (FPS)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={10}
                        max={60}
                        value={activeNode.typewriterFps || 28}
                        onChange={(e) =>
                          handleNodeUpdate({ ...activeNode, typewriterFps: Number(e.target.value) })
                        }
                        className="flex-1 accent-sky-400 cursor-pointer"
                      />
                      <span className="font-mono text-xs font-bold text-sky-300">
                        {activeNode.typewriterFps || 28} fps
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold">Suara Beep Ketikan</label>
                    <select
                      value={activeNode.beepSound || 'synth'}
                      onChange={(e) => handleNodeUpdate({ ...activeNode, beepSound: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs outline-none cursor-pointer"
                    >
                      <option value="synth">Synth High Beep</option>
                      <option value="coin">Retro Coin Beep</option>
                      <option value="laser">Futuristic Laser</option>
                      <option value="hit">Soft Pulse</option>
                    </select>
                  </div>
                </div>

                {/* Linked Next Node (If no options) */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">
                    Node Lanjutan Otomatis (Jika Tanpa Pilihan)
                  </label>
                  <select
                    value={activeNode.nextDialogueId || ''}
                    onChange={(e) =>
                      handleNodeUpdate({ ...activeNode, nextDialogueId: e.target.value || undefined })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sky-300 font-semibold focus:border-sky-400 outline-none cursor-pointer"
                  >
                    <option value="">-- Selesai Dialog (Tutup Box) --</option>
                    {(Object.values(activeTree.nodes) as DialogueNode[])
                      .filter((n) => n.id !== activeNode.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          Lanjut ke: {n.speakerName} ({n.id})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Branching Choice Options */}
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-sky-400">Pilihan Cabang Jawaban</span>
                      <p className="text-[10px] text-slate-400">
                        Memungkinkan pemain memilih percakapan dan memicu aksi/skor
                      </p>
                    </div>
                    <button
                      onClick={handleAddOption}
                      className="bg-sky-500/20 text-sky-300 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-sky-500/30"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Pilihan
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(activeNode.options || []).map((opt, idx) => (
                      <div
                        key={opt.id}
                        className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">{idx + 1}.</span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const newOpts = [...(activeNode.options || [])];
                              newOpts[idx].text = e.target.value;
                              handleNodeUpdate({ ...activeNode, options: newOpts });
                            }}
                            placeholder="Teks Pilihan..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs outline-none"
                          />
                          <button
                            onClick={() => {
                              const newOpts = (activeNode.options || []).filter((_, i) => i !== idx);
                              handleNodeUpdate({ ...activeNode, options: newOpts });
                            }}
                            className="text-red-400 p-1.5 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Linked Node Target for Option */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-400">Lanjut ke Node:</span>
                            <select
                              value={opt.nextDialogueId || ''}
                              onChange={(e) => {
                                const newOpts = [...(activeNode.options || [])];
                                newOpts[idx].nextDialogueId = e.target.value || undefined;
                                handleNodeUpdate({ ...activeNode, options: newOpts });
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-sky-300 outline-none"
                            >
                              <option value="">-- Selesai Dialog --</option>
                              {(Object.values(activeTree.nodes) as DialogueNode[]).map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.speakerName} ({n.id})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-400">Aksi Game (Reward/Sound):</span>
                            <div className="flex items-center gap-1">
                              <select
                                value={opt.action || 'ADD_SCORE'}
                                onChange={(e) => {
                                  const newOpts = [...(activeNode.options || [])];
                                  newOpts[idx].action = e.target.value as ActionType;
                                  handleNodeUpdate({ ...activeNode, options: newOpts });
                                }}
                                className="w-1/2 bg-slate-900 border border-slate-700 rounded p-1 text-amber-300 outline-none"
                              >
                                <option value="ADD_SCORE">Tambah Skor</option>
                                <option value="PLAY_SOUND">Putar Suara</option>
                                <option value="RESTART_LEVEL">Restart Level</option>
                                <option value="NEXT_SCENE">Ke Level Berikutnya</option>
                              </select>
                              <input
                                type="text"
                                value={opt.actionParam || '10'}
                                onChange={(e) => {
                                  const newOpts = [...(activeNode.options || [])];
                                  newOpts[idx].actionParam = e.target.value;
                                  handleNodeUpdate({ ...activeNode, options: newOpts });
                                }}
                                className="w-1/2 bg-slate-900 border border-slate-700 rounded p-1 text-white outline-none"
                                placeholder="Param..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Pilih atau buat node untuk mulai mengedit
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STORY VARIABLES */}
        {activeTab === 'variables' && (
          <div className="p-4 h-full overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-sm text-sky-400">Pengelola Variabel Cerita & Story Flags</h4>
                <p className="text-xs text-slate-400">
                  Variabel ini digunakan untuk melacak koin, status quest, nama pemain, atau flag keputusan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(activeTree.variables || {}).map(([key, value]) => (
                <div key={key} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">&#123;{key}&#125;</span>
                    <span className="text-[10px] text-slate-500 uppercase">{typeof value}</span>
                  </div>
                  <input
                    type="text"
                    value={String(value)}
                    onChange={(e) => {
                      const updatedVars = {
                        ...(activeTree.variables || {}),
                        [key]: e.target.value,
                      };
                      handleUpdateTree({ ...activeTree, variables: updatedVars });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs outline-none font-mono"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LIVE SIMULATOR / TESTER */}
        {activeTab === 'simulator' && (
          <div className="p-4 h-full flex flex-col items-center justify-center bg-slate-950 space-y-4">
            <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" /> Simulator Pratinjau Cerita
                </span>
                <button
                  onClick={startSimulation}
                  className="px-2.5 py-1 bg-sky-500 text-slate-950 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Restart Tes
                </button>
              </div>

              {/* Simulated Interactive Text Display Area */}
              <div
                onClick={() => {
                  simEngine.handleInteraction();
                  setSimIsRunning(!simIsRunning);
                }}
                className="min-h-[160px] bg-slate-950 rounded-lg border border-slate-800 p-4 relative cursor-pointer hover:border-sky-500 transition-all flex flex-col justify-between"
              >
                {simEngine.getCurrentNode() ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                      <span>{simEngine.getCurrentNode()?.speakerName}</span>
                      <span className="text-[10px] text-slate-500 uppercase">
                        Mode: {simEngine.getCurrentNode()?.mode || 'dialogue_box'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-mono leading-relaxed">
                      {simEngine.substituteVariables(simEngine.getCurrentNode()?.text || '')}
                    </p>

                    {/* Options list inside simulator */}
                    {(simEngine.getCurrentNode()?.options || []).length > 0 && (
                      <div className="pt-2 space-y-1">
                        {simEngine.getCurrentNode()?.options?.map((opt, i) => (
                          <button
                            key={opt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              simEngine.selectOption(i);
                              setSimIsRunning(!simIsRunning);
                            }}
                            className="w-full text-left p-2 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 rounded text-xs font-bold cursor-pointer transition-all"
                          >
                            {i + 1}. {opt.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 text-xs my-auto">
                    Percakapan Selesai. Klik "Restart Tes" untuk mengulang.
                  </div>
                )}

                <div className="text-[10px] text-sky-400 text-right mt-2 font-mono">
                  [Klik di mana saja untuk melanjutkan text typewriter]
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
