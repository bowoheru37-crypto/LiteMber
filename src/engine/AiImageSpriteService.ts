/**
 * AiImageSpriteService.ts
 * AI 2D & 3D Sprite & Texture Generation Service for Engine Studio
 * Integrates AI-generated high-res 2D & 3D sprite assets, procedural synthesis,
 * image-to-pixel matrix quantization, chroma key background removal, direct entity injection,
 * and asset manager binding.
 */

import { GameProject, Entity, ImageAsset } from '../types/engine';
import { AssetManager } from './AssetManager';

// Import pre-generated AI 2D Sprite assets
import cyberNinjaImg from '../assets/images/cyber_ninja_sprite_1787925140180.jpg';
import slimeMonsterImg from '../assets/images/slime_monster_sprite_1787925157218.jpg';
import mechBossImg from '../assets/images/mech_boss_sprite_1787925170908.jpg';
import magicCrystalImg from '../assets/images/magic_crystal_sprite_1787925187778.jpg';
import goldenChestImg from '../assets/images/golden_chest_sprite_1787925200312.jpg';

// Import pre-generated AI 3D Rendered Sprite assets
import cyberHero3dImg from '../assets/images/cyber_hero_3d_sprite_1787925538573.jpg';
import crystalOrb3dImg from '../assets/images/crystal_orb_3d_sprite_1787925558330.jpg';
import mechTitan3dImg from '../assets/images/mech_titan_3d_sprite_1787925583999.jpg';
import slime3dImg from '../assets/images/slime_3d_sprite_1787925615579.jpg';
import cyberTile3dImg from '../assets/images/cyber_tile_3d_sprite_1787925634127.jpg';

export interface AiGeneratedSpriteModel {
  id: string;
  name: string;
  category: 'character' | 'enemy' | 'boss' | 'item' | 'object' | 'environment';
  dimension: '2D' | '3D';
  style:
    | 'pixel_art'
    | 'cyberpunk'
    | 'retro_arcade'
    | 'fantasy_chibi'
    | 'sci_fi'
    | 'isometric_3d'
    | 'lowpoly_3d'
    | 'stylized_render_3d'
    | 'claymation_3d'
    | 'voxel_3d';
  prompt: string;
  aspectRatio: '1:1' | '4:3' | '16:9' | '3:4';
  imageUrl: string;
  palette: string[];
  entityPresetType: 'player' | 'enemy' | 'coin' | 'platform' | 'hazard';
}

export const BUILTIN_AI_SPRITE_CATALOGUE: AiGeneratedSpriteModel[] = [
  // 3D Rendered Sprites
  {
    id: 'ai_sprite_3d_cyber_hero',
    name: 'Cyber Warrior 3D Hero',
    category: 'character',
    dimension: '3D',
    style: 'isometric_3d',
    prompt: '3D rendered isometric game character sprite of a futuristic cyber warrior in glowing cyan and dark slate armor, high quality 3D stylized render, clean studio lighting, isolated on solid dark background',
    aspectRatio: '1:1',
    imageUrl: cyberHero3dImg,
    palette: ['#06b6d4', '#0284c7', '#0f172a', '#38bdf8', '#ffffff'],
    entityPresetType: 'player',
  },
  {
    id: 'ai_sprite_3d_slime',
    name: 'Bouncy Slime 3D',
    category: 'enemy',
    dimension: '3D',
    style: 'stylized_render_3d',
    prompt: '3D cute rendered friendly green slime enemy monster sprite with glowing eyes and gelatinous bouncy shader, clean isometric game asset sprite, isolated solid background',
    aspectRatio: '1:1',
    imageUrl: slime3dImg,
    palette: ['#22c55e', '#16a34a', '#14532d', '#86efac', '#ffffff'],
    entityPresetType: 'enemy',
  },
  {
    id: 'ai_sprite_3d_mech_titan',
    name: 'Titan Mech Boss 3D',
    category: 'boss',
    dimension: '3D',
    style: 'lowpoly_3d',
    prompt: '3D rendered sci-fi mech robot boss with glowing orange thrusters and heavy titanium armor, clean stylized 3D game asset sprite, isolated solid background',
    aspectRatio: '1:1',
    imageUrl: mechTitan3dImg,
    palette: ['#f97316', '#ea580c', '#334155', '#fed7aa', '#0f172a'],
    entityPresetType: 'enemy',
  },
  {
    id: 'ai_sprite_3d_crystal_orb',
    name: 'Void Magic Crystal Orb 3D',
    category: 'item',
    dimension: '3D',
    style: 'stylized_render_3d',
    prompt: '3D stylized rendered floating magic energy crystal orb with purple neon runes and sparkling particles, isolated solid background, game item asset sprite',
    aspectRatio: '1:1',
    imageUrl: crystalOrb3dImg,
    palette: ['#a855f7', '#9333ea', '#581c87', '#e9d5ff', '#ffffff'],
    entityPresetType: 'coin',
  },
  {
    id: 'ai_sprite_3d_cyber_tile',
    name: 'Cyber Platform Tile 3D',
    category: 'environment',
    dimension: '3D',
    style: 'isometric_3d',
    prompt: '3D isometric floating cyberpunk sci-fi platform tile block with neon blue energy stripes, game environment asset sprite, isolated solid dark background',
    aspectRatio: '1:1',
    imageUrl: cyberTile3dImg,
    palette: ['#38bdf8', '#0284c7', '#1e293b', '#0f172a', '#67e8f9'],
    entityPresetType: 'platform',
  },

  // 2D Pixel / Arcade Sprites
  {
    id: 'ai_sprite_cyber_ninja',
    name: 'Cyber Ninja Shinobi 2D',
    category: 'character',
    dimension: '2D',
    style: 'cyberpunk',
    prompt: '2D retro pixel art game sprite of a futuristic cyber ninja hero holding a glowing cyan neon katana, sharp pixel edges, isolated on solid dark background, clean game asset sprite',
    aspectRatio: '1:1',
    imageUrl: cyberNinjaImg,
    palette: ['#06b6d4', '#3b82f6', '#0f172a', '#38bdf8', '#ffffff'],
    entityPresetType: 'player',
  },
  {
    id: 'ai_sprite_slime_monster',
    name: 'Slime Monster 2D',
    category: 'enemy',
    dimension: '2D',
    style: 'fantasy_chibi',
    prompt: '2D cute green slime monster game asset sprite with glowing friendly eyes and bouncy gelatinous body, vibrant pixel art style, isolated background',
    aspectRatio: '1:1',
    imageUrl: slimeMonsterImg,
    palette: ['#22c55e', '#4ade80', '#15803d', '#86efac', '#ffffff'],
    entityPresetType: 'enemy',
  },
  {
    id: 'ai_sprite_mech_boss',
    name: 'Heavy Titan Mech Boss 2D',
    category: 'boss',
    dimension: '2D',
    style: 'sci_fi',
    prompt: '2D sci-fi heavy armor robot mech boss sprite with red laser visor and rocket thrusters, sharp arcade pixel art game sprite, isolated solid background',
    aspectRatio: '1:1',
    imageUrl: mechBossImg,
    palette: ['#ef4444', '#f97316', '#78716c', '#1e293b', '#fbbf24'],
    entityPresetType: 'enemy',
  },
  {
    id: 'ai_sprite_magic_crystal',
    name: 'Energy Crystal 2D',
    category: 'item',
    dimension: '2D',
    style: 'retro_arcade',
    prompt: '2D glowing purple mystical energy crystal gem game sprite, sparkling floating magic item, clean retro game asset, isolated background',
    aspectRatio: '1:1',
    imageUrl: magicCrystalImg,
    palette: ['#a855f7', '#d8b4fe', '#6b21a8', '#c084fc', '#ffffff'],
    entityPresetType: 'coin',
  },
  {
    id: 'ai_sprite_golden_chest',
    name: 'Royal Loot Chest 2D',
    category: 'object',
    dimension: '2D',
    style: 'pixel_art',
    prompt: '2D vintage wooden treasure chest with golden ornaments and glowing lock, rpg game loot sprite, isolated background',
    aspectRatio: '1:1',
    imageUrl: goldenChestImg,
    palette: ['#eab308', '#ca8a04', '#713f12', '#fef08a', '#451a03'],
    entityPresetType: 'coin',
  },
];

// Helper: Procedural Image/Canvas Sprite Generator for on-the-fly custom 2D & 3D prompts
export function generateProceduralAiSpriteImage(
  prompt: string,
  style: string,
  palette: string[],
  resolution: number = 128
): string {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Transparent Background
  ctx.clearRect(0, 0, resolution, resolution);

  const c1 = palette[0] || '#06b6d4';
  const c2 = palette[1] || '#3b82f6';
  const c3 = palette[2] || '#0f172a';
  const c4 = palette[3] || '#ffffff';
  const c5 = palette[4] || '#f59e0b';

  const hash = prompt.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0);
  const center = resolution / 2;
  const radius = resolution * 0.38;

  const is3D =
    style.includes('3d') ||
    style.includes('isometric') ||
    style.includes('lowpoly') ||
    prompt.toLowerCase().includes('3d') ||
    prompt.toLowerCase().includes('isometric');

  if (is3D) {
    // 3D Stylized Rendered Isometric Synthesis with Lighting and Depth
    if (prompt.toLowerCase().includes('tile') || prompt.toLowerCase().includes('platform') || prompt.toLowerCase().includes('block')) {
      // 3D Isometric Cube / Platform Block
      const isoW = resolution * 0.44;
      const isoH = resolution * 0.26;
      const blockDepth = resolution * 0.3;

      // Top Face
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.moveTo(center, center - isoH - blockDepth / 2);
      ctx.lineTo(center + isoW, center - blockDepth / 2);
      ctx.lineTo(center, center + isoH - blockDepth / 2);
      ctx.lineTo(center - isoW, center - blockDepth / 2);
      ctx.closePath();
      ctx.fill();

      // Top Highlight Lines
      ctx.strokeStyle = c4;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Left Face (Shadowed)
      ctx.fillStyle = c3;
      ctx.beginPath();
      ctx.moveTo(center - isoW, center - blockDepth / 2);
      ctx.lineTo(center, center + isoH - blockDepth / 2);
      ctx.lineTo(center, center + isoH + blockDepth / 2);
      ctx.lineTo(center - isoW, center + blockDepth / 2);
      ctx.closePath();
      ctx.fill();

      // Right Face (Mid-tone)
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(center, center + isoH - blockDepth / 2);
      ctx.lineTo(center + isoW, center - blockDepth / 2);
      ctx.lineTo(center + isoW, center + blockDepth / 2);
      ctx.lineTo(center, center + isoH + blockDepth / 2);
      ctx.closePath();
      ctx.fill();
    } else if (prompt.toLowerCase().includes('crystal') || prompt.toLowerCase().includes('orb') || prompt.toLowerCase().includes('item') || prompt.toLowerCase().includes('coin')) {
      // 3D Spherical Glowing Orb with Specular Reflection & Glow
      const grad3D = ctx.createRadialGradient(center - radius * 0.35, center - radius * 0.35, 4, center, center, radius);
      grad3D.addColorStop(0, '#ffffff');
      grad3D.addColorStop(0.2, c1);
      grad3D.addColorStop(0.7, c2);
      grad3D.addColorStop(1, c3);

      ctx.fillStyle = grad3D;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer Glow Ring
      ctx.strokeStyle = c4;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(center, center, radius * 1.15, radius * 0.45, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 3D Stylized Chibi Character / Boss Figure
      const gradBody = ctx.createRadialGradient(center - 12, center - 12, 6, center, center, radius);
      gradBody.addColorStop(0, c4);
      gradBody.addColorStop(0.3, c1);
      gradBody.addColorStop(0.8, c2);
      gradBody.addColorStop(1, c3);

      // Head 3D Sphere
      ctx.fillStyle = gradBody;
      ctx.beginPath();
      ctx.arc(center, center - 18, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // 3D Glowing Visor
      ctx.fillStyle = c1;
      ctx.shadowColor = c1;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(center - 16, center - 22, 32, 10, [5]);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 3D Torso Capsule
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.ellipse(center, center + 18, radius * 0.65, radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // 2D Pixel / Arcade Rendering
    if (prompt.toLowerCase().includes('slime') || prompt.toLowerCase().includes('monster') || prompt.toLowerCase().includes('enemy')) {
      const grad = ctx.createRadialGradient(center - 10, center - 10, 5, center, center, radius);
      grad.addColorStop(0, c4);
      grad.addColorStop(0.3, c1);
      grad.addColorStop(0.8, c2);
      grad.addColorStop(1, c3);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(center, center + 6, radius * 0.9, radius * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(center - 16, center - 4, 8, 0, Math.PI * 2);
      ctx.arc(center + 16, center - 4, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = c3;
      ctx.beginPath();
      ctx.arc(center - 14, center - 4, 4, 0, Math.PI * 2);
      ctx.arc(center + 18, center - 4, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (prompt.toLowerCase().includes('coin') || prompt.toLowerCase().includes('gem') || prompt.toLowerCase().includes('crystal') || prompt.toLowerCase().includes('item')) {
      ctx.fillStyle = c1;
      ctx.strokeStyle = c4;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(center, center - radius);
      ctx.lineTo(center + radius * 0.8, center - radius * 0.2);
      ctx.lineTo(center + radius * 0.6, center + radius * 0.9);
      ctx.lineTo(center - radius * 0.6, center + radius * 0.9);
      ctx.lineTo(center - radius * 0.8, center - radius * 0.2);
      ctx.closePath();

      const grad = ctx.createLinearGradient(center - radius, center - radius, center + radius, center + radius);
      grad.addColorStop(0, c4);
      grad.addColorStop(0.4, c1);
      grad.addColorStop(0.9, c2);
      grad.addColorStop(1, c3);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.stroke();
    } else if (prompt.toLowerCase().includes('chest') || prompt.toLowerCase().includes('box') || prompt.toLowerCase().includes('platform')) {
      const w = resolution * 0.7;
      const h = resolution * 0.55;
      const x = (resolution - w) / 2;
      const y = (resolution - h) / 2;

      ctx.fillStyle = c3;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = c1;
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

      ctx.strokeStyle = c5;
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

      ctx.fillStyle = c5;
      ctx.beginPath();
      ctx.arc(center, center, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const grad = ctx.createLinearGradient(center, center - radius, center, center + radius);
      grad.addColorStop(0, c1);
      grad.addColorStop(0.5, c2);
      grad.addColorStop(1, c3);

      ctx.fillStyle = c3;
      ctx.beginPath();
      ctx.arc(center, center - 20, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = c1;
      ctx.shadowColor = c1;
      ctx.shadowBlur = 8;
      ctx.fillRect(center - 12, center - 22, 24, 6);
      ctx.shadowBlur = 0;

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(center - 22, center - 2);
      ctx.lineTo(center + 22, center - 2);
      ctx.lineTo(center + 14, center + 34);
      ctx.lineTo(center - 14, center + 34);
      ctx.closePath();
      ctx.fill();
    }
  }

  return canvas.toDataURL('image/png');
}

// Helper: Convert any Image or Canvas to a 16x16 or 32x32 Pixel Color Matrix
export function rasterizeImageToPixelGrid(
  imageSource: HTMLImageElement | string,
  gridSize: number = 16,
  alphaThreshold: number = 20
): Promise<string[][]> {
  return new Promise((resolve) => {
    const img = typeof imageSource === 'string' ? new Image() : imageSource;
    if (typeof imageSource === 'string') {
      img.crossOrigin = 'anonymous';
      img.src = imageSource;
    }

    const process = () => {
      const canvas = document.createElement('canvas');
      canvas.width = gridSize;
      canvas.height = gridSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(Array(gridSize).fill(null).map(() => Array(gridSize).fill('transparent')));
        return;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, gridSize, gridSize);
      const imgData = ctx.getImageData(0, 0, gridSize, gridSize);
      const data = imgData.data;

      const grid: string[][] = [];
      for (let r = 0; r < gridSize; r++) {
        const row: string[] = [];
        for (let c = 0; c < gridSize; c++) {
          const idx = (r * gridSize + c) * 4;
          const red = data[idx];
          const green = data[idx + 1];
          const blue = data[idx + 2];
          const alpha = data[idx + 3];

          if (alpha < alphaThreshold) {
            row.push('transparent');
          } else {
            const hex = '#' + ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1);
            row.push(hex);
          }
        }
        grid.push(row);
      }
      resolve(grid);
    };

    if (img.complete && img.naturalWidth > 0) {
      process();
    } else {
      img.onload = () => process();
      img.onerror = () => {
        resolve(Array(gridSize).fill(null).map(() => Array(gridSize).fill('transparent')));
      };
    }
  });
}

/**
 * Direct Injection Function:
 * Injects a generated sprite image URL directly into the selected entity's sprite configuration.
 * Also registers the asset with AssetManager and updates project.assets.images.
 */
export function injectSpriteUrlToEntity(
  project: GameProject,
  targetEntityId: string,
  imageUrl: string,
  options?: {
    spriteName?: string;
    pixelData?: string[][];
    palette?: string[];
    dimension?: '2D' | '3D';
  }
): { updatedProject: GameProject; updatedEntity: Entity | null; imageAssetId: string } {
  const assetManager = AssetManager.getInstance();
  const imageAssetId = `img_ai_sprite_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const newImageAsset: ImageAsset = {
    id: imageAssetId,
    name: options?.spriteName || 'AI Generated Sprite',
    type: 'sprite',
    format: 'data_url',
    url: imageUrl,
    pixelData: options?.pixelData,
    fileSizeKb: Math.max(1, Math.round(imageUrl.length / 1024)),
    isOptimized: true,
  };

  // Register image with engine asset memory & metadata
  assetManager.loadImage(imageAssetId, imageUrl).catch(() => {});
  assetManager.registerOrUpdateMetadata({
    id: imageAssetId,
    canonicalName: options?.spriteName || 'AI Generated Sprite',
    originalName: options?.spriteName || 'AI Generated Sprite',
    category: 'image',
    mimeType: 'image/png',
    src: imageUrl,
    byteSize: imageUrl.length,
    tags: ['ai_generated', 'sprite', options?.dimension || '2D'],
  });

  const existingImages = project.assets?.images || [];
  const updatedImages = [...existingImages.filter((img) => img.id !== imageAssetId), newImageAsset];

  const updatedAssets = {
    ...project.assets,
    audio: project.assets?.audio || [],
    images: updatedImages,
  };

  let updatedEntity: Entity | null = null;
  const updatedEntities = project.entities.map((ent) => {
    if (ent.id === targetEntityId) {
      const newEnt: Entity = {
        ...ent,
        name: options?.spriteName || ent.name,
        sprite: {
          ...ent.sprite,
          type: options?.pixelData ? ('pixel' as const) : ('preset' as const),
          imageAssetId: imageAssetId,
          pixelData: options?.pixelData || ent.sprite.pixelData,
          color: options?.palette?.[0] || ent.sprite.color,
        },
      };
      updatedEntity = newEnt;
      return newEnt;
    }
    return ent;
  });

  return {
    updatedProject: {
      ...project,
      entities: updatedEntities,
      assets: updatedAssets,
    },
    updatedEntity,
    imageAssetId,
  };
}

// Helper: Apply Image Asset & Entity bindings (Create New Entity / Selected Entity / Save to Assets)
export function applyAiSpriteToProject(
  project: GameProject,
  sprite: {
    name: string;
    imageUrl: string;
    pixelData?: string[][];
    palette?: string[];
    dimension?: '2D' | '3D';
    entityType?: 'player' | 'enemy' | 'coin' | 'platform' | 'hazard';
  },
  mode: 'new_entity' | 'selected_entity' | 'asset_only',
  selectedEntity: Entity | null
): { updatedProject: GameProject; newEntityId?: string; imageAssetId: string } {
  if (mode === 'selected_entity' && selectedEntity) {
    const res = injectSpriteUrlToEntity(project, selectedEntity.id, sprite.imageUrl, {
      spriteName: sprite.name,
      pixelData: sprite.pixelData,
      palette: sprite.palette,
      dimension: sprite.dimension,
    });
    return {
      updatedProject: res.updatedProject,
      newEntityId: selectedEntity.id,
      imageAssetId: res.imageAssetId,
    };
  }

  const assetManager = AssetManager.getInstance();
  const imageAssetId = `img_ai_sprite_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const newImageAsset: ImageAsset = {
    id: imageAssetId,
    name: sprite.name || 'AI Sprite 2D',
    type: 'sprite',
    format: 'data_url',
    url: sprite.imageUrl,
    pixelData: sprite.pixelData,
    fileSizeKb: Math.max(1, Math.round(sprite.imageUrl.length / 1024)),
    isOptimized: true,
  };

  assetManager.loadImage(imageAssetId, sprite.imageUrl).catch(() => {});
  assetManager.registerOrUpdateMetadata({
    id: imageAssetId,
    canonicalName: sprite.name || 'AI Sprite 2D',
    originalName: sprite.name || 'AI Sprite 2D',
    category: 'image',
    mimeType: 'image/png',
    src: sprite.imageUrl,
    byteSize: sprite.imageUrl.length,
    tags: ['ai_generated', 'sprite', sprite.dimension || '2D'],
  });

  const existingImages = project.assets?.images || [];
  const updatedImages = [...existingImages.filter((img) => img.id !== imageAssetId), newImageAsset];

  const updatedAssets = {
    ...project.assets,
    audio: project.assets?.audio || [],
    images: updatedImages,
  };

  if (mode === 'asset_only') {
    return {
      updatedProject: {
        ...project,
        assets: updatedAssets,
      },
      imageAssetId,
    };
  }

  // Create new entity
  const newEntId = `entity_ai_sprite_${Date.now()}`;
  const entType = sprite.entityType || 'player';
  const width = entType === 'coin' ? 32 : 48;
  const height = entType === 'coin' ? 32 : 48;

  const newEntity: Entity = {
    id: newEntId,
    name: sprite.name || 'AI Generated Sprite',
    type: entType,
    visible: true,
    locked: false,
    transform: {
      x: project.world.viewportWidth / 2,
      y: project.world.viewportHeight / 2 - 40,
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 10,
    },
    sprite: {
      type: sprite.pixelData ? 'pixel' : 'preset',
      color: sprite.palette?.[0] || '#06b6d4',
      imageAssetId: imageAssetId,
      pixelData: sprite.pixelData,
      opacity: 1,
    },
    rigidbody: {
      bodyType: entType === 'coin' ? 'static' : 'dynamic',
      mass: 1,
      gravityScale: entType === 'coin' ? 0 : 1,
      velocityX: 0,
      velocityY: 0,
      friction: 0.8,
      restitution: entType === 'coin' ? 0 : 0.15,
      isGrounded: false,
      fixedRotation: true,
    },
    collider: {
      enabled: true,
      type: entType === 'coin' ? 'circle' : 'box',
      isTrigger: entType === 'coin',
      offsetX: 0,
      offsetY: 0,
      width,
      height,
      radius: width / 2,
    },
    script:
      entType === 'player'
        ? {
            tag: 'player',
            rules: [
              {
                id: `rule_${Date.now()}_jump`,
                enabled: true,
                name: 'Lompat / Tap Layar',
                trigger: 'ON_TAP',
                action: 'JUMP',
                paramNumber: -380,
                paramString: 'jump',
              },
              {
                id: `rule_${Date.now()}_swipe_r`,
                enabled: true,
                name: 'Swipe Kanan',
                trigger: 'ON_SWIPE_RIGHT',
                action: 'MOVE_RIGHT',
                paramNumber: 260,
              },
              {
                id: `rule_${Date.now()}_swipe_l`,
                enabled: true,
                name: 'Swipe Kiri',
                trigger: 'ON_SWIPE_LEFT',
                action: 'MOVE_LEFT',
                paramNumber: 260,
              },
            ],
          }
        : undefined,
  };

  return {
    updatedProject: {
      ...project,
      entities: [...project.entities, newEntity],
      assets: updatedAssets,
    },
    newEntityId: newEntId,
    imageAssetId,
  };
}

