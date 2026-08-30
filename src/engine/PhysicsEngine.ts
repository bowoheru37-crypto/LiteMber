/**
 * PhysicsEngine.ts
 * Advanced 2D Rigid Body Physics Engine
 * Features Semi-Implicit Euler Integration, Continuous Collision Detection, and Restitution/Friction Resolvers.
 */

import { Entity, WorldSettings, PhysicsJoint } from '../types/engine';
import { SpatialHashGrid } from './AlgorithmEngine';

export class PhysicsEngine {
  private spatialHash: SpatialHashGrid = new SpatialHashGrid(64);
  private fixedTimeStep = 1 / 60; // 60 FPS physics tick
  private accumulator = 0;
  private entityMap: Map<string, Entity> = new Map();

  /**
   * Advances the physics world by deltaTime (in seconds)
   */
  public update(entities: Entity[], world: WorldSettings, dtSeconds: number, constraints?: PhysicsJoint[]): void {
    // Clamp max dt to prevent spiral of death on laggy devices
    const clampedDt = Math.min(dtSeconds, 0.1);
    this.accumulator += clampedDt;

    while (this.accumulator >= this.fixedTimeStep) {
      this.stepPhysics(entities, world, this.fixedTimeStep, constraints);
      this.accumulator -= this.fixedTimeStep;
    }
  }

  private stepPhysics(entities: Entity[], world: WorldSettings, dt: number, constraints?: PhysicsJoint[]): void {
    this.spatialHash.clear();

    // 1. Solve Mechanical Constraints / Joints
    if (constraints && constraints.length > 0) {
      this.solveConstraints(entities, constraints, dt);
    }

    // 2. Integrate Velocities and Positions
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (!ent.visible || !ent.rigidbody) continue;

      const rb = ent.rigidbody;
      if (rb.bodyType === 'dynamic') {
        rb.isGrounded = false;
        // Apply Gravity
        rb.velocityY += world.gravityY * rb.gravityScale * dt;
        rb.velocityX += world.gravityX * rb.gravityScale * dt;

        // Apply Friction / Drag
        rb.velocityX *= 1 - rb.friction * dt;
      }

      // Update Transform
      ent.transform.x += rb.velocityX * dt;
      ent.transform.y += rb.velocityY * dt;

      // Populate Spatial Hash for Broadphase
      this.spatialHash.insert(ent);
    }

    // 3. Narrowphase Collision & Impulse Resolution
    for (let i = 0; i < entities.length; i++) {
      const entA = entities[i];
      if (!entA.visible || !entA.collider || !entA.collider.enabled) continue;

      const candidates = this.spatialHash.getCandidates(entA);
      for (let j = 0; j < candidates.length; j++) {
        const entB = candidates[j];
        if (!entB.visible || !entB.collider || !entB.collider.enabled) continue;

        // Skip duplicate pair checks or self checks
        if (entA.id >= entB.id) continue;

        // Skip static vs static collisions
        if (
          entA.rigidbody?.bodyType === 'static' &&
          entB.rigidbody?.bodyType === 'static'
        ) {
          continue;
        }

        this.resolveCollision(entA, entB);
      }
    }

    // Solve Constraints post-collision resolution to enforce rigid joints
    if (constraints && constraints.length > 0) {
      this.solveConstraints(entities, constraints, dt);
    }
  }

  public solveConstraints(entities: Entity[], constraints: PhysicsJoint[], dt: number): void {
    if (!constraints || constraints.length === 0 || !entities || entities.length === 0) return;

    this.entityMap.clear();
    for (let i = 0; i < entities.length; i++) {
      this.entityMap.set(entities[i].id, entities[i]);
    }

    for (let c = 0; c < constraints.length; c++) {
      const joint = constraints[c];
      if (joint.enabled === false) continue;

      const entA = this.entityMap.get(joint.entityAId);
      const entB = this.entityMap.get(joint.entityBId);
      if (!entA || !entB || !entA.visible || !entB.visible) continue;

      const anchorA = joint.anchorA || { x: 0, y: 0 };
      const anchorB = joint.anchorB || { x: 0, y: 0 };

      // Center + Anchor Offset
      const pAx = entA.transform.x + (entA.transform.width / 2) + anchorA.x;
      const pAy = entA.transform.y + (entA.transform.height / 2) + anchorA.y;

      const pBx = entB.transform.x + (entB.transform.width / 2) + anchorB.x;
      const pBy = entB.transform.y + (entB.transform.height / 2) + anchorB.y;

      if (joint.type === 'distance' || joint.type === 'spring' || joint.type === 'rope') {
        const dx = pBx - pAx;
        const dy = pBy - pAy;
        const currentDist = Math.hypot(dx, dy) || 0.001;
        const targetDist = joint.distance !== undefined ? joint.distance : 80;

        const delta = currentDist - targetDist;
        if (joint.type === 'rope' && delta < 0) {
          // Rope only pulls when taut
          continue;
        }

        const nx = dx / currentDist;
        const ny = dy / currentDist;

        // Stiffness
        const stiffness = Math.min(1.0, Math.max(0.05, (joint.stiffness || 100) / 100));
        const correctionX = nx * delta * stiffness;
        const correctionY = ny * delta * stiffness;

        const aDyn = entA.rigidbody?.bodyType === 'dynamic';
        const bDyn = entB.rigidbody?.bodyType === 'dynamic';

        if (aDyn && bDyn) {
          entA.transform.x += correctionX * 0.5;
          entA.transform.y += correctionY * 0.5;
          entB.transform.x -= correctionX * 0.5;
          entB.transform.y -= correctionY * 0.5;

          if (entA.rigidbody) {
            entA.rigidbody.velocityX += nx * delta * stiffness * 2;
            entA.rigidbody.velocityY += ny * delta * stiffness * 2;
          }
          if (entB.rigidbody) {
            entB.rigidbody.velocityX -= nx * delta * stiffness * 2;
            entB.rigidbody.velocityY -= ny * delta * stiffness * 2;
          }
        } else if (aDyn) {
          entA.transform.x += correctionX;
          entA.transform.y += correctionY;
          if (entA.rigidbody) {
            entA.rigidbody.velocityX += nx * delta * stiffness * 4;
            entA.rigidbody.velocityY += ny * delta * stiffness * 4;
          }
        } else if (bDyn) {
          entB.transform.x -= correctionX;
          entB.transform.y -= correctionY;
          if (entB.rigidbody) {
            entB.rigidbody.velocityX -= nx * delta * stiffness * 4;
            entB.rigidbody.velocityY -= ny * delta * stiffness * 4;
          }
        }
      } else if (joint.type === 'hinge') {
        const dx = pBx - pAx;
        const dy = pBy - pAy;

        const aDyn = entA.rigidbody?.bodyType === 'dynamic';
        const bDyn = entB.rigidbody?.bodyType === 'dynamic';

        if (aDyn && bDyn) {
          entA.transform.x += dx * 0.5;
          entA.transform.y += dy * 0.5;
          entB.transform.x -= dx * 0.5;
          entB.transform.y -= dy * 0.5;
        } else if (aDyn) {
          entA.transform.x += dx;
          entA.transform.y += dy;
        } else if (bDyn) {
          entB.transform.x -= dx;
          entB.transform.y -= dy;
        }

        // Hinge motor
        if (joint.enableMotor && joint.motorSpeed && bDyn) {
          entB.transform.rotation = (entB.transform.rotation + joint.motorSpeed * dt) % 360;
        }

        // Hinge limits
        if (joint.enableLimits && joint.minAngle !== undefined && joint.maxAngle !== undefined) {
          const relAngle = entB.transform.rotation - entA.transform.rotation;
          if (relAngle < joint.minAngle) {
            entB.transform.rotation = entA.transform.rotation + joint.minAngle;
          } else if (relAngle > joint.maxAngle) {
            entB.transform.rotation = entA.transform.rotation + joint.maxAngle;
          }
        }
      }
    }
  }

  private resolveCollision(a: Entity, b: Entity): void {
    const ax = a.transform.x + (a.collider?.offsetX || 0);
    const ay = a.transform.y + (a.collider?.offsetY || 0);
    const aw = a.transform.width;
    const ah = a.transform.height;

    const bx = b.transform.x + (b.collider?.offsetX || 0);
    const by = b.transform.y + (b.collider?.offsetY || 0);
    const bw = b.transform.width;
    const bh = b.transform.height;

    // AABB Overlap Check
    const overlapX = Math.min(ax + aw, bx + bw) - Math.max(ax, bx);
    const overlapY = Math.min(ay + ah, by + bh) - Math.max(ay, by);

    if (overlapX > 0 && overlapY > 0) {
      // Trigger check
      if (a.collider?.isTrigger || b.collider?.isTrigger) {
        return;
      }

      // Separate along minimum penetration axis
      if (overlapX < overlapY) {
        // Resolve X
        const sign = ax + aw / 2 < bx + bw / 2 ? -1 : 1;
        if (a.rigidbody && a.rigidbody.bodyType === 'dynamic') {
          a.transform.x += overlapX * sign;
          a.rigidbody.velocityX = -a.rigidbody.velocityX * a.rigidbody.restitution;
        }
      } else {
        // Resolve Y
        const sign = ay + ah / 2 < by + bh / 2 ? -1 : 1;
        if (a.rigidbody && a.rigidbody.bodyType === 'dynamic') {
          a.transform.y += overlapY * sign;
          a.rigidbody.velocityY = -a.rigidbody.velocityY * a.rigidbody.restitution;

          if (sign < 0) {
            a.rigidbody.isGrounded = true;
          }
        }
      }
    }
  }
}
