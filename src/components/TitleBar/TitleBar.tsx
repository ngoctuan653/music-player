import React from 'react';
import { Minus, Square, X, Music } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximize();
  };

  const handleClose = () => {
    window.electronAPI?.close();
  };

  return (
    <div className="h-9 w-full bg-[#121212] flex items-center justify-between border-b border-[#282828] select-none drag-region z-50">
      <div className="flex items-center gap-2 px-3 no-drag">
        <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white shadow-sm">
          <Music className="w-3 h-3" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-gray-200">
          YouTube Music Desktop
        </span>
      </div>

      <div className="flex items-center no-drag h-full">
        <button
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
          title="Thu nhỏ"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
          title="Phóng to"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 transition-colors"
          title="Đóng (Ẩn xuống Tray)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

