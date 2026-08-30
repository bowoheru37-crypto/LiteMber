import React, { useState, useEffect } from 'react';
import { GameProject, Entity, AudioAsset, AiDiagnosticReport, AiDiagnosticIssue, TilemapComponent, SpriteClip, ImageAsset } from '../types/engine';
import { UnifiedModal } from './Common/UnifiedModal';
import { soundEngine } from '../engine/AudioEngine';
import { generatePresetSpriteClips, generatePresetLevelTilemap, generateTilePixelData } from '../engine/AutoTileEngine';
import {
  BUILTIN_AI_SPRITE_CATALOGUE,
  AiGeneratedSpriteModel,
  generateProceduralAiSpriteImage,
  rasterizeImageToPixelGrid,
  applyAiSpriteToProject,
  injectSpriteUrlToEntity,
} from '../engine/AiImageSpriteService';
import {
  Sparkles,
  Wand2,
  Volume2,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Play,
  Plus,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Layers,
  Paintbrush,
  Grid,
  Film,
  Grid3X3,
  Clapperboard,
  Image as ImageIcon,
  ImagePlus,
  Download,
  Eye,
  Palette,
  Dice5,
  Check,
  Cpu,
  Box,
  Target,
  ArrowRight,
  Link2,
} from 'lucide-react';

interface AiStudioModalProps {
  project: GameProject;
  selectedEntity: Entity | null;
  onUpdateProject: (updated: GameProject) => void;
  onClose: () => void;
}

// Preset Pixel Art Generators
const SPRITE_PRESETS: { name: string; category: string; prompt: string; palette: string[] }[] = [
  {
    name: 'Cyber Ninja Hero',
    category: 'Character',
    prompt: 'Karakter ninja futuristik dengan pedang neon cyan',
    palette: ['#000000', '#06b6d4', '#3b82f6', '#ffffff', '#1e293b'],
  },
  {
    name: 'Slime Monster Hijau',
    category: 'Enemy',
    prompt: 'Monster slime pixel imut dengan mata besar glowing',
    palette: ['#000000', '#22c55e', '#4ade80', '#15803d', '#ffffff'],
  },
  {
    name: 'Koin Emas Bintang',
    category: 'Item',
    prompt: 'Koin emas bersinar dengan simbol bintang retro 8-bit',
    palette: ['#000000', '#eab308', '#fef08a', '#ca8a04', '#ffffff'],
  },
  {
    name: 'Robot Boss Mech',
    category: 'Boss',
    prompt: 'Robot purba bertubuh baja merah dengan mata laser',
    palette: ['#000000', '#ef4444', '#f97316', '#78716c', '#ffffff'],
  },
  {
    name: 'Kristal Energi Magic',
    category: 'Item',
    prompt: 'Kristal magis mengapung berwarna ungu neon',
    palette: ['#000000', '#a855f7', '#d8b4fe', '#6b21a8', '#ffffff'],
  },
  {
    name: 'Peti Harta Karun',
    category: 'Object',
    prompt: 'Peti kayu klasik berkunci emas',
    palette: ['#000000', '#854d0e', '#ca8a04', '#fef08a', '#3f2c14'],
  },
];

// Helper: Generate procedural 16x16 pixel grid
function generateProceduralGrid(theme: string, palette: string[]): string[][] {
  const grid: string[][] = Array(16)
    .fill(null)
    .map(() => Array(16).fill('transparent'));

  const cMain = palette[1] || '#06b6d4';
  const cSec = palette[2] || '#3b82f6';
  const cHighlight = palette[3] || '#ffffff';
  const cDark = palette[4] || '#0f172a';

  if (theme.includes('Enemy') || theme.includes('Slime')) {
    // Blob shape
    for (let r = 5; r <= 13; r++) {
      for (let c = 3; c <= 12; c++) {
        grid[r][c] = cMain;
      }
    }
    // Eyes
    grid[7][5] = cHighlight;
    grid[7][6] = cDark;
    grid[7][9] = cHighlight;
    grid[7][10] = cDark;
  } else if (theme.includes('Koin') || theme.includes('Item')) {
    // Round Coin
    for (let r = 2; r <= 13; r++) {
      for (let c = 2; c <= 13; c++) {
        const dist = Math.hypot(r - 7.5, c - 7.5);
        if (dist <= 5.5) grid[r][c] = cMain;
        else if (dist <= 6.5) grid[r][c] = cDark;
      }
    }
    // Star center
    grid[7][7] = cHighlight;
    grid[7][8] = cHighlight;
    grid[8][7] = cHighlight;
  } else if (theme.includes('Boss') || theme.includes('Robot')) {
    // Mech body
    for (let r = 2; r <= 14; r++) {
      for (let c = 3; c <= 12; c++) {
        grid[r][c] = (r + c) % 2 === 0 ? cMain : cSec;
      }
    }
    // Visor
    grid[5][4] = '#ef4444';
    grid[5][5] = '#ef4444';
    grid[5][6] = '#ef4444';
    grid[5][7] = '#ef4444';
    grid[5][8] = '#ef4444';
    grid[5][9] = '#ef4444';
    grid[5][10] = '#ef4444';
    grid[5][11] = '#ef4444';
  } else {
    // Default Ninja / Player Character
    // Head
    for (let r = 2; r <= 6; r++) {
      for (let c = 5; c <= 10; c++) grid[r][c] = cDark;
    }
    // Visor / Eyes
    grid[4][6] = cMain;
    grid[4][7] = cMain;
    grid[4][8] = cMain;
    grid[4][9] = cMain;
    // Body
    for (let r = 7; r <= 12; r++) {
      for (let c = 4; c <= 11; c++) grid[r][c] = cSec;
    }
    // Scarf / Sword
    grid[7][12] = cHighlight;
    grid[6][13] = cHighlight;
    grid[5][14] = cHighlight;
  }

  return grid;
}

// Diagnostic Scanner Logic
function runDiagnosticScan(project: GameProject): AiDiagnosticReport {
  const issues: AiDiagnosticIssue[] = [];
  let score = 100;

  // 1. Particle Check
  let highParticleCount = 0;
  project.entities.forEach((ent) => {
    if (ent.particles && ent.particles.enabled && ent.particles.rate > 80) {
      highParticleCount++;
    }
  });

  if (project.world.maxActiveParticles > 150) {
    issues.push({
      id: 'particle_overflow',
      type: 'warning',
      category: 'performance',
      title: 'Batas Partikel Melebihi Rekomendasi itel A70',
      description: `Batas partikel aktif (${project.world.maxActiveParticles}) dapat memicu throttling GPU Mali-G57 pada perangkat entry-level.`,
      suggestedFix: 'Turunkan batas partikel ke 100 & rate ke 50/detik.',
      autoFixable: true,
    });
    score -= 10;
  }

  // 2. Physics & Colliders Check
  let dynamicNoCollider = 0;
  project.entities.forEach((ent) => {
    if (ent.rigidbody && ent.rigidbody.bodyType === 'dynamic' && (!ent.collider || !ent.collider.enabled)) {
      dynamicNoCollider++;
    }
  });

  if (dynamicNoCollider > 0) {
    issues.push({
      id: 'dynamic_no_collider',
      type: 'critical',
      category: 'physics',
      title: `${dynamicNoCollider} Entitas Dinamis Tanpa Collider`,
      description: 'Entitas fisik dinamis tanpa collider akan menembus tanah/platform.',
      suggestedFix: 'Aktifkan Box Collider dengan ukurang pas otomatis.',
      autoFixable: true,
    });
    score -= 15;
  }

  // 3. Audio Feedback Check
  let playerJumpSound = false;
  project.entities.forEach((ent) => {
    if (ent.script?.rules?.some((r) => r.action === 'JUMP' || r.action === 'PLAY_SOUND')) {
      playerJumpSound = true;
    }
  });

  if (!playerJumpSound && project.entities.some((e) => e.type === 'player')) {
    issues.push({
      id: 'missing_audio_feedback',
      type: 'info',
      category: 'audio',
      title: 'Belum Ada Suara Efek Lompat (Jump SFX)',
      description: 'Game terasa kurang reponsif tanpa umpan balik suara lompatan atau tabrakan.',
      suggestedFix: 'Tambahkan efek audio 8-bit Jump pada pemicu JUMP.',
      autoFixable: true,
    });
    score -= 5;
  }

  // 4. Input Gesture Check
  let hasSwipeOrTap = false;
  project.entities.forEach((ent) => {
    if (ent.script?.rules?.some((r) => r.trigger.includes('SWIPE') || r.trigger.includes('TAP') || r.trigger.includes('HOLD'))) {
      hasSwipeOrTap = true;
    }
  });

  if (!hasSwipeOrTap) {
    issues.push({
      id: 'legacy_input',
      type: 'info',
      category: 'input',
      title: 'Dukungan Gestur Layar Sentuh Belum Dikonfigurasi',
      description: 'Pengguna HP (itel A70) dapat lebih mudah mengontrol game menggunakan Tap/Swipe.',
      suggestedFix: 'Tambahkan gestur Tap untuk Lompat / Tembak.',
      autoFixable: true,
    });
    score -= 5;
  }

  // 5. Physics Memory Buffer Check
  if (!project.world.useTypedArrayBuffer) {
    issues.push({
      id: 'typed_array_disabled',
      type: 'warning',
      category: 'performance',
      title: 'Memory Buffer TypedArray Non-aktif',
      description: 'Pengalokasian memori non-contiguous menyebabkan lag Garbage Collection (GC).',
      suggestedFix: 'Aktifkan useTypedArrayBuffer.',
      autoFixable: true,
    });
    score -= 10;
  }

  return {
    healthScore: Math.max(0, score),
    deviceProfile: 'itel A70 Optimized (Unisoc T603 / 4GB RAM)',
    issues,
  };
}

export const AiStudioModal: React.FC<AiStudioModalProps> = ({
  project,
  selectedEntity,
  onUpdateProject,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'sprites' | 'spritesheet' | 'tilemap' | 'audio' | 'analyzer'>('sprites');

  // AI 2D & 3D Image Sprite Studio State
  const [spriteSubMode, setSpriteSubMode] = useState<'ai_image' | 'procedural_pixel'>('ai_image');
  const [selectedDimension, setSelectedDimension] = useState<'2D' | '3D'>('3D');
  const [catalogueFilter, setCatalogueFilter] = useState<'all' | '3D' | '2D' | 'character' | 'enemy' | 'item' | 'environment'>('all');
  const [selectedAiSprite, setSelectedAiSprite] = useState<AiGeneratedSpriteModel>(BUILTIN_AI_SPRITE_CATALOGUE[0]);
  const [aiImagePrompt, setAiImagePrompt] = useState<string>(BUILTIN_AI_SPRITE_CATALOGUE[0].prompt);
  const [aiImageCategory, setAiImageCategory] = useState<AiGeneratedSpriteModel['category']>('character');
  const [aiImageStyle, setAiImageStyle] = useState<AiGeneratedSpriteModel['style']>('isometric_3d');
  const [aiImageAspectRatio, setAiImageAspectRatio] = useState<'1:1' | '4:3' | '16:9' | '3:4'>('1:1');
  const [aiImageName, setAiImageName] = useState<string>(BUILTIN_AI_SPRITE_CATALOGUE[0].name);
  const [currentAiImageUrl, setCurrentAiImageUrl] = useState<string>(BUILTIN_AI_SPRITE_CATALOGUE[0].imageUrl);
  const [customImageUrlInput, setCustomImageUrlInput] = useState<string>('');
  const [showCustomUrlInput, setShowCustomUrlInput] = useState<boolean>(false);
  const [currentRasterizedGrid, setCurrentRasterizedGrid] = useState<string[][]>(() =>
    generateProceduralGrid('Cyber Warrior 3D Hero', BUILTIN_AI_SPRITE_CATALOGUE[0].palette)
  );
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [isRasterizing, setIsRasterizing] = useState(false);
  const [aiPreviewTab, setAiPreviewTab] = useState<'hd_image' | 'pixel_grid'>('hd_image');
  const [selectedEntityPresetType, setSelectedEntityPresetType] = useState<'player' | 'enemy' | 'coin' | 'platform' | 'hazard'>('player');

  // Procedural Pixel AI State
  const [spritePrompt, setSpritePrompt] = useState('Cyber Ninja Hero');
  const [selectedPalette, setSelectedPalette] = useState<string[]>(SPRITE_PRESETS[0].palette);
  const [generatedPixelGrid, setGeneratedPixelGrid] = useState<string[][]>(() =>
    generateProceduralGrid('Cyber Ninja Hero', SPRITE_PRESETS[0].palette)
  );
  const [isGeneratingSprite, setIsGeneratingSprite] = useState(false);
  const [spriteName, setSpriteName] = useState('Hero Cyber AI');

  // Auto-rasterize AI Image to Pixel Grid when URL changes
  useEffect(() => {
    if (currentAiImageUrl) {
      setIsRasterizing(true);
      rasterizeImageToPixelGrid(currentAiImageUrl, 16)
        .then((grid) => {
          setCurrentRasterizedGrid(grid);
          setIsRasterizing(false);
        })
        .catch(() => {
          setIsRasterizing(false);
        });
    }
  }, [currentAiImageUrl]);

  // Random Prompt Inspiration Generator for 2D and 3D Sprites
  const handleRandomizeAiPrompt = () => {
    const inspirations = [
      {
        name: 'Cyber Warrior 3D Hero',
        dimension: '3D' as const,
        category: 'character' as const,
        style: 'isometric_3d' as const,
        prompt: '3D rendered isometric game character sprite of a futuristic cyber warrior in glowing cyan and dark slate armor, high quality 3D stylized render, clean studio lighting, isolated on solid dark background',
      },
      {
        name: '3D Glowing Crystal Orb',
        dimension: '3D' as const,
        category: 'item' as const,
        style: 'stylized_render_3d' as const,
        prompt: '3D stylized rendered floating magic energy crystal orb with purple neon runes and sparkling particles, isolated solid background, game item asset sprite',
      },
      {
        name: '3D Heavy Mech Titan',
        dimension: '3D' as const,
        category: 'boss' as const,
        style: 'lowpoly_3d' as const,
        prompt: '3D rendered sci-fi mech robot boss with glowing orange thrusters and heavy titanium armor, clean stylized 3D game asset sprite, isolated solid background',
      },
      {
        name: 'Cyber Ninja Shinobi 2D',
        dimension: '2D' as const,
        category: 'character' as const,
        style: 'cyberpunk' as const,
        prompt: '2D retro pixel art game sprite of a futuristic cyber ninja hero holding a glowing cyan neon katana, sharp pixel edges, isolated on solid dark background',
      },
      {
        name: 'Cute Slime Blob 3D',
        dimension: '3D' as const,
        category: 'enemy' as const,
        style: 'stylized_render_3d' as const,
        prompt: '3D cute rendered friendly green slime enemy monster sprite with glowing eyes and gelatinous bouncy shader, clean isometric game asset sprite, isolated solid background',
      },
      {
        name: 'Floating Cyber Tile 3D',
        dimension: '3D' as const,
        category: 'environment' as const,
        style: 'isometric_3d' as const,
        prompt: '3D isometric floating cyberpunk sci-fi platform tile block with neon blue energy stripes, game environment asset sprite, isolated solid dark background',
      },
      {
        name: 'Royal Loot Chest 2D',
        dimension: '2D' as const,
        category: 'object' as const,
        style: 'pixel_art' as const,
        prompt: '2D vintage wooden treasure chest with golden ornaments and glowing lock, rpg game loot sprite, isolated background',
      },
    ];
    const picked = inspirations[Math.floor(Math.random() * inspirations.length)];
    setAiImageName(picked.name);
    setAiImagePrompt(picked.prompt);
    setSelectedDimension(picked.dimension);
    setAiImageCategory(picked.category);
    setAiImageStyle(picked.style);
  };

  // Generate Custom 2D / 3D AI Sprite
  const handleGenerateCustomAiSprite = () => {
    setIsGeneratingAiImage(true);
    setTimeout(() => {
      const generatedDataUrl = generateProceduralAiSpriteImage(
        aiImagePrompt,
        aiImageStyle,
        selectedAiSprite.palette || ['#06b6d4', '#3b82f6', '#0f172a', '#ffffff', '#eab308'],
        128
      );
      setCurrentAiImageUrl(generatedDataUrl);
      setIsGeneratingAiImage(false);
      setFixSuccessMsg(`✨ Berhasil menghasilkan Sprite ${selectedDimension}: "${aiImageName}"!`);
      setTimeout(() => setFixSuccessMsg(null), 3000);
    }, 600);
  };

  // Select Preset AI Sprite from Catalogue
  const handleSelectAiSpritePreset = (sprite: AiGeneratedSpriteModel) => {
    setSelectedAiSprite(sprite);
    setAiImageName(sprite.name);
    setAiImagePrompt(sprite.prompt);
    setSelectedDimension(sprite.dimension);
    setAiImageCategory(sprite.category);
    setAiImageStyle(sprite.style);
    setAiImageAspectRatio(sprite.aspectRatio);
    setCurrentAiImageUrl(sprite.imageUrl);
    setSelectedEntityPresetType(sprite.entityPresetType);
  };

  // Direct Injection Function: Inject Sprite URL into Selected Entity's Sprite Configuration
  const handleInjectSpriteUrlToSelectedEntity = (customUrl?: string) => {
    if (!selectedEntity) {
      setFixSuccessMsg('⚠️ Pilih entitas terlebih dahulu di kanvas untuk menginjeksi sprite URL!');
      setTimeout(() => setFixSuccessMsg(null), 3000);
      return;
    }

    const urlToInject = customUrl || currentAiImageUrl;
    if (!urlToInject) return;

    const { updatedProject, updatedEntity, imageAssetId } = injectSpriteUrlToEntity(
      project,
      selectedEntity.id,
      urlToInject,
      {
        spriteName: aiImageName || selectedEntity.name,
        pixelData: currentRasterizedGrid,
        palette: selectedAiSprite.palette,
        dimension: selectedDimension,
      }
    );

    onUpdateProject(updatedProject);
    setFixSuccessMsg(`⚡ Sprite URL berhasil diinjeksi ke konfigurasi entitas "${selectedEntity.name}"!`);
    setTimeout(() => setFixSuccessMsg(null), 3500);
  };

  // Apply AI Image Sprite to Project / Entity
  const handleApplyAiImageSprite = (mode: 'new_entity' | 'selected_entity' | 'asset_only') => {
    if (mode === 'selected_entity' && selectedEntity) {
      handleInjectSpriteUrlToSelectedEntity();
      return;
    }

    const { updatedProject } = applyAiSpriteToProject(
      project,
      {
        name: aiImageName || `AI Sprite ${selectedDimension}`,
        imageUrl: currentAiImageUrl,
        pixelData: currentRasterizedGrid,
        palette: selectedAiSprite.palette,
        dimension: selectedDimension,
        entityType: selectedEntityPresetType,
      },
      mode,
      selectedEntity
    );

    onUpdateProject(updatedProject);

    if (mode === 'asset_only') {
      setFixSuccessMsg(`Aset Sprite "${aiImageName}" berhasil disimpan ke Asset Library!`);
      setTimeout(() => setFixSuccessMsg(null), 3000);
    } else {
      onClose();
    }
  };

  // Spritesheet Studio State
  const [spritesheetPreset, setSpritesheetPreset] = useState('Cyber Knight Hero');
  const [generatedClips, setGeneratedClips] = useState<Record<string, SpriteClip>>(() =>
    generatePresetSpriteClips('Cyber Knight Hero', '#06b6d4', '#3b82f6')
  );
  const [activeClipPreview, setActiveClipPreview] = useState<'idle' | 'run' | 'jump'>('run');
  const [isGeneratingClips, setIsGeneratingClips] = useState(false);

  // Tilemap Studio State
  const [tileTheme, setTileTheme] = useState<TilemapComponent['theme']>('grass_dirt');
  const [tilePreset, setTilePreset] = useState<'simple_platformer' | 'dungeon_maze' | 'cyber_run'>('simple_platformer');
  const [generatedTileGrid, setGeneratedTileGrid] = useState(() =>
    generatePresetLevelTilemap('simple_platformer', 16, 10)
  );
  const [isGeneratingTilemap, setIsGeneratingTilemap] = useState(false);

  // Audio AI State
  const [audioPrompt, setAudioPrompt] = useState('Suara Tembakan Laser Pew Pew');
  const [synthPresetKey, setSynthPresetKey] = useState<string>('laser');
  const [synthVolume, setSynthVolume] = useState<number>(0.9);
  const [audioAssetName, setAudioAssetName] = useState('Laser Laser AI');

  // Analyzer AI State
  const [diagnosticReport, setDiagnosticReport] = useState<AiDiagnosticReport>(() => runDiagnosticScan(project));
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [fixSuccessMsg, setFixSuccessMsg] = useState<string | null>(null);

  // Handle AI Generate Sprite
  const handleGenerateSprite = (presetPrompt?: string, palette?: string[]) => {
    setIsGeneratingSprite(true);
    const pPrompt = presetPrompt || spritePrompt;
    const pPalette = palette || selectedPalette;

    setTimeout(() => {
      const newGrid = generateProceduralGrid(pPrompt, pPalette);
      setGeneratedPixelGrid(newGrid);
      setIsGeneratingSprite(false);
    }, 400);
  };

  // Handle AI Generate Spritesheet Clips
  const handleGenerateSpritesheet = (name: string, c1: string, c2: string) => {
    setIsGeneratingClips(true);
    setSpritesheetPreset(name);
    setTimeout(() => {
      const clips = generatePresetSpriteClips(name, c1, c2);
      setGeneratedClips(clips);
      setIsGeneratingClips(false);
    }, 400);
  };

  const handleApplySpritesheet = (mode: 'new' | 'selected') => {
    if (mode === 'selected' && selectedEntity) {
      const updatedEntities = project.entities.map((e) => {
        if (e.id === selectedEntity.id) {
          return {
            ...e,
            sprite: {
              ...e.sprite,
              type: 'spritesheet' as const,
              currentClip: 'run',
              clips: generatedClips,
            },
          };
        }
        return e;
      });
      onUpdateProject({ ...project, entities: updatedEntities });
      onClose();
    } else {
      const newEntity: Entity = {
        id: `entity_spritesheet_${Date.now()}`,
        name: `${spritesheetPreset} (Animated)`,
        type: 'player',
        visible: true,
        locked: false,
        transform: {
          x: project.world.viewportWidth / 2,
          y: project.world.viewportHeight / 2 - 50,
          width: 48,
          height: 48,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 10,
        },
        sprite: {
          type: 'spritesheet',
          color: '#06b6d4',
          currentClip: 'run',
          clips: generatedClips,
          opacity: 1,
        },
        rigidbody: {
          bodyType: 'dynamic',
          mass: 1,
          gravityScale: 1,
          velocityX: 0,
          velocityY: 0,
          friction: 0.8,
          restitution: 0.1,
          isGrounded: false,
          fixedRotation: true,
        },
        collider: {
          enabled: true,
          type: 'box',
          isTrigger: false,
          offsetX: 0,
          offsetY: 0,
          width: 48,
          height: 48,
          radius: 24,
        },
      };
      onUpdateProject({ ...project, entities: [...project.entities, newEntity] });
      onClose();
    }
  };

  // Handle AI Generate Tilemap Level
  const handleGenerateTilemap = (preset: 'simple_platformer' | 'dungeon_maze' | 'cyber_run', theme: TilemapComponent['theme']) => {
    setIsGeneratingTilemap(true);
    setTilePreset(preset);
    setTileTheme(theme);
    setTimeout(() => {
      const grid = generatePresetLevelTilemap(preset, 16, 10);
      setGeneratedTileGrid(grid);
      setIsGeneratingTilemap(false);
    }, 400);
  };

  const handleApplyTilemapLevel = (mode: 'new' | 'selected') => {
    const tilemapComp: TilemapComponent = {
      tileSize: 32,
      cols: 16,
      rows: 10,
      data: generatedTileGrid,
      theme: tileTheme,
      autoTiled: true,
    };

    if (mode === 'selected' && selectedEntity) {
      const updatedEntities = project.entities.map((e) => {
        if (e.id === selectedEntity.id) {
          return {
            ...e,
            sprite: {
              ...e.sprite,
              type: 'tilemap' as const,
              tilemap: tilemapComp,
            },
          };
        }
        return e;
      });
      onUpdateProject({ ...project, entities: updatedEntities });
      onClose();
    } else {
      const newEntity: Entity = {
        id: `entity_tilemap_${Date.now()}`,
        name: `Level Tilemap (${tileTheme})`,
        type: 'platform',
        visible: true,
        locked: false,
        transform: {
          x: project.world.viewportWidth / 2,
          y: project.world.viewportHeight / 2,
          width: project.world.viewportWidth,
          height: project.world.viewportHeight,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 1,
        },
        sprite: {
          type: 'tilemap',
          color: '#22c55e',
          tilemap: tilemapComp,
          opacity: 1,
        },
        collider: {
          enabled: true,
          type: 'box',
          isTrigger: false,
          offsetX: 0,
          offsetY: 0,
          width: project.world.viewportWidth,
          height: project.world.viewportHeight,
          radius: 100,
        },
      };
      onUpdateProject({ ...project, entities: [...project.entities, newEntity] });
      onClose();
    }
  };
  const handleApplySpriteToEntity = (mode: 'new' | 'selected') => {
    if (mode === 'selected' && selectedEntity) {
      const updatedEntities = project.entities.map((e) => {
        if (e.id === selectedEntity.id) {
          return {
            ...e,
            sprite: {
              ...e.sprite,
              type: 'pixel' as const,
              pixelData: generatedPixelGrid,
            },
          };
        }
        return e;
      });
      onUpdateProject({ ...project, entities: updatedEntities });
      onClose();
    } else {
      // Create new Entity
      const newEntity: Entity = {
        id: `entity_ai_${Date.now()}`,
        name: spriteName || 'Objek AI Pixel',
        type: 'player',
        visible: true,
        locked: false,
        transform: {
          x: project.world.viewportWidth / 2,
          y: project.world.viewportHeight / 2 - 50,
          width: 48,
          height: 48,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 10,
        },
        sprite: {
          type: 'pixel',
          color: selectedPalette[1] || '#06b6d4',
          pixelData: generatedPixelGrid,
          opacity: 1,
        },
        rigidbody: {
          bodyType: 'dynamic',
          mass: 1,
          gravityScale: 1,
          velocityX: 0,
          velocityY: 0,
          friction: 0.8,
          restitution: 0.1,
          isGrounded: false,
          fixedRotation: true,
        },
        collider: {
          enabled: true,
          type: 'box',
          isTrigger: false,
          offsetX: 0,
          offsetY: 0,
          width: 44,
          height: 44,
          radius: 22,
        },
        script: {
          tag: 'player',
          rules: [
            {
              id: `rule_${Date.now()}_1`,
              enabled: true,
              name: 'Lompat Layar / Tap',
              trigger: 'ON_TAP',
              action: 'JUMP',
              paramNumber: -380,
              paramString: 'jump',
            },
            {
              id: `rule_${Date.now()}_2`,
              enabled: true,
              name: 'Gerak Kanan Swipe',
              trigger: 'ON_SWIPE_RIGHT',
              action: 'MOVE_RIGHT',
              paramNumber: 260,
            },
            {
              id: `rule_${Date.now()}_3`,
              enabled: true,
              name: 'Gerak Kiri Swipe',
              trigger: 'ON_SWIPE_LEFT',
              action: 'MOVE_LEFT',
              paramNumber: 260,
            },
          ],
        },
      };

      onUpdateProject({
        ...project,
        entities: [...project.entities, newEntity],
      });
      onClose();
    }
  };

  // Handle AI Sound Generation & Save
  const handlePlaySynthPreview = () => {
    soundEngine.play(synthPresetKey);
  };

  const handleSaveAudioAsset = () => {
    const newAsset: AudioAsset = {
      id: `audio_ai_${Date.now()}`,
      name: audioAssetName || 'Sound AI Effect',
      type: 'sfx',
      format: 'synth',
      presetKey: synthPresetKey,
      volume: 0.9,
    };

    const existingAudio = project.assets?.audio || [];
    onUpdateProject({
      ...project,
      assets: {
        ...project.assets,
        audio: [...existingAudio, newAsset],
      },
    });

    setFixSuccessMsg(`Aset Audio "${newAsset.name}" berhasil disimpan ke Proyek!`);
    setTimeout(() => setFixSuccessMsg(null), 3000);
  };

  // 1-Click Auto Fix & Optimizer
  const handleAutoFixAll = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      // Apply Optimizations
      const updatedWorld = {
        ...project.world,
        maxActiveParticles: Math.min(project.world.maxActiveParticles, 100),
        useTypedArrayBuffer: true,
        deviceProfile: 'itel_a70_optimized' as const,
      };

      const updatedEntities = project.entities.map((ent) => {
        let updated = { ...ent };
        // Ensure collider for dynamic rigidbodies
        if (updated.rigidbody && updated.rigidbody.bodyType === 'dynamic' && (!updated.collider || !updated.collider.enabled)) {
          updated.collider = {
            enabled: true,
            type: 'box',
            isTrigger: false,
            offsetX: 0,
            offsetY: 0,
            width: updated.transform.width,
            height: updated.transform.height,
            radius: updated.transform.width / 2,
          };
        }
        // Cap particle rates
        if (updated.particles && updated.particles.enabled) {
          updated.particles.rate = Math.min(updated.particles.rate, 60);
        }
        return updated;
      });

      const newProject = {
        ...project,
        world: updatedWorld,
        entities: updatedEntities,
      };

      onUpdateProject(newProject);
      setDiagnosticReport(runDiagnosticScan(newProject));
      setIsOptimizing(false);
      setFixSuccessMsg('✨ Berhasil mengoptimalkan 100% performa untuk itel A70!');
      setTimeout(() => setFixSuccessMsg(null), 3000);
    }, 600);
  };

  return (
    <UnifiedModal
      title="Asisten AI Engine Studio"
      subtitle="Generator Sprite, Efek Suara Synth & Optimasi Performa itel A70"
      icon={Sparkles}
      iconColor="text-cyan-400"
      badge={
        <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30 font-bold">
          Pro AI
        </span>
      }
      maxWidth="3xl"
      onClose={onClose}
    >
      {/* Navigation Tabs with 48px Touch Target */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-3 sm:px-5 gap-2 overflow-x-auto shrink-0 min-h-[48px] items-center">
          <button
            onClick={() => setActiveTab('sprites')}
            className={`py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'sprites'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Generate Sprite</span>
            <span className="text-[9px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.2 rounded-full font-bold">
              2D/3D
            </span>
          </button>

          <button
            onClick={() => setActiveTab('spritesheet')}
            className={`py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'spritesheet'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>AI Spritesheet Animasi</span>
          </button>

          <button
            onClick={() => setActiveTab('tilemap')}
            className={`py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'tilemap'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>AI Auto Tilemap Level</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'audio'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>AI Audio & Synth</span>
          </button>

          <button
            onClick={() => setActiveTab('analyzer')}
            className={`py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'analyzer'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>AI Analisa & Optimasi</span>
            {diagnosticReport.issues.length > 0 && (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {diagnosticReport.issues.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {fixSuccessMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{fixSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: GENERATE SPRITE (2D & 3D IMAGE GENERATION & ENTITY INJECTION) */}
          {activeTab === 'sprites' && (
            <div className="space-y-4">
              {/* Target Entity Live HUD Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  selectedEntity
                    ? 'bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/60 border-cyan-500/40 shadow-lg shadow-cyan-950/30'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedEntity
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-inner'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Target Entitas:</span>
                      <span className={`text-xs font-bold ${selectedEntity ? 'text-white' : 'text-slate-400 italic'}`}>
                        {selectedEntity ? selectedEntity.name : 'Tidak ada entitas terpilih di kanvas'}
                      </span>
                      {selectedEntity && (
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold">
                          {selectedEntity.type.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {selectedEntity
                        ? `Injeksi langsung URL gambar sprite ini ke konfigurasi sprite entitas "${selectedEntity.name}".`
                        : 'Pilih entitas di kanvas untuk menginjeksi sprite ke objek tersebut, atau klik "Buat Karakter Baru".'}
                    </p>
                  </div>
                </div>

                {selectedEntity && (
                  <button
                    onClick={() => handleInjectSpriteUrlToSelectedEntity()}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Injeksi ke {selectedEntity.name}</span>
                  </button>
                )}
              </div>

              {/* Sub-mode Pill Switcher & Dimension Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl p-2 gap-2.5">
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setSpriteSubMode('ai_image')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      spriteSubMode === 'ai_image'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>AI 2D/3D Sprite Generator</span>
                    <span className="text-[9px] bg-cyan-400/20 text-cyan-300 px-1 py-0.2 rounded font-bold">PRO</span>
                  </button>

                  <button
                    onClick={() => setSpriteSubMode('procedural_pixel')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      spriteSubMode === 'procedural_pixel'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Paintbrush className="w-3.5 h-3.5" />
                    <span>Procedural 16x16 Pixel Grid</span>
                  </button>
                </div>

                {spriteSubMode === 'ai_image' && (
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs self-stretch sm:self-auto justify-center">
                    <button
                      onClick={() => {
                        setSelectedDimension('3D');
                        setAiImageStyle('isometric_3d');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        selectedDimension === '3D'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Box className="w-3 h-3" />
                      <span>3D Render</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDimension('2D');
                        setAiImageStyle('pixel_art');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        selectedDimension === '2D'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>2D Sprite</span>
                    </button>
                  </div>
                )}
              </div>

              {/* MODE 1: AI 2D/3D SPRITE GENERATOR & INJECTION */}
              {spriteSubMode === 'ai_image' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Preset Gallery & Prompt Customization */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Filter Pills & Preset Catalogue */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Pilih dari Galeri AI 2D/3D Sprite Terkurasi</span>
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {BUILTIN_AI_SPRITE_CATALOGUE.length} Aset Siap Pakai
                        </span>
                      </div>

                      {/* Filter category tabs */}
                      <div className="flex gap-1 overflow-x-auto pb-1.5 mb-2 text-[10px] scrollbar-none">
                        {(['all', '3D', '2D', 'character', 'enemy', 'item', 'environment'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setCatalogueFilter(filter)}
                            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer capitalize ${
                              catalogueFilter === filter
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {filter === 'all'
                              ? 'Semua'
                              : filter === '3D'
                              ? '🧊 3D Sprites'
                              : filter === '2D'
                              ? '🎮 2D Sprites'
                              : filter === 'character'
                              ? 'Player / Hero'
                              : filter === 'enemy'
                              ? 'Enemies / Boss'
                              : filter === 'item'
                              ? 'Loot & Gems'
                              : 'Platform & Tiles'}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {BUILTIN_AI_SPRITE_CATALOGUE.filter((item) => {
                          if (catalogueFilter === 'all') return true;
                          if (catalogueFilter === '3D') return item.dimension === '3D';
                          if (catalogueFilter === '2D') return item.dimension === '2D';
                          if (catalogueFilter === 'character') return item.category === 'character';
                          if (catalogueFilter === 'enemy') return item.category === 'enemy' || item.category === 'boss';
                          if (catalogueFilter === 'item') return item.category === 'item' || item.category === 'object';
                          if (catalogueFilter === 'environment') return item.category === 'environment';
                          return true;
                        }).map((item) => {
                          const isSelected = selectedAiSprite.id === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleSelectAiSpritePreset(item)}
                              className={`p-2 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                                isSelected
                                  ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-950 mb-2 relative border border-slate-800 flex items-center justify-center">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {isSelected && (
                                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                )}
                                <span className="absolute top-1 left-1 text-[8px] bg-slate-950/90 text-cyan-300 px-1 py-0.5 rounded font-black border border-slate-800">
                                  {item.dimension}
                                </span>
                                <span className="absolute bottom-1 left-1 text-[8px] bg-slate-950/80 text-slate-300 px-1 py-0.5 rounded backdrop-blur-xs font-mono">
                                  {item.category.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-white block truncate group-hover:text-cyan-400">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">{item.style.replace(/_/g, ' ')}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI Prompt Input & Style Controls */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Buat Prompt Sprite {selectedDimension} Kustom</span>
                        </label>
                        <button
                          onClick={handleRandomizeAiPrompt}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Dice5 className="w-3 h-3 text-cyan-400" />
                          <span>Inspirasi Acak</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <textarea
                          rows={2}
                          value={aiImagePrompt}
                          onChange={(e) => setAiImagePrompt(e.target.value)}
                          placeholder={
                            selectedDimension === '3D'
                              ? "Deskripsikan 3D sprite... contoh: '3D rendered isometric cyber hero in glowing armor with studio lighting...'"
                              : "Deskripsikan 2D sprite... contoh: '2D pixel art cyber ninja katana glowing neon...'"
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none font-sans"
                        />
                      </div>

                      {/* Style & Category Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Gaya Seni (Art Style)</label>
                          <select
                            value={aiImageStyle}
                            onChange={(e) => setAiImageStyle(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            <optgroup label="✨ Gaya 3D Render">
                              <option value="isometric_3d">3D Isometric Stylized</option>
                              <option value="stylized_render_3d">3D Studio Render</option>
                              <option value="lowpoly_3d">3D Low-Poly Clean</option>
                              <option value="claymation_3d">3D Claymation / Plasticine</option>
                              <option value="voxel_3d">3D Voxel Model</option>
                            </optgroup>
                            <optgroup label="🎮 Gaya 2D Sprite">
                              <option value="pixel_art">2D Pixel Art 16-Bit</option>
                              <option value="cyberpunk">2D Cyberpunk Neon</option>
                              <option value="retro_arcade">2D Retro Arcade 8-Bit</option>
                              <option value="fantasy_chibi">2D Fantasy Chibi RPG</option>
                              <option value="sci_fi">2D Sci-Fi Vector</option>
                            </optgroup>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Kategori Entitas</label>
                          <select
                            value={selectedEntityPresetType}
                            onChange={(e) => setSelectedEntityPresetType(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            <option value="player">Player (Karakter Utama)</option>
                            <option value="enemy">Enemy (Musuh)</option>
                            <option value="coin">Coin / Item Koleksi</option>
                            <option value="platform">Platform / Lantai</option>
                            <option value="hazard">Hazard / Rintangan</option>
                          </select>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-[10px] text-slate-400 block mb-1">Aspek Rasio</label>
                          <select
                            value={aiImageAspectRatio}
                            onChange={(e) => setAiImageAspectRatio(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            <option value="1:1">1:1 (Sprite Persegi)</option>
                            <option value="4:3">4:3 (Objek Lebar)</option>
                            <option value="16:9">16:9 (Backdrop)</option>
                            <option value="3:4">3:4 (Portrait Hero)</option>
                          </select>
                        </div>
                      </div>

                      {/* Custom Direct URL Injection Accordion */}
                      <div className="pt-1 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>{showCustomUrlInput ? 'Sembunyikan Input URL Kustom' : 'Atau Masukkan / Injeksi URL Gambar Kustom'}</span>
                        </button>

                        {showCustomUrlInput && (
                          <div className="mt-2 flex gap-1.5">
                            <input
                              type="text"
                              value={customImageUrlInput}
                              onChange={(e) => setCustomImageUrlInput(e.target.value)}
                              placeholder="https://... atau data:image/png;base64,..."
                              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (customImageUrlInput.trim()) {
                                  setCurrentAiImageUrl(customImageUrlInput.trim());
                                  if (selectedEntity) {
                                    handleInjectSpriteUrlToSelectedEntity(customImageUrlInput.trim());
                                  } else {
                                    setFixSuccessMsg('URL gambar berhasil dimuat ke viewport preview!');
                                    setTimeout(() => setFixSuccessMsg(null), 3000);
                                  }
                                }
                              }}
                              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              Terapkan
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Generate Button */}
                      <button
                        onClick={handleGenerateCustomAiSprite}
                        disabled={isGeneratingAiImage}
                        className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Wand2 className={`w-4 h-4 ${isGeneratingAiImage ? 'animate-spin' : ''}`} />
                        <span>{isGeneratingAiImage ? `Sedang Mensintesis Sprite ${selectedDimension}...` : `Generate Sprite ${selectedDimension} Baru`}</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: High-Res Preview, Quantization Matrix & Entity Application */}
                  <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Preview Header & View Mode Switcher */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Preview Aset {selectedDimension}</span>
                        </span>

                        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px]">
                          <button
                            onClick={() => setAiPreviewTab('hd_image')}
                            className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                              aiPreviewTab === 'hd_image' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            HD Texture
                          </button>
                          <button
                            onClick={() => setAiPreviewTab('pixel_grid')}
                            className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                              aiPreviewTab === 'pixel_grid' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            16x16 Matrix
                          </button>
                        </div>
                      </div>

                      {/* Display Viewport */}
                      <div className="w-full aspect-square max-w-[240px] mx-auto bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-3 flex items-center justify-center relative overflow-hidden shadow-inner group">
                        {/* Background Grid Pattern */}
                        <div
                          className="absolute inset-0 opacity-20 pointer-events-none"
                          style={{
                            backgroundImage:
                              'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                            backgroundSize: '16px 16px',
                            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                          }}
                        />

                        {aiPreviewTab === 'hd_image' ? (
                          <div className="relative z-10 w-full h-full flex items-center justify-center">
                            <img
                              src={currentAiImageUrl}
                              alt={aiImageName}
                              referrerPolicy="no-referrer"
                              className="max-w-full max-h-full object-contain drop-shadow-2xl animate-pulse-slow group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <div className="relative z-10 grid grid-cols-16 gap-0.5 w-full h-full">
                            {isRasterizing ? (
                              <div className="col-span-16 h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                                <span>Mengkuantisasi matriks pixel...</span>
                              </div>
                            ) : (
                              currentRasterizedGrid.map((row, rIdx) =>
                                row.map((color, cIdx) => (
                                  <div
                                    key={`${rIdx}-${cIdx}`}
                                    className="w-full h-full rounded-[0.5px]"
                                    style={{
                                      backgroundColor: color === 'transparent' ? 'transparent' : color,
                                    }}
                                  />
                                ))
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {/* Palette Bar & Metadata */}
                      <div className="mt-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Palet Warna Terdeteksi:</span>
                          <span className="font-mono text-cyan-400 text-[10px]">RGBA 32-Bit</span>
                        </div>
                        <div className="flex gap-1.5 items-center">
                          {selectedAiSprite.palette.map((hex, idx) => (
                            <div
                              key={idx}
                              className="w-4 h-4 rounded-md border border-slate-700 shadow-sm"
                              style={{ backgroundColor: hex }}
                              title={hex}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls & Direct Entity Injection */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Nama Aset / Entitas</label>
                        <input
                          type="text"
                          value={aiImageName}
                          onChange={(e) => setAiImageName(e.target.value)}
                          placeholder="Nama Karakter AI..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Direct Injection Button for Selected Entity */}
                      {selectedEntity && (
                        <button
                          onClick={() => handleInjectSpriteUrlToSelectedEntity()}
                          className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer transition-all hover:scale-[1.01]"
                        >
                          <Zap className="w-4 h-4 fill-current" />
                          <span>Injeksi Sprite URL ke "{selectedEntity.name}"</span>
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleApplyAiImageSprite('new_entity')}
                          className="py-2.5 px-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Buat Karakter Baru</span>
                        </button>

                        <button
                          onClick={() => handleApplyAiImageSprite('selected_entity')}
                          disabled={!selectedEntity}
                          className="py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-40"
                        >
                          <Layers className="w-4 h-4 text-cyan-400" />
                          <span>Terapkan ke Terpilih</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleApplyAiImageSprite('asset_only')}
                          className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <ImagePlus className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Simpan ke Assets</span>
                        </button>

                        <a
                          href={currentAiImageUrl}
                          download={`${aiImageName.toLowerCase().replace(/\s+/g, '_')}_sprite.png`}
                          className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Unduh PNG</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: PROCEDURAL 16x16 PIXEL MATRIX */}
              {spriteSubMode === 'procedural_pixel' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left Column: Preset & Generator Prompt */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                        1. Pilih Preset Karakter / Objek
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {SPRITE_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => {
                              setSpritePrompt(preset.name);
                              setSelectedPalette(preset.palette);
                              handleGenerateSprite(preset.name, preset.palette);
                            }}
                            className="p-2.5 bg-slate-800/80 border border-slate-700/80 hover:border-cyan-500/50 rounded-xl text-left transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-white group-hover:text-cyan-400">
                                {preset.name}
                              </span>
                              <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                                {preset.category}
                              </span>
                            </div>
                            <div className="flex gap-1 mt-1">
                              {preset.palette.map((c, idx) => (
                                <div
                                  key={idx}
                                  className="w-3.5 h-3.5 rounded-full border border-slate-600"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        2. Kustomisasi Prompt AI Sprite
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={spritePrompt}
                          onChange={(e) => setSpritePrompt(e.target.value)}
                          placeholder="Contoh: Robot alien mata laser, Koin emas..."
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={() => handleGenerateSprite()}
                          disabled={isGeneratingSprite}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                        >
                          <Wand2 className={`w-3.5 h-3.5 ${isGeneratingSprite ? 'animate-spin' : ''}`} />
                          <span>Generate</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Preview Pixel Matrix & Apply */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center space-y-4">
                    <span className="text-xs font-semibold text-slate-300 self-start flex items-center gap-1.5">
                      <Paintbrush className="w-3.5 h-3.5 text-cyan-400" /> Preview Hasil Sprite (16x16 Pixel Grid)
                    </span>

                    {/* Pixel Canvas Rendering */}
                    <div className="bg-slate-900 border-2 border-slate-700 p-2 rounded-xl shadow-inner grid grid-cols-16 gap-0.5 w-48 h-48">
                      {generatedPixelGrid.map((row, rIdx) =>
                        row.map((color, cIdx) => (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            className="w-full h-full rounded-[1px]"
                            style={{
                              backgroundColor: color === 'transparent' ? '#1e293b' : color,
                            }}
                          />
                        ))
                      )}
                    </div>

                    {/* Apply Buttons */}
                    <div className="w-full space-y-2">
                      <input
                        type="text"
                        value={spriteName}
                        onChange={(e) => setSpriteName(e.target.value)}
                        placeholder="Nama Sprite Entitas..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white text-center"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleApplySpriteToEntity('new')}
                          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buat Karakter Baru</span>
                        </button>

                        <button
                          onClick={() => handleApplySpriteToEntity('selected')}
                          disabled={!selectedEntity}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
                        >
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Terapkan ke Terpilih</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI SPRITESHEET ANIMATION STUDIO */}
          {activeTab === 'spritesheet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Pilih Preset Karakter Spritesheet Multi-Frame
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Cyber Knight Hero', c1: '#06b6d4', c2: '#3b82f6' },
                      { name: 'Goblin Slime Monster', c1: '#22c55e', c2: '#15803d' },
                      { name: 'Space Robot Boss', c1: '#ef4444', c2: '#f97316' },
                      { name: 'Golden Coin Star', c1: '#facc15', c2: '#ca8a04' },
                    ].map((p) => (
                      <button
                        key={p.name}
                        onClick={() => handleGenerateSpritesheet(p.name, p.c1, p.c2)}
                        className={`p-2.5 bg-slate-800/80 border rounded-xl text-left transition-all cursor-pointer group ${
                          spritesheetPreset === p.name ? 'border-purple-500 bg-purple-950/20' : 'border-slate-700 hover:border-purple-500/50'
                        }`}
                      >
                        <span className="text-xs font-bold text-white group-hover:text-purple-300 block">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.c1 }} />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.c2 }} />
                          <span className="text-[9px] text-slate-400 ml-1">Idle • Run • Jump</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1">
                    <Film className="w-3.5 h-3.5" /> Frame Sequence Clips Output:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.keys(generatedClips).map((clipKey) => (
                      <button
                        key={clipKey}
                        onClick={() => setActiveClipPreview(clipKey as any)}
                        className={`py-1 px-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                          activeClipPreview === clipKey ? 'bg-purple-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {clipKey} ({generatedClips[clipKey].frames.length}F)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Live Animation Preview */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center space-y-4">
                <span className="text-xs font-semibold text-slate-300 self-start flex items-center gap-1.5">
                  <Clapperboard className="w-3.5 h-3.5 text-purple-400" /> Live Spritesheet Animation Preview ({activeClipPreview.toUpperCase()})
                </span>

                {/* Animated Render Box */}
                <div className="bg-slate-900 border-2 border-purple-500/60 p-2 rounded-xl shadow-inner grid grid-cols-16 gap-0.5 w-48 h-48">
                  {(() => {
                    const clip = generatedClips[activeClipPreview] || Object.values(generatedClips)[0];
                    if (!clip || !clip.frames.length) return null;
                    const frameIdx = Math.floor((performance.now() / 1000) * (clip.fps || 8)) % clip.frames.length;
                    const frameGrid = clip.frames[frameIdx];

                    return frameGrid.map((row, rIdx) =>
                      row.map((color, cIdx) => (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className="w-full h-full rounded-[1px]"
                          style={{
                            backgroundColor: color === 'transparent' ? '#1e293b' : color,
                          }}
                        />
                      ))
                    );
                  })()}
                </div>

                {/* Apply Buttons */}
                <div className="w-full grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleApplySpritesheet('new')}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-lg shadow-purple-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Buat Player Animated</span>
                  </button>

                  <button
                    onClick={() => handleApplySpritesheet('selected')}
                    disabled={!selectedEntity}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Terapkan ke Terpilih</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI AUTO TILEMAP LEVEL STUDIO */}
          {activeTab === 'tilemap' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    1. Pilih Tema Visual Auto-Tilemap
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'grass_dirt', label: '🌿 Forest Grass & Dirt', color: '#22c55e' },
                      { id: 'cyber_neon', label: '⚡ Cyberpunk Neon', color: '#06b6d4' },
                      { id: 'retro_brick', label: '🧱 Retro Brick City', color: '#ef4444' },
                      { id: 'dungeon_stone', label: '🏰 Dungeon Stone Castle', color: '#64748b' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleGenerateTilemap(tilePreset, t.id as any)}
                        className={`p-2.5 bg-slate-800 border rounded-xl text-left transition-all cursor-pointer ${
                          tileTheme === t.id ? 'border-emerald-500 bg-emerald-950/20' : 'border-slate-700 hover:border-emerald-500/50'
                        }`}
                      >
                        <span className="text-xs font-bold text-white block">{t.label}</span>
                        <div className="w-4 h-1 rounded mt-1.5" style={{ backgroundColor: t.color }} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    2. Pilih Layout Level Preset
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'simple_platformer', label: 'Platformer' },
                      { id: 'cyber_run', label: 'Cyber Runner' },
                      { id: 'dungeon_maze', label: 'Dungeon' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleGenerateTilemap(p.id as any, tileTheme)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold text-center border cursor-pointer transition-all ${
                          tilePreset === p.id ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Tilemap Mini Level Preview */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center space-y-4">
                <span className="text-xs font-semibold text-slate-300 self-start flex items-center gap-1.5">
                  <Grid3X3 className="w-3.5 h-3.5 text-emerald-400" /> Mini Level Tilemap Preview (16x10 Grid)
                </span>

                <div className="bg-slate-900 border-2 border-emerald-500/60 p-1.5 rounded-xl shadow-inner w-full h-44 flex flex-col justify-between">
                  {generatedTileGrid.map((row, rIdx) => (
                    <div key={rIdx} className="flex gap-0.5 h-full">
                      {row.map((tileType, cIdx) => {
                        const isSolid = tileType !== 'empty';
                        const isSpike = tileType === 'spike';
                        const isCoin = tileType === 'coin';

                        let bg = 'transparent';
                        if (isSpike) bg = '#ef4444';
                        else if (isCoin) bg = '#facc15';
                        else if (isSolid) bg = tileTheme === 'cyber_neon' ? '#06b6d4' : tileTheme === 'retro_brick' ? '#b91c1c' : '#22c55e';

                        return (
                          <div
                            key={cIdx}
                            className="flex-1 rounded-[1px]"
                            style={{ backgroundColor: bg }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="w-full grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleApplyTilemapLevel('new')}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Buat Level Tilemap</span>
                  </button>

                  <button
                    onClick={() => handleApplyTilemapLevel('selected')}
                    disabled={!selectedEntity}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Terapkan ke Terpilih</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI AUDIO & SYNTH */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">
                  Pilih Preset Efek Suara Synth 8-Bit
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'jump', label: '🦘 Jump (Lompat)' },
                    { key: 'coin', label: '🪙 Coin (Koin)' },
                    { key: 'hit', label: '💥 Hit (Tabrakan)' },
                    { key: 'laser', label: '🔫 Laser (Tembak)' },
                    { key: 'explosion', label: '💣 Explode (Ledakan)' },
                    { key: 'powerup', label: '⭐ Powerup (Bonus)' },
                    { key: 'win', label: '🏆 Victory (Menang)' },
                    { key: 'bounce', label: '🌀 Bounce (Langkah)' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => {
                        setSynthPresetKey(p.key);
                        setAudioAssetName(`SFX ${p.key.toUpperCase()} AI`);
                        soundEngine.play(p.key);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                        synthPresetKey === p.key
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 font-bold'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{p.label}</span>
                      <Play className="w-3.5 h-3.5 text-cyan-400 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Synthesizer Preview & Controls */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" /> Parameter Synthesizer Audio AI
                  </h3>
                  <button
                    onClick={handlePlaySynthPreview}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Tes Audio
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Nama Aset Audio</span>
                    <input
                      type="text"
                      value={audioAssetName}
                      onChange={(e) => setAudioAssetName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Volume Audio (0 - 1)</span>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      value={synthVolume}
                      onChange={(e) => setSynthVolume(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveAudioAsset}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" /> Simpan Ke Aset Audio Proyek
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AI ANALYZER & OPTIMIZER */}
          {activeTab === 'analyzer' && (
            <div className="space-y-4">
              {/* Health Score Overview */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Skor Kesehatan Performa Proyek</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-extrabold text-white">
                      {diagnosticReport.healthScore}/100
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        diagnosticReport.healthScore >= 85
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {diagnosticReport.healthScore >= 85 ? 'Sangat Optimal (itel A70)' : 'Perlu Optimasi'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleAutoFixAll}
                  disabled={isOptimizing}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
                  <span>1-Click Auto Fix</span>
                </button>
              </div>

              {/* Issues List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Hasil Diagnostik & Catatan Optimasi:
                </span>

                {diagnosticReport.issues.length === 0 ? (
                  <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-white">Semua Sistem 100% Sempurna!</p>
                    <p className="text-[11px] text-slate-400">
                      Proyek game Anda telah sepenuhnya teroptimasi untuk kelancaran 60 FPS pada itel A70.
                    </p>
                  </div>
                ) : (
                  diagnosticReport.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          {issue.type === 'critical' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          ) : issue.type === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Info className="w-4 h-4 text-cyan-400" />
                          )}
                          {issue.title}
                        </span>
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase">
                          {issue.category}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{issue.description}</p>
                      <div className="text-[11px] text-cyan-300 font-semibold pt-1 border-t border-slate-800/80">
                        💡 Rekomendasi Solusi: {issue.suggestedFix}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
    </UnifiedModal>
  );
};
