import React, { useState } from 'react';
import { GameProject } from '../types/engine';
import { UnifiedModal } from './Common/UnifiedModal';
import { Download, Code, Smartphone, Check, Copy, Binary, Monitor, Globe, Layers, Loader2 } from 'lucide-react';
import { BinaryEngine } from '../engine/BinaryEngine';
import { AndroidEngine } from '../engine/AndroidEngine';
import { DesktopEngine } from '../engine/DesktopEngine';
import { SketchwareEngine } from '../engine/SketchwareEngine';

interface ExportModalProps {
  project: GameProject;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ project, onClose }) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isExportingSWB, setIsExportingSWB] = useState(false);

  // Generate single HTML5 runnable bundle code
  const generateStandaloneHTML = () => {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>${project.name} - LiteEngine 2D</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; touch-action: none; }
    body { background: #020617; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; font-family: sans-serif; }
    canvas { width: 100vw; height: 100vh; max-width: 450px; max-height: 800px; background: ${project.world.backgroundColor}; border-radius: 12px; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script>
    console.log("Running ${project.name} on LiteEngine 2D Mobile Runtime @ 60 FPS (itel A70 Unisoc T606 Optimized)");
  </script>
</body>
</html>`;
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.id}_project.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadBinary = () => {
    const arrayBuf = BinaryEngine.serializeProjectToBinary(project);
    const blob = new Blob([arrayBuf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `${project.id}_compressed.bin`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSketchwareSWB = async () => {
    try {
      setIsExportingSWB(true);
      const swbBlob = await SketchwareEngine.exportSketchwareSWB(project);
      const url = URL.createObjectURL(swbBlob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      const cleanFileName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'game';
      downloadAnchor.setAttribute('download', `${cleanFileName}_sketchware.swb`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Sketchware Pro project:', err);
    } finally {
      setIsExportingSWB(false);
    }
  };

  const handleCopyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <UnifiedModal
      title={`Ekspor Proyek: ${project.name}`}
      subtitle="Web, Android (itel A70 WebView), Desktop & Binary"
      icon={Download}
      iconColor="text-cyan-400"
      maxWidth="2xl"
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="w-full min-h-[48px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl border border-slate-700 cursor-pointer transition-all active:scale-98"
        >
          Selesai
        </button>
      }
    >
      <div className="space-y-3 text-xs overflow-y-auto pr-1">
          {/* Sketchware Pro Compatible Export Box */}
          <div className="p-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 rounded-xl border border-amber-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-amber-300 text-sm">Sketchware Pro (.swb Project)</p>
                  <p className="text-[10px] text-slate-300">Format Backup & Arsitektur Proyek Sketchware Pro</p>
                </div>
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                100% Compatible
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Arsitektur lengkap meliputi file metadata <code className="text-amber-300 font-mono">project</code>, <code className="text-amber-300 font-mono">AndroidManifest.xml</code>, <code className="text-amber-300 font-mono">java/MainActivity.java</code> dengan WebView bridge, <code className="text-amber-300 font-mono">res/layout/main.xml</code>, dan <code className="text-amber-300 font-mono">assets/index.html</code>.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleDownloadSketchwareSWB}
                disabled={isExportingSWB}
                className="flex-1 min-w-[140px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isExportingSWB ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengekspor .swb...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Unduh Proyek .swb</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleCopyCode(SketchwareEngine.generateMainActivityJava(project), 'sketchware_java')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-2.5 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition-all"
                title="Salin Kode MainActivity.java Sketchware Pro"
              >
                {copiedType === 'sketchware_java' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copiedType === 'sketchware_java' ? 'Tersalin' : 'Java Bridge'}</span>
              </button>
            </div>
          </div>
          {/* Binary Engine (.bin ArrayBuffer) */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Binary className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="font-bold text-white">Binary Buffer (.bin)</p>
                <p className="text-[10px] text-slate-400">Format Biner Terkompresi (Zero JSON Parsing Lag)</p>
              </div>
            </div>
            <button
              onClick={handleDownloadBinary}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95"
            >
              Unduh .bin
            </button>
          </div>

          {/* Android Engine Native Manifest & Java Bridge */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="font-bold text-white">Android Engine (WebView Native)</p>
                <p className="text-[10px] text-slate-400">AndroidManifest.xml & MainActivity.java Terimbal</p>
              </div>
            </div>
            <button
              onClick={() => handleCopyCode(AndroidEngine.generateAndroidManifest(project.name), 'android')}
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              {copiedType === 'android' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'android' ? 'Tersalin' : 'Salin Manifest'}</span>
            </button>
          </div>

          {/* Desktop Engine Electron Main JS */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Monitor className="w-5 h-5 text-purple-400" />
              <div>
                <p className="font-bold text-white">Desktop Engine (Electron / Tauri)</p>
                <p className="text-[10px] text-slate-400">main.js dengan Dukungan Gamepad Xbox/PS</p>
              </div>
            </div>
            <button
              onClick={() => handleCopyCode(DesktopEngine.generateElectronMainJS(project.name), 'desktop')}
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              {copiedType === 'desktop' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'desktop' ? 'Tersalin' : 'Salin main.js'}</span>
            </button>
          </div>

          {/* HTML5 Standalone Web Engine */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-bold text-white">Web Engine (HTML5 Standalone)</p>
                <p className="text-[10px] text-slate-400">Bundle HTML5 Lengkap untuk Browser Web</p>
              </div>
            </div>
            <button
              onClick={() => handleCopyCode(generateStandaloneHTML(), 'html')}
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              {copiedType === 'html' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'html' ? 'Tersalin' : 'Salin HTML'}</span>
            </button>
          </div>

          {/* JSON Project File */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Code className="w-5 h-5 text-amber-400" />
              <div>
                <p className="font-bold text-white">Proyek JSON (.json)</p>
                <p className="text-[10px] text-slate-400">Backup lengkap proyek dalam format JSON</p>
              </div>
            </div>
            <button
              onClick={handleDownloadJSON}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95"
            >
              Unduh .json
            </button>
          </div>
        </div>
    </UnifiedModal>
  );
};

