import { useState, useEffect, useCallback } from 'react';

export type LayoutMode = 'bottom_dock' | 'floating_pip' | 'ultra_canvas' | 'side_studio';
export type ToolbarPosition = 'bottom' | 'top' | 'floating_pill';
export type AspectPreset = 'itel_a70' | 'android_portrait' | 'android_hd' | 'landscape_16_9' | 'square_1_1' | 'responsive_fit';
export type ToolsDockTab = 'scaler_zoom' | 'transform' | 'nudge' | 'align' | 'layer' | 'selection' | 'grid_snap' | 'all';

export interface WorkspaceLayoutConfig {
  layoutMode: LayoutMode;
  toolbarPosition: ToolbarPosition;
  isPanelMinimized: boolean;
  panelHeightPx: number;
  floatingPanelPos: { x: number; y: number };
  floatingPanelSize: { width: number; height: number };
  toolsDockOpen: boolean;
  toolsDockMinimized: boolean;
  toolsDockActiveTab: ToolsDockTab;
  toolsDockPos: { x: number; y: number };
  aspectPreset: AspectPreset;
  lowEndDeviceOptimized: boolean; // Specially tuned for itel A70 and Android 5+
  compactNavbar: boolean;
  showTouchGrid: boolean;
}

const STORAGE_KEY = 'lite_engine_workspace_layout_v2';

const DEFAULT_CONFIG: WorkspaceLayoutConfig = {
  layoutMode: 'bottom_dock',
  toolbarPosition: 'bottom',
  isPanelMinimized: false,
  panelHeightPx: 420,
  floatingPanelPos: { x: 20, y: 80 },
  floatingPanelSize: { width: 340, height: 460 },
  toolsDockOpen: true,
  toolsDockMinimized: false,
  toolsDockActiveTab: 'scaler_zoom',
  toolsDockPos: { x: 12, y: 70 },
  aspectPreset: 'itel_a70',
  lowEndDeviceOptimized: true,
  compactNavbar: false,
  showTouchGrid: false,
};

export function useWorkspaceLayout() {
  const [config, setConfig] = useState<WorkspaceLayoutConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  });

  // Save to LocalStorage whenever config changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  const updateConfig = useCallback((patch: Partial<WorkspaceLayoutConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const setLayoutMode = useCallback((layoutMode: LayoutMode) => {
    setConfig((prev) => ({ ...prev, layoutMode, isPanelMinimized: false }));
  }, []);

  const togglePanelMinimize = useCallback(() => {
    setConfig((prev) => ({ ...prev, isPanelMinimized: !prev.isPanelMinimized }));
  }, []);

  const setPanelHeight = useCallback((heightPx: number) => {
    const clamped = Math.max(180, Math.min(window.innerHeight * 0.88, heightPx));
    setConfig((prev) => ({ ...prev, panelHeightPx: clamped }));
  }, []);

  const setFloatingPanelPos = useCallback((pos: { x: number; y: number }) => {
    setConfig((prev) => ({ ...prev, floatingPanelPos: pos }));
  }, []);

  const setToolsDockOpen = useCallback((open: boolean) => {
    setConfig((prev) => ({ ...prev, toolsDockOpen: open }));
  }, []);

  const toggleToolsDockMinimize = useCallback(() => {
    setConfig((prev) => ({ ...prev, toolsDockMinimized: !prev.toolsDockMinimized }));
  }, []);

  const setToolsDockTab = useCallback((tab: ToolsDockTab) => {
    setConfig((prev) => ({ ...prev, toolsDockActiveTab: tab, toolsDockOpen: true, toolsDockMinimized: false }));
  }, []);

  const setToolsDockPos = useCallback((pos: { x: number; y: number }) => {
    setConfig((prev) => ({ ...prev, toolsDockPos: pos }));
  }, []);

  const setAspectPreset = useCallback((preset: AspectPreset) => {
    setConfig((prev) => ({ ...prev, aspectPreset: preset }));
  }, []);

  const toggleLowEndOptimization = useCallback(() => {
    setConfig((prev) => ({ ...prev, lowEndDeviceOptimized: !prev.lowEndDeviceOptimized }));
  }, []);

  const resetToDefaultLayout = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  return {
    config,
    updateConfig,
    setLayoutMode,
    togglePanelMinimize,
    setPanelHeight,
    setFloatingPanelPos,
    setToolsDockOpen,
    toggleToolsDockMinimize,
    setToolsDockTab,
    setToolsDockPos,
    setAspectPreset,
    toggleLowEndOptimization,
    resetToDefaultLayout,
  };
}
