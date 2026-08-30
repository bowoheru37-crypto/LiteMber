import React, { useState, useRef } from 'react';
import { Entity, EntityGroup, GameProject } from '../../types/engine';
import {
  Layers,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  X,
  Sparkles,
  ArrowUpDown,
  Search,
  CheckSquare,
  Square,
  LayoutGrid,
  List,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Box,
  Edit2,
  CheckCircle2,
  Move,
  ArrowRight,
  ChevronRight,
  Palette,
} from 'lucide-react';
import { AndroidEngine } from '../../engine/AndroidEngine';

interface LayerOrderingSheetProps {
  entities: Entity[];
  groups?: EntityGroup[];
  selectedEntityId: string | null;
  selectedEntityIds?: string[];
  project?: GameProject;
  onSelectEntity: (id: string, isMultiToggle?: boolean) => void;
  onSelectAllEntities?: () => void;
  onClearSelection?: () => void;
  onUpdateEntity: (entity: Entity) => void;
  onUpdateEntities?: (entities: Entity[]) => void;
  onUpdateGroups?: (groups: EntityGroup[]) => void;
  onUpdateProject?: (project: GameProject) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicateEntity?: (id: string) => void;
  onDeleteEntity?: (id: string) => void;
  onOpenSavePrefab?: () => void;
  onClose: () => void;
}

export type LayerTier = 'ui' | 'foreground' | 'gameplay' | 'default' | 'background';

const PRESET_FOLDER_COLORS = [
  '#38bdf8', // Cyan
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#6366f1', // Indigo
  '#64748b', // Slate
];

export const LayerOrderingSheet: React.FC<LayerOrderingSheetProps> = ({
  entities,
  groups = [],
  selectedEntityId,
  selectedEntityIds = [],
  project,
  onSelectEntity,
  onSelectAllEntities,
  onClearSelection,
  onUpdateEntity,
  onUpdateEntities,
  onUpdateGroups,
  onUpdateProject,
  onToggleVisibility,
  onToggleLock,
  onDuplicateEntity,
  onDeleteEntity,
  onOpenSavePrefab,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'stack' | 'folders' | 'tiers'>('folders');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Drag and Drop State
  const [draggedEntityId, setDraggedEntityId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // New Folder Dialog State
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [folderNameInput, setFolderNameInput] = useState<string>('');
  const [folderColorInput, setFolderColorInput] = useState<string>(PRESET_FOLDER_COLORS[0]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Folder Collapsed State (Local override)
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Record<string, boolean>>({});

  // Sorted entities descending by Z-Index (topmost rendered layer at the top of list)
  const sortedEntities = [...entities].sort(
    (a, b) => (b.transform.zIndex || 0) - (a.transform.zIndex || 0)
  );

  const filteredEntities = sortedEntities.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTierForZIndex = (z: number): { label: string; tier: LayerTier; color: string; badgeBg: string } => {
    if (z >= 100) return { label: 'UI / Overlay', tier: 'ui', color: 'text-purple-400', badgeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300' };
    if (z >= 20) return { label: 'Foreground / FX', tier: 'foreground', color: 'text-amber-400', badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300' };
    if (z >= 1) return { label: 'Gameplay / Aktor', tier: 'gameplay', color: 'text-cyan-400', badgeBg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' };
    if (z === 0) return { label: 'Default / Ground', tier: 'default', color: 'text-emerald-400', badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' };
    return { label: 'Background', tier: 'background', color: 'text-slate-400', badgeBg: 'bg-slate-700/60 border-slate-600 text-slate-300' };
  };

  // --- FOLDER / GROUP MANAGEMENT FUNCTIONS ---
  const handleCreateGroup = () => {
    if (!folderNameInput.trim()) return;

    const newGroup: EntityGroup = {
      id: editingGroupId || `group_${Date.now()}`,
      name: folderNameInput.trim(),
      color: folderColorInput,
      collapsed: false,
      visible: true,
      locked: false,
    };

    let updatedGroups: EntityGroup[];
    if (editingGroupId) {
      updatedGroups = groups.map((g) => (g.id === editingGroupId ? { ...g, name: newGroup.name, color: newGroup.color } : g));
    } else {
      updatedGroups = [...groups, newGroup];
    }

    // Assign multi-selected entities to new group if created fresh
    if (!editingGroupId && selectedEntityIds.length > 0) {
      const updatedEntities = entities.map((e) => {
        if (selectedEntityIds.includes(e.id)) {
          return { ...e, groupId: newGroup.id };
        }
        return e;
      });
      if (onUpdateEntities) onUpdateEntities(updatedEntities);
    }

    if (onUpdateGroups) {
      onUpdateGroups(updatedGroups);
    } else if (project && onUpdateProject) {
      onUpdateProject({ ...project, groups: updatedGroups });
    }

    setFolderNameInput('');
    setEditingGroupId(null);
    setShowNewFolderModal(false);
    AndroidEngine.triggerHaptic(20);
  };

  const handleEditGroupClick = (group: EntityGroup) => {
    setEditingGroupId(group.id);
    setFolderNameInput(group.name);
    setFolderColorInput(group.color || PRESET_FOLDER_COLORS[0]);
    setShowNewFolderModal(true);
  };

  const handleDeleteGroup = (groupId: string) => {
    const updatedGroups = groups.filter((g) => g.id !== groupId);
    const updatedEntities = entities.map((e) => {
      if (e.groupId === groupId) {
        return { ...e, groupId: undefined };
      }
      return e;
    });

    if (onUpdateEntities) onUpdateEntities(updatedEntities);
    if (onUpdateGroups) {
      onUpdateGroups(updatedGroups);
    } else if (project && onUpdateProject) {
      onUpdateProject({ ...project, entities: updatedEntities, groups: updatedGroups });
    }
    AndroidEngine.triggerHaptic(25);
  };

  const handleToggleFolderCollapse = (groupId: string) => {
    setCollapsedFolderIds((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleAssignEntityGroup = (entityId: string, groupId: string | undefined) => {
    const target = entities.find((e) => e.id === entityId);
    if (!target) return;

    onUpdateEntity({
      ...target,
      groupId: groupId,
    });
    AndroidEngine.triggerHaptic(15);
  };

  const handleToggleGroupVisibility = (groupId: string) => {
    const groupEntities = entities.filter((e) => e.groupId === groupId);
    if (groupEntities.length === 0) return;

    const allVisible = groupEntities.every((e) => e.visible);
    const updated = entities.map((e) => {
      if (e.groupId === groupId) {
        return { ...e, visible: !allVisible };
      }
      return e;
    });

    if (onUpdateEntities) {
      onUpdateEntities(updated);
    } else {
      groupEntities.forEach((e) => onToggleVisibility(e.id));
    }
    AndroidEngine.triggerHaptic(20);
  };

  const handleToggleGroupLock = (groupId: string) => {
    const groupEntities = entities.filter((e) => e.groupId === groupId);
    if (groupEntities.length === 0) return;

    const allLocked = groupEntities.every((e) => e.locked);
    const updated = entities.map((e) => {
      if (e.groupId === groupId) {
        return { ...e, locked: !allLocked };
      }
      return e;
    });

    if (onUpdateEntities) {
      onUpdateEntities(updated);
    } else {
      groupEntities.forEach((e) => onToggleLock(e.id));
    }
    AndroidEngine.triggerHaptic(20);
  };

  const handleShiftGroupZ = (groupId: string, delta: number) => {
    const updated = entities.map((e) => {
      if (e.groupId === groupId) {
        const curZ = e.transform.zIndex || 0;
        return { ...e, transform: { ...e.transform, zIndex: curZ + delta } };
      }
      return e;
    });

    if (onUpdateEntities) {
      onUpdateEntities(updated);
    } else {
      updated.forEach((e) => {
        if (e.groupId === groupId) onUpdateEntity(e);
      });
    }
    AndroidEngine.triggerHaptic(20);
  };

  // --- DRAG AND DROP REORDERING LOGIC ---
  const handleDragStart = (e: React.DragEvent, entityId: string) => {
    e.dataTransfer.setData('text/plain', entityId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedEntityId(entityId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
    setDragOverFolderId(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number, targetGroupId?: string) => {
    e.preventDefault();
    setDragOverIndex(null);
    setDragOverFolderId(null);

    const draggedId = e.dataTransfer.getData('text/plain') || draggedEntityId;
    if (!draggedId) return;

    const currentIndex = sortedEntities.findIndex((ent) => ent.id === draggedId);
    if (currentIndex === -1) return;

    // Reorder the list
    const newSorted = [...sortedEntities];
    const [movedItem] = newSorted.splice(currentIndex, 1);

    // Update groupId if dropped on specific group
    if (targetGroupId !== undefined) {
      movedItem.groupId = targetGroupId === 'root' ? undefined : targetGroupId;
    }

    newSorted.splice(targetIndex, 0, movedItem);

    // Re-assign zIndex values cleanly based on new order (topmost = index 0 gets highest Z)
    const totalCount = newSorted.length;
    const updatedEntities = newSorted.map((ent, idx) => ({
      ...ent,
      transform: {
        ...ent.transform,
        zIndex: totalCount - 1 - idx,
      },
    }));

    if (onUpdateEntities) {
      onUpdateEntities(updatedEntities);
    } else {
      updatedEntities.forEach((ent) => onUpdateEntity(ent));
    }

    setDraggedEntityId(null);
    AndroidEngine.triggerHaptic(30);
  };

  const handleDropOnFolderHeader = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const draggedId = e.dataTransfer.getData('text/plain') || draggedEntityId;
    if (!draggedId) return;

    handleAssignEntityGroup(draggedId, targetGroupId === 'root' ? undefined : targetGroupId);
    setDraggedEntityId(null);
  };

  // --- Z-INDEX SHIFT & NORMALIZE HELPERS ---
  const handleShiftZ = (id: string, delta: number) => {
    const target = entities.find((e) => e.id === id);
    if (!target) return;
    const curZ = target.transform.zIndex || 0;
    const newZ = Math.max(-100, Math.min(999, curZ + delta));

    onUpdateEntity({
      ...target,
      transform: { ...target.transform, zIndex: newZ },
    });
    AndroidEngine.triggerHaptic(15);
  };

  const handleSetExtremeZ = (id: string, position: 'top' | 'bottom') => {
    const target = entities.find((e) => e.id === id);
    if (!target) return;

    const maxZ = Math.max(...entities.map((e) => e.transform.zIndex || 0), 0);
    const minZ = Math.min(...entities.map((e) => e.transform.zIndex || 0), 0);
    const newZ = position === 'top' ? maxZ + 1 : minZ - 1;

    onUpdateEntity({
      ...target,
      transform: { ...target.transform, zIndex: newZ },
    });
    AndroidEngine.triggerHaptic(25);
  };

  const handleNormalizeZ = () => {
    const ascList = [...entities].sort((a, b) => (a.transform.zIndex || 0) - (b.transform.zIndex || 0));
    const updated = ascList.map((e, idx) => ({
      ...e,
      transform: {
        ...e.transform,
        zIndex: idx,
      },
    }));

    if (onUpdateEntities) {
      onUpdateEntities(updated);
    } else {
      updated.forEach((e) => onUpdateEntity(e));
    }
    AndroidEngine.triggerHaptic(30);
  };

  return (
    <div className="flex flex-col h-full text-white">
      {/* Sheet Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <h3 className="font-bold text-sm sm:text-base truncate">Manajemen Layer & Folder</h3>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Geser urutan Z-Index dengan drag & drop dan kelompokkan dalam folder
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Create Folder Button */}
          <button
            onClick={() => {
              setEditingGroupId(null);
              setFolderNameInput('');
              setShowNewFolderModal(true);
            }}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-xl border border-indigo-400/40 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            title="Buat Folder / Grup Baru"
          >
            <FolderPlus className="w-4 h-4 text-indigo-200 shrink-0" />
            <span className="hidden sm:inline">Folder Baru</span>
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('folders')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'folders' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Tampilan Folder & Grup"
            >
              <Folder className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Folder</span>
            </button>
            <button
              onClick={() => setViewMode('stack')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'stack' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Daftar Stack Z-Index Flat"
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Stack</span>
            </button>
            <button
              onClick={() => setViewMode('tiers')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'tiers' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Kategori Tier Layer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Tier</span>
            </button>
          </div>

          <button
            onClick={handleNormalizeZ}
            className="p-1.5 sm:px-2 sm:py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-semibold rounded-lg border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
            title="Rapikan Z-Index secara berurutan (0, 1, 2...)"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Rapikan Z</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subbar Search & Drag Instruction */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nama objek atau folder..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="text-[10px] text-slate-400 hidden md:flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
          <GripVertical className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tarik ikon pegangan untuk menggeser Z-Index</span>
        </div>
      </div>

      {/* Modal / Dialog Add/Edit Folder */}
      {showNewFolderModal && (
        <div className="p-3.5 bg-slate-900 border-b border-indigo-500/40 space-y-3 shrink-0 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-indigo-400" />
              <span>{editingGroupId ? 'Edit Nama & Warna Folder' : 'Buat Folder/Grup Objek Baru'}</span>
            </h4>
            <button
              onClick={() => setShowNewFolderModal(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label className="text-[10.5px] text-slate-400">Nama Folder / Kategori:</label>
              <input
                type="text"
                placeholder="misal: Karakter & Musuh, Background, UI HUD..."
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] text-slate-400">Warna Aksen Folder:</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_FOLDER_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setFolderColorInput(col)}
                    className={`w-5 h-5 rounded-md border transition-all cursor-pointer ${
                      folderColorInput === col ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setShowNewFolderModal(false)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleCreateGroup}
              disabled={!folderNameInput.trim()}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40"
            >
              {editingGroupId ? 'Simpan Perubahan' : 'Buat Folder'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredEntities.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">Objek tidak ditemukan.</div>
        ) : viewMode === 'folders' ? (
          /* Folder / Group View */
          <div className="space-y-3">
            {/* Render Groups First */}
            {groups.map((group) => {
              const groupEntities = filteredEntities.filter((e) => e.groupId === group.id);
              const isCollapsed = collapsedFolderIds[group.id] ?? group.collapsed;
              const isDropTarget = dragOverFolderId === group.id;

              return (
                <div
                  key={group.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverFolderId(group.id);
                  }}
                  onDragLeave={() => setDragOverFolderId(null)}
                  onDrop={(e) => handleDropOnFolderHeader(e, group.id)}
                  className={`bg-slate-900/90 border rounded-xl overflow-hidden transition-all ${
                    isDropTarget
                      ? 'border-indigo-400 shadow-md shadow-indigo-500/20 bg-indigo-950/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Folder Header */}
                  <div
                    onClick={() => handleToggleFolderCollapse(group.id)}
                    className="flex items-center justify-between p-2.5 bg-slate-950/60 border-b border-slate-800/80 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        className="text-slate-400 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFolderCollapse(group.id);
                        }}
                      >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <div
                        className="w-3.5 h-3.5 rounded-md flex-shrink-0"
                        style={{ backgroundColor: group.color || '#38bdf8' }}
                      />

                      <div className="flex items-center gap-1.5 truncate">
                        {isCollapsed ? (
                          <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
                        ) : (
                          <FolderOpen className="w-4 h-4 text-indigo-300 shrink-0" />
                        )}
                        <span className="font-bold text-xs text-white truncate">{group.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                          {groupEntities.length}
                        </span>
                      </div>
                    </div>

                    {/* Group Quick Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleShiftGroupZ(group.id, 1)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded"
                        title="Naikkan Z-Index Semua Isi Folder (+1)"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleShiftGroupZ(group.id, -1)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded"
                        title="Turunkan Z-Index Semua Isi Folder (-1)"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleGroupVisibility(group.id)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                        title="Tampil/Sembunyikan Seluruh Objek Folder"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleGroupLock(group.id)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded"
                        title="Kunci/Buka Seluruh Objek Folder"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleEditGroupClick(group)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 rounded"
                        title="Edit Folder"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded"
                        title="Hapus Folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Folder Item List */}
                  {!isCollapsed && (
                    <div className="p-1.5 space-y-1">
                      {groupEntities.length === 0 ? (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverFolderId(group.id);
                          }}
                          onDrop={(e) => handleDropOnFolderHeader(e, group.id)}
                          className="text-[11px] text-slate-500 italic p-3 text-center border-2 border-dashed border-slate-800/80 rounded-lg"
                        >
                          Tarik & lepas objek di sini untuk dimasukkan ke folder {group.name}
                        </div>
                      ) : (
                        groupEntities.map((ent, idx) => {
                          const globalIdx = sortedEntities.findIndex((e) => e.id === ent.id);
                          const isPrimarySelected = ent.id === selectedEntityId;
                          const isMultiSelected = selectedEntityIds.includes(ent.id);
                          const isSelected = isPrimarySelected || isMultiSelected;
                          const curZ = ent.transform.zIndex || 0;

                          return (
                            <div
                              key={ent.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, ent.id)}
                              onDragOver={(e) => handleDragOver(e, globalIdx)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, globalIdx, group.id)}
                              onClick={() => onSelectEntity(ent.id, selectedEntityIds.length > 1)}
                              className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                                dragOverIndex === globalIdx ? 'border-cyan-400 bg-cyan-950/40 border-t-2' : ''
                              } ${
                                isPrimarySelected
                                  ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                                  : isMultiSelected
                                  ? 'bg-indigo-500/20 border-indigo-500/80 text-white'
                                  : 'bg-slate-950/80 border-slate-800/80 hover:bg-slate-800/80 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="p-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 shrink-0">
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>

                                <div
                                  className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                                  style={{ backgroundColor: ent.sprite.color || '#38bdf8' }}
                                />

                                <div className="truncate">
                                  <p className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                                    {ent.name}
                                  </p>
                                  <p className="text-[9.5px] text-slate-400 font-mono">
                                    Z: <span className="text-cyan-300 font-bold">{curZ}</span> • {ent.type}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={ent.groupId || ''}
                                  onChange={(e) => handleAssignEntityGroup(ent.id, e.target.value || undefined)}
                                  className="bg-slate-900 text-[10px] text-slate-300 border border-slate-700 rounded px-1 py-0.5"
                                >
                                  <option value="">(Buka Folder)</option>
                                  {groups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.name}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => handleShiftZ(ent.id, 1)}
                                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded"
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleShiftZ(ent.id, -1)}
                                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded"
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped Entities / Root Level */}
            {(() => {
              const rootEntities = filteredEntities.filter((e) => !e.groupId);
              return (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverFolderId('root');
                  }}
                  onDragLeave={() => setDragOverFolderId(null)}
                  onDrop={(e) => handleDropOnFolderHeader(e, 'root')}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-400" />
                      <h4 className="text-xs font-bold text-slate-300">Objek Tanpa Folder ({rootEntities.length})</h4>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {rootEntities.length === 0 ? (
                      <p className="text-[10.5px] text-slate-500 italic py-1 text-center">Semua objek telah dikelompokkan dalam folder.</p>
                    ) : (
                      rootEntities.map((ent) => {
                        const globalIdx = sortedEntities.findIndex((e) => e.id === ent.id);
                        const isPrimarySelected = ent.id === selectedEntityId;
                        const isMultiSelected = selectedEntityIds.includes(ent.id);
                        const isSelected = isPrimarySelected || isMultiSelected;
                        const curZ = ent.transform.zIndex || 0;

                        return (
                          <div
                            key={ent.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, ent.id)}
                            onDragOver={(e) => handleDragOver(e, globalIdx)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, globalIdx)}
                            onClick={() => onSelectEntity(ent.id, selectedEntityIds.length > 1)}
                            className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                              dragOverIndex === globalIdx ? 'border-cyan-400 bg-cyan-950/40 border-t-2' : ''
                            } ${
                              isPrimarySelected
                                ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                                : isMultiSelected
                                ? 'bg-indigo-500/20 border-indigo-500/80 text-white'
                                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 shrink-0">
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>

                              <div
                                className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                                style={{ backgroundColor: ent.sprite.color || '#38bdf8' }}
                              />

                              <div className="truncate">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-400' : 'text-slate-100'}`}>
                                  {ent.name}
                                </p>
                                <p className="text-[9.5px] text-slate-400 font-mono">
                                  Z: <span className="text-cyan-300 font-bold">{curZ}</span> • {ent.type}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {groups.length > 0 && (
                                <select
                                  value={ent.groupId || ''}
                                  onChange={(e) => handleAssignEntityGroup(ent.id, e.target.value || undefined)}
                                  className="bg-slate-900 text-[10px] text-slate-300 border border-slate-700 rounded px-1 py-0.5"
                                >
                                  <option value="">+ Ke Folder...</option>
                                  {groups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.name}
                                    </option>
                                  ))}
                                </select>
                              )}

                              <button
                                onClick={() => handleShiftZ(ent.id, 1)}
                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleShiftZ(ent.id, -1)}
                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : viewMode === 'stack' ? (
          /* Drag & Drop Flat Stack View */
          filteredEntities.map((ent, idx) => {
            const isPrimarySelected = ent.id === selectedEntityId;
            const isMultiSelected = selectedEntityIds.includes(ent.id);
            const isSelected = isPrimarySelected || isMultiSelected;
            const curZ = ent.transform.zIndex || 0;
            const tierInfo = getTierForZIndex(curZ);
            const entGroup = groups.find((g) => g.id === ent.groupId);

            return (
              <div
                key={ent.id}
                draggable
                onDragStart={(e) => handleDragStart(e, ent.id)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
                onClick={() => onSelectEntity(ent.id, selectedEntityIds.length > 1)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                  dragOverIndex === idx ? 'border-cyan-400 bg-cyan-950/50 border-t-2 shadow-lg' : ''
                } ${
                  isPrimarySelected
                    ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                    : isMultiSelected
                    ? 'bg-indigo-500/20 border-indigo-500/80 text-white'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                }`}
              >
                {/* Drag Handle, Sprite & Details */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="p-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 shrink-0"
                    title="Tarik untuk menggeser posisi z-index"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/20"
                    style={{ backgroundColor: ent.sprite.color || '#38bdf8' }}
                  />

                  <div className="truncate">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-400' : 'text-slate-100'}`}>
                        {ent.name}
                      </p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${tierInfo.badgeBg} shrink-0`}>
                        {tierInfo.label}
                      </span>
                      {entGroup && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-white/20 text-white shrink-0 flex items-center gap-1"
                          style={{ backgroundColor: (entGroup.color || '#6366f1') + '40' }}
                        >
                          <Folder className="w-2.5 h-2.5" />
                          {entGroup.name}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono capitalize">
                      {ent.type} • Pos ({Math.round(ent.transform.x)}, {Math.round(ent.transform.y)})
                    </p>
                  </div>
                </div>

                {/* Direct Numeric & Extremes */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-lg p-0.5 gap-1">
                    <button
                      onClick={() => handleShiftZ(ent.id, -1)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    <input
                      type="number"
                      value={curZ}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        onUpdateEntity({
                          ...ent,
                          transform: { ...ent.transform, zIndex: val },
                        });
                      }}
                      className="w-10 text-center text-xs font-mono font-bold bg-transparent text-cyan-300 focus:outline-none"
                    />

                    <button
                      onClick={() => handleShiftZ(ent.id, 1)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleSetExtremeZ(ent.id, 'top')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 cursor-pointer"
                    title="Bawa ke Paling Depan (Topmost)"
                  >
                    <ChevronsUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleSetExtremeZ(ent.id, 'bottom')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 cursor-pointer"
                    title="Kirim ke Paling Belakang (Bottommost)"
                  >
                    <ChevronsDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onToggleVisibility(ent.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {ent.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
                  </button>

                  <button
                    onClick={() => onToggleLock(ent.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-white cursor-pointer"
                    title="Kunci Posisi"
                  >
                    {ent.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  {onDuplicateEntity && (
                    <button
                      onClick={() => onDuplicateEntity(ent.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-cyan-300 cursor-pointer"
                      title="Duplikat Objek"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onDeleteEntity && (
                    <button
                      onClick={() => onDeleteEntity(ent.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="Hapus Objek"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          /* Tier Category Grouping View */
          <div className="space-y-3">
            {[
              { key: 'ui' as LayerTier, title: 'UI / Overlay Layer (Z ≥ 100)', minZ: 100, desc: 'Teks, Score, Joystick & tombol HUD' },
              { key: 'foreground' as LayerTier, title: 'Foreground / FX (Z: 20 - 99)', minZ: 20, desc: 'Partikel, kabut, efek lampu & overlay' },
              { key: 'gameplay' as LayerTier, title: 'Gameplay / Aktor (Z: 1 - 19)', minZ: 1, desc: 'Karakter, musuh, koin, objek bergerak' },
              { key: 'default' as LayerTier, title: 'Default / Ground (Z: 0)', minZ: 0, desc: 'Lantai dasar, platform utama' },
              { key: 'background' as LayerTier, title: 'Background / Sky (Z < 0)', minZ: -10, desc: 'Gambar latar belakang, langit, laut' },
            ].map((tierGroup) => {
              const tierEntities = filteredEntities.filter((e) => {
                const z = e.transform.zIndex || 0;
                if (tierGroup.key === 'ui') return z >= 100;
                if (tierGroup.key === 'foreground') return z >= 20 && z < 100;
                if (tierGroup.key === 'gameplay') return z >= 1 && z < 20;
                if (tierGroup.key === 'default') return z === 0;
                return z < 0;
              });

              return (
                <div key={tierGroup.key} className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{tierGroup.title}</h4>
                      <p className="text-[10px] text-slate-400">{tierGroup.desc}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                      {tierEntities.length} Objek
                    </span>
                  </div>

                  {tierEntities.length === 0 ? (
                    <p className="text-[11px] text-slate-600 italic py-1">Tidak ada objek di tier ini.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {tierEntities.map((ent) => (
                        <div
                          key={ent.id}
                          onClick={() => onSelectEntity(ent.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer ${
                            ent.id === selectedEntityId
                              ? 'bg-cyan-500/20 border-cyan-500 text-white'
                              : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: ent.sprite.color || '#38bdf8' }}
                            />
                            <span className="font-semibold truncate">{ent.name}</span>
                          </div>
                          <span className="font-mono text-[10px] text-cyan-400 font-bold">
                            Z:{ent.transform.zIndex || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
