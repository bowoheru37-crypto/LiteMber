import React, { useState, useEffect } from 'react';
import { GameProject } from '../../types/engine';
import { WebEngine, CryptoSnapshotBlock } from '../../engine/WebEngine';
import { AndroidEngine } from '../../engine/AndroidEngine';
import {
  Globe,
  Download,
  Share2,
  ShieldCheck,
  Cpu,
  Zap,
  Database,
  Lock,
  X,
  Check,
  Copy,
  Terminal,
  Layers,
  Sparkles,
  RefreshCw,
  Code2,
} from 'lucide-react';

interface WebEcosystemSheetProps {
  project: GameProject;
  onUpdateProject: (updatedProject: GameProject) => void;
  onClose: () => void;
}

export const WebEcosystemSheet: React.FC<WebEcosystemSheetProps> = ({
  project,
  onUpdateProject,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'web1' | 'web2' | 'web3' | 'wasm'>('web1');
  const [ipfsCid, setIpfsCid] = useState<string>('');
  const [cryptoBlocks, setCryptoBlocks] = useState<CryptoSnapshotBlock[]>([]);
  const [compressedSize, setCompressedSize] = useState<{ raw: number; compressed: number }>({ raw: 0, compressed: 0 });
  const [wasmStatus, setWasmStatus] = useState<'idle' | 'active' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate initial IPFS CID & Compression ratio
    const jsonStr = JSON.stringify(project);
    const compressed = WebEngine.compressStateRLE(jsonStr);
    setCompressedSize({ raw: jsonStr.length, compressed: compressed.length });

    WebEngine.generateIPFSContentHash(jsonStr).then(setIpfsCid);

    // Initialize WASM
    WebEngine.initWebAssemblyEngine().then((ok) => {
      setWasmStatus(ok ? 'active' : 'error');
    });

    // Create initial Web3 Snapshot Block
    const initialBlock = WebEngine.createCryptoBlock(0, '0x0000000000000000', project);
    setCryptoBlocks([initialBlock]);
  }, [project]);

  // Export Web1 Standalone Single HTML File
  const handleDownloadWeb1Bundle = () => {
    const htmlContent = WebEngine.exportStandaloneWeb1Bundle(project);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project.name || 'game').toLowerCase().replace(/\s+/g, '_')}_web1_bundle.html`;
    a.click();
    URL.revokeObjectURL(url);
    AndroidEngine.triggerHaptic(20);
  };

  // Generate New Web3 Block
  const handleMintWeb3SnapshotBlock = () => {
    const parent = cryptoBlocks[cryptoBlocks.length - 1];
    const newBlock = WebEngine.createCryptoBlock(cryptoBlocks.length, parent.stateHash, project);
    setCryptoBlocks([...cryptoBlocks, newBlock]);
    AndroidEngine.triggerHaptic(30);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/90">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm flex items-center gap-2">
              Web Unified Technology Suite
              <span className="text-[9px] bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono px-2 py-0.5 rounded-full font-bold">
                WEB 1 + 2 + 3 + WASM
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Penggabungan fondasi Web1, Web2, Web3 & WebAssembly dalam satu modul terpusat
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Unified Tab Navigation */}
      <div className="flex items-center bg-slate-950 p-1.5 border-b border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('web1')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'web1'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Web1 (Standalone HTML)</span>
        </button>

        <button
          onClick={() => setActiveTab('web2')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'web2'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Web2 (Storage & Sync)</span>
        </button>

        <button
          onClick={() => setActiveTab('web3')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'web3'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Web3 (Ledger & IPFS)</span>
        </button>

        <button
          onClick={() => setActiveTab('wasm')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'wasm'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>WebAssembly (WASM)</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* WEB1 TAB */}
        {activeTab === 'web1' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-cyan-500/30 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Code2 className="w-5 h-5" />
                <span>Web1 Foundation: Single-File Standalone Bundle</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mengekspor seluruh proyek game Anda ke dalam **1 file HTML5 mandiri** yang berisi seluruh kode logika, canvas rendering, dan aset tertanam (embedded base64). Dapat dibuka langsung offline tanpa ketergantungan server external.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Format Output</p>
                  <p className="text-xs font-bold text-cyan-300 mt-0.5">Standalone HTML5 (.html)</p>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Ketergantungan Server</p>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5">0% (Offline Playable)</p>
                </div>
              </div>

              <button
                onClick={handleDownloadWeb1Bundle}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-cyan-950/50 cursor-pointer transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Download Bundle HTML5 Web1 Mandiri</span>
              </button>
            </div>
          </div>
        )}

        {/* WEB2 TAB */}
        {activeTab === 'web2' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-blue-500/30 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Database className="w-5 h-5" />
                <span>Web2 Dynamic Layer: RLE Compression & Storage</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pengelolaan memori dan penyimpanan negara game menggunakan kompresi byte RLE untuk menghemat kuota internet dan mempercepat waktu muat.
              </p>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Ukuran JSON Mentah:</span>
                  <span className="text-slate-200 font-bold">{compressedSize.raw} Bytes</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Ukuran Terkompresi RLE:</span>
                  <span className="text-blue-400 font-bold">{compressedSize.compressed} Bytes</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-blue-500 h-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((compressedSize.compressed / Math.max(1, compressedSize.raw)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-emerald-400 font-mono text-right">
                  Hemat Storage & Quota ~{Math.round((1 - compressedSize.compressed / Math.max(1, compressedSize.raw)) * 100)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WEB3 TAB */}
        {activeTab === 'web3' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Web3 Integration: IPFS Addressing & Immutable Ledger</span>
              </div>
              <p className="text-xs text-slate-300">
                Pencatatan sidik jari kriptografi (Cryptographic Hash Chaining) untuk pembuktian kepemilikan game dan verifikasi skor anti-cheat secara terdesentralisasi.
              </p>

              {/* IPFS CID Display */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">IPFS Content Identifier (CIDv1)</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-purple-300 break-all select-all font-bold">{ipfsCid}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ipfsCid);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Block Minting */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Rantai Blok Ledger Snapshot Proyek ({cryptoBlocks.length} Block)</span>
                  <button
                    onClick={handleMintWeb3SnapshotBlock}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Mint Block Baru</span>
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                  {cryptoBlocks.map((blk) => (
                    <div key={blk.blockIndex} className="bg-slate-900 p-2.5 rounded-xl border border-purple-500/20 text-[10.5px] font-mono space-y-1">
                      <div className="flex items-center justify-between text-purple-300 font-bold">
                        <span>BLOCK #{blk.blockIndex}</span>
                        <span className="text-slate-500">{new Date(blk.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-400 truncate">Parent: {blk.parentHash}</p>
                      <p className="text-emerald-400 truncate">State Hash: {blk.stateHash}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WASM TAB */}
        {activeTab === 'wasm' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Cpu className="w-5 h-5" />
                <span>WebAssembly (WASM): Binary Physics Engine</span>
              </div>
              <p className="text-xs text-slate-300">
                Kompilasi kode biner native WebAssembly secara langsung di browser untuk kalkulasi matematika Vektor dan Fisika Partikel kecepatan tinggi.
              </p>

              <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${wasmStatus === 'active' ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
                  <span className="text-xs font-bold text-slate-200">
                    Status WASM Engine: {wasmStatus === 'active' ? 'AKTIF (Compiling Native Bytes)' : 'MEMUAT...'}
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                  ArrayBuffer Shared Memory
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
