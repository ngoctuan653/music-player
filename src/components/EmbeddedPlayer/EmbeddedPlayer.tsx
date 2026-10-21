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
    // Initialize the singleton YouTube IFrame player into #youtube-iframe-target
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
      className={`fixed transition-all duration-200 ease-out overflow-hidden flex flex-col bg-[#111114] border border-white/[0.08] shadow-2xl rounded-lg ${
        isOpen
          ? 'bottom-20 right-4 w-96 h-60 opacity-100 pointer-events-auto z-50'
          : 'bottom-0 right-0 w-60 h-36 opacity-[0.001] pointer-events-none -z-10'
      }`}
    >
      {/* Header when open */}
      {isOpen && (
        <div className="h-7 bg-[#16161a] px-3 flex items-center justify-between border-b border-white/[0.06] text-[11px] text-zinc-300">
          <span className="font-semibold truncate max-w-[200px]">
            {currentTrack ? currentTrack.title : 'YouTube Player'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenOnYouTube}
              className="p-1 hover:text-white hover:bg-white/[0.05] rounded"
              title="Mở trên YouTube"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:text-white hover:bg-white/[0.05] rounded"
              title="Thu nhỏ vào nền"
            >
              <X className="w-3 h-3" />
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
