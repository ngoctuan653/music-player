import React, { useEffect, useRef, useState } from 'react';
import { Vaso } from 'vaso';
import { GlassTier } from '../../models/glass';

interface GlassLensProps {
  tier: GlassTier;
  level: 'playerBar' | 'nowPlaying' | 'card' | 'panel';
  radius: number;
  className?: string;
  children: React.ReactNode;
}

const PRESETS = {
  high: { depth: 0.35, blur: 3.0, dispersion: 0.12, specular: 0.55 },
  balanced: { depth: 0.22, blur: 2.0, dispersion: 0.05, specular: 0.35 },
} as const;

export const GlassLens = React.memo<GlassLensProps>(({ tier, level, radius, className = '', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    let timeout: number | undefined;
    const observer = new ResizeObserver(([entry]) => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        const width = Math.round(entry.contentRect.width / 4) * 4;
        const height = Math.round(entry.contentRect.height / 4) * 4;
        setSize({ width, height });
      }, 80);
    });
    observer.observe(ref.current);
    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  const preset = tier === 'high' || tier === 'balanced' ? PRESETS[tier] : undefined;
  const lensOn = Boolean(preset && size.width > 0);

  return (
    <div ref={ref} className={`glass-lens-host ${className}`} data-lens={lensOn ? 'on' : 'off'} data-level={level}>
      {lensOn && (
        <div className="glass-lens-layer" aria-hidden="true">
          <Vaso
            width={size.width}
            height={size.height}
            radius={radius}
            outset={1}
            {...preset}
            style={{ width: size.width, height: size.height }}
          />
        </div>
      )}
      <div className="glass-lens-content">{children}</div>
    </div>
  );
});

GlassLens.displayName = 'GlassLens';
