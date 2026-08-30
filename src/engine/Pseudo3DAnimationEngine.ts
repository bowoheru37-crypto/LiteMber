import { TransformComponent, Entity, Vector2D } from '../types/engine';

export interface Matrix2D {
  a: number; // scaleX / cos
  b: number; // skewY / sin
  c: number; // skewX / -sin
  d: number; // scaleY / cos
  e: number; // translateX
  f: number; // translateY
}

export interface Bone3D {
  id: string;
  name: string;
  parentId?: string;
  length: number;
  localOffsetX: number;
  localOffsetY: number;
  localOffsetZ: number;
  rotationX: number; // Pitch
  rotationY: number; // Yaw
  rotationZ: number; // Roll
  // Computed world coordinates
  worldX?: number;
  worldY?: number;
  worldZ?: number;
}

export interface SkeletonRig3D {
  id: string;
  name: string;
  bones: Bone3D[];
  ikTarget?: { x: number; y: number; z: number; endBoneId: string };
}

export interface MorphVertex3D {
  x: number;
  y: number;
  z: number;
}

export interface MorphTarget3D {
  id: string;
  name: string;
  vertices: MorphVertex3D[];
}

export interface NormalMap3DLight {
  lightX: number; // 3D Light source X
  lightY: number; // 3D Light source Y
  lightZ: number; // 3D Light source Z (Depth above sprite)
  color: string;
  intensity: number;
  specularPower: number;
}

export type Pseudo3DPresetType =
  | 'coin_spin_3d'
  | 'card_flip_3d'
  | 'perspective_tilt_3d'
  | 'billboard_camera_3d'
  | 'depth_pulse_3d'
  | 'wobble_3d';

export class Pseudo3DAnimationEngine {
  private static defaultPerspective = 500; // Default focal distance F in px

  /**
   * METHOD 1: 3D Matrix Projection & Perspective Transforms
   * Calculates a 2D affine transformation matrix that projects 3D Euler rotations (Pitch, Yaw, Roll)
   * and 3D depth perspective onto a 2D Canvas context.
   */
  public static compute3DProjectionMatrix(
    transform: TransformComponent,
    customPerspective?: number
  ): Matrix2D {
    const rotX = ((transform.rotationX || 0) * Math.PI) / 180; // Pitch
    const rotY = ((transform.rotationY || 0) * Math.PI) / 180; // Yaw
    const rotZ = ((transform.rotation || transform.rotationZ || 0) * Math.PI) / 180; // Roll
    const depthZ = transform.depthZ || 0;
    const F = customPerspective || transform.perspective || this.defaultPerspective;

    // Perspective depth scale factor k = F / (F + Z)
    const perspectiveScale = F / Math.max(1, F + depthZ);

    // Composite 3D rotation trigonometric components
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosZ = Math.cos(rotZ);
    const sinZ = Math.sin(rotZ);

    // Apply 2.5D skew factors
    const skewX = transform.skewX || 0;
    const skewY = transform.skewY || 0;

    // Combine 3D Euler matrix projections into 2D affine transformation terms
    // scaleX = cos(Yaw) * scaleX * perspectiveScale
    // scaleY = cos(Pitch) * scaleY * perspectiveScale
    const projScaleX = transform.scaleX * cosY * perspectiveScale;
    const projScaleY = transform.scaleY * cosX * perspectiveScale;

    const a = (cosZ * projScaleX - sinZ * skewY);
    const b = (sinZ * projScaleX + cosZ * skewY);
    const c = (-sinZ * projScaleY + cosZ * skewX);
    const d = (cosZ * projScaleY + sinZ * skewX);

    // 3D Pitch tilt shifts vertical perspective center slightly
    const pitchCenterShiftY = sinX * (transform.height / 4) * perspectiveScale;
    const yawCenterShiftX = sinY * (transform.width / 4) * perspectiveScale;

    return {
      a,
      b,
      c,
      d,
      e: yawCenterShiftX,
      f: pitchCenterShiftY,
    };
  }

  /**
   * Applies the computed 3D matrix projection to a Canvas context.
   */
  public static apply3DCanvasTransform(
    ctx: CanvasRenderingContext2D,
    transform: TransformComponent,
    customPerspective?: number
  ) {
    const mat = this.compute3DProjectionMatrix(transform, customPerspective);
    ctx.transform(mat.a, mat.b, mat.c, mat.d, mat.e, mat.f);
  }

  /**
   * METHOD 2: 3D Preset Animation Generator
   * Computes animated 3D rotation angles for 2D sprites based on timer milliseconds.
   */
  public static updatePreset3DAnimation(
    transform: TransformComponent,
    preset: Pseudo3DPresetType,
    timeMs: number,
    speedScale: number = 1.0
  ): TransformComponent {
    const t = (timeMs / 1000) * speedScale;
    const updated = { ...transform };

    switch (preset) {
      case 'coin_spin_3d':
        // Continuous 3D Y-axis spinning (Yaw)
        updated.rotationY = (t * 180) % 360;
        updated.depthZ = Math.sin(t * Math.PI * 2) * 15;
        break;

      case 'card_flip_3d': {
        // Continuous 3D card flip
        const flipAngle = (t * 120) % 360;
        updated.rotationY = flipAngle;
        updated.depthZ = Math.sin((flipAngle * Math.PI) / 180) * 40;
        break;
      }

      case 'perspective_tilt_3d':
        // Gentle 3D floating perspective tilt (Pitch & Roll)
        updated.rotationX = Math.sin(t * 2) * 25;
        updated.rotationY = Math.cos(t * 1.5) * 20;
        updated.rotationZ = Math.sin(t * 0.8) * 8;
        updated.depthZ = Math.sin(t * 3) * 25;
        break;

      case 'billboard_camera_3d':
        // Align 3D rotation angles to counter camera tilt
        updated.rotationX = 0;
        updated.rotationY = 0;
        updated.rotationZ = transform.rotation || 0;
        break;

      case 'depth_pulse_3d':
        // Pulsing in 3D perspective depth Z
        updated.depthZ = Math.sin(t * 4) * 80;
        updated.perspective = 400 + Math.cos(t * 2) * 100;
        break;

      case 'wobble_3d':
        // 3D jelly wobble
        updated.rotationX = Math.sin(t * 8) * 18;
        updated.rotationY = Math.cos(t * 6) * 18;
        updated.skewX = Math.sin(t * 10) * 0.15;
        updated.skewY = Math.cos(t * 10) * 0.15;
        break;
    }

    return updated;
  }

  /**
   * METHOD 3: 2.5D Skeletal Rigging & 3D Inverse Kinematics (IK)
   * Updates 3D joint hierarchy and solves 3D IK targets for 2D character limbs.
   */
  public static solveSkeleton3DRig(rig: SkeletonRig3D, focalDistance: number = 500): SkeletonRig3D {
    const updatedBones = [...rig.bones];
    const boneMap = new Map<string, Bone3D>();

    // Forward Kinematics pass (Parent -> Child 3D matrix cascade)
    for (let i = 0; i < updatedBones.length; i++) {
      const bone = { ...updatedBones[i] };
      const parent = bone.parentId ? boneMap.get(bone.parentId) : undefined;

      const parentX = parent?.worldX || 0;
      const parentY = parent?.worldY || 0;
      const parentZ = parent?.worldZ || 0;

      const rotX = ((bone.rotationX + (parent?.rotationX || 0)) * Math.PI) / 180;
      const rotY = ((bone.rotationY + (parent?.rotationY || 0)) * Math.PI) / 180;
      const rotZ = ((bone.rotationZ + (parent?.rotationZ || 0)) * Math.PI) / 180;

      // Local 3D vector offset
      const dx = Math.cos(rotZ) * Math.cos(rotY) * bone.length + bone.localOffsetX;
      const dy = Math.sin(rotZ) * Math.cos(rotX) * bone.length + bone.localOffsetY;
      const dz = Math.sin(rotY) * Math.sin(rotX) * bone.length + bone.localOffsetZ;

      bone.worldX = parentX + dx;
      bone.worldY = parentY + dy;
      bone.worldZ = parentZ + dz;

      boneMap.set(bone.id, bone);
      updatedBones[i] = bone;
    }

    // Solve Inverse Kinematics if target provided (Analytical 2-Bone 3D IK)
    if (rig.ikTarget && updatedBones.length >= 2) {
      const target = rig.ikTarget;
      const endBone = updatedBones.find((b) => b.id === target.endBoneId);
      if (endBone && endBone.parentId) {
        const rootBone = updatedBones.find((b) => b.id === endBone.parentId);
        if (rootBone) {
          const dx = target.x - (rootBone.worldX || 0);
          const dy = target.y - (rootBone.worldY || 0);
          const dz = target.z - (rootBone.worldZ || 0);
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          const l1 = rootBone.length;
          const l2 = endBone.length;

          if (dist > 0 && dist < l1 + l2) {
            // Law of Cosines for 3D Joint Angle
            const cosAngle = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
            const clampedCos = Math.max(-1, Math.min(1, cosAngle));
            const ikAngleRad = Math.acos(clampedCos);

            const baseAngleZ = (Math.atan2(dy, dx) * 180) / Math.PI;
            const baseAngleY = (Math.atan2(dz, dx) * 180) / Math.PI;

            rootBone.rotationZ = baseAngleZ - (ikAngleRad * 180) / Math.PI;
            rootBone.rotationY = baseAngleY;
            endBone.rotationZ = (ikAngleRad * 2 * 180) / Math.PI;
          }
        }
      }
    }

    return { ...rig, bones: updatedBones };
  }

  /**
   * Renders 3D Bone Skeletal Rig overlay onto Canvas
   */
  public static renderSkeleton3DRigOverlay(
    ctx: CanvasRenderingContext2D,
    rig: SkeletonRig3D,
    focalDistance: number = 500
  ) {
    ctx.save();
    ctx.lineWidth = 3;

    rig.bones.forEach((bone) => {
      const parent = rig.bones.find((b) => b.id === bone.parentId);
      const px = parent ? parent.worldX || 0 : 0;
      const py = parent ? parent.worldY || 0 : 0;
      const pz = parent ? parent.worldZ || 0 : 0;

      const bx = bone.worldX || 0;
      const by = bone.worldY || 0;
      const bz = bone.worldZ || 0;

      // Project 3D bone positions to 2D screen coordinates with perspective depth
      const parentScale = focalDistance / Math.max(1, focalDistance + pz);
      const boneScale = focalDistance / Math.max(1, focalDistance + bz);

      const sx1 = px * parentScale;
      const sy1 = py * parentScale;
      const sx2 = bx * boneScale;
      const sy2 = by * boneScale;

      // Bone connection line
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      // Joint node
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(sx2, sy2, 4 * boneScale, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * METHOD 4: 3D Morph Target / Vertex Interpolation (Blend Shapes)
   * Interpolates 3D mesh vertices between base shape and target shape based on blend weight (0..1).
   */
  public static interpolateMorphTargets3D(
    baseVertices: MorphVertex3D[],
    target: MorphTarget3D,
    weight: number
  ): MorphVertex3D[] {
    const w = Math.max(0, Math.min(1, weight));
    return baseVertices.map((v, idx) => {
      const tv = target.vertices[idx] || v;
      return {
        x: v.x + (tv.x - v.x) * w,
        y: v.y + (tv.y - v.y) * w,
        z: v.z + (tv.z - v.z) * w,
      };
    });
  }

  /**
   * METHOD 5: 3D Normal Map & Specular Light Vector Calculation
   * Computes 3D Phong illumination highlights on 2D sprite surfaces.
   */
  public static compute3DNormalLightingHighlight(
    normalX: number,
    normalY: number,
    normalZ: number,
    light: NormalMap3DLight
  ): { diffuse: number; specular: number } {
    // Normalize surface normal vector
    const nLen = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ) || 1;
    const nx = normalX / nLen;
    const ny = normalY / nLen;
    const nz = normalZ / nLen;

    // Normalize light direction vector
    const lLen = Math.sqrt(light.lightX * light.lightX + light.lightY * light.lightY + light.lightZ * light.lightZ) || 1;
    const lx = light.lightX / lLen;
    const ly = light.lightY / lLen;
    const lz = light.lightZ / lLen;

    // Dot product N . L (Lambertian Diffuse)
    const dotNL = Math.max(0, nx * lx + ny * ly + nz * lz);
    const diffuse = dotNL * light.intensity;

    // Specular Reflection Highlight (Phong)
    // Halfway vector H = (L + V) / |L + V| where View V = (0, 0, 1)
    const hx = lx;
    const hy = ly;
    const hz = lz + 1;
    const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
    const dotNH = Math.max(0, nx * (hx / hLen) + ny * (hy / hLen) + nz * (hz / hLen));
    const specular = Math.pow(dotNH, light.specularPower) * light.intensity;

    return { diffuse, specular };
  }
}
