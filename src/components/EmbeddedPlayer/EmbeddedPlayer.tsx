import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { playerService } from '../../services/playerService';
import { TrackReference } from '../../models/types';

interface EmbeddedPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmbeddedPlayer: React.FC<EmbeddedPlayerProps> = ({ isOpen, onClose }) => {
  const webviewRef = useRef<any>(null);
  const [currentTrack, setCurrentTrack] = useState<TrackReference | null>(
    playerService.getStatus().currentTrack
  );

  useEffect(() => {
    if (webviewRef.current) {
      playerService.initWebview(webviewRef.current);
    }

    const unsub = playerService.subscribe((s) => {
      // Only re-render when the active track actually changes
      setCurrentTrack((prev) => (prev?.videoId === s.currentTrack?.videoId ? prev : s.currentTrack));
    });
    return unsub;
  }, []);

  const handleOpenOnYouTube = () => {
    if (currentTrack) {
      window.open(`https://www.youtube.com/watch?v=${currentTrack.videoId}`, '_blank');
    }
  };

  return (
    <div
      className={`fixed transition-all duration-200 ease-out overflow-hidden flex flex-col bg-[#1c1c1e] border border-white/[0.08] shadow-2xl rounded-xl ${
        isOpen
          ? 'bottom-20 right-4 w-96 h-60 opacity-100 pointer-events-auto z-[60]'
          : 'fixed -left-[9999px] top-0 w-80 h-48 opacity-100 pointer-events-none -z-50'
      }`}
    >
      {/* Header when open */}
      {isOpen && (
        <div className="h-7 bg-[#232323] px-3 flex items-center justify-between border-b border-white/[0.08] text-[11px] text-zinc-300">
          <span className="font-semibold truncate max-w-[200px] text-white">
            {currentTrack ? currentTrack.title : 'YouTube Player'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenOnYouTube}
              className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded"
              title="Mở trên YouTube"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded"
              title="Thu nhỏ vào nền"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Native YouTube Webview engine - plays all videos with zero embedding restrictions */}
      <div className="w-full flex-1 bg-black relative overflow-hidden">
        <webview
          ref={webviewRef}
          id="yt-player-webview"
          src="about:blank"
          className="w-full h-full border-0"
          allowpopups={true}
        />
      </div>
    </div>
  );
};
