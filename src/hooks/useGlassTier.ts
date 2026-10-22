import { useEffect, useState } from 'react';
import { GlassTier, GlassUserSetting, resolveGlassTier } from '../models/glass';
import { LocalStorageManager } from '../storage/localStore';

const DEFAULT_TIER_INPUT = {
  onBattery: false,
  gpuHealthy: true,
};

export function useGlassTier(): GlassTier {
  const [tier, setTier] = useState<GlassTier>('high');

  useEffect(() => {
    let resizeTimer: number | undefined;
    let mounted = true;
    let isResizing = false;
    let onBattery = DEFAULT_TIER_INPUT.onBattery;
    let gpuHealthy = DEFAULT_TIER_INPUT.gpuHealthy;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => {
      const setting = LocalStorageManager.getSettings().glassEffect as GlassUserSetting;
      const nextTier = resolveGlassTier({
        userSetting: setting,
        windowWidth: window.innerWidth,
        isResizing,
        onBattery,
        prefersReducedMotion: mediaQuery.matches,
        documentHidden: document.hidden,
        gpuHealthy,
      });
      document.documentElement.dataset.glassTier = nextTier;
      if (mounted) setTier(nextTier);
    };

    const handleResize = () => {
      isResizing = true;
      update();
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        isResizing = false;
        update();
      }, 150);
    };
    const handleVisibility = () => update();
    const handleReducedMotion = () => update();
    const handleGlassEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ onBattery?: boolean; gpuHealthy?: boolean }>).detail;
      if (typeof detail.onBattery === 'boolean') onBattery = detail.onBattery;
      if (typeof detail.gpuHealthy === 'boolean') gpuHealthy = detail.gpuHealthy;
      update();
    };
    const handleSettingsChange = () => update();
    const cleanupEnvironment = window.electronAPI?.onGlassEnvironment?.((environment) => {
      onBattery = environment.onBattery;
      gpuHealthy = environment.gpuHealthy;
      window.dispatchEvent(new CustomEvent('glass-environment-change', { detail: environment }));
    });
    const cleanupVisibility = window.electronAPI?.onGlassWindowVisibility?.((visible) => {
      if (!visible) document.documentElement.dataset.glassTier = 'balanced';
      update();
    });
    window.electronAPI?.getGlassEnvironment?.().then((environment) => {
      onBattery = environment.onBattery;
      gpuHealthy = environment.gpuHealthy;
      update();
    }).catch(() => {});

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    mediaQuery.addEventListener('change', handleReducedMotion);
    window.addEventListener('glass-environment-change', handleGlassEvent);
    window.addEventListener('glass-settings-change', handleSettingsChange);
    update();

    return () => {
      mounted = false;
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      mediaQuery.removeEventListener('change', handleReducedMotion);
      window.removeEventListener('glass-environment-change', handleGlassEvent);
      window.removeEventListener('glass-settings-change', handleSettingsChange);
      cleanupEnvironment?.();
      cleanupVisibility?.();
    };
  }, []);

  return tier;
}
