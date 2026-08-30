export type EntityType = 
  | 'player' 
  | 'enemy' 
  | 'platform' 
  | 'coin' 
  | 'hazard' 
  | 'particle_emitter' 
  | 'ui_text' 
  | 'joystick' 
  | 'trigger';

export type BodyType = 'static' | 'dynamic' | 'kinematic';

export interface Vector2D {
  x: number;
  y: number;
}

export interface TransformComponent {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
  scaleX: number;
  scaleY: number;
  zIndex: number;
  rotationX?: number; // 3D Pitch angle in degrees (-180..180)
  rotationY?: number; // 3D Yaw angle in degrees (-180..180)
  rotationZ?: number; // 3D Roll angle in degrees (-180..180)
  depthZ?: number; // 3D Depth coordinate Z (-1000..1000)
  perspective?: number; // Perspective focal distance
  skewX?: number; // 2.5D Skew X factor
  skewY?: number; // 2.5D Skew Y factor
}

export interface SpriteClip {
  name: string;
  frames: string[][][]; // array of 16x16 pixel grids
  fps: number;
  loop?: boolean;
}

export type TileType = 
  | 'empty' 
  | 'grass_top' 
  | 'grass_center' 
  | 'dirt_center' 
  | 'stone_wall' 
  | 'brick' 
  | 'water' 
  | 'lava' 
  | 'spike' 
  | 'coin';

export type TileCollisionType = 'solid' | 'pass_through' | 'hazard' | 'ladder' | 'water' | 'empty';

export interface TilesetTile {
  id: string;
  name: string;
  type: TileType | string;
  pixelData: string[][]; // e.g. 16x16 grid
  collisionType: TileCollisionType;
  animatedFrames?: string[][][]; // Optional animated tile frames
  animationFps?: number;
  tags?: string[];
}

export interface TilesetDefinition {
  id: string;
  name: string;
  tileSize: number; // e.g. 8, 16, 32
  theme: 'grass_dirt' | 'cyber_neon' | 'retro_brick' | 'dungeon_stone' | 'water_zone' | 'custom';
  tiles: TilesetTile[];
}

export interface TilemapLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  isCollisionLayer?: boolean;
  data: (string | TileType)[][];
}

export type IsometricProjectionMode = 'orthogonal' | 'isometric_2_1' | 'dimetric';

export interface IsometricTile {
  col: number;
  row: number;
  height: number; // Elevation height level (0..N)
  topColor?: string;
  leftColor?: string;
  rightColor?: string;
  type?: string; // e.g. 'grass', 'stone', 'water', 'sand', 'snow'
  slope?: 'none' | 'north' | 'south' | 'east' | 'west';
}

export interface IsometricMapConfig {
  tileWidth: number; // e.g. 64 or 32
  tileHeight: number; // e.g. 32 or 16 (2:1 standard ratio)
  blockHeight: number; // e.g. 16 px 3D extrusion depth
  rows: number;
  cols: number;
  heightmap: number[][]; // Elevation height per cell
  tileTypes: string[][]; // Tile material per cell
  projectionMode: IsometricProjectionMode;
  ambientOcclusion?: boolean;
  shadows?: boolean;
}

export interface ProceduralIsoTerrainParams {
  seed: number;
  roughness: number;
  waterLevel: number;
  mountainHeight: number;
  preset: 'hills' | 'island' | 'dungeon' | 'pyramid' | 'canyon';
}

export interface TilemapComponent {
  tileSize: number;
  cols: number;
  rows: number;
  data: TileType[][]; // Default / backward-compatible main layer data
  layers?: TilemapLayer[];
  activeLayerId?: string;
  tilesetId?: string;
  customTileset?: TilesetDefinition;
  theme: 'grass_dirt' | 'cyber_neon' | 'retro_brick' | 'dungeon_stone' | 'water_zone' | 'custom';
  autoTiled?: boolean;
  isometricConfig?: IsometricMapConfig;
  isIsometric?: boolean;
}

export interface AtlasFrame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pixelData?: string[][];
  pivotX?: number;
  pivotY?: number;
}

export interface SpriteAtlas {
  id: string;
  name: string;
  width: number;
  height: number;
  frames: AtlasFrame[];
  pixelAtlasGrid?: string[][]; // Packed single composite atlas pixel grid
}

export interface SpritesheetAtlas {
  id: string;
  name: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  clips: Record<string, SpriteClip>;
  pixelAtlasGrid?: string[][];
}

export interface AnimationKeyframe {
  id: string;
  timeMs: number; // e.g., 0, 100, 200, 300...
  frameIndex?: number;
  pixelData?: string[][]; // 16x16 pixel frame
  offsetX?: number;
  offsetY?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  depthZ?: number;
  skewX?: number;
  skewY?: number;
  opacity?: number;
  easing?: 'linear' | 'easeOutBounce' | 'easeOutElastic' | 'easeInOutQuad' | 'easeOutBack' | 'easeOutSine' | 'springBouncy' | 'springSnappy' | 'springLoose' | 'springCharacter';
  sfxPreset?: string; // e.g. 'step', 'jump', 'coin', 'hit', 'land'
}

export interface AnimationTimelineTrack {
  id: string;
  name: string;
  fps: number; // 4, 8, 12, 16, 24, 30, 60
  durationMs: number;
  loop: boolean;
  keyframes: AnimationKeyframe[];
}

export interface SpriteComponent {
  type: 'color' | 'pixel' | 'preset' | 'circle' | 'video' | 'animated' | 'spritesheet' | 'tilemap';
  color: string;
  presetIcon?: string; // e.g. 'hero', 'coin', 'monster', 'star', 'spike', 'box'
  pixelData?: string[][]; // 16x16 grid of hex colors
  animatedFrames?: string[][][]; // array of 16x16 pixel grids for clip animations
  animationFps?: number;
  currentClip?: string;
  clips?: Record<string, SpriteClip>;
  timelineTracks?: Record<string, AnimationTimelineTrack>;
  activeTimelineTrackId?: string;
  tilemap?: TilemapComponent;
  videoAssetId?: string;
  imageAssetId?: string;
  borderRadius?: number;
  opacity: number;
}

export interface RigidbodyComponent {
  bodyType: BodyType;
  mass: number;
  gravityScale: number;
  velocityX: number;
  velocityY: number;
  friction: number;
  restitution: number; // bounciness 0 - 1
  isGrounded: boolean;
  fixedRotation: boolean;
}

export interface ColliderComponent {
  enabled: boolean;
  type: 'box' | 'circle';
  isTrigger: boolean;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  radius: number;
}

export type PhysicsJointType = 'distance' | 'hinge' | 'spring' | 'rope';

export interface PhysicsJoint {
  id: string;
  name: string;
  type: PhysicsJointType;
  entityAId: string;
  entityBId: string;
  anchorA?: { x: number; y: number }; // Offset from Entity A center
  anchorB?: { x: number; y: number }; // Offset from Entity B center
  distance?: number; // Target distance (if distance/spring joint)
  stiffness?: number; // Elastic stiffness 0..1000 (default 100)
  damping?: number; // Damping factor 0..100 (default 10)
  collideConnected?: boolean;
  enableLimits?: boolean; // For hinge joints
  minAngle?: number; // Min angle in degrees (-180..180)
  maxAngle?: number; // Max angle in degrees (-180..180)
  enableMotor?: boolean; // Motor torque for hinge joint
  motorSpeed?: number; // Angular speed deg/s
  maxMotorTorque?: number;
  breakForce?: number; // Force limit before joint snaps (0 = unbreakable)
  color?: string; // Visual color in editor
  enabled?: boolean;
}

export type TriggerType = 
  | 'ON_START'
  | 'ON_UPDATE'
  | 'ON_TOUCH_DOWN'
  | 'ON_TOUCH_UP'
  | 'ON_TAP'
  | 'ON_SWIPE_UP'
  | 'ON_SWIPE_DOWN'
  | 'ON_SWIPE_LEFT'
  | 'ON_SWIPE_RIGHT'
  | 'ON_JOYSTICK_MOVE'
  | 'ON_KEY_PRESS'
  | 'ON_KEY_HOLD'
  | 'ON_COLLISION_ENTER'
  | 'ON_OUT_OF_BOUNDS'
  | 'ON_SCORE_REACH'
  | 'ON_TIMER';

export type ActionType = 
  | 'APPLY_FORCE'
  | 'SET_VELOCITY_X'
  | 'SET_VELOCITY_Y'
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'MOVE_UP'
  | 'MOVE_DOWN'
  | 'JUMP'
  | 'DASH'
  | 'TELEPORT'
  | 'DESTROY_SELF'
  | 'DESTROY_OTHER'
  | 'ADD_SCORE'
  | 'PLAY_SOUND'
  | 'EMIT_PARTICLES'
  | 'RESTART_LEVEL'
  | 'TOGGLE_VISIBILITY'
  | 'CHANGE_COLOR'
  | 'SHOW_DIALOGUE'
  | 'CHANGE_SCENE'
  | 'SHOW_BANNER'
  | 'TRIGGER_TUTORIAL'
  | 'SAVE_GAME'
  | 'LOAD_GAME'
  | 'SET_VARIABLE'
  | 'ADD_VARIABLE'
  | 'TOGGLE_VARIABLE';

// --- GAME VARIABLES SYSTEM TYPES ---
export type GameVariableType = 'number' | 'boolean' | 'string';
export type GameVariableScope = 'global' | 'local';

export interface GameVariable {
  id: string;
  name: string;
  type: GameVariableType;
  scope: GameVariableScope;
  value: number | boolean | string;
  defaultValue: number | boolean | string;
  description?: string;
  entityId?: string; // If local scope, tied to specific entity
}

// --- TUTORIAL SYSTEM TYPES ---
export type GestureHintType = 'tap' | 'double_tap' | 'swipe_left' | 'swipe_right' | 'drag' | 'pinch';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElementId?: string; // UI DOM element ID or entity ID
  highlightRect?: { x: number; y: number; width: number; height: number }; // Screen space spotlight
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  gestureHint?: GestureHintType;
  triggerType?: 'ON_START' | 'ON_TAP_TARGET' | 'ON_BUTTON_CLICK' | 'ON_ACTION' | 'MANUAL';
  autoAdvanceMs?: number;
  audioHint?: string;
  hapticPattern?: 'light' | 'medium' | 'heavy' | 'double';
}

export interface TutorialSequence {
  id: string;
  title: string;
  category: 'basics' | 'logic' | 'physics' | 'audio' | 'export';
  steps: TutorialStep[];
  completed?: boolean;
}

// --- DIALOGUE & MONOLOGUE SYSTEM TYPES ---
export type DialogueMode = 'dialogue_box' | 'monologue_thought' | 'floating_bubble' | 'cinematic_banner';
export type DialogueMood = 'neutral' | 'happy' | 'angry' | 'surprised' | 'sad' | 'mysterious';

export interface DialogueVariableChange {
  varName: string;
  operation: 'set' | 'add' | 'toggle';
  value: string | number | boolean;
}

export interface DialogueCondition {
  varName: string;
  operator: '==' | '!=' | '>=' | '<=' | 'contains';
  value: string | number | boolean;
}

export interface DialogueOption {
  id: string;
  text: string;
  nextDialogueId?: string;
  action?: ActionType;
  actionParam?: string;
  condition?: DialogueCondition;
  variableChanges?: DialogueVariableChange[];
}

export interface DialogueNode {
  id: string;
  speakerName: string;
  portraitPreset: 'hero' | 'wizard' | 'cyborg' | 'king' | 'villain' | 'robot' | 'ghost' | 'guide';
  customPortraitUrl?: string;
  text: string;
  mode?: DialogueMode;
  mood?: DialogueMood;
  typewriterFps?: number;
  beepSound?: string;
  voicePitch?: number;
  autoAdvanceMs?: number;
  options?: DialogueOption[];
  nextDialogueId?: string;
  targetEntityId?: string; // For floating speech/thought bubbles
  variableChanges?: DialogueVariableChange[];
  condition?: DialogueCondition;
}

export interface DialogueTree {
  id: string;
  title: string;
  initialNodeId: string;
  nodes: Record<string, DialogueNode>;
  variables?: Record<string, string | number | boolean>;
}

// --- SCENE SYSTEM TYPES ---
export type SceneTransitionType = 'fade_black' | 'wipe_left' | 'slide_up' | 'zoom_in' | 'pixelate';

export interface Scene {
  id: string;
  name: string;
  entities: Entity[];
  world: WorldSettings;
  groups?: EntityGroup[];
  bgmAssetId?: string;
  dialogueTreeId?: string;
}

export interface LogicRule {
  id: string;
  enabled: boolean;
  name: string;
  trigger: TriggerType;
  triggerTargetTag?: string; // e.g. 'coin', 'hazard'
  triggerKey?: string; // e.g. 'ArrowLeft', 'Space', 'Touch'
  targetEntityId?: string; // Relative entity target for prefab/scene interactions
  action: ActionType;
  paramNumber?: number; // e.g. force amount, score delta, sound index
  paramString?: string; // e.g. sound type: 'jump', 'coin', 'hit', 'laser'
  timerMs?: number; // Timer interval in milliseconds
  
  // Game Variables Integration
  varName?: string; // Name or ID of variable to modify or evaluate
  varOperator?: '==' | '!=' | '>' | '<' | '>=' | '<='; // Condition operator
  varValue?: string | number | boolean; // Value to compare, set, or add
}

export interface ScriptComponent {
  rules: LogicRule[];
  tag: string;
}

export interface AudioAsset {
  id: string;
  name: string;
  type: 'sfx' | 'bgm';
  format: 'synth' | 'custom_url' | 'data_url';
  presetKey?: string; // e.g. 'jump', 'coin', 'hit', 'laser', 'explosion', 'powerup', 'win', 'cyber_theme', 'pixel_bounce', 'retro_march'
  url?: string; // base64 data url or public audio URL
  durationSeconds?: number;
  loop?: boolean;
  volume?: number; // 0 to 1
  fileSizeKb?: number;
  isOptimized?: boolean;
}

export interface VideoAsset {
  id: string;
  name: string;
  type: 'bg_loop' | 'cutscene' | 'animated_sprite';
  format: 'mp4_url' | 'webm_url' | 'gif_frames' | 'procedural';
  url?: string;
  presetKey?: string; // e.g. 'cyber_grid_loop', 'space_nebula_loop', 'matrix_rain_loop'
  frames?: string[][][]; // array of 16x16 pixel grids
  fps?: number;
  durationSeconds?: number;
  loop?: boolean;
  fileSizeKb?: number;
  isOptimized?: boolean;
}

export interface ImageAsset {
  id: string;
  name: string;
  type: 'sprite' | 'bg_texture' | 'tileset' | 'pbr_layer';
  format: 'data_url' | 'pixel_grid' | 'custom_url';
  url?: string;
  pixelData?: string[][];
  presetKey?: string; // e.g. 'cyber_grid_bg', 'brick_wall_bg', 'space_stars_bg'
  fileSizeKb?: number;
  isOptimized?: boolean;
  width?: number;
  height?: number;
  pbrChannel?: 'base_color' | 'normal' | 'roughness' | 'metallic' | 'ao' | 'height' | 'sss' | 'clearcoat';
  texelDensityScore?: number;
}

export interface Model3DAsset {
  id: string;
  name: string;
  format: 'obj' | 'gltf' | 'glb' | 'stl';
  url?: string;
  dataText?: string;
  vertexCount?: number;
  faceCount?: number;
  fileSizeKb?: number;
  projectionSpriteUrl?: string; // Auto-generated compressed 2D isometric/orthographic preview sprite
  isOptimized?: boolean;
  lods?: Array<{ level: number; vertexCount: number; dataUrl?: string }>;
  pbrMaterialId?: string;
  texelDensityScore?: number;
  polyBudgetStatus?: 'optimal' | 'warning' | 'exceeded';
}

export interface AnimationAsset {
  id: string;
  name: string;
  type: 'timeline_track' | 'sprite_clip' | 'skeletal_rig' | 'blendshape_facs' | 'motion_matching';
  format: 'json' | 'keyframe_sequence' | 'pixel_grid_frames';
  durationMs: number;
  fps: number;
  loop?: boolean;
  timelineTrack?: AnimationTimelineTrack;
  spriteClip?: SpriteClip;
  blendshapes?: Record<string, number>;
  fileSizeKb?: number;
  isOptimized?: boolean;
}

export interface AudioSourceComponent {
  soundOnStart?: string; // audio asset ID or synth key
  soundOnCollision?: string; // audio asset ID or synth key
  bgmAssetId?: string; // audio asset ID for entity background audio
  autoplayBgm?: boolean;
  loopBgm?: boolean;
  volume?: number;
}

export type ParticleEmitterShape = 'point' | 'box' | 'circle' | 'cone' | 'line' | 'ring';
export type ParticleShape = 'square' | 'circle' | 'spark' | 'star' | 'ring';

export interface ParticleComponent {
  enabled: boolean;
  rate?: number; // particles per sec (backward compatibility)
  burstRate?: number; // particles per sec / burst count
  color?: string; // base color
  colorGradient?: string[]; // array of hex colors for gradient transition
  speed?: number; // base speed
  minSpeed?: number;
  maxSpeed?: number;
  lifetime?: number; // base lifetime in seconds
  minLifetime?: number;
  maxLifetime?: number;
  size?: number; // base size in px
  minSize?: number;
  maxSize?: number;
  shape?: ParticleShape;
  emitterShape?: ParticleEmitterShape;
  emitterWidth?: number;
  emitterHeight?: number;
  emitterRadius?: number;
  angle?: number; // emission angle in degrees (0..360)
  spread?: number; // cone angle spread in degrees (0..360)
  gravityX?: number; // particle gravity force X
  gravityY?: number; // particle gravity force Y
  blendMode?: 'source-over' | 'lighter' | 'additive';
  preset?: string;
}

export type ShaderType = 
  | 'crt_scanline'
  | 'cyber_neon'
  | 'pixelate'
  | 'vignette'
  | 'chromatic'
  | 'water_ripple'
  | 'glitch'
  | 'thermal'
  | 'bloom';

export interface ShaderComponent {
  enabled: boolean;
  type: ShaderType;
  intensity: number; // 0..1
  scale?: number;
  speed?: number;
  glowColor?: string;
  blendMode?: 'source-over' | 'screen' | 'lighter' | 'overlay' | 'multiply';
  applyToWorld?: boolean;
}

export interface EntityGroup {
  id: string;
  name: string;
  color?: string; // e.g. '#38bdf8', '#a855f7', '#f59e0b', '#10b981', '#ec4899'
  collapsed?: boolean;
  visible?: boolean;
  locked?: boolean;
  zIndex?: number;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  visible: boolean;
  locked: boolean;
  groupId?: string; // Parent group/folder ID for project organization
  transform: TransformComponent;
  sprite: SpriteComponent;
  rigidbody?: RigidbodyComponent;
  collider?: ColliderComponent;
  script?: ScriptComponent;
  particles?: ParticleComponent;
  shader?: ShaderComponent;
  audioSource?: AudioSourceComponent;
  health?: number;
  maxHealth?: number;
  customVariables?: Record<string, string | number | boolean>;
  text?: {
    content: string;
    fontSize: number;
    color: string;
    align: 'left' | 'center' | 'right';
  };
}

export type ControlInputType = 'button' | 'dpad' | 'joystick' | 'trigger';

export interface VirtualInputControl {
  id: string;
  name: string;
  type: ControlInputType;
  mappedKey: string; // e.g. 'Space', 'ArrowLeft', 'KeyZ', 'KeyX', 'ArrowUp', 'ArrowDown', etc.
  gamepadButton?: string; // e.g. 'Button0 (A)', 'Button1 (B)', 'Button2 (X)', 'Button3 (Y)', etc.
  posX: number; // Percentage 0 - 100 on screen
  posY: number; // Percentage 0 - 100 on screen
  sizePx: number; // Base size in pixels (40 - 120px)
  shape: 'circle' | 'square' | 'pill';
  color: string;
  hapticFeedback: boolean;
  rapidFire: boolean;
  rapidFireSpeedMs?: number; // e.g. 100ms
  holdBehavior?: 'press' | 'toggle' | 'repeat';
  touchAccuracyRadiusPx?: number;
}

export interface VirtualInputLayout {
  id: string;
  name: string;
  controls: VirtualInputControl[];
  touchLatencyMode: 'ultra_low_latency' | 'balanced' | 'filtered';
  deadzoneRadiusPx: number;
  showInPlayMode: boolean;
  vibrationIntensityMs: number;
}

export interface GlobalLightingSettings {
  enabled: boolean;
  ambientColor: string; // Hex e.g. '#ffffff' or '#1a1a2e'
  ambientIntensity: number; // 0 to 1
  shadowsEnabled: boolean;
  shadowColor?: string; // Hex color or rgba for shadows e.g. '#000000'
  shadowIntensity?: number; // 0 to 1
  shadowOffsetX?: number; // px offset
  shadowOffsetY?: number; // px offset
  shadowBlur?: number; // px blur
  sunLightColor?: string; // Directional sunlight/moonlight tint
  sunLightIntensity?: number; // 0 to 1
  moodPreset?: 'daylight' | 'sunset' | 'night' | 'cyberpunk' | 'dungeon' | 'neon_noir' | 'custom';
}

export interface WorldSettings {
  gravityX: number;
  gravityY: number;
  backgroundColor: string;
  backgroundImageUrl?: string;
  backgroundVideoAssetId?: string;
  showGridSnap?: boolean;
  gridSize?: number;
  viewportWidth: number;
  viewportHeight: number;
  cameraFollowEntityId?: string;
  cameraSmoothing: number;
  targetFPS: 30 | 60;
  deviceProfile: 'itel_a70_optimized' | 'standard';
  maxActiveParticles: number;
  useTypedArrayBuffer: boolean;
  liteOptimizationMode?: boolean;
  bgmAssetId?: string; // World background music asset ID
  worldShader?: ShaderComponent; // Global backdrop camera shader filter
  inputLayout?: VirtualInputLayout; // Virtual Input Touch Mapping Layout
  lighting?: GlobalLightingSettings; // Global lighting, ambient light & shadow settings
}

export interface Prefab {
  id: string;
  name: string;
  category: 'player' | 'item' | 'enemy' | 'platform' | 'ui' | 'interactive' | 'custom';
  description?: string;
  icon?: string;
  color?: string;
  createdAt: string;
  isBuiltin?: boolean;
  entities: Entity[];
}

export interface GameProject {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  entities: Entity[];
  world: WorldSettings;
  groups?: EntityGroup[];
  constraints?: PhysicsJoint[];
  joints?: PhysicsJoint[];
  score: number;
  highScore: number;
  prefabs?: Prefab[];
  variables?: GameVariable[];
  scenes?: Scene[];
  activeSceneId?: string;
  dialogues?: DialogueTree[];
  tutorials?: TutorialSequence[];
  assets?: {
    audio: AudioAsset[];
    video?: VideoAsset[];
    images?: ImageAsset[];
    models3d?: Model3DAsset[];
    animations?: AnimationAsset[];
    tilesets?: TilesetDefinition[];
    atlases?: SpriteAtlas[];
    spritesheets?: SpritesheetAtlas[];
  };
}

export interface ProfilerStats {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  activeEntities: number;
  activeParticles: number;
  bufferMemoryKb: number;
  gcCallsPrevented: number;
}

export interface AiDiagnosticIssue {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'performance' | 'physics' | 'audio' | 'input' | 'logic';
  title: string;
  description: string;
  suggestedFix: string;
  autoFixable: boolean;
}

export interface AiDiagnosticReport {
  healthScore: number; // 0-100
  deviceProfile: string;
  issues: AiDiagnosticIssue[];
}

