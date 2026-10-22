import React from 'react';

interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  strong?: boolean;
}

export const GlassSurface = React.forwardRef<HTMLDivElement, GlassSurfaceProps>(
  ({ children, className = '', strong = false, ...props }, ref) => (
    <div
      ref={ref}
      className={`glass-surface${strong ? ' glass-surface-strong' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  ),
);

GlassSurface.displayName = 'GlassSurface';
