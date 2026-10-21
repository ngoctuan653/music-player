import React, { useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { playerService } from '../../services/playerService';
import { PlayerStatus } from '../../models/types';

interface EmbeddedPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmbeddedPlayer: React.FC<EmbeddedPlayerProps> = ({ isOpen, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = React.useState<PlayerStatus>(playerService.getStatus());

  useEffect(() => {
    // Initialize the singleton YouTube IFrame player once into #youtube-iframe-target
    playerService.initPlayer('youtube-iframe-target');

    const unsub = playerService.subscribe((s) => {
      setStatus(s);
    });
    return unsub;
  }, []);

  const currentTrack = status.currentTrack;

  const handleOpenOnYouTube = () => {
    if (currentTrack) {
      window.open(`https://www.youtube.com/watch?v=${currentTrack.videoId}`, '_blank');
    }
  };

  return (
    <div
      ref={containerRef}
      className={`fixed transition-all duration-300 ease-in-out z-50 ${
        isOpen
          ? 'bottom-24 right-4 w-96 h-60 bg-[#1c1c1c] border border-[#333333] rounded-xl shadow-2xl overflow-hidden flex flex-col'
          : 'opacity-0 pointer-events-none -left-[9999px] top-0 w-64 h-36'
      }`}
    >
      {/* Header when open */}
      {isOpen && (
        <div className="h-8 bg-[#222222] px-3 flex items-center justify-between border-b border-[#333333] text-xs text-gray-300">
          <span className="font-semibold truncate max-w-[200px]">
            {currentTrack ? currentTrack.title : 'YouTube Player'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenOnYouTube}
              className="p-1 hover:text-white hover:bg-[#333] rounded"
              title="Mở trên YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:text-white hover:bg-[#333] rounded"
              title="Thu nhỏ vào nền"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* The single permanent container for YouTube IFrame */}
      <div className="w-full flex-1 bg-black relative">
        <div id="youtube-iframe-target" className="w-full h-full" />
      </div>
    </div>
  );
};

