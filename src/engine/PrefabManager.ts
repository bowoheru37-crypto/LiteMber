import { Entity, Prefab, GameProject } from '../types/engine';

const LOCAL_STORAGE_KEY = 'ai_studio_user_prefabs_v1';

// Built-in Prefab Templates Collection
const BUILTIN_PREFABS: Prefab[] = [
  {
    id: 'pfb_hero_platformer',
    name: 'Hero Player (Platformer)',
    category: 'player',
    description: 'Karakter utama lengkap dengan Fisika Dynamic, Kontrol WASD/Lompat, Tag Player, dan Fokus Kamera.',
    icon: '👤',
    color: '#38bdf8',
    createdAt: '2026-08-11T00:00:00.000Z',
    isBuiltin: true,
    entities: [
      {
        id: 'ent_hero_template',
        name: 'Hero Player',
        type: 'player',
        visible: true,
        locked: false,
        transform: {
          x: 0,
          y: 0,
          width: 32,
          height: 48,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 10,
        },
        sprite: {
          type: 'preset',
          presetIcon: 'hero',
          color: '#38bdf8',
          borderRadius: 6,
          opacity: 1,
        },
        rigidbody: {
          bodyType: 'dynamic',
          mass: 1,
          gravityScale: 1.2,
          velocityX: 0,
          velocityY: 0,
          friction: 0.9,
          restitution: 0,
          isGrounded: false,
          fixedRotation: true,
        },
        collider: {
          enabled: true,
          type: 'box',
          isTrigger: false,
          offsetX: 0,
          offsetY: 0,
          width: 30,
          height: 46,
          radius: 15,
        },
        script: {
          tag: 'player',
          rules: [
            {
              id: 'rule_hero_move_left',
              enabled: true,
              name: 'Jalan Kiri',
              trigger: 'ON_KEY_PRESS',
              paramString: 'ArrowLeft',
              action: 'MOVE_LEFT',
              paramNumber: 150,
            },
            {
              id: 'rule_hero_move_right',
              enabled: true,
              name: 'Jalan Kanan',
              trigger: 'ON_KEY_PRESS',
              paramString: 'ArrowRight',
              action: 'MOVE_RIGHT',
              paramNumber: 150,
            },
            {
              id: 'rule_hero_jump',
              enabled: true,
              name: 'Lompat',
              trigger: 'ON_KEY_PRESS',
              paramString: 'Space',
              action: 'JUMP',
              paramNumber: 320,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'pfb_gold_coin',
    name: 'Koin Emas Bonus',
    category: 'item',
    description: 'Koin bonus melayang (+10 Poin) dengan sensor trigger, efek suara coin, dan partikel.',
    icon: '🪙',
    color: '#facc15',
    createdAt: '2026-08-11T00:00:00.000Z',
    isBuiltin: true,
    entities: [
      {
        id: 'ent_coin_template',
        name: 'Koin Emas',
        type: 'coin',
        visible: true,
        locked: false,
        transform: {
          x: 0,
          y: 0,
          width: 28,
          height: 28,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 5,
        },
        sprite: {
          type: 'preset',
          presetIcon: 'coin',
          color: '#facc15',
          borderRadius: 14,
          opacity: 1,
        },
        rigidbody: {
          bodyType: 'static',
          mass: 0,
          gravityScale: 0,
          velocityX: 0,
          velocityY: 0,
          friction: 0,
          restitution: 0,
          isGrounded: false,
          fixedRotation: true,
        },
        collider: {
          enabled: true,
          type: 'circle',
          isTrigger: true,
          offsetX: 0,
          offsetY: 0,
          width: 28,
          height: 28,
          radius: 14,
        },
        audioSource: {
          soundOnCollision: 'coin',
          volume: 1,
        },
        script: {
          tag: 'item',
          rules: [
            {
              id: 'rule_coin_add_score',
              enabled: true,
              name: 'Tambah Skor +10',
              trigger: 'ON_COLLISION_ENTER',
              action: 'ADD_SCORE',
              paramNumber: 10,
            },
            {
              id: 'rule_coin_sfx',
              enabled: true,
              name: 'Putar Suara Koin',
              trigger: 'ON_COLLISION_ENTER',
              action: 'PLAY_SOUND',
              paramString: 'coin',
            },
            {
              id: 'rule_coin_destroy',
              enabled: true,
              name: 'Hancurkan Koin Saat Ambil',
              trigger: 'ON_COLLISION_ENTER',
              action: 'DESTROY_SELF',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'pfb_enemy_alien',
    name: 'Musuh Alien Patroli',
    category: 'enemy',
    description: 'Musuh Alien dengan logika bahaya reset level dan fisika dynamic membal.',
    icon: '👾',
    color: '#ef4444',
    createdAt: '2026-08-11T00:00:00.000Z',
    isBuiltin: true,
    entities: [
      {
        id: 'ent_enemy_template',
        name: 'Musuh Alien',
        type: 'enemy',
        visible: true,
        locked: false,
        transform: {
          x: 0,
          y: 0,
          width: 36,
          height: 36,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 8,
        },
        sprite: {
          type: 'preset',
          presetIcon: 'monster',
          color: '#ef4444',
          borderRadius: 8,
          opacity: 1,
        },
        rigidbody: {
          bodyType: 'dynamic',
          mass: 1.5,
          gravityScale: 1,
          velocityX: 40,
          velocityY: 0,
          friction: 0.2,
          restitution: 0.5,
          isGrounded: false,
          fixedRotation: true,
        },
        collider: {
          enabled: true,
          type: 'box',
          isTrigger: false,
          offsetX: 0,
          offsetY: 0,
          width: 34,
          height: 34,
          radius: 17,
        },
        audioSource: {
          soundOnCollision: 'hit',
          volume: 1,
        },
        script: {
          tag: 'enemy',
          rules: [
            {
              id: 'rule_enemy_hazard',
              enabled: true,
              name: 'Tabrak Hero -> Reset Level',
              trigger: 'ON_COLLISION_ENTER',
              action: 'RESTART_LEVEL',
            },
            {
              id: 'rule_enemy_particles',
              enabled: true,
              name: 'Percikan Partikel Red Explosion',
              trigger: 'ON_COLLISION_ENTER',
              action: 'EMIT_PARTICLES',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'pfb_moving_platform',
    name: 'Platform Melayang Kinematic',
    category: 'platform',
    description: 'Pijakan melayang kokoh dengan bodi Kinematic untuk rintangan melompat.',
    icon: '📦',
    color: '#22c55e',
    createdAt: '2026-08-11T00:00:00.000Z',
    isBuiltin: true,
    entities: [
      {
        id: 'ent_platform_template',
        name: 'Platform Melayang',
        type: 'platform',
        visible: true,
        locked: false,
        transform: {
          x: 0,
          y: 0,
          width: 120,
          height: 24,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 2,
        },
        sprite: {
          type: 'preset',
          presetIcon: 'box',
          color: '#22c55e',
          borderRadius: 6,
          opacity: 1,
        },
        rigidbody: {
          bodyType: 'kinematic',
          mass: 0,
          gravityScale: 0,
          velocityX: 0,
          velocityY: 0,
          friction: 0.9,
          restitution: 0,
          isGrounded: false,
          fixedRotation: true,
        },
        collider: {
          enabled: true,
          type: 'box',
          isTrigger: false,
          offsetX: 0,
          offsetY: 0,
          width: 120,
          height: 24,
          radius: 12,
        },
      },
    ],
  },
  {
    id: 'pfb_trampoline_bounce',
    name: 'Trampolin Membal (Bounce Pad)',
    category: 'interactive',
    description: 'Pad trampolin dengan gaya dorong lompat tinggi saat disentuh.',
    icon: '🦘',
    color: '#a855f7',
    createdAt: '2026-08-11T00:00:00.000Z',
    isBuiltin: true,
    entities: [
      {
        id: 'ent_trampoline_template',
        name: 'Trampolin Membal',
        type: 'platform',
        visible: true,
        locked: false,
        transform: {
          x: 0,
          y: 0,
          width: 48,
          height: 16,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 3,
        },
        sprite: {
          type: 'preset',
          presetIcon: 'box',
          color: '#a855f7',
          borderRadius: 4,
          opacity: 1,
        },
        rigidbody: {
          bodyType: 'static',
          mass: 0,
          gravityScale: 0,
          velocityX: 0,
          velocityY: 0,
          friction: 0,
          restitution: 1,
          isGrounded: false,
          fixedRotation: true,
        },
        collider: {
          enabled: true,
          type: 'box',
          isTrigger: true,
          offsetX: 0,
          offsetY: 0,
          width: 48,
          height: 16,
          radius: 8,
        },
        script: {
          tag: 'bounce_pad',
          rules: [
            {
              id: 'rule_bounce_pad_jump',
              enabled: true,
              name: 'Gaya Dorong Trampolin',
              trigger: 'ON_COLLISION_ENTER',
              action: 'JUMP',
              paramNumber: 480,
            },
            {
              id: 'rule_bounce_sfx',
              enabled: true,
              name: 'Suara Trampolin',
              trigger: 'ON_COLLISION_ENTER',
              action: 'PLAY_SOUND',
              paramString: 'jump',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'pfb_hazard_spikes',
    name: 'Duri Bahaya (Spike Hazard)',
    category: 'enemy',
    description: 'Rintangan duri tajam yang langsung mengulangi level jika tersentuh.',
    icon: '🔥',
    color: '#f97316',
    createdAt: '2026-08-11T00:00:00.000Z',
    isBuiltin: true,
    entities: [
      {
        id: 'ent_spike_template',
        name: 'Duri Bahaya',
        type: 'hazard',
        visible: true,
        locked: false,
        transform: {
          x: 0,
          y: 0,
          width: 32,
          height: 32,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 4,
        },
        sprite: {
          type: 'preset',
          presetIcon: 'spike',
          color: '#f97316',
          borderRadius: 2,
          opacity: 1,
        },
        rigidbody: {
          bodyType: 'static',
          mass: 0,
          gravityScale: 0,
          velocityX: 0,
          velocityY: 0,
          friction: 0,
          restitution: 0,
          isGrounded: false,
          fixedRotation: true,
        },
        collider: {
          enabled: true,
          type: 'box',
          isTrigger: true,
          offsetX: 0,
          offsetY: 0,
          width: 30,
          height: 30,
          radius: 15,
        },
        script: {
          tag: 'hazard',
          rules: [
            {
              id: 'rule_spike_restart',
              enabled: true,
              name: 'Reset Level Saat Tabrak',
              trigger: 'ON_COLLISION_ENTER',
              action: 'RESTART_LEVEL',
            },
            {
              id: 'rule_spike_sound',
              enabled: true,
              name: 'Suara Hit',
              trigger: 'ON_COLLISION_ENTER',
              action: 'PLAY_SOUND',
              paramString: 'hit',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'pfb_hud_jump_button',
    name: 'Tombol Jump HUD UI',
    category: 'ui',
    description: 'Tombol UI layar sentuh siap guna yang memicu aksi lompat hero.',
    icon: '🎮',
    color: '#ec4899',
    createdAt: '2026-08-11T00:00:00.000Z',
    isBuiltin: true,
    entities: [
      {
        id: 'ent_ui_jump_template',
        name: 'Tombol Jump HUD',
        type: 'ui_text',
        visible: true,
        locked: false,
        transform: {
          x: 0,
          y: 0,
          width: 110,
          height: 40,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 100,
        },
        sprite: {
          type: 'color',
          color: '#ec4899',
          borderRadius: 12,
          opacity: 0.9,
        },
        text: {
          content: '🦘 LOMPAT',
          fontSize: 14,
          color: '#ffffff',
          align: 'center',
        },
        script: {
          tag: 'ui_button',
          rules: [
            {
              id: 'rule_ui_jump_action',
              enabled: true,
              name: 'Lompat Saat Di-Tap',
              trigger: 'ON_TAP',
              action: 'JUMP',
              paramNumber: 320,
            },
          ],
        },
      },
    ],
  },
];

export class PrefabManager {
  /**
   * Get all built-in template prefabs
   */
  public static getBuiltinPrefabs(): Prefab[] {
    return BUILTIN_PREFABS;
  }

  /**
   * Get all user created prefabs stored in localStorage & active project
   */
  public static getUserPrefabs(project?: GameProject): Prefab[] {
    const userPrefabsMap: Map<string, Prefab> = new Map();

    // 1. Read from localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed: Prefab[] = JSON.parse(stored);
          parsed.forEach((p) => userPrefabsMap.set(p.id, p));
        }
      }
    } catch (e) {
      console.warn('Failed to parse prefabs from localStorage:', e);
    }

    // 2. Read from project
    if (project && project.prefabs) {
      project.prefabs.forEach((p) => userPrefabsMap.set(p.id, p));
    }

    return Array.from(userPrefabsMap.values());
  }

  /**
   * Get all prefabs (Built-in + User created)
   */
  public static getAllPrefabs(project?: GameProject): Prefab[] {
    const builtins = this.getBuiltinPrefabs();
    const userPrefabs = this.getUserPrefabs(project);
    return [...userPrefabs, ...builtins];
  }

  /**
   * Create a Prefab from an Entity or collection of Entities
   */
  public static createPrefabFromEntities(
    name: string,
    category: Prefab['category'],
    entitiesToPackage: Entity[],
    description?: string,
    icon?: string,
    color?: string
  ): Prefab {
    if (!entitiesToPackage || entitiesToPackage.length === 0) {
      throw new Error('Tidak ada objek yang dipilih untuk disimpan sebagai Prefab');
    }

    // Deep clone entities
    const clonedEntities: Entity[] = JSON.parse(JSON.stringify(entitiesToPackage));

    // Calculate bounding box center to normalize relative transform offset
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    clonedEntities.forEach((ent) => {
      minX = Math.min(minX, ent.transform.x);
      minY = Math.min(minY, ent.transform.y);
      maxX = Math.max(maxX, ent.transform.x + ent.transform.width);
      maxY = Math.max(maxY, ent.transform.y + ent.transform.height);
    });

    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;

    // Normalize positions relative to center origin (0, 0)
    clonedEntities.forEach((ent) => {
      ent.transform.x = Math.round(ent.transform.x - centerX);
      ent.transform.y = Math.round(ent.transform.y - centerY);
    });

    const newPrefab: Prefab = {
      id: 'pfb_user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim() || 'Prefab Kustom Baru',
      category: category || 'custom',
      description: description || `Grup berisikan ${clonedEntities.length} objek game.`,
      icon: icon || (clonedEntities.length > 1 ? '📦' : '⭐'),
      color: color || '#38bdf8',
      createdAt: new Date().toISOString(),
      isBuiltin: false,
      entities: clonedEntities,
    };

    return newPrefab;
  }

  /**
   * Save a new Prefab to LocalStorage and update Project state
   */
  public static savePrefab(prefab: Prefab, project?: GameProject): GameProject | null {
    // 1. Save to LocalStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const currentLocal = this.getUserPrefabs();
        const updatedLocal = [prefab, ...currentLocal.filter((p) => p.id !== prefab.id)];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLocal));
      }
    } catch (e) {
      console.warn('Failed to save prefab to localStorage:', e);
    }

    // 2. Return updated project
    if (project) {
      const currentPrefabs = project.prefabs || [];
      const updatedPrefabs = [prefab, ...currentPrefabs.filter((p) => p.id !== prefab.id)];
      return {
        ...project,
        prefabs: updatedPrefabs,
      };
    }

    return null;
  }

  /**
   * Delete a User Prefab
   */
  public static deletePrefab(prefabId: string, project?: GameProject): GameProject | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const currentLocal = this.getUserPrefabs();
        const updatedLocal = currentLocal.filter((p) => p.id !== prefabId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLocal));
      }
    } catch (e) {
      console.warn('Failed to delete prefab from localStorage:', e);
    }

    if (project && project.prefabs) {
      return {
        ...project,
        prefabs: project.prefabs.filter((p) => p.id !== prefabId),
      };
    }

    return null;
  }

  /**
   * Instantiate / Spawn a Prefab into a Scene
   */
  public static instantiatePrefab(
    prefab: Prefab,
    targetPosition: { x: number; y: number } = { x: 200, y: 300 }
  ): Entity[] {
    const timestamp = Date.now();
    const idMap: Map<string, string> = new Map();

    // Map old entity IDs to new unique spawned IDs
    prefab.entities.forEach((ent, idx) => {
      const newId = `ent_inst_${timestamp}_${idx}_${Math.random().toString(36).substring(2, 5)}`;
      idMap.set(ent.id, newId);
    });

    // Instantiate cloned entities
    const instantiatedEntities: Entity[] = prefab.entities.map((originalEnt) => {
      const cloned: Entity = JSON.parse(JSON.stringify(originalEnt));
      const newId = idMap.get(originalEnt.id)!;

      cloned.id = newId;
      cloned.name = originalEnt.name;

      // Position relative to target spawn coordinate
      cloned.transform.x = Math.round(targetPosition.x + originalEnt.transform.x);
      cloned.transform.y = Math.round(targetPosition.y + originalEnt.transform.y);

      // Remap script rule target IDs if referencing relative entities in prefab
      if (cloned.script && cloned.script.rules) {
        cloned.script.rules.forEach((rule) => {
          if (rule.targetEntityId && idMap.has(rule.targetEntityId)) {
            rule.targetEntityId = idMap.get(rule.targetEntityId);
          }
        });
      }

      return cloned;
    });

    return instantiatedEntities;
  }

  /**
   * Export Prefab to JSON file string
   */
  public static exportPrefabToJSON(prefab: Prefab): string {
    return JSON.stringify(prefab, null, 2);
  }

  /**
   * Import Prefab from JSON file string
   */
  public static importPrefabFromJSON(jsonString: string): Prefab {
    const parsed = JSON.parse(jsonString);
    if (!parsed.name || !parsed.entities || !Array.isArray(parsed.entities)) {
      throw new Error('Format file Prefab JSON tidak valid');
    }

    return {
      id: 'pfb_imported_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      name: parsed.name,
      category: parsed.category || 'custom',
      description: parsed.description || 'Imported Prefab Module',
      icon: parsed.icon || '📦',
      color: parsed.color || '#a855f7',
      createdAt: new Date().toISOString(),
      isBuiltin: false,
      entities: parsed.entities,
    };
  }
}
