import React from 'react';
import { Entity, WorldSettings } from '../../types/engine';
import { UnifiedSheetHeader } from '../Common/UnifiedSheetHeader';
import { Palette, Move, Activity, Shield, Camera, Focus, Box, Sliders, Volume2, BookmarkPlus } from 'lucide-react';

interface InspectorSheetProps {
  entity: Entity | null;
  world?: WorldSettings;
  onUpdateEntity: (updated: Entity) => void;
  onUpdateWorld?: (updatedWorld: WorldSettings) => void;
  onOpenSavePrefab?: () => void;
  onOpenPhysicsPresets?: () => void;
  onClose: () => void;
}

export const InspectorSheet: React.FC<InspectorSheetProps> = ({
  entity,
  world,
  onUpdateEntity,
  onUpdateWorld,
  onOpenSavePrefab,
  onOpenPhysicsPresets,
  onClose,
}) => {
  if (!entity) {
    return (
      <div className="flex flex-col h-full text-white">
        <UnifiedSheetHeader
          title="Properti Objek"
          subtitle="Pilih objek di panggung untuk mengedit parameter"
          icon={Sliders}
          iconColor="text-cyan-400"
          onClose={onClose}
        />
        <div className="p-8 text-center text-slate-400 text-xs font-medium">
          Pilih objek di layar untuk melihat properti detail.
        </div>
      </div>
    );
  }

  const presetColors = [
    '#38bdf8', '#facc15', '#ef4444', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#334155', '#ffffff'
  ];

  const presetIcons = ['hero', 'coin', 'spike', 'monster', 'box'];

  return (
    <div className="flex flex-col h-full text-white">
      <UnifiedSheetHeader
        title={`Properti: ${entity.name}`}
        subtitle={`${entity.type.toUpperCase()} • Transform & Physics`}
        icon={Palette}
        iconColor="text-cyan-400"
        action={
          onOpenSavePrefab && (
            <button
              onClick={onOpenSavePrefab}
              className="min-h-[40px] px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/40 transition-all cursor-pointer flex items-center gap-1.5"
              title="Simpan sebagai Prefab Module"
            >
              <Box className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Prefab</span>
            </button>
          )
        }
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
        {/* Name & Tag */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nama Objek</label>
          <input
            type="text"
            value={entity.name}
            onChange={(e) => onUpdateEntity({ ...entity, name: e.target.value })}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Camera Focus Target Option */}
        {world && onUpdateWorld && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Camera className="w-4 h-4" />
                <span>Camera Focus Target</span>
              </div>
              {world.cameraFollowEntityId === entity.id && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Focus className="w-3 h-3" /> TARGET AKTIF
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Atur objek ini sebagai target kamera agar viewport GameCanvas mengikuti pergerakannya secara halus saat Mode Play.
            </p>
            <button
              onClick={() => {
                const isCurrentTarget = world.cameraFollowEntityId === entity.id;
                onUpdateWorld({
                  ...world,
                  cameraFollowEntityId: isCurrentTarget ? undefined : entity.id,
                });
              }}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                world.cameraFollowEntityId === entity.id
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              {world.cameraFollowEntityId === entity.id
                ? 'Lepas Focus Kamera'
                : 'Jadikan Target Focus Kamera'}
            </button>
          </div>
        )}

        {/* Transform: X, Y, Width, Height */}
        <div className="space-y-2 border-t border-slate-800/80 pt-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
            <Move className="w-3.5 h-3.5" />
            <span>Transformasi Posisi & Ukuran</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400">Posisi X</span>
              <input
                type="number"
                value={Math.round(entity.transform.x)}
                onChange={(e) =>
                  onUpdateEntity({
                    ...entity,
                    transform: { ...entity.transform, x: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Posisi Y</span>
              <input
                type="number"
                value={Math.round(entity.transform.y)}
                onChange={(e) =>
                  onUpdateEntity({
                    ...entity,
                    transform: { ...entity.transform, y: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400">Lebar (Width)</span>
              <input
                type="number"
                value={entity.transform.width}
                onChange={(e) =>
                  onUpdateEntity({
                    ...entity,
                    transform: { ...entity.transform, width: parseFloat(e.target.value) || 10 },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400">Tinggi (Height)</span>
              <input
                type="number"
                value={entity.transform.height}
                onChange={(e) =>
                  onUpdateEntity({
                    ...entity,
                    transform: { ...entity.transform, height: parseFloat(e.target.value) || 10 },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400">Urutan Layer (Z-Index)</span>
              <input
                type="number"
                value={entity.transform.zIndex || 0}
                onChange={(e) =>
                  onUpdateEntity({
                    ...entity,
                    transform: { ...entity.transform, zIndex: parseInt(e.target.value) || 0 },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400">Rotasi (Derajat)</span>
              <input
                type="number"
                value={entity.transform.rotation || 0}
                onChange={(e) =>
                  onUpdateEntity({
                    ...entity,
                    transform: { ...entity.transform, rotation: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Sprite Color & Preset Icon */}
        <div className="space-y-2 border-t border-slate-800/80 pt-3">
          <span className="text-xs font-semibold text-cyan-400">Warna & Tampilan Graphic</span>

          {/* Color Palette Picker */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() =>
                  onUpdateEntity({
                    ...entity,
                    sprite: { ...entity.sprite, color },
                  })
                }
                className={`w-6 h-6 rounded-full border border-white/20 transition-all cursor-pointer ${
                  entity.sprite.color === color ? 'ring-2 ring-cyan-400 scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Icon Presets */}
          <div className="mt-2">
            <span className="text-[10px] text-slate-400 block mb-1">Preset Bentuk / Ikon Graphic</span>
            <div className="flex gap-1.5">
              {presetIcons.map((icon) => (
                <button
                  key={icon}
                  onClick={() =>
                    onUpdateEntity({
                      ...entity,
                      sprite: { ...entity.sprite, type: 'preset', presetIcon: icon },
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg border text-xs capitalize cursor-pointer ${
                    entity.sprite.presetIcon === icon
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audio Source Component */}
        <div className="space-y-2 border-t border-slate-800/80 pt-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Respon Suara Audio (Audio Source)</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400">Suara Saat Bertabrakan</span>
              <select
                value={entity.audioSource?.soundOnCollision || 'hit'}
                onChange={(e) =>
                  onUpdateEntity({
                    ...entity,
                    audioSource: { ...entity.audioSource, soundOnCollision: e.target.value },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="none">Tanpa Suara</option>
                <option value="hit">Hit (Tabrakan)</option>
                <option value="coin">Coin (Koin)</option>
                <option value="jump">Jump (Lompat)</option>
                <option value="laser">Laser (Tembakan)</option>
                <option value="explosion">Explosion (Ledakan)</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] text-slate-400">Suara Saat Start Game</span>
              <select
                value={entity.audioSource?.soundOnStart || 'none'}
                onChange={(e) =>
                  onUpdateEntity({
                    ...entity,
                    audioSource: { ...entity.audioSource, soundOnStart: e.target.value },
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="none">Tanpa Suara</option>
                <option value="powerup">Powerup</option>
                <option value="win">Victory (Menang)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Physics Rigidbody (Dynamic / Static) */}
        {entity.rigidbody && (
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                <Activity className="w-3.5 h-3.5" />
                <span>Fisika & Gravitasi (Rigidbody2D)</span>
              </div>
              {onOpenPhysicsPresets && (
                <button
                  onClick={onOpenPhysicsPresets}
                  className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded-md border border-amber-500/40 font-bold transition-all cursor-pointer"
                >
                  ⚡ Preset Fisika
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">Tipe Objek</span>
                <select
                  value={entity.rigidbody.bodyType}
                  onChange={(e) =>
                    onUpdateEntity({
                      ...entity,
                      rigidbody: { ...entity.rigidbody!, bodyType: e.target.value as 'dynamic' | 'static' },
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                >
                  <option value="dynamic">Dinamis (Jatuh)</option>
                  <option value="static">Statis (Diam/Tanah)</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-mono">Skala Gravitasi</span>
                <input
                  type="number"
                  step="0.1"
                  value={entity.rigidbody.gravityScale}
                  onChange={(e) =>
                    onUpdateEntity({
                      ...entity,
                      rigidbody: { ...entity.rigidbody!, gravityScale: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Particle System Component */}
        <div className="space-y-2 border-t border-slate-800/80 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              ✨ Emitter System Partikel
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={entity.particles?.enabled || false}
                onChange={(e) => {
                  const isEnabled = e.target.checked;
                  onUpdateEntity({
                    ...entity,
                    particles: {
                      enabled: isEnabled,
                      burstRate: entity.particles?.burstRate || 20,
                      rate: entity.particles?.rate || 20,
                      color: entity.particles?.color || entity.sprite.color || '#38bdf8',
                      colorGradient: entity.particles?.colorGradient || [entity.sprite.color || '#38bdf8', '#a855f7'],
                      minSpeed: entity.particles?.minSpeed || 30,
                      maxSpeed: entity.particles?.maxSpeed || 90,
                      speed: entity.particles?.speed || 60,
                      minLifetime: entity.particles?.minLifetime || 0.3,
                      maxLifetime: entity.particles?.maxLifetime || 0.8,
                      minSize: entity.particles?.minSize || 3,
                      maxSize: entity.particles?.maxSize || 6,
                      shape: entity.particles?.shape || 'spark',
                      emitterShape: entity.particles?.emitterShape || 'point',
                    },
                  });
                }}
                className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
              />
              <span className="text-slate-300">Aktif</span>
            </label>
          </div>

          {entity.particles?.enabled && (
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400">Rate Partikel / dtk</span>
                <input
                  type="number"
                  value={entity.particles.burstRate || entity.particles.rate || 20}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 10;
                    onUpdateEntity({
                      ...entity,
                      particles: { ...entity.particles!, burstRate: val, rate: val },
                    });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400">Area Emitter</span>
                <select
                  value={entity.particles.emitterShape || 'point'}
                  onChange={(e) =>
                    onUpdateEntity({
                      ...entity,
                      particles: {
                        ...entity.particles!,
                        emitterShape: e.target.value as any,
                      },
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                >
                  <option value="point">Point (Titik)</option>
                  <option value="box">Box (Kotak)</option>
                  <option value="circle">Circle (Lingkaran)</option>
                  <option value="cone">Cone (Kerucut)</option>
                  <option value="line">Line (Garis)</option>
                  <option value="ring">Ring (Cincin)</option>
                </select>
              </div>
            </div>
          )}

          {/* Save as Prefab Card */}
          {onOpenSavePrefab && (
            <div className="p-3 bg-slate-900 border border-amber-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Box className="w-4 h-4" />
                <span>Simpan sebagai Prefab Module</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Kemas objek "{entity.name}" beserta komponen Fisika, Suara, dan Script Rules miliknya agar bisa dipakai ulang di scene manapun.
              </p>
              <button
                onClick={onOpenSavePrefab}
                className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <BookmarkPlus className="w-4 h-4 fill-amber-300" />
                <span>Simpan ke Library Prefab</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
