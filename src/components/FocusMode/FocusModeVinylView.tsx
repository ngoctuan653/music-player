import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Volume1,
  Volume2, 
  VolumeX, 
  Heart
} from 'lucide-react';
import { PlayerStatus, RepeatMode } from '../../models/types';
import { playerService } from '../../services/playerService';
import { playlistService } from '../../services/playlistService';
import { useDominantColor } from '../../hooks/useDominantColor';
import { useAlbumArt } from '../../hooks/useAlbumArt';
import { MarqueeText } from './MarqueeText';

interface FocusModeVinylViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FocusModeVinylView: React.FC<FocusModeVinylViewProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [status, setStatus] = useState<PlayerStatus>(playerService.getStatus());
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [dragTime, setDragTime] = useState<number>(0);

  const activeTrack = status.currentTrack;
  const { colors } = useDominantColor(activeTrack?.thumbnailUrl);
  const albumArt = useAlbumArt(activeTrack?.videoId, activeTrack?.thumbnailUrl);

  useEffect(() => {
    const unsub = playerService.subscribe((newStatus) => {
      setStatus(newStatus);
      if (newStatus.currentTrack) {
        setIsFavorite(playlistService.isFavorite(newStatus.currentTrack.videoId));
      }
    });
    return unsub;
  }, []);

  // Keyboard shortcut: Escape to close focus mode, Space to toggle play/pause
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        playerService.togglePlayPause();
      } else if (e.key === 'ArrowRight' && !(e.target instanceof HTMLInputElement)) {
        playerService.seekTo(status.currentTime + 5);
      } else if (e.key === 'ArrowLeft' && !(e.target instanceof HTMLInputElement)) {
        playerService.seekTo(Math.max(0, status.currentTime - 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, status.currentTime]);

  if (!isOpen || !status.currentTrack) return null;

  const currentTrack = status.currentTrack;
  const isPlaying = status.isPlaying;

  const handleTogglePlay = () => {
    playerService.togglePlayPause();
  };

  const handlePrev = () => {
    playlistService.playPrevious();
  };

  const handleNext = () => {
    playlistService.playNext();
  };

  const handleToggleFavorite = () => {
    if (currentTrack) {
      const newState = playlistService.toggleFavorite(currentTrack);
      setIsFavorite(newState);
    }
  };

  const cycleRepeat = () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(status.repeatMode) + 1) % modes.length;
    playerService.setRepeatMode(modes[nextIdx]);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setDragTime(val);
  };

  const handleSeekCommit = () => {
    setIsDraggingSlider(false);
    playerService.seekTo(dragTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    playerService.setVolume(val);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const displayTime = isDraggingSlider ? dragTime : status.currentTime;
  const progressPercent = status.duration > 0 ? (displayTime / status.duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#08080a] select-none text-white overflow-hidden animate-in fade-in duration-300">
      {/* Seamless Full-Bleed Ambient Background (Single unified GPU canvas, 100% continuous fade, zero lines or seams) */}
      <div 
        className="absolute inset-0 pointer-events-none select-none transition-all duration-1000"
        style={{
          backgroundColor: '#070709',
          backgroundImage: `
            radial-gradient(circle at 50% 44%, ${colors.glowColor} 0%, transparent 64%),
            radial-gradient(ellipse at 70% 60%, ${colors.ambientLight || colors.glowColor} 0%, transparent 58%),
            radial-gradient(ellipse at 30% 65%, ${colors.labelBg} 0%, transparent 58%),
            radial-gradient(circle at 50% 50%, #0d0d12 0%, #070709 100%)
          `,
        }}
      />
      {/* Soft Vignette Overlay: Ensures completely smooth, natural fade around all edges */}
      <div 
        className="absolute inset-0 pointer-events-none select-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(5, 5, 7, 0.6) 100%)',
        }}
      />

      {/* Top Floating Header Bar (Completely transparent, zero borders or layer cutoffs) */}
      <header className="relative h-14 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-transparent">
        <button
          onClick={onClose}
          className="group flex items-center h-8 px-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.18] backdrop-blur-md border border-white/[0.1] text-zinc-200 hover:text-white transition-all duration-300 text-xs font-medium shadow-sm active:scale-95 shrink-0 overflow-hidden"
          title="Minimize (Esc)"
        >
          <ChevronDown className="w-4 h-4 text-zinc-200 group-hover:text-white transition-colors shrink-0" />
          <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap group-hover:max-w-20 group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 ease-out text-xs font-medium">
            Minimize
          </span>
        </button>

        <button
          onClick={handleToggleFavorite}
          className={`p-2 rounded-full transition-all border shrink-0 backdrop-blur-md ${
            isFavorite
              ? 'text-[#fc3c44] bg-[#fc3c44]/15 border-[#fc3c44]/30'
              : 'text-zinc-300 hover:text-white bg-white/[0.08] hover:bg-white/[0.18] border-white/[0.1]'
          }`}
          title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#fc3c44]' : ''}`} />
        </button>
      </header>

      {/* Center Stage: Authentic Turntable Deck with Spinning Vinyl Record & Tonearm */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-0 overflow-visible">
        {/* Fluid Responsive Turntable Platter Container (Scales gracefully on all viewports) */}
        <div className="relative w-[min(70vw,40vh,350px)] h-[min(70vw,40vh,350px)] flex items-center justify-center shrink-0">
          {/* Metallic Turntable Platter Rim Beneath Vinyl (Zero awkward box clipping) */}
          <div className="absolute inset-[-6px] rounded-full bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_80px_rgba(0,0,0,0.7)] pointer-events-none" />

          {/* Spinning Vinyl Record (Đĩa nhựa màu trong suốt với vân đĩa tinh xảo) */}
          <div 
            className={`w-full h-full rounded-full relative flex items-center justify-center shadow-[0_15px_45px_rgba(0,0,0,0.85)] ring-1 ring-white/10 vinyl-translucent-body ${
              isPlaying ? 'animate-vinyl-spin' : 'animate-vinyl-spin animate-vinyl-spin-paused'
            }`}
            style={{
              ['--vinyl-translucent-bg' as any]: colors.vinylTranslucentBg,
              ['--vinyl-glow' as any]: colors.glowColor,
            }}
          >
            {/* Delicate Silky Sound Grooves (Vân rãnh đĩa siêu mịn, không bị thô) */}
            <div className="absolute inset-0 rounded-full vinyl-delicate-grooves" />

            {/* Translucent Satin Specular Light Sheen */}
            <div className="absolute inset-0 rounded-full vinyl-translucent-sheen pointer-events-none opacity-65" />

            {/* Outer Translucent Rim & Accent Grooves */}
            <div className="absolute inset-0 rounded-full border border-white/15 shadow-[inset_0_0_10px_rgba(0,0,0,0.65)] pointer-events-none" />
            <div className="absolute inset-2 rounded-full border border-black/25 pointer-events-none" />

            {/* Enlarged Center Album Art (Tràn ra gần viền đĩa theo đúng yêu cầu, vẫn giữ dải vân đĩa than) */}
            <div className="relative z-10 w-[63%] h-[63%] rounded-full overflow-hidden border-2 border-[#1c1c20] shadow-[0_0_30px_rgba(0,0,0,0.9)] ring-2 ring-white/15 bg-black flex items-center justify-center">
              <img
                src={albumArt.src}
                alt={currentTrack.title}
                onError={albumArt.handleError}
                className="w-full h-full object-cover scale-[1.34] select-none pointer-events-none"
              />
              {/* Center Spindle Eyelet (Lỗ trục kim loại mạ vàng) */}
              <div className="absolute w-4 h-4 rounded-full bg-[#111113] border-2 border-[#d4af37] shadow-inner flex items-center justify-center pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              </div>
            </div>
          </div>

          {/* Tonearm Assembly (Kim phát nhạc đĩa than - Chỉ vào rãnh ngoài, KHÔNG vào tâm) */}
          <div 
            className="absolute -top-3 -right-4 w-[28%] h-[56%] pointer-events-none z-30 tonearm-pivot"
            style={{
              transform: isPlaying ? 'rotate(0deg)' : 'rotate(-26deg)',
            }}
          >
            {/* Tonearm Base & Chrome Rod SVG */}
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 200" fill="none">
              {/* Counterweight */}
              <rect x="68" y="6" width="14" height="14" rx="2" fill="url(#metal-grad)" stroke="#666" strokeWidth="0.8" />
              
              {/* Gimbal Pivot Base */}
              <circle cx="75" cy="25" r="16" fill="url(#chrome-grad)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.7))" />
              <circle cx="75" cy="25" r="9" fill="#18181b" stroke="#555" strokeWidth="1" />
              <circle cx="75" cy="25" r="3.5" fill="#d4af37" />

              {/* Curved Chrome Tonearm Tube */}
              <path
                d="M 75 25 L 75 80 L 46 138 L 32 170"
                stroke="url(#chrome-grad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="drop-shadow(2px 4px 6px rgba(0,0,0,0.8))"
              />

              {/* Headshell & Stylus Cartridge (Chỉ chính xác vào dải rãnh ngoài của đĩa, KHÔNG vào nhãn giữa) */}
              <g transform="translate(18, 164) rotate(-22)">
                <rect x="0" y="0" width="14" height="24" rx="2" fill="#18181b" stroke="#555" strokeWidth="1" />
                <rect x="2.5" y="16" width="9" height="6" rx="1" fill="#fc3c44" />
                <circle cx="7" cy="23" r="1.5" fill="#ffffff" />
              </g>

              <defs>
                <linearGradient id="chrome-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d4d4d8" />
                  <stop offset="40%" stopColor="#ffffff" />
                  <stop offset="70%" stopColor="#a1a1aa" />
                  <stop offset="100%" stopColor="#71717a" />
                </linearGradient>
                <linearGradient id="metal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#52525b" />
                  <stop offset="50%" stopColor="#27272a" />
                  <stop offset="100%" stopColor="#71717a" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Status indicator pill */}
        <div className="mt-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-zinc-400 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{isPlaying ? 'VINYL SPINNING (45 RPM)' : 'TONEARM RESTING (PAUSED)'}</span>
        </div>
      </div>

      {/* Bottom Track Information & Full Playback Controls (Borderless floating glass deck) */}
      <footer className="relative z-20 px-4 sm:px-6 py-4 bg-gradient-to-t from-black/55 via-black/20 to-transparent flex flex-col items-center gap-2.5 max-w-2xl mx-auto w-full shrink-0">
        {/* Track Title and Artist with Marquee */}
        <div className="text-center w-full max-w-md px-2 flex flex-col items-center">
          <MarqueeText
            text={currentTrack.title || 'Không có bài hát nào'}
            className="text-base sm:text-lg font-bold text-white tracking-tight drop-shadow-md"
            containerClassName="max-w-[min(84vw,420px)]"
          />
          <MarqueeText
            text={currentTrack.channelTitle || 'YouTube Music'}
            className="text-xs text-zinc-400 font-medium mt-0.5"
            containerClassName="max-w-[min(70vw,340px)]"
          />
        </div>

        {/* Scrubber Progress Bar */}
        <div className="w-full flex items-center gap-2.5 max-w-xl text-[11px] font-mono text-zinc-400">
          <span className="w-9 text-right tabular-nums">{formatTime(displayTime)}</span>
          <div className="relative flex-1 flex items-center group py-2">
            <div className="w-full h-1.5 bg-white/[0.1] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#fc3c44] to-[#ff6b72] rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={status.duration || 100}
              step="0.5"
              value={displayTime}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              onMouseDown={() => setIsDraggingSlider(true)}
              onTouchStart={() => setIsDraggingSlider(true)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="w-9 tabular-nums">{formatTime(status.duration)}</span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between w-full max-w-xl pt-0.5">
          {/* Left Actions: Shuffle & Repeat */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => playerService.toggleShuffle()}
              className={`p-1.5 rounded-full transition-colors ${
                status.isShuffled ? 'text-[#fc3c44] bg-[#fc3c44]/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={status.isShuffled ? 'Disable Shuffle' : 'Enable Shuffle'}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={cycleRepeat}
              className={`p-1.5 rounded-full transition-colors relative ${
                status.repeatMode !== 'off' ? 'text-[#fc3c44] bg-[#fc3c44]/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={`Repeat: ${status.repeatMode}`}
            >
              <Repeat className="w-4 h-4" />
              {status.repeatMode === 'one' && (
                <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-[#fc3c44] leading-none">1</span>
              )}
            </button>
          </div>

          {/* Center Playback Controls */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={handlePrev}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/[0.08] rounded-full transition-all active:scale-90"
              title="Previous Track"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#fc3c44] hover:bg-[#e0343b] text-white flex items-center justify-center shadow-[0_0_20px_rgba(252,60,68,0.5)] transition-all hover:scale-105 active:scale-95"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={handleNext}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/[0.08] rounded-full transition-all active:scale-90"
              title="Next Track"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Right Actions: Vertical Volume Control with Hover-Only Popup */}
          <div className="relative group flex items-center justify-center">
            <button
              onClick={() => playerService.toggleMute()}
              onDoubleClick={() => playerService.setVolume(80)}
              className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.08] rounded-full transition-all active:scale-90"
              title={status.isMuted ? 'Unmute (Double-click: 80%)' : 'Mute (Double-click: 80%)'}
            >
              {status.isMuted || status.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-[#fc3c44]" />
              ) : status.volume < 50 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* Vertical Slider Capsule (Appears on Hover) */}
            <div 
              className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-2.5 rounded-2xl bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.85)] flex flex-col items-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 animate-in fade-in zoom-in-95"
            >
              {/* Bridge to prevent hover loss when moving cursor */}
              <div className="absolute -bottom-3 left-0 right-0 h-3" />

              <div 
                className="relative w-6 h-28 flex items-center justify-center cursor-pointer"
                onDoubleClick={() => playerService.setVolume(80)}
                title="Âm lượng (Click đúp để về 80%)"
              >
                {/* Track with bottom-up red progress fill */}
                <div className="w-1.5 h-24 bg-white/[0.15] rounded-full overflow-hidden relative flex flex-col justify-end">
                  <div 
                    className="w-full bg-[#fc3c44] rounded-full transition-all duration-75"
                    style={{ height: `${status.isMuted ? 0 : status.volume}%` }}
                  />
                </div>

                {/* Rotated range input for natural up/down dragging */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={status.isMuted ? 0 : status.volume}
                  onChange={handleVolumeChange}
                  className="absolute w-24 h-6 -rotate-90 origin-center opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
