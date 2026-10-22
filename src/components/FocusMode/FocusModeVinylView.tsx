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
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#08080a] select-none text-white overflow-hidden animate-in fade-in duration-300">
      {/* Subtle Dynamic Ambient Gradient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Blurred Ambient Backdrop */}
        <div 
          className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] opacity-25 blur-3xl transition-all duration-1000 scale-110"
          style={{
            backgroundImage: `radial-gradient(circle at 45% 40%, rgba(220, 38, 38, 0.45), transparent 45%), radial-gradient(circle at 65% 55%, rgba(99, 102, 241, 0.35), transparent 45%), radial-gradient(circle at 50% 50%, #151518, #08080a 75%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 h-14 px-6 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-md">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.08] text-zinc-300 hover:text-white transition-all text-xs font-medium shadow-sm hover:scale-105 active:scale-95"
          title="Thu nhỏ về giao diện chính (Esc)"
        >
          <ChevronDown className="w-4 h-4 text-zinc-300" />
          <span>Thu nhỏ</span>
          <span className="text-[10px] font-mono text-zinc-500 bg-black/40 px-1 rounded ml-0.5">Esc</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Disc className={`w-3.5 h-3.5 text-[#fc3c44] ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          <span className="tracking-widest uppercase font-semibold text-zinc-300">Now Playing • Vinyl Studio</span>
        </div>

        <button
          onClick={handleToggleFavorite}
          className={`p-2 rounded-full transition-all border ${
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
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 min-h-0">
        <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] flex items-center justify-center">
          {/* Turntable Platter Deck Base */}
          <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-[#1c1c20] via-[#121215] to-[#0c0c0e] border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] p-4">
            {/* Platter Rim */}
            <div className="w-full h-full rounded-full border border-white/[0.04] bg-[#0c0c0e] shadow-inner relative flex items-center justify-center">
              
              {/* Spinning Vinyl Record (Đĩa than) */}
              <div 
                className={`w-[290px] h-[290px] sm:w-[350px] sm:h-[350px] rounded-full relative flex items-center justify-center shadow-[0_10px_35px_rgba(0,0,0,0.95)] ring-1 ring-white/10 ${
                  isPlaying ? 'animate-vinyl-spin' : 'animate-vinyl-spin animate-vinyl-spin-paused'
                }`}
              >
                {/* Vinyl Grooves (Rãnh đĩa than) */}
                <div className="absolute inset-0 rounded-full vinyl-grooves" />

                {/* Vinyl Glossy Specular Light Sheen (Hiệu ứng phản quang đĩa than) */}
                <div className="absolute inset-0 rounded-full vinyl-sheen pointer-events-none" />

                {/* Outer run-in groove line */}
                <div className="absolute inset-3 rounded-full border border-white/[0.05] pointer-events-none" />
                <div className="absolute inset-7 rounded-full border border-white/[0.04] pointer-events-none" />

                {/* Center Label: Album Cover Art (Nhãn đĩa / Bìa Album) */}
                <div className="relative z-10 w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-full overflow-hidden border-4 border-[#222226] shadow-[0_0_20px_rgba(0,0,0,0.8)] ring-2 ring-[#fc3c44]/30 bg-black flex items-center justify-center">
                  <img
                    src={currentTrack.thumbnailUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                  {/* Center Spindle Hole (Lỗ trục mâm đĩa) */}
                  <div className="absolute w-4 h-4 rounded-full bg-[#111113] border-2 border-[#d4af37] shadow-inner flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-black" />
                  </div>
                </div>
              </div>

              {/* Tonearm Assembly (Kim phát nhạc đĩa than) */}
              <div 
                className="absolute top-2 right-2 w-28 h-56 sm:w-36 sm:h-64 pointer-events-none z-30 tonearm-pivot"
                style={{
                  transform: isPlaying ? 'rotate(26deg)' : 'rotate(-16deg)',
                }}
              >
                {/* Tonearm Gimbal Pivot Base */}
                <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-zinc-300 via-zinc-600 to-zinc-900 shadow-xl border border-white/20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700 shadow-inner flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#d4af37] border border-amber-300/40" />
                  </div>
                </div>

                {/* Tonearm Rod (Trục kim phát nhạc kim loại) */}
                <svg className="w-full h-full" viewBox="0 0 140 240" fill="none">
                  {/* Counterweight */}
                  <rect x="80" y="8" width="22" height="18" rx="3" fill="url(#metal-grad)" stroke="#666" strokeWidth="1" />
                  {/* Curved Silver Chrome Arm */}
                  <path
                    d="M 92 36 L 90 120 L 45 185 L 36 210"
                    stroke="url(#chrome-grad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="drop-shadow(2px 4px 6px rgba(0,0,0,0.6))"
                  />
                  {/* Headshell & Cartridge (Hộp kim & kim đọc) */}
                  <g transform="translate(22, 202) rotate(-22)">
                    <rect x="0" y="0" width="16" height="26" rx="2" fill="#18181b" stroke="#555" strokeWidth="1" />
                    {/* Cartridge highlight */}
                    <rect x="3" y="18" width="10" height="7" rx="1" fill="#fc3c44" />
                    {/* Stylus needle tip */}
                    <circle cx="8" cy="26" r="1.5" fill="#ffffff" />
                  </g>

                  <defs>
                    <linearGradient id="chrome-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#e4e4e7" />
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
          </div>
        </div>

        {/* Status indicator pill */}
        <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-zinc-400">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{isPlaying ? 'VINYL SPINNING (45 RPM)' : 'TONEARM RESTING (PAUSED)'}</span>
        </div>
      </div>

      {/* Bottom Track Information & Full Playback Controls */}
      <footer className="relative z-10 px-8 py-5 border-t border-white/[0.08] bg-[#0c0c0e]/80 backdrop-blur-xl flex flex-col items-center gap-3 max-w-4xl mx-auto w-full">
        {/* Track Title and Artist */}
        <div className="text-center w-full max-w-xl">
          <h2 className="text-lg sm:text-xl font-bold text-white truncate leading-tight tracking-tight" title={currentTrack.title}>
            {currentTrack.title}
          </h2>
          <p className="text-sm text-zinc-400 font-medium truncate mt-0.5" title={currentTrack.channelTitle}>
            {currentTrack.channelTitle}
          </p>
        </div>

        {/* Scrubber Progress Bar */}
        <div className="w-full flex items-center gap-3 max-w-2xl text-xs font-mono text-zinc-400">
          <span className="w-10 text-right tabular-nums">{formatTime(displayTime)}</span>
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
          <span className="w-10 tabular-nums">{formatTime(status.duration)}</span>
        </div>

        {/* Playback Button Controls */}
        <div className="flex items-center justify-between w-full max-w-2xl pt-1">
          {/* Left Actions: Shuffle & Output Bus */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => playerService.toggleShuffle()}
              className={`p-2 rounded-full transition-colors ${
                status.isShuffled ? 'text-[#fc3c44] bg-[#fc3c44]/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={status.isShuffled ? 'Disable Shuffle' : 'Enable Shuffle'}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={cycleRepeat}
              className={`p-2 rounded-full transition-colors relative ${
                status.repeatMode !== 'off' ? 'text-[#fc3c44] bg-[#fc3c44]/10' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={`Repeat: ${status.repeatMode}`}
            >
              <Repeat className="w-4 h-4" />
              {status.repeatMode === 'one' && (
                <span className="absolute top-1 right-1 text-[8px] font-bold text-[#fc3c44] leading-none">1</span>
              )}
            </button>
          </div>

          {/* Center Playback Controls */}
          <div className="flex items-center gap-5">
            <button
              onClick={handlePrev}
              className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.08] rounded-full transition-all active:scale-90"
              title="Previous Track"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#fc3c44] hover:bg-[#e0343b] text-white flex items-center justify-center shadow-[0_0_24px_rgba(252,60,68,0.5)] transition-all hover:scale-105 active:scale-95"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={handleNext}
              className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.08] rounded-full transition-all active:scale-90"
              title="Next Track"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Right Actions: Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => playerService.toggleMute()}
              className="p-2 text-zinc-400 hover:text-white rounded-full transition-colors"
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
              className="w-16 sm:w-20 accent-[#fc3c44] h-1.5 rounded-lg bg-white/[0.1] cursor-pointer"
              title={`Volume: ${status.volume}%`}
            />
          </div>
        </div>
      </footer>
    </div>
  );
};
