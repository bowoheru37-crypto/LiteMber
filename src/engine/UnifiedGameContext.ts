/**
 * UnifiedGameContext.ts
 * Standardized Game & Entity Access Provider Interface & High-Performance Implementation.
 *
 * Provides unified, O(1) HashMap indexed access to game variables and entities across
 * all engine systems (CoreEngine, VariableManager, DialogueEngine, PhysicsEngine, etc.).
 * Drastically reduces memory footprint by eliminating array re-allocations during game loops.
 */

import { Entity, GameVariable, GameVariableType, GameVariableScope } from '../types/engine';
import { CoreRegistryValidator } from './CoreRegistry';

export interface IGameAccessProvider {
  // Variable Access API
  getVariable(nameOrId: string, entity?: Entity | null): GameVariable | undefined;
  getVariableValue(nameOrId: string, entity?: Entity | null): number | boolean | string | undefined;
  setVariableValue(nameOrId: string, value: any, entity?: Entity | null): boolean;
  modifyVariable(nameOrId: string, action: 'SET_VARIABLE' | 'ADD_VARIABLE' | 'TOGGLE_VARIABLE', operand: any, entity?: Entity | null): boolean;
  interpolateText(text: string, entity?: Entity | null, score?: number): string;
  syncVariables(variables: GameVariable[]): void;
  exportVariables(): GameVariable[];
  resetVariablesToDefaults(): void;

  // Entity Query & Indexing API
  getEntityById(id: string): Entity | undefined;
  getEntitiesByTag(tag: string): Entity[];
  getEntitiesByType(type: string): Entity[];
  registerEntity(entity: Entity): void;
  unregisterEntity(id: string): void;
  reindexEntities(entities: Entity[]): void;
}

export class UnifiedGameContext implements IGameAccessProvider {
  private static instance: UnifiedGameContext;

  // Fast O(1) Index Maps
  private variableMap: Map<string, GameVariable> = new Map();
  private variableList: GameVariable[] = [];

  private entityMap: Map<string, Entity> = new Map();
  private tagEntityMap: Map<string, Entity[]> = new Map();
  private typeEntityMap: Map<string, Entity[]> = new Map();

  private static readonly INTERPOLATION_REGEX = /\{([a-zA-Z0-9_\-]+)\}/gi;

  public static getInstance(): UnifiedGameContext {
    if (!UnifiedGameContext.instance) {
      UnifiedGameContext.instance = new UnifiedGameContext();
    }
    return UnifiedGameContext.instance;
  }

  constructor(initialVariables: GameVariable[] = [], initialEntities: Entity[] = []) {
    if (initialVariables.length > 0) {
      this.syncVariables(initialVariables);
    }
    if (initialEntities.length > 0) {
      this.reindexEntities(initialEntities);
    }
  }

  // ============================================================================
  // 1. UNIFIED VARIABLE ACCESS PIPELINE (O(1) HashMap Lookups)
  // ============================================================================

  public syncVariables(variables: GameVariable[]): void {
    this.variableMap.clear();
    this.variableList = variables;

    for (let i = 0; i < variables.length; i++) {
      const v = variables[i];
      if (v.id) this.variableMap.set(v.id, v);
      if (v.name) this.variableMap.set(v.name, v);
      if (v.scope === 'local' && v.entityId && v.name) {
        this.variableMap.set(`${v.entityId}_${v.name}`, v);
      }
    }
  }

  public exportVariables(): GameVariable[] {
    return this.variableList;
  }

  public getVariable(nameOrId: string, entity?: Entity | null): GameVariable | undefined {
    if (entity) {
      const localKey = `${entity.id}_${nameOrId}`;
      if (this.variableMap.has(localKey)) {
        return this.variableMap.get(localKey);
      }
    }
    return this.variableMap.get(nameOrId);
  }

  public getVariableValue(nameOrId: string, entity?: Entity | null): number | boolean | string | undefined {
    // Check local entity customVariables first
    if (entity?.customVariables && nameOrId in entity.customVariables) {
      return entity.customVariables[nameOrId];
    }

    const variable = this.getVariable(nameOrId, entity);
    if (variable) {
      return variable.value;
    }

    return undefined;
  }

  public setVariableValue(nameOrId: string, value: any, entity?: Entity | null): boolean {
    if (entity) {
      if (!entity.customVariables) {
        entity.customVariables = {};
      }
      entity.customVariables[nameOrId] = value;
    }

    const targetVar = this.getVariable(nameOrId, entity);
    if (targetVar) {
      let typedVal = value;
      if (targetVar.type === 'number') typedVal = CoreRegistryValidator.clampNumber(value, 0);
      if (targetVar.type === 'boolean') typedVal = CoreRegistryValidator.coerceBoolean(value, false);
      if (targetVar.type === 'string') typedVal = CoreRegistryValidator.sanitizeString(String(value), 256);

      targetVar.value = typedVal;
      return true;
    }

    // Auto-create global variable if missing and no entity provided
    if (!entity) {
      const varType: GameVariableType =
        typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string';

      const cleanName = CoreRegistryValidator.sanitizeString(nameOrId.replace(/\s+/g, '_'), 32);
      const newVar: GameVariable = {
        id: 'var_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: cleanName || 'newVar',
        type: varType,
        scope: 'global',
        value,
        defaultValue: value,
      };

      this.variableList.push(newVar);
      this.variableMap.set(newVar.id, newVar);
      this.variableMap.set(newVar.name, newVar);
      return true;
    }

    return false;
  }

  public modifyVariable(
    nameOrId: string,
    action: 'SET_VARIABLE' | 'ADD_VARIABLE' | 'TOGGLE_VARIABLE',
    operand: any,
    entity?: Entity | null
  ): boolean {
    const curVal = this.getVariableValue(nameOrId, entity);

    if (action === 'SET_VARIABLE') {
      return this.setVariableValue(nameOrId, operand, entity);
    }

    if (action === 'ADD_VARIABLE') {
      if (typeof curVal === 'number' || typeof operand === 'number' || !isNaN(Number(operand))) {
        const numA = Number(curVal || 0);
        const numB = Number(operand || 1);
        return this.setVariableValue(nameOrId, numA + numB, entity);
      } else {
        const strA = String(curVal || '');
        const strB = String(operand || '');
        return this.setVariableValue(nameOrId, strA + strB, entity);
      }
    }

    if (action === 'TOGGLE_VARIABLE') {
      const boolVal = CoreRegistryValidator.coerceBoolean(curVal, false);
      return this.setVariableValue(nameOrId, !boolVal, entity);
    }

    return false;
  }

  public interpolateText(text: string, entity?: Entity | null, score: number = 0): string {
    if (!text) return '';

    return text.replace(UnifiedGameContext.INTERPOLATION_REGEX, (match, varName) => {
      const lowerVar = String(varName).toLowerCase();
      if (lowerVar === 'score') return String(score);

      const val = this.getVariableValue(varName, entity);
      if (val !== undefined && val !== null) {
        return String(val);
      }

      return match;
    });
  }

  public resetVariablesToDefaults(): void {
    for (let i = 0; i < this.variableList.length; i++) {
      const v = this.variableList[i];
      v.value = v.defaultValue;
    }
  }

  // ============================================================================
  // 2. UNIFIED ENTITY INDEXING PIPELINE (O(1) Spatial & Category Queries)
  // ============================================================================

  public reindexEntities(entities: Entity[]): void {
    this.entityMap.clear();
    this.tagEntityMap.clear();
    this.typeEntityMap.clear();

    for (let i = 0; i < entities.length; i++) {
      this.registerEntity(entities[i]);
    }
  }

  public registerEntity(entity: Entity): void {
    if (!entity || !entity.id) return;

    this.entityMap.set(entity.id, entity);

    // Index by Tag
    const tag = entity.script?.tag || entity.type;
    if (tag) {
      if (!this.tagEntityMap.has(tag)) {
        this.tagEntityMap.set(tag, []);
      }
      this.tagEntityMap.get(tag)!.push(entity);
    }

    // Index by Type
    if (entity.type) {
      if (!this.typeEntityMap.has(entity.type)) {
        this.typeEntityMap.set(entity.type, []);
      }
      this.typeEntityMap.get(entity.type)!.push(entity);
    }
  }

  public unregisterEntity(id: string): void {
    const ent = this.entityMap.get(id);
    if (!ent) return;

    this.entityMap.delete(id);

    // Remove from tag index
    const tag = ent.script?.tag || ent.type;
    if (tag && this.tagEntityMap.has(tag)) {
      const list = this.tagEntityMap.get(tag)!;
      const idx = list.indexOf(ent);
      if (idx !== -1) list.splice(idx, 1);
    }

    // Remove from type index
    if (ent.type && this.typeEntityMap.has(ent.type)) {
      const list = this.typeEntityMap.get(ent.type)!;
      const idx = list.indexOf(ent);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  public getEntityById(id: string): Entity | undefined {
    return this.entityMap.get(id);
  }

  public getEntitiesByTag(tag: string): Entity[] {
    return this.tagEntityMap.get(tag) || [];
  }

  public getEntitiesByType(type: string): Entity[] {
    return this.typeEntityMap.get(type) || [];
  }
}

export const unifiedGameContext = UnifiedGameContext.getInstance();
