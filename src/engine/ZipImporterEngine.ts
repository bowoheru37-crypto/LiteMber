import JSZip from 'jszip';
import { GameProject } from '../types/engine';

export class ZipImporterEngine {
  /**
   * Imports and extracts a GameProject from a uploaded File (.zip, .swb, .json)
   */
  public static async importProjectFromFile(file: File): Promise<GameProject> {
    const fileName = file.name.toLowerCase();

    // 1. Direct JSON File
    if (fileName.endsWith('.json')) {
      const text = await file.text();
      const rawObj = JSON.parse(text);
      return this.normalizeProject(rawObj, file.name);
    }

    // 2. Zip Archive (.zip, .swb)
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    let projectJsonStr: string | null = null;

    // Search for project.json or assets/project.json inside the zip
    const possiblePaths = [
      'project.json',
      'assets/project.json',
      'project',
      'assets/project',
      'game.json',
    ];

    for (const path of possiblePaths) {
      const zipFile = zip.file(path);
      if (zipFile) {
        projectJsonStr = await zipFile.async('text');
        break;
      }
    }

    // If not found by exact path, search for any file ending with project.json or project
    if (!projectJsonStr) {
      const allFiles = Object.keys(zipContent.files);
      const matchedKey = allFiles.find(
        (key) => key.toLowerCase().endsWith('project.json') || key.toLowerCase().endsWith('/project')
      );

      if (matchedKey && zipContent.files[matchedKey]) {
        projectJsonStr = await zipContent.files[matchedKey].async('text');
      }
    }

    if (!projectJsonStr) {
      throw new Error('Format Zip / SWB tidak valid. File project.json tidak ditemukan di dalam arsip.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(projectJsonStr);
    } catch {
      throw new Error('Gagal membaca metadata project.json dari file Zip.');
    }

    return this.normalizeProject(parsed, file.name);
  }

  /**
   * Normalizes raw object into a valid GameProject type with safe fallbacks
   */
  private static normalizeProject(raw: any, sourceFileName: string): GameProject {
    const cleanId = raw.id || 'imported_' + Date.now();
    const cleanName = raw.name || raw.app_name || sourceFileName.replace(/\.[^/.]+$/, '');

    return {
      id: cleanId,
      name: cleanName,
      description: raw.description || 'Proyek diimpor dari file Zip / SWB',
      updatedAt: new Date().toISOString(),
      score: raw.score || 0,
      highScore: raw.highScore || 0,
      world: {
        gravityX: raw.world?.gravityX ?? 0,
        gravityY: raw.world?.gravityY ?? 800,
        backgroundColor: raw.world?.backgroundColor || '#020617',
        viewportWidth: raw.world?.viewportWidth || 360,
        viewportHeight: raw.world?.viewportHeight || 640,
        cameraSmoothing: raw.world?.cameraSmoothing ?? 0.1,
        targetFPS: raw.world?.targetFPS || 60,
        deviceProfile: raw.world?.deviceProfile || 'itel_a70_optimized',
        maxActiveParticles: raw.world?.maxActiveParticles || 200,
        useTypedArrayBuffer: raw.world?.useTypedArrayBuffer ?? true,
        bgmAssetId: raw.world?.bgmAssetId,
        cameraFollowEntityId: raw.world?.cameraFollowEntityId,
      },
      assets: raw.assets || { audio: [] },
      entities: Array.isArray(raw.entities) ? raw.entities : [],
    };
  }
}
