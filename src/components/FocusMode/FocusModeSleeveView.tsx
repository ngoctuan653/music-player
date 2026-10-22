import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume1,
  Volume2, 
  VolumeX, 
  Repeat, 
  Shuffle, 
  ChevronDown, 
  X
} from 'lucide-react';
import { playerService } from '../../services/playerService';
import { playlistService } from '../../services/playlistService';
import { PlayerStatus, TrackReference } from '../../models/types';
import { useDominantColor } from '../../hooks/useDominantColor';
import { useAlbumArt } from '../../hooks/useAlbumArt';
import { MarqueeText } from './MarqueeText';

interface FocusModeSleeveViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FocusModeSleeveView: React.FC<FocusModeSleeveViewProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [status, setStatus] = useState<PlayerStatus>(playerService.getStatus());
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  // Track change retraction state for smooth sliding transition
  const [isRetracted, setIsRetracted] = useState(false);
  const [displayTrack, setDisplayTrack] = useState<TrackReference | null>(status.currentTrack);
  const prevTrackIdRef = useRef<string | null>(status.currentTrack?.videoId || null);

  // Subscribe to real-time player updates
  useEffect(() => {
    const unsub = playerService.subscribe(newStatus => {
      setStatus({ ...newStatus });
    });
    return unsub;
  }, []);

  // Handle smooth vinyl slide retraction & expansion on track change
  useEffect(() => {
    const currentId = status.currentTrack?.videoId || null;
    if (currentId && currentId !== prevTrackIdRef.current) {
      prevTrackIdRef.current = currentId;
      // Retract disc into sleeve
      setIsRetracted(true);
      const timer = setTimeout(() => {
        setDisplayTrack(status.currentTrack);
        setIsRetracted(false);
      }, 380);
      return () => clearTimeout(timer);
    } else if (status.currentTrack && !displayTrack) {
      setDisplayTrack(status.currentTrack);
    }
  }, [status.currentTrack]);

  // Extract dominant ambient & vinyl colors from thumbnail
  const currentCover = displayTrack?.thumbnailUrl || status.currentTrack?.thumbnailUrl;
  const { colors } = useDominantColor(currentCover);
  const activeTrack = displayTrack || status.currentTrack;
  const albumArt = useAlbumArt(activeTrack?.videoId, activeTrack?.thumbnailUrl);

  // Keyboard navigation & playback shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        playerService.togglePlayPause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        playerService.seekTo(Math.min(status.duration, status.currentTime + 5));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        playerService.seekTo(Math.max(0, status.currentTime - 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, status.duration, status.currentTime, onClose]);

  if (!isOpen) return null;

  const isPlaying = status.isPlaying;

  const handleTogglePlay = () => playerService.togglePlayPause();
  const handlePrev = () => playlistService.playPrevious();
  const handleNext = () => playlistService.playNext();
  const handleToggleShuffle = () => playerService.toggleShuffle();
  const handleCycleRepeat = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(status.repeatMode) + 1) % modes.length;
    playerService.setRepeatMode(modes[nextIdx]);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragTime(parseFloat(e.target.value));
  };

  const handleSeekCommit = () => {
    setIsDraggingSlider(false);
    playerService.seekTo(dragTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    playerService.setVolume(parseInt(e.target.value, 10));
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
          onClick={onClose}
          className="p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.18] backdrop-blur-md border border-white/[0.1] text-zinc-300 hover:text-white transition-all active:scale-95"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Main Focus Center: Album Sleeve & Sliding Vinyl Record */}
      <main className="relative flex-1 flex flex-col items-center justify-center min-h-0 px-4 py-2 overflow-visible">
        <div className="relative flex items-center justify-center w-full max-w-4xl py-4">
          
          {/* Combo Container: Sleeve on Left, Sliding Vinyl on Right (Symmetrically centered with -19% offset) */}
          <div className="relative flex items-center justify-center -translate-x-[19%] transition-transform duration-300">
            
            {/* 1. Square Album Sleeve (Front, z-10) */}
            <div 
              className="relative z-10 w-[min(54vw,36vh,320px)] h-[min(54vw,36vh,320px)] aspect-square rounded-[6px] overflow-hidden border-l border-t border-white/[0.18] bg-[#1a1a1c] transition-all duration-300 shrink-0"
              style={{
                boxShadow: `0 30px 70px -15px rgba(0, 0, 0, 0.95), 0 0 50px -10px ${colors.glowColor}, 0 10px 24px -8px rgba(0,0,0,0.85)`,
              }}
            >
              {/* Blurred Ambient Fill Behind: Guarantees full square coverage without black letterbox bars */}
              <img
                src={albumArt.src}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-60 select-none pointer-events-none"
              />

              {/* Crisp Album Cover Art: Scaled 1.34x to cleanly crop YouTube 16:9 black bars without distortion */}
              <img
                src={albumArt.src}
                alt={activeTrack?.title || 'Album Art'}
                onError={albumArt.handleError}
                className="relative z-10 w-full h-full object-cover object-center scale-[1.34] transition-all duration-300 select-none pointer-events-none"
              />

              {/* Sleeve Real Paper Cardboard Texture & Ambient Sheen */}
              <div className="absolute inset-0 z-20 bg-gradient-to-tr from-black/30 via-transparent to-white/[0.12] pointer-events-none" />
              <div className="absolute inset-y-0 left-0 z-20 w-1.5 bg-gradient-to-r from-white/25 via-transparent to-transparent pointer-events-none" />
              
              {/* Sleeve Right Pocket Slot Shadow (where vinyl slides out) */}
              <div className="absolute inset-y-0 right-0 z-20 w-3 bg-gradient-to-l from-black/70 via-black/20 to-transparent pointer-events-none" />
            </div>

            {/* 2. Sliding Vinyl Record (Behind Sleeve, z-0) */}
            <div 
              className="absolute top-0 left-0 w-[min(54vw,36vh,320px)] h-[min(54vw,36vh,320px)] z-0 pointer-events-none shrink-0"
              style={{
                transform: isRetracted ? 'translateX(0%)' : 'translateX(38%)',
                transition: 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Rotating Disc Inner Body: Translucent Colored Acrylic / Vinyl Plastic */}
              <div 
                className={`relative w-full h-full rounded-full overflow-hidden animate-sleeve-vinyl-spin vinyl-translucent-body ${
                  !isPlaying ? 'animate-vinyl-spin-paused' : ''
                }`}
                style={{
                  ['--vinyl-translucent-bg' as any]: colors.vinylTranslucentBg,
                  ['--vinyl-glow' as any]: colors.glowColor,
                  animationPlayState: isPlaying ? 'running' : 'paused',
                }}
              >
                {/* Delicate Silky Sound Grooves (Fine micro-grooves, ultra-smooth and realistic) */}
                <div className="absolute inset-0 rounded-full vinyl-delicate-grooves" />

                {/* Translucent Satin Specular Conic Light Sheen */}
                <div className="absolute inset-0 rounded-full vinyl-translucent-sheen opacity-65 pointer-events-none" />

                {/* Translucent Colored Vinyl Outer Rim & Groove Bevel */}
                <div className="absolute inset-0 rounded-full border border-white/15 shadow-[inset_0_0_10px_rgba(0,0,0,0.65),0_12px_36px_rgba(0,0,0,0.85)] pointer-events-none" />
                <div className="absolute inset-1.5 rounded-full border border-black/25 pointer-events-none" />

                {/* Real Center Album Art Label (Nhãn đĩa in hình thật bìa bài hát) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[52%] h-[52%] rounded-full overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.9)] ring-1 ring-white/20 border border-black/80 flex items-center justify-center pointer-events-none select-none bg-black">
                  <img
                    src={albumArt.src}
                    alt=""
                    onError={albumArt.handleError}
                    className="w-full h-full object-cover scale-[1.34]"
                  />
                  {/* Circular vinyl label sheen & outer concentric grooves */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none" />
                  <div className="absolute inset-2 rounded-full border border-white/15 pointer-events-none" />

                  {/* Center Spindle Eyelet & Hole (Kim loại mạ vàng đồng) */}
                  <div className="absolute w-4 h-4 rounded-full bg-[#111113] border-2 border-[#d4af37] shadow-[inset_0_1px_3px_rgba(0,0,0,1)] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-black shadow-inner" />
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Track Metadata with Bouncing Horizontal Marquee */}
        <div className="text-center mt-3 sm:mt-5 w-full max-w-md sm:max-w-lg px-4 z-20 flex flex-col items-center">
          <MarqueeText
            text={activeTrack?.title || 'Không có bài hát nào'}
            className="text-base sm:text-xl font-bold text-white tracking-tight drop-shadow-md"
            containerClassName="max-w-[min(84vw,440px)]"
          />
          <MarqueeText
            text={activeTrack?.channelTitle || 'YouTube Music'}
            className="text-xs sm:text-sm text-zinc-400 font-medium mt-1"
            containerClassName="max-w-[min(70vw,360px)]"
          />
        </div>
      </main>

      {/* Bottom Floating Control Deck (Seamless glassmorphic fade, zero border lines) */}
      <footer className="relative z-20 px-4 sm:px-8 py-4 bg-gradient-to-t from-black/55 via-black/20 to-transparent shrink-0">
        <div className="max-w-xl mx-auto flex flex-col gap-2.5">
          
          {/* Progress Timeline Scrubber */}
          <div className="flex items-center gap-2.5 text-[11px] font-mono text-zinc-400">
            <span className="w-9 text-right tabular-nums">{formatTime(displayTime)}</span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max={status.duration || 100}
                step="0.1"
                value={displayTime}
                onMouseDown={() => setIsDraggingSlider(true)}
                onTouchStart={() => setIsDraggingSlider(true)}
                onChange={handleSeekChange}
                onMouseUp={handleSeekCommit}
                onTouchEnd={handleSeekCommit}
                className="w-full h-1.5 bg-white/[0.12] rounded-full appearance-none cursor-pointer accent-[#fc3c44] hover:h-2 transition-all"
              />
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-[#fc3c44] rounded-full pointer-events-none transition-all"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
            <span className="w-9 text-left tabular-nums">{formatTime(status.duration)}</span>
          </div>

          {/* Action Row: Controls + Volume */}
          <div className="flex items-center justify-between">
            
            {/* Left Actions: Shuffle & Repeat */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleShuffle}
                className={`p-2 rounded-full transition-colors ${
                  status.isShuffled ? 'text-[#fc3c44] bg-[#fc3c44]/15' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
                title={status.isShuffled ? 'Tắt phát ngẫu nhiên' : 'Bật phát ngẫu nhiên'}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                onClick={handleCycleRepeat}
                className={`p-2 rounded-full transition-colors ${
                  status.repeatMode !== 'off' ? 'text-[#fc3c44] bg-[#fc3c44]/15' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
                title={`Chế độ lặp: ${status.repeatMode}`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Center: Playback Transport Buttons */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={handlePrev}
                className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.08] rounded-full transition-all active:scale-90"
                title="Bài trước"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={handleTogglePlay}
                className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#fc3c44] hover:bg-[#e0343b] text-white flex items-center justify-center shadow-[0_0_25px_rgba(252,60,68,0.5)] transition-all hover:scale-105 active:scale-95"
                title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={handleNext}
                className="p-2 text-zinc-300 hover:text-white hover:bg-white/[0.08] rounded-full transition-all active:scale-90"
                title="Bài kế tiếp"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>

            {/* Right: Vertical Volume Control with Hover-Only Popup */}
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

        </div>
      </footer>
    </div>
  );
};
