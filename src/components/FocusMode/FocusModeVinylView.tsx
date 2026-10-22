import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Heart,
  Disc
} from 'lucide-react';
import { PlayerStatus, RepeatMode } from '../../models/types';
import { playerService } from '../../services/playerService';
import { playlistService } from '../../services/playlistService';

interface FocusModeVinylViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FocusModeVinylView: React.FC<FocusModeVinylViewProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<PlayerStatus>(playerService.getStatus());
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [dragTime, setDragTime] = useState<number>(0);

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
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#070709] select-none text-white overflow-hidden animate-in fade-in duration-300">
      {/* Subtle Dynamic Ambient Gradient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Blurred Ambient Backdrop */}
        <div 
          className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] opacity-25 blur-3xl transition-all duration-1000 scale-110"
          style={{
            backgroundImage: `radial-gradient(circle at 45% 40%, rgba(220, 38, 38, 0.45), transparent 45%), radial-gradient(circle at 65% 55%, rgba(99, 102, 241, 0.35), transparent 45%), radial-gradient(circle at 50% 50%, #151518, #070709 75%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 h-14 px-4 sm:px-6 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-md shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.08] text-zinc-300 hover:text-white transition-all text-xs font-medium shadow-sm hover:scale-105 active:scale-95 shrink-0"
          title="Thu nhỏ về giao diện chính (Esc)"
        >
          <ChevronDown className="w-4 h-4 text-zinc-300" />
          <span>Thu nhỏ</span>
          <span className="hidden sm:inline text-[10px] font-mono text-zinc-500 bg-black/40 px-1 rounded ml-0.5">Esc</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 truncate px-2">
          <Disc className={`w-3.5 h-3.5 text-[#fc3c44] shrink-0 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          <span className="tracking-widest uppercase font-semibold text-zinc-300 truncate">
            Now Playing <span className="hidden sm:inline">• Vinyl Studio</span>
          </span>
        </div>

        <button
          onClick={handleToggleFavorite}
          className={`p-2 rounded-full transition-all border shrink-0 ${
            isFavorite
              ? 'text-[#fc3c44] bg-[#fc3c44]/10 border-[#fc3c44]/30'
              : 'text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border-white/[0.06]'
          }`}
          title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#fc3c44]' : ''}`} />
        </button>
      </header>

      {/* Center Stage: Authentic Turntable Deck with Spinning Vinyl Record & Tonearm */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-0 overflow-hidden">
        {/* Fluid Responsive Turntable Platter Container (Scales gracefully on all viewports) */}
        <div className="relative w-[min(70vw,40vh,350px)] h-[min(70vw,40vh,350px)] flex items-center justify-center shrink-0">
          {/* Metallic Turntable Platter Rim Beneath Vinyl (Zero awkward box clipping) */}
          <div className="absolute inset-[-6px] rounded-full bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_80px_rgba(0,0,0,0.7)] pointer-events-none" />

          {/* Spinning Vinyl Record (Đĩa than) */}
          <div 
            className={`w-full h-full rounded-full relative flex items-center justify-center shadow-[0_12px_40px_rgba(0,0,0,0.95)] ring-1 ring-white/10 ${
              isPlaying ? 'animate-vinyl-spin' : 'animate-vinyl-spin animate-vinyl-spin-paused'
            }`}
          >
            {/* Vinyl Grooves (Rãnh đĩa than bên ngoài) */}
            <div className="absolute inset-0 rounded-full vinyl-grooves" />

            {/* Vinyl Glossy Specular Light Sheen (Hiệu ứng phản quang đĩa than) */}
            <div className="absolute inset-0 rounded-full vinyl-sheen pointer-events-none" />

            {/* Outer Run-in and Accent Grooves */}
            <div className="absolute inset-1.5 rounded-full border border-white/[0.06] pointer-events-none" />
            <div className="absolute inset-3.5 rounded-full border border-white/[0.04] pointer-events-none" />

            {/* Enlarged Center Album Art (Tràn ra gần viền đĩa theo đúng yêu cầu, vẫn giữ dải vân đĩa than) */}
            <div className="relative z-10 w-[63%] h-[63%] rounded-full overflow-hidden border-2 border-[#1c1c20] shadow-[0_0_30px_rgba(0,0,0,0.9)] ring-2 ring-white/15 bg-black flex items-center justify-center">
              <img
                src={currentTrack.thumbnailUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover select-none pointer-events-none"
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

      {/* Bottom Track Information & Full Playback Controls */}
      <footer className="relative z-10 px-4 sm:px-6 py-4 border-t border-white/[0.08] bg-[#0c0c0e]/85 backdrop-blur-xl flex flex-col items-center gap-2.5 max-w-2xl mx-auto w-full shrink-0">
        {/* Track Title and Artist */}
        <div className="text-center w-full max-w-lg px-2">
          <h2 className="text-base sm:text-lg font-bold text-white truncate leading-tight tracking-tight" title={currentTrack.title}>
            {currentTrack.title}
          </h2>
          <p className="text-xs text-zinc-400 font-medium truncate mt-0.5" title={currentTrack.channelTitle}>
            {currentTrack.channelTitle}
          </p>
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

          {/* Right Actions: Volume Control */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => playerService.toggleMute()}
              className="p-1.5 text-zinc-400 hover:text-white rounded-full transition-colors"
              title={status.isMuted ? 'Unmute' : 'Mute'}
            >
              {status.isMuted || status.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-[#fc3c44]" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={status.isMuted ? 0 : status.volume}
              onChange={handleVolumeChange}
              className="w-14 sm:w-20 accent-[#fc3c44] h-1.5 rounded-lg bg-white/[0.1] cursor-pointer"
              title={`Volume: ${status.volume}%`}
            />
          </div>
        </div>
      </footer>
    </div>
  );
};
