import React from 'react';
import { Entity, EntityType } from '../../types/engine';
import { UnifiedSheetHeader } from '../Common/UnifiedSheetHeader';
import {
  User,
  ShieldAlert,
  BoxSelect,
  Coins,
  Flame,
  Type,
  Sparkles,
  Gamepad2,
  Box,
  Wand2,
} from 'lucide-react';

interface AddElementSheetProps {
  onClose: () => void;
  onAddEntity: (type: EntityType) => void;
  onOpenAssetPlacement?: () => void;
  onOpenPrefabLibrary?: () => void;
  onOpenAssetBrowser?: () => void;
  onOpenSmartImporter?: () => void;
}

export const AddElementSheet: React.FC<AddElementSheetProps> = ({
  onClose,
  onAddEntity,
  onOpenAssetPlacement,
  onOpenPrefabLibrary,
  onOpenAssetBrowser,
  onOpenSmartImporter,
}) => {
  const categories = [
    {
      type: 'player' as EntityType,
      title: 'Pemain (Hero)',
      desc: 'Karakter utama dengan kontrol fisik lompat & gerak.',
      icon: User,
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    },
    {
      type: 'platform' as EntityType,
      title: 'Platform / Tanah',
      desc: 'Pijakan padat tempat pemain berdiri.',
      icon: BoxSelect,
      color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    },
    {
      type: 'coin' as EntityType,
      title: 'Koin (Collectible)',
      desc: 'Item yang bisa diambil untuk poin skor.',
      icon: Coins,
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    {
      type: 'hazard' as EntityType,
      title: 'Duri / Bahaya',
      desc: 'Rintangan mematikan yang mereset level.',
      icon: Flame,
      color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    },
    {
      type: 'enemy' as EntityType,
      title: 'Musuh (Enemy)',
      desc: 'Karakter musuh yang bergerak.',
      icon: ShieldAlert,
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    },
    {
      type: 'particle_emitter' as EntityType,
      title: 'Partikel Efek',
      desc: 'Efek percikan api, asap, atau ledakan.',
      icon: Sparkles,
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      type: 'ui_text' as EntityType,
      title: 'Teks UI / Skor',
      desc: 'Label teks dinamik penampil skor.',
      icon: Type,
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
  ];

  return (
    <div className="flex flex-col h-full text-white">
      <UnifiedSheetHeader
        title="Tambah Elemen Game"
        subtitle="Pilih entitas, prefab, atau aset untuk ditambahkan ke panggung"
        icon={Gamepad2}
        iconColor="text-cyan-400"
        onClose={onClose}
      />

      {/* Canva Grid Options */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
        {onOpenSmartImporter && (
          <button
            onClick={() => {
              onOpenSmartImporter();
            }}
            className="w-full min-h-[52px] flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-blue-500/20 hover:from-amber-500/30 hover:to-blue-500/30 border border-amber-500/50 transition-all active:scale-98 cursor-pointer group shadow-xl"
          >
            <div className="flex items-center gap-3 pr-2 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0">
                <Wand2 className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div className="text-left min-w-0">
                <span className="font-bold text-xs text-amber-300 block group-hover:text-amber-200 truncate">
                  Smart Asset Importer (Pustaka Sprite Preset)
                </span>
                <span className="text-[10.5px] text-slate-300 block truncate">
                  Pilih visual sprite karakter, platform, koin & rintangan secara cepat.
                </span>
              </div>
            </div>
            <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shrink-0">
              PILIH SPRITE ➔
            </span>
          </button>
        )}

        {onOpenPrefabLibrary && (
          <button
            onClick={() => {
              onOpenPrefabLibrary();
            }}
            className="w-full min-h-[52px] flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 transition-all active:scale-98 cursor-pointer group shadow-lg"
          >
            <div className="flex items-center gap-3 pr-2 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0">
                <Box className="w-5 h-5 text-amber-300" />
              </div>
              <div className="text-left min-w-0">
                <span className="font-bold text-xs text-amber-300 block group-hover:text-amber-200 truncate">
                  Modul & Template Prefab Reusable
                </span>
                <span className="text-[10.5px] text-slate-300 block truncate">
                  Pasang Hero, Koin, Musuh, Platform & UI dengan Fisika & Logika.
                </span>
              </div>
            </div>
            <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shrink-0">
              LIBRARY ➔
            </span>
          </button>
        )}

        {onOpenAssetBrowser && (
          <button
            onClick={() => {
              onOpenAssetBrowser();
            }}
            className="w-full min-h-[52px] flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/40 transition-all active:scale-98 cursor-pointer group shadow-lg"
          >
            <div className="flex items-center gap-3 pr-2 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shrink-0">
                <BoxSelect className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="text-left min-w-0">
                <span className="font-bold text-xs text-cyan-300 block group-hover:text-cyan-200 truncate">
                  Browser Aset Terpusat & Impor Batch
                </span>
                <span className="text-[10.5px] text-slate-300 block truncate">
                  Kelola gambar, audio, video & impor banyak aset sekaligus.
                </span>
              </div>
            </div>
            <span className="bg-cyan-500 text-slate-950 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shrink-0">
              BROWSER ➔
            </span>
          </button>
        )}

        {onOpenAssetPlacement && (
          <button
            onClick={() => {
              onOpenAssetPlacement();
            }}
            className="w-full min-h-[52px] flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 border border-amber-500/40 transition-all active:scale-98 cursor-pointer group shadow-lg"
          >
            <div className="flex items-center gap-3 pr-2 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0">
                <Sparkles className="w-5 h-5 fill-amber-300" />
              </div>
              <div className="text-left min-w-0">
                <span className="font-bold text-xs text-amber-300 block group-hover:text-amber-200 truncate">
                  Pick & Upload Aset Ke Game (Sprite & Tile)
                </span>
                <span className="text-[10.5px] text-slate-300 block truncate">
                  Pasang Gambar, Teks UI, Suara, Musik, Video & Model 3D.
                </span>
              </div>
            </div>
            <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shrink-0">
              WIZARD ➔
            </span>
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {categories.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                onClick={() => {
                  onAddEntity(item.type);
                  onClose();
                }}
                className="min-h-[52px] flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/60 transition-all active:scale-98 cursor-pointer group text-left"
              >
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-xs text-white group-hover:text-cyan-400 transition-colors block truncate">
                    {item.title}
                  </span>
                  <span className="text-[10.5px] text-slate-400 block truncate mt-0.5">
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
