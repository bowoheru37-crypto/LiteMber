/**
 * SaveLoadEngine.ts
 * High-performance, low-memory Game Save/Load Manager for AI Studio Engine.
 * Engineered for low-end mobile hardware (e.g., itel A70 / Unisoc T603).
 * Uses compact JSON keys, float truncation, omit-default packing, and fast checksums.
 */

import { Entity, GameProject } from '../types/engine';
import { BinaryEngine } from './BinaryEngine';

export interface CompactEntityState {
  i: string; // Entity ID
  x: number; // X Position (rounded to 2 decimals)
  y: number; // Y Position (rounded to 2 decimals)
  r?: number; // Rotation (deg, omitted if 0)
  vx?: number; // Velocity X (omitted if 0)
  vy?: number; // Velocity Y (omitted if 0)
  h?: number; // Health
  mh?: number; // Max Health
  v?: number; // Visible (1 = visible, 0 = hidden/destroyed, default 1)
  cv?: Record<string, string | number | boolean>; // Custom Variables
}

export interface CompactSaveData {
  v: number; // Format version (1)
  t: number; // Timestamp (Unix MS)
  sn: string; // Scene/Level Name or ID
  s: number; // Current Score
  p?: { x: number; y: number; h?: number }; // Player Quick Summary for Slot Preview
  e: CompactEntityState[]; // Dynamic Entities Payload
  gv?: Record<string, string | number | boolean>; // Global/Dialogue Variables
  chk: string; // Checksum Hash
}

export interface SaveSlotMetadata {
  slotId: string;
  slotName: string;
  timestamp: number;
  sceneName: string;
  score: number;
  entityCount: number;
  rawSizeBytes: number;
  compactSizeBytes: number;
  compressionRatioPercent: number;
  playerHealth?: number;
  isAutoSave?: boolean;
  isQuickSave?: boolean;
}

export interface BenchmarkMetrics {
  entityCount: number;
  standardSizeBytes: number;
  compactSizeBytes: number;
  savedBytes: number;
  compressionRatioPercent: number;
  serializeTimeMs: number;
  deserializeTimeMs: number;
}

const STORAGE_PREFIX = 'itel_a70_save_slot_';
const METADATA_PREFIX = 'itel_a70_save_meta_';
const PROJECT_STORAGE_PREFIX = 'itel_a70_project_';
const ACTIVE_PROJECT_STORAGE_KEY = 'itel_a70_active_project_state';
const SAVED_PROJECTS_INDEX_KEY = 'itel_a70_saved_projects_list';

export interface SavedProjectMetadata {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  entityCount: number;
  sceneCount: number;
  sizeBytes: number;
  isAutoSave?: boolean;
}

export class SaveLoadEngine {
  /**
   * Fast 32-bit FNV-1a Hash function for integrity checksums with zero GC overhead
   */
  public static generateChecksum(dataString: string): string {
    let hash = 2166136261;
    for (let i = 0; i < dataString.length; i++) {
      hash ^= dataString.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  /**
   * Serializes current entities and game state into ultra-compact JSON format
   */
  public static serializeGameState(
    entities: Entity[],
    score: number = 0,
    sceneName: string = 'Sekte Pagoda Level 1',
    globalVariables: Record<string, string | number | boolean> = {}
  ): { compactData: CompactSaveData; jsonString: string; rawSizeBytes: number; compactSizeBytes: number } {
    const startTime = performance.now();

    // Standard uncompressed JSON size calculation for comparison
    const rawEntitiesJson = JSON.stringify(entities);
    const rawSizeBytes = new Blob([rawEntitiesJson]).size;

    let playerSummary: { x: number; y: number; h?: number } | undefined = undefined;

    // Filter dynamic entities or entities whose transform/state changed
    const compactEntities: CompactEntityState[] = [];

    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      const posX = Math.round(ent.transform.x * 100) / 100;
      const posY = Math.round(ent.transform.y * 100) / 100;
      const rot = Math.round(ent.transform.rotation * 10) / 10;

      const velX = ent.rigidbody ? Math.round(ent.rigidbody.velocityX * 10) / 10 : 0;
      const velY = ent.rigidbody ? Math.round(ent.rigidbody.velocityY * 10) / 10 : 0;

      const health = ent.health;
      const maxHealth = ent.maxHealth;
      const isVisible = ent.visible !== false ? 1 : 0;
      const customVars = ent.customVariables && Object.keys(ent.customVariables).length > 0 ? ent.customVariables : undefined;

      // Identify player summary for preview UI
      if (ent.type === 'player' || ent.name.toLowerCase().includes('player') || ent.name.toLowerCase().includes('pemain')) {
        playerSummary = {
          x: posX,
          y: posY,
          h: health,
        };
      }

      const compactItem: CompactEntityState = {
        i: ent.id,
        x: posX,
        y: posY,
      };

      if (rot !== 0) compactItem.r = rot;
      if (velX !== 0) compactItem.vx = velX;
      if (velY !== 0) compactItem.vy = velY;
      if (health !== undefined) compactItem.h = health;
      if (maxHealth !== undefined) compactItem.mh = maxHealth;
      if (isVisible === 0) compactItem.v = 0;
      if (customVars) compactItem.cv = customVars;

      compactEntities.push(compactItem);
    }

    // Prepare draft without checksum
    const draftData = {
      v: 1,
      t: Date.now(),
      sn: sceneName,
      s: score,
      p: playerSummary,
      e: compactEntities,
      gv: Object.keys(globalVariables).length > 0 ? globalVariables : undefined,
    };

    const draftJson = JSON.stringify(draftData);
    const checksum = this.generateChecksum(draftJson);

    const compactData: CompactSaveData = {
      ...draftData,
      chk: checksum,
    };

    const jsonString = JSON.stringify(compactData);
    const compactSizeBytes = new Blob([jsonString]).size;

    return {
      compactData,
      jsonString,
      rawSizeBytes,
      compactSizeBytes,
    };
  }

  /**
   * Deserializes compact save string and verifies checksum
   */
  public static deserializeGameState(jsonString: string): CompactSaveData {
    if (!jsonString || jsonString.trim() === '') {
      throw new Error('Data save kosong.');
    }

    let parsed: CompactSaveData;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Format JSON save tidak valid / rusak.');
    }

    if (!parsed || typeof parsed !== 'object' || !parsed.e || !Array.isArray(parsed.e)) {
      throw new Error('Struktur data save tidak sesuai format pemicu.');
    }

    // Verify Checksum
    const checksumInSave = parsed.chk;
    const { chk, ...draftData } = parsed;
    const computedChecksum = this.generateChecksum(JSON.stringify(draftData));

    if (checksumInSave && checksumInSave !== computedChecksum) {
      console.warn('Warning: Checksum save mismatch! Save file may have been modified manually.');
    }

    return parsed;
  }

  /**
   * Applies restored save payload directly to live scene entities
   */
  public static applySaveStateToEntities(
    currentEntities: Entity[],
    saveData: CompactSaveData
  ): Entity[] {
    const savedEntityMap = new Map<string, CompactEntityState>();
    saveData.e.forEach((item) => savedEntityMap.set(item.i, item));

    return currentEntities.map((ent) => {
      const savedState = savedEntityMap.get(ent.id);
      if (!savedState) return ent;

      const updatedTransform = {
        ...ent.transform,
        x: savedState.x,
        y: savedState.y,
        rotation: savedState.r ?? ent.transform.rotation,
      };

      let updatedRigidbody = ent.rigidbody;
      if (updatedRigidbody) {
        updatedRigidbody = {
          ...updatedRigidbody,
          velocityX: savedState.vx ?? 0,
          velocityY: savedState.vy ?? 0,
        };
      }

      return {
        ...ent,
        transform: updatedTransform,
        rigidbody: updatedRigidbody,
        visible: savedState.v === 0 ? false : true,
        health: savedState.h ?? ent.health,
        maxHealth: savedState.mh ?? ent.maxHealth,
        customVariables: savedState.cv ? { ...ent.customVariables, ...savedState.cv } : ent.customVariables,
      };
    });
  }

  /**
   * Save game state to a specified LocalStorage slot
   */
  public static saveToSlot(
    slotId: string,
    slotName: string,
    entities: Entity[],
    score: number = 0,
    sceneName: string = 'Sekte Pagoda Level 1',
    globalVars: Record<string, any> = {}
  ): SaveSlotMetadata {
    const { compactData, jsonString, rawSizeBytes, compactSizeBytes } = this.serializeGameState(
      entities,
      score,
      sceneName,
      globalVars
    );

    const compressionRatioPercent = rawSizeBytes > 0 ? Math.round((1 - compactSizeBytes / rawSizeBytes) * 100) : 0;

    const metadata: SaveSlotMetadata = {
      slotId,
      slotName,
      timestamp: compactData.t,
      sceneName: compactData.sn,
      score: compactData.s,
      entityCount: compactData.e.length,
      rawSizeBytes,
      compactSizeBytes,
      compressionRatioPercent,
      playerHealth: compactData.p?.h,
      isAutoSave: slotId === 'autosave',
      isQuickSave: slotId === 'quicksave',
    };

    try {
      localStorage.setItem(STORAGE_PREFIX + slotId, jsonString);
      localStorage.setItem(METADATA_PREFIX + slotId, JSON.stringify(metadata));
    } catch (e) {
      console.error('LocalStorage save error:', e);
      throw new Error('LocalStorage penuh / tidak diizinkan di peramban ini.');
    }

    return metadata;
  }

  /**
   * Load game state from slot
   */
  public static loadFromSlot(slotId: string): { saveData: CompactSaveData; metadata: SaveSlotMetadata | null } {
    const jsonString = localStorage.getItem(STORAGE_PREFIX + slotId);
    if (!jsonString) {
      throw new Error(`Save slot '${slotId}' tidak ditemukan.`);
    }

    const saveData = this.deserializeGameState(jsonString);

    const metaStr = localStorage.getItem(METADATA_PREFIX + slotId);
    let metadata: SaveSlotMetadata | null = null;
    if (metaStr) {
      try {
        metadata = JSON.parse(metaStr);
      } catch {
        // ignore
      }
    }

    return { saveData, metadata };
  }

  /**
   * Delete save slot
   */
  public static deleteSlot(slotId: string): void {
    localStorage.removeItem(STORAGE_PREFIX + slotId);
    localStorage.removeItem(METADATA_PREFIX + slotId);
  }

  /**
   * List all saved slots with metadata
   */
  public static listAllSlots(): { slotId: string; metadata: SaveSlotMetadata | null; exists: boolean }[] {
    const defaultSlots = [
      { id: 'autosave', name: '⚡ Auto Save' },
      { id: 'quicksave', name: '⏱️ Quick Save' },
      { id: 'slot_1', name: '💾 Slot 1' },
      { id: 'slot_2', name: '💾 Slot 2' },
      { id: 'slot_3', name: '💾 Slot 3' },
      { id: 'slot_4', name: '💾 Slot 4' },
    ];

    return defaultSlots.map((s) => {
      const metaStr = localStorage.getItem(METADATA_PREFIX + s.id);
      let metadata: SaveSlotMetadata | null = null;
      let exists = false;

      if (metaStr) {
        try {
          metadata = JSON.parse(metaStr);
          exists = true;
        } catch {
          exists = false;
        }
      }

      return {
        slotId: s.id,
        metadata: metadata || {
          slotId: s.id,
          slotName: s.name,
          timestamp: 0,
          sceneName: '-',
          score: 0,
          entityCount: 0,
          rawSizeBytes: 0,
          compactSizeBytes: 0,
          compressionRatioPercent: 0,
        },
        exists,
      };
    });
  }

  /**
   * Benchmark serialization speed and RAM payload savings (itel A70 CPU test)
   */
  public static runBenchmark(entities: Entity[]): BenchmarkMetrics {
    const t0 = performance.now();
    const standardJson = JSON.stringify(entities);
    const standardSizeBytes = new Blob([standardJson]).size;

    const t1 = performance.now();
    const { jsonString, compactSizeBytes } = this.serializeGameState(entities);
    const t2 = performance.now();

    // Test deserialization speed
    this.deserializeGameState(jsonString);
    const t3 = performance.now();

    const savedBytes = standardSizeBytes - compactSizeBytes;
    const compressionRatioPercent = standardSizeBytes > 0 ? Math.round((savedBytes / standardSizeBytes) * 100) : 0;

    return {
      entityCount: entities.length,
      standardSizeBytes,
      compactSizeBytes,
      savedBytes,
      compressionRatioPercent,
      serializeTimeMs: Math.round((t2 - t1) * 100) / 100,
      deserializeTimeMs: Math.round((t3 - t2) * 100) / 100,
    };
  }

  /**
   * Fast Binary Buffer Serialization helper
   */
  public static exportToBinaryBuffer(project: GameProject): ArrayBuffer {
    return BinaryEngine.serializeProjectToBinary(project);
  }

  /**
   * Fast Binary Buffer Deserialization helper
   */
  public static importFromBinaryBuffer(buffer: ArrayBuffer): GameProject | null {
    return BinaryEngine.deserializeProjectFromBinary(buffer);
  }

  // --- FULL GAME PROJECT LOCALSTORAGE PERSISTENCE ---

  /**
   * Saves full GameProject state to LocalStorage
   */
  public static saveProjectToLocalStorage(
    project: GameProject,
    isAutoSave: boolean = false
  ): { success: boolean; message: string; metadata: SavedProjectMetadata } {
    if (!project || !project.id) {
      throw new Error('Objek proyek tidak valid.');
    }

    const updatedProject: GameProject = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(updatedProject);
    const sizeBytes = new Blob([jsonString]).size;

    const metadata: SavedProjectMetadata = {
      id: updatedProject.id,
      name: updatedProject.name || 'Proyek Tanpa Nama',
      description: updatedProject.description || '',
      updatedAt: updatedProject.updatedAt,
      entityCount: updatedProject.entities ? updatedProject.entities.length : 0,
      sceneCount: updatedProject.scenes ? updatedProject.scenes.length : 1,
      sizeBytes,
      isAutoSave,
    };

    try {
      // 1. Save specific project payload
      localStorage.setItem(PROJECT_STORAGE_PREFIX + updatedProject.id, jsonString);

      // 2. If autosave, also update the active project state key
      if (isAutoSave) {
        localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, jsonString);
      }

      // 3. Update index list
      const savedList = this.listSavedProjectsFromLocalStorage();
      const existingIdx = savedList.findIndex((item) => item.id === updatedProject.id);

      if (existingIdx >= 0) {
        savedList[existingIdx] = metadata;
      } else {
        savedList.unshift(metadata);
      }

      localStorage.setItem(SAVED_PROJECTS_INDEX_KEY, JSON.stringify(savedList));

      return {
        success: true,
        message: `Proyek '${metadata.name}' berhasil disimpan (${(sizeBytes / 1024).toFixed(1)} KB).`,
        metadata,
      };
    } catch (err: any) {
      console.error('Failed to save project to localStorage:', err);
      throw new Error('Penyimpanan lokal penuh atau tidak diizinkan di peramban.');
    }
  }

  /**
   * Loads a full GameProject from LocalStorage by ID
   */
  public static loadProjectFromLocalStorage(projectId: string): GameProject | null {
    if (!projectId) return null;
    try {
      const raw = localStorage.getItem(PROJECT_STORAGE_PREFIX + projectId);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameProject;
      if (!parsed || !parsed.id || !Array.isArray(parsed.entities)) {
        return null;
      }
      return parsed;
    } catch (err) {
      console.error('Failed to parse project from localStorage:', err);
      return null;
    }
  }

  /**
   * Loads the active auto-saved GameProject state from LocalStorage across sessions
   */
  public static loadActiveProjectFromLocalStorage(): GameProject | null {
    try {
      const raw = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameProject;
      if (!parsed || !parsed.id || !Array.isArray(parsed.entities)) {
        return null;
      }
      return parsed;
    } catch (err) {
      console.error('Failed to load active project state from localStorage:', err);
      return null;
    }
  }

  /**
   * List all saved projects in LocalStorage
   */
  public static listSavedProjectsFromLocalStorage(): SavedProjectMetadata[] {
    try {
      const raw = localStorage.getItem(SAVED_PROJECTS_INDEX_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list;
    } catch (err) {
      return [];
    }
  }

  /**
   * Delete a saved project from LocalStorage
   */
  public static deleteProjectFromLocalStorage(projectId: string): boolean {
    if (!projectId) return false;
    try {
      localStorage.removeItem(PROJECT_STORAGE_PREFIX + projectId);

      const savedList = this.listSavedProjectsFromLocalStorage().filter((p) => p.id !== projectId);
      localStorage.setItem(SAVED_PROJECTS_INDEX_KEY, JSON.stringify(savedList));

      // If deleted project was the active project, clear active key
      const activeProj = this.loadActiveProjectFromLocalStorage();
      if (activeProj && activeProj.id === projectId) {
        localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
      }
      return true;
    } catch (err) {
      console.error('Failed to delete project from localStorage:', err);
      return false;
    }
  }

  /**
   * Clear all stored projects from LocalStorage
   */
  public static clearAllSavedProjectsFromLocalStorage(): void {
    try {
      const list = this.listSavedProjectsFromLocalStorage();
      for (let i = 0; i < list.length; i++) {
        localStorage.removeItem(PROJECT_STORAGE_PREFIX + list[i].id);
      }
      localStorage.removeItem(SAVED_PROJECTS_INDEX_KEY);
      localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear projects from localStorage:', err);
    }
  }
}
