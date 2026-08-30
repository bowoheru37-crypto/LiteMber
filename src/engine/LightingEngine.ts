import { GlobalLightingSettings, Entity } from '../types/engine';

export const LIGHTING_PRESETS: Record<string, {
  name: string;
  description: string;
  settings: GlobalLightingSettings;
}> = {
  daylight: {
    name: 'Cahaya Siang (Daylight)',
    description: 'Cahaya hangat terang dengan bayangan lembut alami',
    settings: {
      enabled: true,
      moodPreset: 'daylight',
      ambientColor: '#ffffff',
      ambientIntensity: 0.15,
      sunLightColor: '#fff8db',
      sunLightIntensity: 0.25,
      shadowsEnabled: true,
      shadowColor: '#000000',
      shadowIntensity: 0.3,
      shadowOffsetX: 4,
      shadowOffsetY: 8,
      shadowBlur: 6,
    },
  },
  sunset: {
    name: 'Matahari Terbenam (Sunset)',
    description: 'Suasana senja jingga keemasan dengan bayangan memanjang',
    settings: {
      enabled: true,
      moodPreset: 'sunset',
      ambientColor: '#ff7e33',
      ambientIntensity: 0.4,
      sunLightColor: '#ffa834',
      sunLightIntensity: 0.45,
      shadowsEnabled: true,
      shadowColor: '#3a0800',
      shadowIntensity: 0.5,
      shadowOffsetX: 12,
      shadowOffsetY: 12,
      shadowBlur: 8,
    },
  },
  night: {
    name: 'Malam Bulan (Moonlight)',
    description: 'Suasana malam gelap berpadu sinaran bulan kebiruan',
    settings: {
      enabled: true,
      moodPreset: 'night',
      ambientColor: '#0a192f',
      ambientIntensity: 0.65,
      sunLightColor: '#4cc9f0',
      sunLightIntensity: 0.35,
      shadowsEnabled: true,
      shadowColor: '#020b14',
      shadowIntensity: 0.7,
      shadowOffsetX: 2,
      shadowOffsetY: 6,
      shadowBlur: 10,
    },
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    description: 'Kombinasi warna magenta neon & cyan futuristik',
    settings: {
      enabled: true,
      moodPreset: 'cyberpunk',
      ambientColor: '#2b0036',
      ambientIntensity: 0.55,
      sunLightColor: '#ff007f',
      sunLightIntensity: 0.5,
      shadowsEnabled: true,
      shadowColor: '#00f0ff',
      shadowIntensity: 0.4,
      shadowOffsetX: -6,
      shadowOffsetY: 6,
      shadowBlur: 12,
    },
  },
  dungeon: {
    name: 'Dungeon / Kasat Gelap',
    description: 'Atmosfer ruang bawah tanah gelap dengan bayangan pekat',
    settings: {
      enabled: true,
      moodPreset: 'dungeon',
      ambientColor: '#0d1117',
      ambientIntensity: 0.75,
      sunLightColor: '#ffaa00',
      sunLightIntensity: 0.2,
      shadowsEnabled: true,
      shadowColor: '#000000',
      shadowIntensity: 0.85,
      shadowOffsetX: 0,
      shadowOffsetY: 10,
      shadowBlur: 14,
    },
  },
  neon_noir: {
    name: 'Neon Noir (Misterius)',
    description: 'Suasana misteri ungu gelap dengan kilauan biru neon',
    settings: {
      enabled: true,
      moodPreset: 'neon_noir',
      ambientColor: '#120024',
      ambientIntensity: 0.6,
      sunLightColor: '#00f0ff',
      sunLightIntensity: 0.45,
      shadowsEnabled: true,
      shadowColor: '#2b0036',
      shadowIntensity: 0.6,
      shadowOffsetX: 8,
      shadowOffsetY: 8,
      shadowBlur: 16,
    },
  },
};

export class LightingEngine {
  public static getDefaultSettings(): GlobalLightingSettings {
    return { ...LIGHTING_PRESETS.daylight.settings };
  }

  private static hexToRgba(hex: string, alpha: number): string {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map((char) => char + char).join('');
    }
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(0,0,0,${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }

  public static renderEntityShadow(
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    settings?: GlobalLightingSettings
  ) {
    if (!settings || !settings.enabled || !settings.shadowsEnabled) return;

    const {
      shadowColor = '#000000',
      shadowIntensity = 0.4,
      shadowOffsetX = 4,
      shadowOffsetY = 8,
      shadowBlur = 6,
    } = settings;

    ctx.save();
    ctx.fillStyle = this.hexToRgba(shadowColor, shadowIntensity);
    ctx.shadowColor = this.hexToRgba(shadowColor, shadowIntensity);
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;

    const x = entity.transform.x;
    const y = entity.transform.y;
    const w = entity.transform.width * (entity.transform.scaleX ?? 1);
    const h = entity.transform.height * (entity.transform.scaleY ?? 1);

    ctx.beginPath();
    ctx.ellipse(
      x + w / 2 + shadowOffsetX,
      y + h - 2 + shadowOffsetY,
      Math.max(6, w * 0.45),
      Math.max(4, h * 0.15),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }

  public static renderGlobalLightingOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings?: GlobalLightingSettings
  ) {
    if (!settings || !settings.enabled) return;

    const {
      ambientColor = '#ffffff',
      ambientIntensity = 0,
      sunLightColor,
      sunLightIntensity = 0,
    } = settings;

    ctx.save();

    if (ambientIntensity > 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = this.hexToRgba(ambientColor, ambientIntensity);
      ctx.fillRect(-width * 2, -height * 2, width * 5, height * 5);
    }

    if (sunLightColor && sunLightIntensity > 0) {
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, this.hexToRgba(sunLightColor, sunLightIntensity));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(-width * 2, -height * 2, width * 5, height * 5);
    }

    ctx.restore();
  }
}
