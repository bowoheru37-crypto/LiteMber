/**
 * AlgorithmEngine.ts
 * High-performance Algoritma Engine: Spatial Hashing Grid, Object Pooling, A* Pathfinding & GC-Free Sorting.
 * Optimized for low-memory Android devices (itel A70 Unisoc T606).
 */

import { Entity } from '../types/engine';

export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<number, Entity[]> = new Map();
  private candidateSet: Set<Entity> = new Set();
  private candidateArray: Entity[] = [];

  constructor(cellSize = 64) {
    this.cellSize = cellSize;
  }

  public clear(): void {
    this.grid.forEach((arr) => (arr.length = 0));
    this.grid.clear();
  }

  private getKeyInt(cx: number, cy: number): number {
    return (cx + 32768) * 65536 + (cy + 32768);
  }

  public insert(entity: Entity): void {
    if (!entity.visible) return;
    const minX = entity.transform.x;
    const minY = entity.transform.y;
    const maxX = entity.transform.x + entity.transform.width;
    const maxY = entity.transform.y + entity.transform.height;

    const startX = Math.floor(minX / this.cellSize);
    const startY = Math.floor(minY / this.cellSize);
    const endX = Math.floor(maxX / this.cellSize);
    const endY = Math.floor(maxY / this.cellSize);

    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const key = this.getKeyInt(cx, cy);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(entity);
      }
    }
  }

  /**
   * Get potential collision candidates for a given entity (zero-GC)
   */
  public getCandidates(entity: Entity): Entity[] {
    const minX = entity.transform.x;
    const minY = entity.transform.y;
    const maxX = entity.transform.x + entity.transform.width;
    const maxY = entity.transform.y + entity.transform.height;

    const startX = Math.floor(minX / this.cellSize);
    const startY = Math.floor(minY / this.cellSize);
    const endX = Math.floor(maxX / this.cellSize);
    const endY = Math.floor(maxY / this.cellSize);

    this.candidateSet.clear();
    this.candidateArray.length = 0;

    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const key = this.getKeyInt(cx, cy);
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            if (cell[i].id !== entity.id) {
              this.candidateSet.add(cell[i]);
            }
          }
        }
      }
    }

    for (const item of this.candidateSet) {
      this.candidateArray.push(item);
    }
    return this.candidateArray;
  }
}

export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (item: T) => void;

  constructor(createFn: () => T, resetFn: (item: T) => void, initialCapacity = 64) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    for (let i = 0; i < initialCapacity; i++) {
      this.pool.push(this.createFn());
    }
  }

  public get(): T {
    const item = this.pool.length > 0 ? this.pool.pop()! : this.createFn();
    this.resetFn(item);
    return item;
  }

  public release(item: T): void {
    this.pool.push(item);
  }
}

export class AlgorithmEngine {
  /**
   * In-place zero-allocation Insertion Sort for Entities by zIndex
   */
  public static sortByZIndex(entities: Entity[]): void {
    const len = entities.length;
    for (let i = 1; i < len; i++) {
      const key = entities[i];
      const keyZ = key.transform.zIndex || 0;
      let j = i - 1;

      while (j >= 0 && (entities[j].transform.zIndex || 0) > keyZ) {
        entities[j + 1] = entities[j];
        j--;
      }
      entities[j + 1] = key;
    }
  }
}
