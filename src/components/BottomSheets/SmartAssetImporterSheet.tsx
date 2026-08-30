import React, { useState } from 'react';
import {
  GameProject,
  Entity,
  EntityType,
  BodyType,
  TriggerType,
  ActionType,
  LogicRule,
} from '../../types/engine';
import { UnifiedSheetHeader } from '../Common/UnifiedSheetHeader';
import {
  Wand2,
  Search,
  Check,
  Plus,
  Layers,
  Sparkles,
  User,
  BoxSelect,
  Coins,
  Flame,
  ShieldAlert,
  Sliders,
  CheckSquare,
  Square,
  Zap,
  RotateCcw,
  Eye,
  Box,
  Palette,
  Heart,
  Star,
  Award,
} from 'lucide-react';

interface SmartAssetImporterSheetProps {
  project: GameProject;
  onAddEntity?: (type: EntityType) => void;
  onUpdateProject: (updatedProject: GameProject) => void;
  onSelectEntity?: (entityId: string) => void;
  onClose: () => void;
}

export interface PresetSpriteItem {
  id: string;
  name: string;
  category: 'heroes' | 'terrain' | 'items' | 'hazards' | 'enemies' | 'props' | 'ui';
  entityType: EntityType;
  presetKey: string;
  defaultColor: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultBodyType: BodyType;
  isSensor?: boolean;
  description: string;
  tags: string[];
  defaultLogic?: { trigger: TriggerType; action: ActionType };
}

// -------------------------------------------------------------
// 16x16 Pixel Sprite Pattern Generator
// -------------------------------------------------------------
export function generatePresetPixelGrid(presetKey: string, primaryColor: string): string[][] {
  const grid: string[][] = Array(16)
    .fill(null)
    .map(() => Array(16).fill('transparent'));

  const cP = primaryColor;
  const cD = '#0f172a'; // dark outline/shadow
  const cW = '#ffffff'; // white highlight
  const cAcc = '#38bdf8'; // cyan secondary

  switch (presetKey) {
    case 'hero_cyber':
      // Cyber Knight with Visor
      for (let r = 3; r <= 14; r++) {
        for (let c = 4; c <= 11; c++) grid[r][c] = cP;
      }
      // Visor
      for (let c = 5; c <= 10; c++) {
        grid[5][c] = cAcc;
        grid[6][c] = '#22d3ee';
      }
      // Outline
      for (let c = 4; c <= 11; c++) grid[3][c] = cD;
      for (let r = 3; r <= 14; r++) {
        grid[r][4] = cD;
        grid[r][11] = cD;
      }
      // Boots/Legs
      grid[13][5] = cD;
      grid[13][6] = cD;
      grid[13][9] = cD;
      grid[13][10] = cD;
      break;

    case 'hero_ninja':
      // Dark Ninja Head & Scarf
      for (let r = 2; r <= 13; r++) {
        for (let c = 4; c <= 11; c++) grid[r][c] = '#1e293b';
      }
      // Glowing Eyes
      grid[5][6] = '#f59e0b';
      grid[5][9] = '#f59e0b';
      // Red Headband
      for (let c = 3; c <= 12; c++) grid[3][c] = cP;
      grid[4][12] = cP;
      grid[5][13] = cP;
      break;

    case 'hero_wizard':
      // Pointy Purple Hat & Robe
      for (let r = 1; r <= 5; r++) {
        const w = r;
        for (let c = 8 - w; c <= 7 + w; c++) grid[r][c] = cP;
      }
      // Robe
      for (let r = 6; r <= 14; r++) {
        for (let c = 4; c <= 11; c++) grid[r][c] = cP;
      }
      // Beard
      for (let r = 7; r <= 10; r++) {
        for (let c = 6; c <= 9; c++) grid[r][c] = cW;
      }
      break;

    case 'platform_wood':
      // Wooden Crate
      for (let r = 1; r <= 14; r++) {
        for (let c = 1; c <= 14; c++) grid[r][c] = cP;
      }
      // Dark Border
      for (let i = 1; i <= 14; i++) {
        grid[1][i] = cD;
        grid[14][i] = cD;
        grid[i][1] = cD;
        grid[i][14] = cD;
      }
      // Diagonals
      for (let i = 2; i <= 13; i++) {
        grid[i][i] = cD;
        grid[i][15 - i] = cD;
      }
      break;

    case 'platform_stone':
      // Stone Block
      for (let r = 1; r <= 14; r++) {
        for (let c = 1; c <= 14; c++) grid[r][c] = cP;
      }
      // Top Bevel Highlight
      for (let c = 1; c <= 14; c++) {
        grid[1][c] = cW;
        grid[2][c] = '#94a3b8';
      }
      // Brick seams
      for (let c = 1; c <= 14; c++) grid[7][c] = cD;
      grid[4][7] = cD;
      grid[11][4] = cD;
      grid[11][11] = cD;
      break;

    case 'platform_cyber':
      // Neon Metal Platform
      for (let r = 2; r <= 13; r++) {
        for (let c = 1; c <= 14; c++) grid[r][c] = '#0f172a';
      }
      // Neon Top Rim
      for (let c = 1; c <= 14; c++) grid[2][c] = cP;
      for (let c = 1; c <= 14; c++) grid[13][c] = cP;
      // Core Stripes
      for (let c = 3; c <= 12; c += 3) {
        grid[7][c] = cAcc;
        grid[8][c] = cAcc;
      }
      break;

    case 'coin_gold':
      // Round Coin
      for (let r = 2; r <= 13; r++) {
        for (let c = 2; c <= 13; c++) {
          const dx = c - 7.5;
          const dy = r - 7.5;
          if (dx * dx + dy * dy <= 28) {
            grid[r][c] = cP;
          }
        }
      }
      // Inner Rim
      for (let r = 4; r <= 11; r++) {
        for (let c = 4; c <= 11; c++) {
          const dx = c - 7.5;
          const dy = r - 7.5;
          if (dx * dx + dy * dy <= 12) {
            grid[r][c] = '#fef08a';
          }
        }
      }
      // Sparkle
      grid[4][5] = cW;
      grid[5][4] = cW;
      break;

    case 'gem_ruby':
    case 'gem_emerald':
      // Diamond Gem
      for (let r = 2; r <= 13; r++) {
        const w = r <= 6 ? r : 14 - r;
        for (let c = 8 - w; c <= 7 + w; c++) {
          if (c >= 1 && c <= 14) grid[r][c] = cP;
        }
      }
      // Top Highlight
      grid[3][7] = cW;
      grid[4][6] = cW;
      grid[4][7] = cW;
      break;

    case 'potion_hp':
      // Flask Bottle
      for (let c = 6; c <= 9; c++) {
        grid[2][c] = '#a16207'; // Cork
        grid[3][c] = '#a16207';
      }
      // Neck
      for (let r = 4; r <= 6; r++) {
        grid[r][7] = cW;
        grid[r][8] = cW;
      }
      // Body Bulb
      for (let r = 7; r <= 14; r++) {
        for (let c = 4; c <= 11; c++) {
          grid[r][c] = cP;
        }
      }
      grid[8][6] = cW; // Highlight
      break;

    case 'enemy_slime':
      // Rounded Slime
      for (let r = 5; r <= 14; r++) {
        const w = r <= 9 ? r - 1 : 14 - Math.floor(r / 2);
        for (let c = 8 - w; c <= 7 + w; c++) {
          if (c >= 2 && c <= 13) grid[r][c] = cP;
        }
      }
      // Eyes
      grid[8][5] = cW;
      grid[8][6] = cD;
      grid[8][9] = cW;
      grid[8][10] = cD;
      break;

    case 'enemy_robot':
      // Metallic Robot
      for (let r = 3; r <= 13; r++) {
        for (let c = 4; c <= 11; c++) grid[r][c] = '#64748b';
      }
      // Single Red Eye
      for (let c = 6; c <= 9; c++) grid[6][c] = cP;
      // Antenna
      grid[1][7] = cP;
      grid[2][7] = '#0f172a';
      break;

    case 'hazard_spike':
      // Triangular Spike
      for (let r = 2; r <= 14; r++) {
        const w = Math.floor((r - 2) / 2);
        for (let c = 7 - w; c <= 8 + w; c++) grid[r][c] = cP;
      }
      // Highlights
      for (let r = 3; r <= 13; r++) {
        const c = 7 - Math.floor((r - 2) / 2);
        if (c >= 1) grid[r][c] = cW;
      }
      break;

    case 'hazard_saw':
      // Circular Sawblade
      for (let r = 2; r <= 13; r++) {
        for (let c = 2; c <= 13; c++) {
          const dx = c - 7.5;
          const dy = r - 7.5;
          if (dx * dx + dy * dy <= 25) grid[r][c] = '#94a3b8';
        }
      }
      // Center Ring
      for (let r = 6; r <= 9; r++) {
        for (let c = 6; c <= 9; c++) grid[r][c] = cP;
      }
      // Teeth
      grid[1][7] = cP;
      grid[14][8] = cP;
      grid[7][1] = cP;
      grid[8][14] = cP;
      break;

    case 'decor_tree':
      // Tree Crown
      for (let r = 1; r <= 10; r++) {
        const w = r <= 6 ? r : 10 - Math.floor(r / 2);
        for (let c = 8 - w; c <= 7 + w; c++) {
          if (c >= 2 && c <= 13) grid[r][c] = cP;
        }
      }
      // Trunk
      for (let r = 10; r <= 15; r++) {
        for (let c = 6; c <= 9; c++) grid[r][c] = '#78350f';
      }
      break;

    case 'decor_chest':
      // Treasure Chest
      for (let r = 5; r <= 13; r++) {
        for (let c = 3; c <= 12; c++) grid[r][c] = '#854d0e';
      }
      // Gold Trim
      for (let c = 3; c <= 12; c++) {
        grid[5][c] = cP;
        grid[13][c] = cP;
      }
      // Latch Lock
      grid[8][7] = cP;
      grid[8][8] = cP;
      grid[9][7] = cP;
      grid[9][8] = cP;
      break;

    case 'decor_portal':
      // Swirling Portal Ring
      for (let r = 2; r <= 13; r++) {
        for (let c = 4; c <= 11; c++) {
          const dx = c - 7.5;
          const dy = (r - 7.5) * 0.8;
          if (dx * dx + dy * dy <= 16) grid[r][c] = cP;
          if (dx * dx + dy * dy <= 6) grid[r][c] = cW;
        }
      }
      break;

    case 'ui_star':
      // Star Icon
      for (let r = 2; r <= 13; r++) {
        const w = r <= 6 ? r : 12 - r;
        for (let c = 8 - w; c <= 7 + w; c++) {
          if (c >= 2 && c <= 13) grid[r][c] = cP;
        }
      }
      grid[4][7] = cW;
      break;

    default:
      // Default solid colored block with outline
      for (let r = 2; r <= 13; r++) {
        for (let c = 2; c <= 13; c++) grid[r][c] = cP;
      }
      for (let i = 2; i <= 13; i++) {
        grid[2][i] = cW;
        grid[i][2] = cW;
        grid[13][i] = cD;
        grid[i][13] = cD;
      }
      break;
  }

  return grid;
}

// -------------------------------------------------------------
// PRESET LIBRARY DATABASE
// -------------------------------------------------------------
const PRESET_SPRITES: PresetSpriteItem[] = [
  // HEROES & CHARACTERS
  {
    id: 'hero_cyber_knight',
    name: 'Cyber Knight',
    category: 'heroes',
    entityType: 'player',
    presetKey: 'hero_cyber',
    defaultColor: '#06b6d4',
    defaultWidth: 40,
    defaultHeight: 56,
    defaultBodyType: 'dynamic',
    description: 'Prajurit futuristik dengan kontrol lompat & lari cepat.',
    tags: ['hero', 'player', 'cyber', 'knight', 'runner'],
  },
  {
    id: 'hero_ninja_shadow',
    name: 'Ninja Bayangan',
    category: 'heroes',
    entityType: 'player',
    presetKey: 'hero_ninja',
    defaultColor: '#ef4444',
    defaultWidth: 36,
    defaultHeight: 48,
    defaultBodyType: 'dynamic',
    description: 'Ninja lincah berbaju gelap dengan ikat kepala merah.',
    tags: ['ninja', 'player', 'hero', 'stealth'],
  },
  {
    id: 'hero_wizard_mage',
    name: 'Penyihir Mistik',
    category: 'heroes',
    entityType: 'player',
    presetKey: 'hero_wizard',
    defaultColor: '#a855f7',
    defaultWidth: 42,
    defaultHeight: 54,
    defaultBodyType: 'dynamic',
    description: 'Penyihir bertopi ungu dengan kemampuan tembakan sihir.',
    tags: ['wizard', 'mage', 'magic', 'player'],
  },

  // TERRAIN & PLATFORMS
  {
    id: 'platform_wood_crate',
    name: 'Kotak Kayu',
    category: 'terrain',
    entityType: 'platform',
    presetKey: 'platform_wood',
    defaultColor: '#d97706',
    defaultWidth: 48,
    defaultHeight: 48,
    defaultBodyType: 'static',
    description: 'Pijakan padat berbahan kayu yang bisa ditumpuk.',
    tags: ['wood', 'crate', 'platform', 'block'],
  },
  {
    id: 'platform_stone_brick',
    name: 'Blok Batu Kastil',
    category: 'terrain',
    entityType: 'platform',
    presetKey: 'platform_stone',
    defaultColor: '#64748b',
    defaultWidth: 64,
    defaultHeight: 48,
    defaultBodyType: 'static',
    description: 'Dinding/pijakan kokoh berbahan batu dengan tekstur.',
    tags: ['stone', 'brick', 'wall', 'platform'],
  },
  {
    id: 'platform_cyber_beam',
    name: 'Beam Logam Cyber',
    category: 'terrain',
    entityType: 'platform',
    presetKey: 'platform_cyber',
    defaultColor: '#38bdf8',
    defaultWidth: 80,
    defaultHeight: 32,
    defaultBodyType: 'static',
    description: 'Platform neon futuristik berlampu LED.',
    tags: ['cyber', 'beam', 'neon', 'platform'],
  },

  // ITEMS & COLLECTIBLES
  {
    id: 'coin_gold_retro',
    name: 'Koin Emas Retro',
    category: 'items',
    entityType: 'coin',
    presetKey: 'coin_gold',
    defaultColor: '#eab308',
    defaultWidth: 32,
    defaultHeight: 32,
    defaultBodyType: 'static',
    isSensor: true,
    description: 'Koin berharga yang menambahkan +100 skor saat diambil.',
    tags: ['coin', 'gold', 'score', 'collectible'],
    defaultLogic: { trigger: 'ON_COLLISION_ENTER', action: 'ADD_SCORE' },
  },
  {
    id: 'gem_ruby_star',
    name: 'Permata Ruby Merah',
    category: 'items',
    entityType: 'coin',
    presetKey: 'gem_ruby',
    defaultColor: '#f43f5e',
    defaultWidth: 32,
    defaultHeight: 32,
    defaultBodyType: 'static',
    isSensor: true,
    description: 'Kristal merah langka untuk bonus skor tinggi.',
    tags: ['gem', 'ruby', 'crystal', 'reward'],
    defaultLogic: { trigger: 'ON_COLLISION_ENTER', action: 'ADD_SCORE' },
  },
  {
    id: 'potion_health_red',
    name: 'Ramuan Pulih HP',
    category: 'items',
    entityType: 'coin',
    presetKey: 'potion_hp',
    defaultColor: '#ef4444',
    defaultWidth: 28,
    defaultHeight: 36,
    defaultBodyType: 'static',
    isSensor: true,
    description: 'Botol ramuan pemulih kesehatan karakter.',
    tags: ['potion', 'health', 'heal', 'item'],
    defaultLogic: { trigger: 'ON_COLLISION_ENTER', action: 'ADD_SCORE' },
  },

  // ENEMIES & HAZARDS
  {
    id: 'enemy_purple_slime',
    name: 'Slime Ungu Monster',
    category: 'enemies',
    entityType: 'enemy',
    presetKey: 'enemy_slime',
    defaultColor: '#c084fc',
    defaultWidth: 40,
    defaultHeight: 32,
    defaultBodyType: 'kinematic',
    description: 'Musuh slime kenyal yang berpatroli bolak-balik.',
    tags: ['enemy', 'slime', 'monster', 'patrol'],
  },
  {
    id: 'enemy_cyber_robot',
    name: 'Robot Patroli Red-Eye',
    category: 'enemies',
    entityType: 'enemy',
    presetKey: 'enemy_robot',
    defaultColor: '#f43f5e',
    defaultWidth: 40,
    defaultHeight: 48,
    defaultBodyType: 'kinematic',
    description: 'Robot penjaga berantena dengan optik merah tajam.',
    tags: ['robot', 'patrol', 'enemy', 'guard'],
  },
  {
    id: 'hazard_sharp_spike',
    name: 'Duri Tajam Merah',
    category: 'hazards',
    entityType: 'hazard',
    presetKey: 'hazard_spike',
    defaultColor: '#ef4444',
    defaultWidth: 36,
    defaultHeight: 36,
    defaultBodyType: 'static',
    isSensor: true,
    description: 'Rintangan mematikan yang mereset level saat tersentuh.',
    tags: ['hazard', 'spike', 'danger', 'reset'],
    defaultLogic: { trigger: 'ON_COLLISION_ENTER', action: 'RESTART_LEVEL' },
  },
  {
    id: 'hazard_sawblade_spinning',
    name: 'Gergaji Putar',
    category: 'hazards',
    entityType: 'hazard',
    presetKey: 'hazard_saw',
    defaultColor: '#0284c7',
    defaultWidth: 44,
    defaultHeight: 44,
    defaultBodyType: 'static',
    isSensor: true,
    description: 'Cakram gergaji berputar berbahaya.',
    tags: ['saw', 'blade', 'hazard', 'obstacle'],
    defaultLogic: { trigger: 'ON_COLLISION_ENTER', action: 'RESTART_LEVEL' },
  },

  // DECOR & PROPS
  {
    id: 'decor_pixel_tree',
    name: 'Pohon Pixel Rindang',
    category: 'props',
    entityType: 'platform',
    presetKey: 'decor_tree',
    defaultColor: '#22c55e',
    defaultWidth: 56,
    defaultHeight: 64,
    defaultBodyType: 'static',
    description: 'Dekorasi pohon hijau pembawa suasana segar.',
    tags: ['tree', 'nature', 'decor', 'plant'],
  },
  {
    id: 'decor_treasure_chest',
    name: 'Peti Harta Karun',
    category: 'props',
    entityType: 'coin',
    presetKey: 'decor_chest',
    defaultColor: '#eab308',
    defaultWidth: 44,
    defaultHeight: 36,
    defaultBodyType: 'static',
    description: 'Peti rahasia penampung item bonus atau kunci.',
    tags: ['chest', 'treasure', 'secret', 'reward'],
  },
  {
    id: 'decor_teleport_portal',
    name: 'Portal Teleportasi',
    category: 'props',
    entityType: 'trigger',
    presetKey: 'decor_portal',
    defaultColor: '#a855f7',
    defaultWidth: 48,
    defaultHeight: 64,
    defaultBodyType: 'static',
    isSensor: true,
    description: 'Pintu gerbang mistis menuju area atau scene berikutnya.',
    tags: ['portal', 'gate', 'teleport', 'next_scene'],
    defaultLogic: { trigger: 'ON_COLLISION_ENTER', action: 'CHANGE_SCENE' },
  },

  // UI & EFFECTS
  {
    id: 'ui_magic_star',
    name: 'Bintang Prestasi (Star)',
    category: 'ui',
    entityType: 'coin',
    presetKey: 'ui_star',
    defaultColor: '#facc15',
    defaultWidth: 32,
    defaultHeight: 32,
    defaultBodyType: 'static',
    isSensor: true,
    description: 'Bintang pencapaian skor sempurna.',
    tags: ['star', 'award', 'ui', 'bonus'],
  },
];

export const SmartAssetImporterSheet: React.FC<SmartAssetImporterSheetProps> = ({
  project,
  onAddEntity,
  onUpdateProject,
  onSelectEntity,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePreset, setActivePreset] = useState<PresetSpriteItem | null>(PRESET_SPRITES[0]);

  // Customization State for Active Preset
  const [customName, setCustomName] = useState<string>('');
  const [accentColor, setAccentColor] = useState<string>('#38bdf8');
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [bodyType, setBodyType] = useState<BodyType>('static');
  const [attachLogic, setAttachLogic] = useState<boolean>(true);

  // Multi-Selection / Batch Mode
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Sync state when activePreset changes
  const handleSelectPresetCard = (preset: PresetSpriteItem) => {
    setActivePreset(preset);
    setCustomName(preset.name);
    setAccentColor(preset.defaultColor);
    setBodyType(preset.defaultBodyType);
    setScaleFactor(1.0);
    setAttachLogic(!!preset.defaultLogic);
  };

  // Filter logic
  const filteredPresets = PRESET_SPRITES.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesQuery =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  // Calculate spawn coordinates near scene center or staggered
  const getNextSpawnPosition = (indexOffset = 0) => {
    const cameraX = project.world.cameraX || 400;
    const cameraY = project.world.cameraY || 300;
    const offset = (project.entities.length + indexOffset) * 20;
    return {
      x: Math.round(cameraX - 100 + (offset % 240)),
      y: Math.round(cameraY - 100 + Math.floor(offset / 240) * 40),
    };
  };

  // Instantiate & Import Single Preset
  const handleImportSingle = () => {
    if (!activePreset) return;

    const pixelGrid = generatePresetPixelGrid(activePreset.presetKey, accentColor);
    const spawnPos = getNextSpawnPosition();

    const w = Math.round(activePreset.defaultWidth * scaleFactor);
    const h = Math.round(activePreset.defaultHeight * scaleFactor);

    const rules: LogicRule[] = [];
    if (attachLogic && activePreset.defaultLogic) {
      rules.push({
        id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Otomatis ${activePreset.defaultLogic.action}`,
        enabled: true,
        trigger: activePreset.defaultLogic.trigger,
        action: activePreset.defaultLogic.action,
      });
    }

    const newEntity: Entity = {
      id: `ent_${activePreset.presetKey}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: customName || activePreset.name,
      type: activePreset.entityType,
      visible: true,
      locked: false,
      transform: {
        x: spawnPos.x,
        y: spawnPos.y,
        width: w,
        height: h,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: project.entities.length + 1,
      },
      sprite: {
        type: 'pixel',
        color: accentColor,
        presetIcon: activePreset.presetKey,
        pixelData: pixelGrid,
        borderRadius: activePreset.category === 'items' ? 8 : 4,
        opacity: 1,
      },
      rigidbody: {
        bodyType: bodyType,
        mass: 1,
        gravityScale: bodyType === 'dynamic' ? 1 : 0,
        velocityX: 0,
        velocityY: 0,
        friction: 0.2,
        restitution: 0.1,
        isGrounded: false,
        fixedRotation: true,
      },
      collider: {
        enabled: true,
        type: 'box',
        isTrigger: activePreset.isSensor || false,
        offsetX: 0,
        offsetY: 0,
        width: w,
        height: h,
        radius: Math.min(w, h) / 2,
      },
      script: {
        rules: rules,
        tag: activePreset.category,
      },
    };

    const updatedEntities = [...project.entities, newEntity];
    onUpdateProject({
      ...project,
      entities: updatedEntities,
    });

    if (onSelectEntity) {
      onSelectEntity(newEntity.id);
    }

    showToast(`✓ Terimpor: ${newEntity.name} ke scene!`);
  };

  // Import Batch Selected
  const handleImportBatch = () => {
    if (batchSelectedIds.length === 0) return;

    const selectedPresets = PRESET_SPRITES.filter((p) => batchSelectedIds.includes(p.id));
    const newEntities: Entity[] = [];

    selectedPresets.forEach((preset, idx) => {
      const pixelGrid = generatePresetPixelGrid(preset.presetKey, preset.defaultColor);
      const spawnPos = getNextSpawnPosition(idx);

      const rules: LogicRule[] = [];
      if (preset.defaultLogic) {
        rules.push({
          id: `rule_batch_${Date.now()}_${idx}`,
          name: `Rule ${preset.defaultLogic.action}`,
          enabled: true,
          trigger: preset.defaultLogic.trigger,
          action: preset.defaultLogic.action,
        });
      }

      newEntities.push({
        id: `ent_${preset.presetKey}_${Date.now()}_${idx}`,
        name: `${preset.name} #${idx + 1}`,
        type: preset.entityType,
        visible: true,
        locked: false,
        transform: {
          x: spawnPos.x,
          y: spawnPos.y,
          width: preset.defaultWidth,
          height: preset.defaultHeight,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: project.entities.length + idx + 1,
        },
        sprite: {
          type: 'pixel',
          color: preset.defaultColor,
          presetIcon: preset.presetKey,
          pixelData: pixelGrid,
          opacity: 1,
        },
        rigidbody: {
          bodyType: preset.defaultBodyType,
          mass: 1,
          gravityScale: preset.defaultBodyType === 'dynamic' ? 1 : 0,
          velocityX: 0,
          velocityY: 0,
          friction: 0.2,
          restitution: 0.1,
          isGrounded: false,
          fixedRotation: true,
        },
        collider: {
          enabled: true,
          type: 'box',
          isTrigger: preset.isSensor || false,
          offsetX: 0,
          offsetY: 0,
          width: preset.defaultWidth,
          height: preset.defaultHeight,
          radius: Math.min(preset.defaultWidth, preset.defaultHeight) / 2,
        },
        script: {
          rules: rules,
          tag: preset.category,
        },
      });
    });

    const updatedEntities = [...project.entities, ...newEntities];
    onUpdateProject({
      ...project,
      entities: updatedEntities,
    });

    showToast(`✓ Berhasil mengimpor ${newEntities.length} Aset Sprite ke Scene!`);
    setBatchSelectedIds([]);
    setIsBatchMode(false);
  };

  const toggleBatchSelect = (id: string) => {
    if (batchSelectedIds.includes(id)) {
      setBatchSelectedIds(batchSelectedIds.filter((i) => i !== id));
    } else {
      setBatchSelectedIds([...batchSelectedIds, id]);
    }
  };

  return (
    <div className="flex flex-col h-full text-white bg-slate-900">
      <UnifiedSheetHeader
        title="Smart Asset Importer"
        subtitle="Pustaka Visual Sprite & Batch Importer"
        icon={Wand2}
        iconColor="text-amber-400"
        action={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setIsBatchMode(!isBatchMode);
                setBatchSelectedIds([]);
              }}
              className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isBatchMode
                  ? 'bg-amber-500/30 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="hidden sm:inline">Pilih Banyak</span>
            </button>

            {isBatchMode && batchSelectedIds.length > 0 && (
              <button
                onClick={handleImportBatch}
                className="min-h-[40px] px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-lg cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Impor ({batchSelectedIds.length})</span>
              </button>
            )}
          </div>
        }
        onClose={onClose}
      />

      {/* Toast Banner */}
      {toastMessage && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-4 py-2 text-center text-xs text-emerald-300 font-bold animate-in fade-in slide-in-from-top-1">
          {toastMessage}
        </div>
      )}

      {/* Main Split Container */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
        {/* Left: Preset Library Browser */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-800/80 p-3 space-y-3">
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari sprite (hero, koin, spike)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all min-h-[40px]"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 pb-1">
            {[
              { id: 'all', label: 'Semua', icon: Layers },
              { id: 'heroes', label: 'Karakter', icon: User },
              { id: 'terrain', label: 'Platform', icon: BoxSelect },
              { id: 'items', label: 'Item & Koin', icon: Coins },
              { id: 'enemies', label: 'Musuh', icon: ShieldAlert },
              { id: 'hazards', label: 'Duri', icon: Flame },
              { id: 'props', label: 'Dekorasi', icon: Box },
              { id: 'ui', label: 'UI & FX', icon: Star },
            ].map((cat) => {
              const IconComp = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold shadow-sm'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5 shrink-0" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Grid Cards Container */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {filteredPresets.map((preset) => {
              const isSelected = activePreset?.id === preset.id;
              const isBatchChecked = batchSelectedIds.includes(preset.id);

              // Render Pixel Mini Grid Preview
              const miniGrid = generatePresetPixelGrid(preset.presetKey, preset.defaultColor);

              return (
                <div
                  key={preset.id}
                  onClick={() => {
                    if (isBatchMode) {
                      toggleBatchSelect(preset.id);
                    } else {
                      handleSelectPresetCard(preset);
                    }
                  }}
                  className={`relative p-2.5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                    isBatchChecked
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                      : isSelected && !isBatchMode
                      ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                      : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                  }`}
                >
                  {/* Top Header info */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 uppercase font-mono truncate">
                      {preset.category}
                    </span>

                    {isBatchMode && (
                      <div className="p-0.5 text-amber-400">
                        {isBatchChecked ? (
                          <CheckSquare className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pixel Art Visual Canvas Box */}
                  <div className="w-full h-20 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-2 mb-2 group-hover:scale-105 transition-transform overflow-hidden relative">
                    <div
                      className="grid grid-cols-16 grid-rows-16 gap-[0.5px] w-14 h-14"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(16, minmax(0, 1fr))',
                        gridTemplateRows: 'repeat(16, minmax(0, 1fr))',
                      }}
                    >
                      {miniGrid.map((row, rIdx) =>
                        row.map((cell, cIdx) => (
                          <div
                            key={`${rIdx}_${cIdx}`}
                            style={{
                              backgroundColor: cell === 'transparent' ? 'transparent' : cell,
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* Title & Details */}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{preset.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{preset.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Preset Customizer & Inspector */}
        {activePreset && !isBatchMode && (
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950/80 p-3.5 space-y-3 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  Kustomisasi Sprite
                </span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 font-bold">
                  {activePreset.entityType.toUpperCase()}
                </span>
              </div>

              {/* Large Pixel Canvas Visual Preview */}
              <div className="w-full h-28 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center p-3 relative shadow-inner overflow-hidden">
                <div
                  className="grid grid-cols-16 grid-rows-16 gap-[1px] w-20 h-20 shadow-xl"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(16, minmax(0, 1fr))',
                    gridTemplateRows: 'repeat(16, minmax(0, 1fr))',
                  }}
                >
                  {generatePresetPixelGrid(activePreset.presetKey, accentColor).map((row, rIdx) =>
                    row.map((cell, cIdx) => (
                      <div
                        key={`big_${rIdx}_${cIdx}`}
                        style={{
                          backgroundColor: cell === 'transparent' ? 'transparent' : cell,
                        }}
                      />
                    ))
                  )}
                </div>
                <div className="absolute bottom-1.5 right-2 text-[10px] font-mono text-slate-500">
                  {Math.round(activePreset.defaultWidth * scaleFactor)}x
                  {Math.round(activePreset.defaultHeight * scaleFactor)}px
                </div>
              </div>

              {/* Custom Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Nama Objek Entitas</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 min-h-[40px]"
                />
              </div>

              {/* Color Accent Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                  <span>Warna Utama Sprite</span>
                  <span className="font-mono text-cyan-400">{accentColor}</span>
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    '#06b6d4',
                    '#ef4444',
                    '#a855f7',
                    '#22c55e',
                    '#eab308',
                    '#3b82f6',
                    '#ec4899',
                    '#f97316',
                    '#64748b',
                  ].map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setAccentColor(hex)}
                      className={`w-7 h-7 rounded-xl shrink-0 transition-transform active:scale-95 ${
                        accentColor === hex ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Scale Multiplier */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>Skala Ukuran</span>
                  <span className="text-cyan-400 font-mono">{scaleFactor.toFixed(2)}x</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[0.75, 1.0, 1.25, 1.5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setScaleFactor(s)}
                      className={`py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                        scaleFactor === s
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Physics Body Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Fisika Benda (Body)</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'static', label: 'Padat / Statis' },
                    { id: 'dynamic', label: 'Dinamik' },
                    { id: 'kinematic', label: 'Kinematik' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBodyType(b.id as BodyType)}
                      className={`py-1.5 rounded-lg border text-[10.5px] font-semibold transition-all cursor-pointer min-h-[36px] ${
                        bodyType === b.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Logic Rule Checkbox */}
              {activePreset.defaultLogic && (
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachLogic}
                    onChange={(e) => setAttachLogic(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200">Pasang Rules Otomatis</p>
                    <p className="text-[10px] text-slate-400">
                      {activePreset.defaultLogic.trigger} ➔ {activePreset.defaultLogic.action}
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* Action Import Button */}
            <button
              onClick={handleImportSingle}
              className="w-full min-h-[48px] bg-gradient-to-r from-amber-500 via-cyan-500 to-blue-600 hover:from-amber-400 hover:to-blue-500 text-slate-950 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-cyan-900/30 cursor-pointer transition-all active:scale-98 shrink-0 mt-3"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>Tambah ke Scene Panggung</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
