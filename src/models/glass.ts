export type GlassTier = 'high' | 'balanced' | 'performance' | 'off';
export type GlassUserSetting = 'auto' | GlassTier;

export interface GlassTierInput {
  userSetting: GlassUserSetting;
  windowWidth: number;
  isResizing: boolean;
  onBattery: boolean;
  prefersReducedMotion: boolean;
  documentHidden: boolean;
  gpuHealthy: boolean;
}

export function resolveGlassTier(input: GlassTierInput): GlassTier {
  if (input.userSetting !== 'auto') return input.userSetting;
  if (!input.gpuHealthy || input.prefersReducedMotion) return 'off';
  if (input.documentHidden) return 'performance';
  if (input.isResizing) return 'balanced';
  return 'high';
}
