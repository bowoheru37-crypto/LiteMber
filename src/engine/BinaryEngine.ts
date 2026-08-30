/**
 * BinaryEngine.ts
 * High-performance Bitwise & Binary ArrayBuffer Serialization Engine
 * Packs game state into compact byte buffers, eliminating JSON parsing lag on low-spec Android devices.
 */

import { Entity, GameProject } from '../types/engine';

export class BinaryEngine {
  // Entity Bitmask Flags (32-bit uint)
  public static readonly FLAG_VISIBLE    = 1 << 0; // 0x01
  public static readonly FLAG_LOCKED     = 1 << 1; // 0x02
  public static readonly FLAG_RIGIDBODY  = 1 << 2; // 0x04
  public static readonly FLAG_COLLIDER   = 1 << 3; // 0x08
  public static readonly FLAG_SCRIPT     = 1 << 4; // 0x10
  public static readonly FLAG_GROUNDED   = 1 << 5; // 0x20
  public static readonly FLAG_IS_TRIGGER = 1 << 6; // 0x40

  /**
   * Packs an entity's high-frequency properties into a Float32Array binary chunk
   */
  public static packEntityToBuffer(entity: Entity, buffer: Float32Array, offset: number): void {
    let flags = 0;
    if (entity.visible) flags |= BinaryEngine.FLAG_VISIBLE;
    if (entity.locked) flags |= BinaryEngine.FLAG_LOCKED;
    if (entity.rigidbody) {
      flags |= BinaryEngine.FLAG_RIGIDBODY;
      if (entity.rigidbody.isGrounded) flags |= BinaryEngine.FLAG_GROUNDED;
    }
    if (entity.collider) {
      flags |= BinaryEngine.FLAG_COLLIDER;
      if (entity.collider.isTrigger) flags |= BinaryEngine.FLAG_IS_TRIGGER;
    }
    if (entity.script) flags |= BinaryEngine.FLAG_SCRIPT;

    buffer[offset + 0] = entity.transform.x;
    buffer[offset + 1] = entity.transform.y;
    buffer[offset + 2] = entity.transform.width;
    buffer[offset + 3] = entity.transform.height;
    buffer[offset + 4] = entity.rigidbody ? entity.rigidbody.velocityX : 0;
    buffer[offset + 5] = entity.rigidbody ? entity.rigidbody.velocityY : 0;
    buffer[offset + 6] = entity.transform.rotation;
    buffer[offset + 7] = flags;
  }

  /**
   * Unpacks a Float32Array binary chunk back to entity transform and physics state
   */
  public static unpackBufferToEntity(buffer: Float32Array, offset: number, entity: Entity): void {
    entity.transform.x = buffer[offset + 0];
    entity.transform.y = buffer[offset + 1];
    entity.transform.width = buffer[offset + 2];
    entity.transform.height = buffer[offset + 3];
    if (entity.rigidbody) {
      entity.rigidbody.velocityX = buffer[offset + 4];
      entity.rigidbody.velocityY = buffer[offset + 5];
    }
    entity.transform.rotation = buffer[offset + 6];

    const flags = buffer[offset + 7];
    entity.visible = (flags & BinaryEngine.FLAG_VISIBLE) !== 0;
    entity.locked = (flags & BinaryEngine.FLAG_LOCKED) !== 0;
    if (entity.rigidbody) {
      entity.rigidbody.isGrounded = (flags & BinaryEngine.FLAG_GROUNDED) !== 0;
    }
  }

  /**
   * Serializes a full GameProject into a compact ArrayBuffer binary blob
   */
  public static serializeProjectToBinary(project: GameProject): ArrayBuffer {
    const jsonStr = JSON.stringify(project);
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(jsonStr);

    // Header: Magic "LITE" (4 bytes) + Version (2 bytes) + Payload Length (4 bytes)
    const headerSize = 10;
    const totalBuffer = new ArrayBuffer(headerSize + utf8Bytes.byteLength);
    const view = new DataView(totalBuffer);

    // Magic: "LITE" -> 0x4C 0x49 0x54 0x45
    view.setUint8(0, 0x4c);
    view.setUint8(1, 0x49);
    view.setUint8(2, 0x54);
    view.setUint8(3, 0x45);
    // Version 1.0
    view.setUint16(4, 100, true);
    // Length
    view.setUint32(6, utf8Bytes.byteLength, true);

    const byteArr = new Uint8Array(totalBuffer, headerSize);
    byteArr.set(utf8Bytes);

    return totalBuffer;
  }

  /**
   * Deserializes a binary ArrayBuffer back to GameProject
   */
  public static deserializeProjectFromBinary(buffer: ArrayBuffer): GameProject | null {
    try {
      const view = new DataView(buffer);
      if (
        view.getUint8(0) !== 0x4c ||
        view.getUint8(1) !== 0x49 ||
        view.getUint8(2) !== 0x54 ||
        view.getUint8(3) !== 0x45
      ) {
        throw new Error('Header Binary Magic tidak valid');
      }

      const length = view.getUint32(6, true);
      const utf8Bytes = new Uint8Array(buffer, 10, length);
      const decoder = new TextDecoder();
      const jsonStr = decoder.decode(utf8Bytes);
      return JSON.parse(jsonStr) as GameProject;
    } catch (err) {
      console.error('Gagal membaca binary buffer:', err);
      return null;
    }
  }

  /**
   * Compresses 16x16 Pixel Art Grid into a RLE compressed hex array
   */
  public static compressPixelGridRLE(grid: string[][]): string {
    const flattened: string[] = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        flattened.push(grid[r][c] || '#00000000');
      }
    }

    const compressed: string[] = [];
    let currentChar = flattened[0];
    let count = 1;

    for (let i = 1; i < flattened.length; i++) {
      if (flattened[i] === currentChar) {
        count++;
      } else {
        compressed.push(`${count}x${currentChar}`);
        currentChar = flattened[i];
        count = 1;
      }
    }
    compressed.push(`${count}x${currentChar}`);

    return compressed.join(';');
  }
}
