import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export const TitleBar: React.FC = () => {
  return (
    <header className="h-8 w-full bg-[#0a0a0c] flex items-center justify-between border-b border-white/[0.06] select-none drag-region z-50 text-xs">
      <div className="flex items-center gap-2.5 px-3 no-drag">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-[11px] font-semibold text-zinc-300 tracking-wider uppercase">
            YT.AUDIO
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-600 border-l border-white/[0.06] pl-2">
          DIRECT BUS
        </span>
      </div>

      <div className="flex items-center no-drag h-full">
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="w-10 h-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          title="Thu nhỏ"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          className="w-10 h-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          title="Phóng to"
        >
          <Square className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={() => window.electronAPI?.close()}
          className="w-10 h-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-red-600 transition-colors"
          title="Đóng (Ẩn xuống Tray)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
