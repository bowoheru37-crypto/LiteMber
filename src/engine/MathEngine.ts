/**
 * MathEngine.ts
 * High-performance 2D Math & Trigonometric Lookup Engine
 * Optimized for entry-level ARM Cortex-A55 CPUs (e.g. Unisoc T606 / itel A70).
 */

export class MathEngine {
  private static readonly LUT_SIZE = 1024;
  private static readonly LUT_MASK = 1023;
  private static readonly RAD_TO_LUT = MathEngine.LUT_SIZE / (Math.PI * 2);

  private static sinTable: Float32Array = new Float32Array(MathEngine.LUT_SIZE);
  private static cosTable: Float32Array = new Float32Array(MathEngine.LUT_SIZE);
  private static initialized = false;

  // Float32/Int32 buffers for fast bitwise inverse square root
  private static f32Buf = new Float32Array(1);
  private static i32Buf = new Int32Array(MathEngine.f32Buf.buffer);

  public static init() {
    if (this.initialized) return;
    for (let i = 0; i < MathEngine.LUT_SIZE; i++) {
      const rad = (i / MathEngine.LUT_SIZE) * Math.PI * 2;
      MathEngine.sinTable[i] = Math.sin(rad);
      MathEngine.cosTable[i] = Math.cos(rad);
    }
    this.initialized = true;
  }

  /**
   * Fast O(1) Sine via precomputed Float32 LUT
   */
  public static fastSin(radians: number): number {
    if (!this.initialized) this.init();
    const index = (radians * MathEngine.RAD_TO_LUT) & MathEngine.LUT_MASK;
    return MathEngine.sinTable[index >= 0 ? index : index + MathEngine.LUT_SIZE];
  }

  /**
   * Fast O(1) Cosine via precomputed Float32 LUT
   */
  public static fastCos(radians: number): number {
    if (!this.initialized) this.init();
    const index = (radians * MathEngine.RAD_TO_LUT) & MathEngine.LUT_MASK;
    return MathEngine.cosTable[index >= 0 ? index : index + MathEngine.LUT_SIZE];
  }

  /**
   * Fast Inverse Square Root (Quake III Q_rsqrt adaptation in JS)
   */
  public static fastInverseSqrt(number: number): number {
    if (number <= 0) return 0;
    const x2 = number * 0.5;
    MathEngine.f32Buf[0] = number;
    MathEngine.i32Buf[0] = 0x5f3759df - (MathEngine.i32Buf[0] >> 1);
    let y = MathEngine.f32Buf[0];
    y = y * (1.5 - x2 * y * y); // 1st Newton iteration
    return y;
  }

  /**
   * Fast Euclidean Distance using fast inverse sqrt
   */
  public static fastDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distSq = dx * dx + dy * dy;
    if (distSq === 0) return 0;
    return 1 / MathEngine.fastInverseSqrt(distSq);
  }

  /**
   * Clamp value within [min, max]
   */
  public static clamp(val: number, min: number, max: number): number {
    return val < min ? min : val > max ? max : val;
  }

  /**
   * Linear Interpolation (Lerp)
   */
  public static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * MathEngine.clamp(t, 0, 1);
  }

  /**
   * Mulberry32 Fast Pseudo-Random Generator (Deterministic & Zero GC)
   */
  public static mulberry32(seed: number): () => number {
    return () => {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * AABB Box Collision Intersect Check
   */
  public static boxIntersect(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return (
      x1 < x2 + w2 &&
      x1 + w1 > x2 &&
      y1 < y2 + h2 &&
      y1 + h1 > y2
    );
  }

  /**
   * Circle vs Box Intersect Check
   */
  public static circleBoxIntersect(
    cx: number, cy: number, crad: number,
    bx: number, by: number, bw: number, bh: number
  ): boolean {
    const closestX = MathEngine.clamp(cx, bx, bx + bw);
    const closestY = MathEngine.clamp(cy, by, by + bh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < crad * crad;
  }
}

MathEngine.init();
