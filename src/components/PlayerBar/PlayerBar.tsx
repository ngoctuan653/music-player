import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Video,
  ListMusic,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  Disc,
} from 'lucide-react';
import { PlayerStatus, RepeatMode } from '../../models/types';
import { playerService } from '../../services/playerService';
import { playlistService } from '../../services/playlistService';
import { AudioOutputSelector } from '../AudioOutputSelector/AudioOutputSelector';

interface PlayerBarProps {
  onToggleMiniVideo: () => void;
  isMiniVideoOpen: boolean;
  onOpenQueue: () => void;
  onToggleComments: () => void;
  isCommentsOpen: boolean;
  onOpenFocusMode?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  onToggleMiniVideo,
  isMiniVideoOpen,
  onOpenQueue,
  onToggleComments,
  isCommentsOpen,
  onOpenFocusMode,
}) => {
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
    if (status.currentTrack) {
      const newState = playlistService.toggleFavorite(status.currentTrack);
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

  const displayTime = isDraggingSlider ? dragTime : status.currentTime;
  const progressPercent = status.duration > 0 ? (displayTime / status.duration) * 100 : 0;
  const currentTrack = status.currentTrack;

  return (
    <footer className="am-playerbar h-16 bg-[#161616] border-t border-white/[0.08] px-4 flex items-center justify-between select-none z-40 relative text-xs">
      {/* Alert toast if error occurs */}
      {status.error && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#1c1212] text-red-300 text-[11px] font-mono px-3 py-1 rounded border border-red-800/60 flex items-center gap-2 shadow-lg z-50">
          <AlertTriangle className="w-3.5 h-3.5 text-[#fc3c44] shrink-0" />
          <span>{status.error}</span>
          {currentTrack && (
            <button
              onClick={() => window.open(`https://www.youtube.com/watch?v=${currentTrack.videoId}`, '_blank')}
              className="ml-1 underline text-red-200 hover:text-white flex items-center gap-0.5"
            >
              <span>Open YouTube</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}

      {/* Left: Track Information */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[140px] sm:max-w-[260px] shrink-0">
        {currentTrack ? (
          <>
            <div 
              onClick={onOpenFocusMode}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-md bg-[#2c2c2e] overflow-hidden shrink-0 relative border border-white/[0.06] shadow-sm cursor-pointer group hover:ring-2 hover:ring-[#fc3c44]/60 transition-all"
              title="Mở chế độ Focus Đĩa Than (Vinyl Mode)"
            >
              <img
                src={currentTrack.thumbnailUrl}
                alt=""
                className="w-full h-full object-cover scale-[1.34] group-hover:scale-[1.45] transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                <Disc className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              {status.isBuffering && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#fc3c44] animate-ping" />
              )}
            </div>

            <div className="overflow-hidden min-w-0 flex-1 pr-1">
              <p 
                onClick={onOpenFocusMode}
                className="text-xs font-semibold text-white truncate hover:text-[#fc3c44] hover:underline cursor-pointer transition-colors" 
                title={`${currentTrack.title} (Click to open Vinyl Focus Mode)`}
              >
                {currentTrack.title}
              </p>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5" title={currentTrack.channelTitle}>
                {currentTrack.channelTitle}
              </p>
            </div>

            <button
              onClick={handleToggleFavorite}
              className={`p-1.5 rounded transition-colors shrink-0 hidden sm:inline-flex ${
                isFavorite
                  ? 'text-[#fc3c44]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-[#fc3c44]' : ''}`} />
            </button>
          </>
        ) : (
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-mono truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
            <span className="truncate">NOT PLAYING</span>
          </div>
        )}
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex flex-col items-center flex-1 max-w-[480px] min-w-0 px-1 sm:px-2">
        {/* Buttons */}
        <div className="flex items-center gap-2 sm:gap-4 mb-1">
          <button
            onClick={() => playerService.toggleShuffle()}
            className={`p-1 rounded transition-colors hidden sm:inline-flex ${
              status.isShuffled ? 'text-[#fc3c44]' : 'text-zinc-400 hover:text-white'
            }`}
            title={status.isShuffled ? 'Disable Shuffle' : 'Enable Shuffle'}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePrev}
            disabled={!currentTrack}
            className="p-1 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous track"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={handleTogglePlay}
            disabled={!currentTrack}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              status.isPlaying
                ? 'bg-[#fc3c44] text-white shadow-sm ring-1 ring-[#fc3c44]/50'
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
            title={status.isPlaying ? 'Pause' : 'Play'}
          >
            {status.isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={!currentTrack}
            className="p-1 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-1 rounded transition-colors hidden sm:inline-flex ${
              status.repeatMode !== 'off' ? 'text-[#fc3c44]' : 'text-zinc-400 hover:text-white'
            }`}
            title={`Repeat: ${status.repeatMode}`}
          >
            {status.repeatMode === 'one' ? (
              <Repeat1 className="w-3.5 h-3.5" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Needle Scrubber */}
        <div className="w-full flex items-center gap-1.5 sm:gap-2.5 text-[10px] font-mono text-zinc-400">
          <span className="w-7 sm:w-8 text-right font-medium text-zinc-400 shrink-0">{formatTime(displayTime)}</span>
          <div className="relative flex-1 flex items-center group h-2 cursor-pointer min-w-0">
            <div className="w-full h-[3px] bg-white/[0.12] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#fc3c44] transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={status.duration || 100}
              step="0.5"
              value={displayTime}
              onMouseDown={() => setIsDraggingSlider(true)}
              onTouchStart={() => setIsDraggingSlider(true)}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              disabled={!currentTrack || status.duration === 0}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          </div>
          <span className="w-7 sm:w-8 font-medium text-zinc-400 shrink-0">{formatTime(status.duration)}</span>
        </div>
      </div>

      {/* Right: Audio Output Bus & Controls */}
      <div className="audio-output-dock flex items-center justify-end gap-1 sm:gap-1.5 shrink-0">
        {/* Audio Output Device Selector (Desktop only) */}
        <div className="hidden md:flex items-center">
          <AudioOutputSelector />
        </div>

        {/* View Queue button */}
        <button
          onClick={onOpenQueue}
          className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-white/[0.04] transition-colors shrink-0"
          title="Playback Queue"
        >
          <ListMusic className="w-3.5 h-3.5" />
        </button>

        {/* Comments drawer toggle (Wide screens only) */}
        <button
          onClick={onToggleComments}
          disabled={!currentTrack}
          className={`p-1.5 rounded transition-colors shrink-0 hidden lg:inline-flex disabled:opacity-30 disabled:cursor-not-allowed ${
            isCommentsOpen
              ? 'text-[#fc3c44] bg-[#fc3c44]/15'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
          title={isCommentsOpen ? 'Hide comments' : 'Show comments'}
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        {/* Mini video toggle (Desktop only) */}
        <button
          onClick={onToggleMiniVideo}
          className={`p-1.5 rounded transition-colors shrink-0 hidden md:inline-flex ${
            isMiniVideoOpen
              ? 'text-[#fc3c44] bg-[#fc3c44]/15'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
          title={isMiniVideoOpen ? 'Hide video' : 'Show video'}
        >
          <Video className="w-3.5 h-3.5" />
        </button>

        {/* Focus Mode Vinyl toggle */}
        <button
          onClick={onOpenFocusMode}
          disabled={!currentTrack}
          className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-white/[0.04] transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed group"
          title="Mở Chế độ Focus Đĩa Than (Focus Mode)"
        >
          <Disc className={`w-3.5 h-3.5 group-hover:text-[#fc3c44] transition-colors ${status.isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
        </button>

        {/* Compact Volume with Vertical Hover Popup */}
        <div className="relative group flex items-center pl-1.5 border-l border-white/[0.08] shrink-0">
          <button
            onClick={() => playerService.toggleMute()}
            onDoubleClick={() => playerService.setVolume(80)}
            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-white/[0.04] transition-colors shrink-0"
            title={status.isMuted ? 'Unmute (Double click: 80%)' : 'Mute (Double click: 80%)'}
          >
            {status.isMuted || status.volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-[#fc3c44]" />
            ) : status.volume < 50 ? (
              <Volume1 className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Vertical Slider Capsule (Appears on Hover) */}
          <div 
            className="absolute bottom-full mb-3 right-0 sm:left-1/2 sm:-translate-x-1/2 p-2.5 rounded-2xl bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/[0.12] shadow-[0_12px_28px_rgba(0,0,0,0.85)] flex flex-col items-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50"
          >
            <div className="absolute -bottom-3 inset-x-0 h-3" />
            <div 
              className="relative w-5 h-24 flex items-center justify-center cursor-pointer"
              onDoubleClick={() => playerService.setVolume(80)}
              title="Volume (Double click: 80%)"
            >
              <div className="w-1.5 h-20 bg-white/[0.15] rounded-full overflow-hidden relative flex flex-col justify-end">
                <div
                  className="w-full bg-[#fc3c44] rounded-full transition-all duration-75"
                  style={{ height: `${status.isMuted ? 0 : status.volume}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={status.isMuted ? 0 : status.volume}
                onChange={handleVolumeChange}
                className="absolute w-20 h-5 -rotate-90 origin-center opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
