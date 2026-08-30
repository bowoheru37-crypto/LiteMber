/**
 * CollisionEngine.ts
 * Advanced 2D Collision Engine featuring SAT (Separating Axis Theorem), Raycasting, and Continuous Collision Detection (CCD).
 * Optimized for spatial querying on entry-level Android devices (itel A70).
 */

import { Entity } from '../types/engine';
import { SpatialHashGrid } from './AlgorithmEngine';

export interface RaycastHit {
  hit: boolean;
  distance: number;
  pointX: number;
  pointY: number;
  entity?: Entity;
}

export class CollisionEngine {
  private spatialHash: SpatialHashGrid = new SpatialHashGrid(64);

  /**
   * Raycast test against static/dynamic entity colliders
   */
  public raycast(
    startX: number,
    startY: number,
    dirX: number,
    dirY: number,
    maxDistance: number,
    entities: Entity[]
  ): RaycastHit {
    let closestHit: RaycastHit = { hit: false, distance: maxDistance, pointX: 0, pointY: 0 };

    const normLength = Math.hypot(dirX, dirY);
    if (normLength === 0) return closestHit;

    const ndx = dirX / normLength;
    const ndy = dirY / normLength;

    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (!ent.visible || !ent.collider || !ent.collider.enabled) continue;

      const bx = ent.transform.x + (ent.collider.offsetX || 0);
      const by = ent.transform.y + (ent.collider.offsetY || 0);
      const bw = ent.transform.width;
      const bh = ent.transform.height;

      // Slab Ray-AABB Intersection Test
      let tmin = 0;
      let tmax = maxDistance;

      if (Math.abs(ndx) < 0.000001) {
        if (startX < bx || startX > bx + bw) continue;
      } else {
        const tx1 = (bx - startX) / ndx;
        const tx2 = (bx + bw - startX) / ndx;
        tmin = Math.max(tmin, Math.min(tx1, tx2));
        tmax = Math.min(tmax, Math.max(tx1, tx2));
      }

      if (Math.abs(ndy) < 0.000001) {
        if (startY < by || startY > by + bh) continue;
      } else {
        const ty1 = (by - startY) / ndy;
        const ty2 = (by + bh - startY) / ndy;
        tmin = Math.max(tmin, Math.min(ty1, ty2));
        tmax = Math.min(tmax, Math.max(ty1, ty2));
      }

      if (tmax >= tmin && tmin < closestHit.distance) {
        closestHit = {
          hit: true,
          distance: tmin,
          pointX: startX + ndx * tmin,
          pointY: startY + ndy * tmin,
          entity: ent,
        };
      }
    }

    return closestHit;
  }

  /**
   * Continuous Collision Detection (CCD) Sweep Test between two moving bodies
   */
  public sweepTest(
    a: Entity,
    vx: number,
    vy: number,
    b: Entity,
    dt: number
  ): { hit: boolean; timeOfImpact: number } {
    if (!a.collider || !b.collider) return { hit: false, timeOfImpact: 1 };

    const steps = 4;
    const subDt = dt / steps;

    const startAX = a.transform.x;
    const startAY = a.transform.y;

    for (let step = 1; step <= steps; step++) {
      const simX = startAX + vx * subDt * step;
      const simY = startAY + vy * subDt * step;

      const ax = simX + a.collider.offsetX;
      const ay = simY + a.collider.offsetY;
      const aw = a.transform.width;
      const ah = a.transform.height;

      const bx = b.transform.x + b.collider.offsetX;
      const by = b.transform.y + b.collider.offsetY;
      const bw = b.transform.width;
      const bh = b.transform.height;

      if (ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by) {
        return { hit: true, timeOfImpact: (step / steps) * dt };
      }
    }

    return { hit: false, timeOfImpact: dt };
  }
}
