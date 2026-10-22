import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 18, className = '' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="appleMusicGradUI" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fa2d48" />
          <stop offset="50%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="512" height="512" rx="116" ry="116" fill="url(#appleMusicGradUI)" />
      <rect x="0" y="0" width="512" height="512" rx="116" ry="116" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="12" />

      <g fill="#ffffff">
        <ellipse cx="172" cy="365" rx="52" ry="38" transform="rotate(-24 172 365)" />
        <ellipse cx="340" cy="312" rx="52" ry="38" transform="rotate(-24 340 312)" />
        <rect x="202" y="162" width="22" height="200" rx="6" />
        <rect x="370" y="108" width="22" height="200" rx="6" />
        <polygon points="202,192 392,138 392,94 202,148" />
      </g>
    </svg>
  );
};

