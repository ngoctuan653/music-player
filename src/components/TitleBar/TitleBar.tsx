import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { AppLogo } from '../AppLogo/AppLogo';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Initial check
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then((max) => {
        setIsMaximized(max);
      }).catch(() => {});
    }

    // Subscribe to state changes from main process
    if (window.electronAPI?.onWindowStateChange) {
      const unsub = window.electronAPI.onWindowStateChange((max) => {
        setIsMaximized(max);
      });
      return () => {
        unsub();
      };
    }
  }, []);

  const handleToggleMaximize = () => {
    window.electronAPI?.maximize();
  };

  return (
    <header
      onDoubleClick={handleToggleMaximize}
      className="h-7 w-full bg-[#161616] flex items-center justify-between border-b border-white/[0.08] select-none drag-region z-50 text-xs shrink-0"
    >
      {/* Left: Apple Music Icon & Brand */}
      <div className="flex items-center gap-2 px-3 no-drag">
        <AppLogo size={14} className="shadow-sm" />
        <span className="font-semibold text-[11px] text-white tracking-wide font-sans">
          Music
        </span>
        <span className="text-[9px] font-mono font-medium text-[#fc3c44] bg-[#fc3c44]/15 px-1.5 py-0.2 rounded border border-[#fc3c44]/30">
          LOSSLESS
        </span>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center no-drag h-full">
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="w-10 h-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleToggleMaximize}
          className="w-10 h-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          title={isMaximized ? 'Restore Down' : 'Maximize'}
          aria-label={isMaximized ? 'Restore Down' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" />
          ) : (
            <Square className="w-2.5 h-2.5" />
          )}
        </button>
        <button
          onClick={() => window.electronAPI?.close()}
          className="w-10 h-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#fc3c44] transition-colors"
          title="Close"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
