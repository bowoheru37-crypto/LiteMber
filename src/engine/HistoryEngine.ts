/**
 * HistoryEngine.ts
 * High-performance state-history stack tracking changes to project entities,
 * world settings, assets, dialogues, and scenes.
 * Enables Ctrl+Z / Ctrl+Y and touch-based Undo/Redo buttons for rapid iteration.
 */

import { GameProject } from '../types/engine';

export interface HistoryListener {
  (canUndo: boolean, canRedo: boolean, lastAction?: string): void;
}

export class HistoryEngine {
  private static instance: HistoryEngine;

  private undoStack: { project: GameProject; actionLabel?: string }[] = [];
  private redoStack: { project: GameProject; actionLabel?: string }[] = [];
  private maxHistorySize: number = 60;
  private listeners: Set<HistoryListener> = new Set();
  private lastSerializedState: string = '';
  private isBatching: boolean = false;

  private constructor() {}

  public static getInstance(): HistoryEngine {
    if (!HistoryEngine.instance) {
      HistoryEngine.instance = new HistoryEngine();
    }
    return HistoryEngine.instance;
  }

  /**
   * Initializes the history stack with the current project state.
   */
  public init(project: GameProject) {
    const clone = this.cloneProject(project);
    this.undoStack = [{ project: clone, actionLabel: 'Awal Proyek' }];
    this.redoStack = [];
    this.lastSerializedState = JSON.stringify(clone);
    this.notifyListeners();
  }

  /**
   * Pushes a new snapshot onto the undo stack if state changed.
   */
  public pushState(project: GameProject, actionLabel?: string) {
    if (this.isBatching) return;

    const serialized = JSON.stringify(project);
    if (serialized === this.lastSerializedState) {
      // No state difference, ignore duplicate snapshot
      return;
    }

    const clone = this.cloneProject(project);
    this.undoStack.push({ project: clone, actionLabel });

    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift(); // Maintain max stack bounds
    }

    this.redoStack = []; // Clear redo stack on new user action
    this.lastSerializedState = serialized;
    this.notifyListeners();
  }

  /**
   * Temporarily pauses history snapshots (e.g. during continuous drag)
   */
  public startBatch() {
    this.isBatching = true;
  }

  /**
   * Ends batching and commits final project state
   */
  public endBatch(project: GameProject, actionLabel?: string) {
    this.isBatching = false;
    this.pushState(project, actionLabel);
  }

  /**
   * Performs an Undo operation. Returns the previous GameProject or null.
   */
  public undo(): { project: GameProject; actionLabel?: string } | null {
    if (this.undoStack.length <= 1) {
      return null;
    }

    // Pop top current state from undo stack
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    // Peak previous state
    const previous = this.undoStack[this.undoStack.length - 1];
    const clone = this.cloneProject(previous.project);
    this.lastSerializedState = JSON.stringify(clone);
    this.notifyListeners();

    return { project: clone, actionLabel: current.actionLabel };
  }

  /**
   * Performs a Redo operation. Returns the next GameProject or null.
   */
  public redo(): { project: GameProject; actionLabel?: string } | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    const next = this.redoStack.pop()!;
    this.undoStack.push(next);

    const clone = this.cloneProject(next.project);
    this.lastSerializedState = JSON.stringify(clone);
    this.notifyListeners();

    return { project: clone, actionLabel: next.actionLabel };
  }

  public canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoActionLabel(): string | undefined {
    if (this.undoStack.length > 1) {
      return this.undoStack[this.undoStack.length - 1].actionLabel;
    }
    return undefined;
  }

  public getRedoActionLabel(): string | undefined {
    if (this.redoStack.length > 0) {
      return this.redoStack[this.redoStack.length - 1].actionLabel;
    }
    return undefined;
  }

  public getHistoryCount(): { undoCount: number; redoCount: number } {
    return {
      undoCount: Math.max(0, this.undoStack.length - 1),
      redoCount: this.redoStack.length,
    };
  }

  public subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener);
    listener(this.canUndo(), this.canRedo(), this.getUndoActionLabel());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const undoable = this.canUndo();
    const redoable = this.canRedo();
    const lastAction = this.getUndoActionLabel();
    this.listeners.forEach((listener) => listener(undoable, redoable, lastAction));
  }

  private cloneProject(project: GameProject): GameProject {
    return JSON.parse(JSON.stringify(project));
  }
}

export const historyEngine = HistoryEngine.getInstance();
