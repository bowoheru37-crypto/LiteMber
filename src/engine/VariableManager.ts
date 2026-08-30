import { GameProject, GameVariable, GameVariableType, GameVariableScope, Entity } from '../types/engine';
import { CoreRegistryValidator } from './CoreRegistry';
import { unifiedGameContext } from './UnifiedGameContext';

export class VariableManager {
  /**
   * Default built-in global game variables preset
   */
  public static getDefaultVariables(): GameVariable[] {
    return [
      {
        id: 'var_coins',
        name: 'coinsCount',
        type: 'number',
        scope: 'global',
        value: 0,
        defaultValue: 0,
        description: 'Jumlah koin yang dikumpulkan oleh pemain',
      },
      {
        id: 'var_lives',
        name: 'playerLives',
        type: 'number',
        scope: 'global',
        value: 3,
        defaultValue: 3,
        description: 'Sisa nyawa pemain',
      },
      {
        id: 'var_door_unlocked',
        name: 'isDoorUnlocked',
        type: 'boolean',
        scope: 'global',
        value: false,
        defaultValue: false,
        description: 'Status apakah pintu atau gerbang level telah terbuka',
      },
      {
        id: 'var_player_state',
        name: 'playerState',
        type: 'string',
        scope: 'global',
        value: 'idle',
        defaultValue: 'idle',
        description: 'Status mode pergerakan pemain (e.g. idle, running, powered_up)',
      },
    ];
  }

  /**
   * Ensures a project has variable definitions initialized
   */
  public static ensureProjectVariables(project: GameProject): GameVariable[] {
    if (!project.variables || project.variables.length === 0) {
      const defaults = this.getDefaultVariables();
      unifiedGameContext.syncVariables(defaults);
      return defaults;
    }
    unifiedGameContext.syncVariables(project.variables);
    return project.variables;
  }

  /**
   * Creates a new GameVariable object
   */
  public static createVariable(
    name: string,
    type: GameVariableType,
    scope: GameVariableScope,
    defaultValue: number | boolean | string,
    description?: string,
    entityId?: string
  ): GameVariable {
    const cleanName = CoreRegistryValidator.sanitizeString(name.replace(/\s+/g, '_'), 32);
    return {
      id: 'var_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName || 'newVar',
      type,
      scope,
      value: defaultValue,
      defaultValue,
      description: CoreRegistryValidator.sanitizeString(description || '', 128),
      entityId: scope === 'local' ? entityId : undefined,
    };
  }

  /**
   * Get value of a variable by name or ID (O(1) HashMap lookup)
   */
  public static getVariableValue(
    variables: GameVariable[],
    nameOrId: string,
    entity?: Entity | null
  ): number | boolean | string | undefined {
    unifiedGameContext.syncVariables(variables);
    return unifiedGameContext.getVariableValue(nameOrId, entity);
  }

  /**
   * Set value of a variable by name or ID
   */
  public static setVariableValue(
    variables: GameVariable[],
    nameOrId: string,
    newValue: number | boolean | string,
    entity?: Entity | null
  ): GameVariable[] {
    unifiedGameContext.syncVariables(variables);
    unifiedGameContext.setVariableValue(nameOrId, newValue, entity);
    return unifiedGameContext.exportVariables();
  }

  /**
   * Modify variable according to action type ('SET_VARIABLE' | 'ADD_VARIABLE' | 'TOGGLE_VARIABLE')
   */
  public static modifyVariable(
    variables: GameVariable[],
    nameOrId: string,
    action: 'SET_VARIABLE' | 'ADD_VARIABLE' | 'TOGGLE_VARIABLE',
    operandValue: any,
    entity?: Entity | null
  ): GameVariable[] {
    unifiedGameContext.syncVariables(variables);
    unifiedGameContext.modifyVariable(nameOrId, action, operandValue, entity);
    return unifiedGameContext.exportVariables();
  }

  /**
   * Evaluates logic condition comparing variable value to target
   */
  public static evaluateCondition(
    varValue: any,
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' = '==',
    targetValue: any
  ): boolean {
    if (varValue === undefined || varValue === null) return false;

    switch (operator) {
      case '==':
        // eslint-disable-next-line eqeqeq
        return varValue == targetValue;
      case '!=':
        // eslint-disable-next-line eqeqeq
        return varValue != targetValue;
      case '>':
        return Number(varValue) > Number(targetValue);
      case '<':
        return Number(varValue) < Number(targetValue);
      case '>=':
        return Number(varValue) >= Number(targetValue);
      case '<=':
        return Number(varValue) <= Number(targetValue);
      default:
        return true;
    }
  }

  /**
   * Fast, single-pass zero-GC RegExp variable tag interpolation
   */
  public static interpolateVariables(
    text: string,
    variables: GameVariable[],
    entity?: Entity | null,
    score: number = 0
  ): string {
    unifiedGameContext.syncVariables(variables);
    return unifiedGameContext.interpolateText(text, entity, score);
  }

  /**
   * Resets all variables in the list to their default values
   */
  public static resetVariablesToDefaults(variables: GameVariable[]): GameVariable[] {
    unifiedGameContext.syncVariables(variables);
    unifiedGameContext.resetVariablesToDefaults();
    return unifiedGameContext.exportVariables();
  }
}


