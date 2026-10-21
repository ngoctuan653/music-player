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
  AlertTriangle
} from 'lucide-react';
import { PlayerStatus, RepeatMode } from '../../models/types';
import { playerService } from '../../services/playerService';
import { playlistService } from '../../services/playlistService';
import { AudioOutputSelector } from '../AudioOutputSelector/AudioOutputSelector';

interface PlayerBarProps {
  onToggleMiniVideo: () => void;
  isMiniVideoOpen: boolean;
  onOpenQueue: () => void;
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
    <footer className="h-16 bg-[#0a0a0d] border-t border-white/[0.08] px-3.5 flex items-center justify-between select-none z-40 relative text-xs">
      {/* Alert toast if error occurs */}
      {status.error && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#1c1212] text-red-300 text-[11px] font-mono px-3 py-1 rounded border border-red-800/60 flex items-center gap-1.5 shadow-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>{status.error}</span>
        </div>
      )}

      {/* Left: Track Information */}
      <div className="flex items-center gap-2.5 w-[28%] min-w-[200px]">
        {currentTrack ? (
          <>
            <div className="w-10 h-10 rounded bg-[#16161a] overflow-hidden shrink-0 relative border border-white/[0.06]">
              <img
                src={currentTrack.thumbnailUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              {status.isBuffering && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="overflow-hidden min-w-0 flex-1 pr-1">
              <p className="text-xs font-medium text-zinc-100 truncate hover:text-white cursor-pointer" title={currentTrack.title}>
                {currentTrack.title}
              </p>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5" title={currentTrack.channelTitle}>
                {currentTrack.channelTitle}
              </p>
            </div>

            <button
              onClick={handleToggleFavorite}
              className={`p-1.5 rounded transition-colors shrink-0 ${
                isFavorite
                  ? 'text-red-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={isFavorite ? 'Bỏ thích' : 'Yêu thích'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-red-500' : ''}`} />
            </button>
          </>
        ) : (
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span>IDLE / SẴN SÀNG</span>
          </div>
        )}
      </div>

      {/* Center: Controls & Needle Timeline */}
      <div className="flex flex-col items-center max-w-[500px] w-[44%]">
        {/* Buttons */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => playerService.toggleShuffle()}
            className={`p-1 rounded transition-colors ${
              status.isShuffled ? 'text-red-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={status.isShuffled ? 'Tắt phát ngẫu nhiên' : 'Bật phát ngẫu nhiên'}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePrev}
            disabled={!currentTrack}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Bài trước đó"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={handleTogglePlay}
            disabled={!currentTrack}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              status.isPlaying
                ? 'bg-red-500 text-white shadow-sm ring-1 ring-red-400'
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
            title={status.isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {status.isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={!currentTrack}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Bài tiếp theo"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-1 rounded transition-colors ${
              status.repeatMode !== 'off' ? 'text-red-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={`Lặp lại: ${status.repeatMode}`}
          >
            {status.repeatMode === 'one' ? (
              <Repeat1 className="w-3.5 h-3.5" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Needle Scrubber */}
        <div className="w-full flex items-center gap-2 text-[10px] font-mono text-zinc-500">
          <span className="w-8 text-right font-medium text-zinc-400">{formatTime(displayTime)}</span>
          <div className="relative flex-1 flex items-center group h-2 cursor-pointer">
            <div className="w-full h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-150"
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
          <span className="w-8 font-medium text-zinc-400">{formatTime(status.duration)}</span>
        </div>
      </div>

      {/* Right: Audio Output Bus & Controls */}
      <div className="flex items-center justify-end gap-2.5 w-[28%] min-w-[200px]">
        {/* Audio Output Device Selector */}
        <AudioOutputSelector />

        {/* View Queue button */}
        <button
          onClick={onOpenQueue}
          className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-white/[0.04] transition-colors"
          title="Xem hàng đợi phát"
        >
          <ListMusic className="w-3.5 h-3.5" />
        </button>

        {/* Mini video toggle */}
        <button
          onClick={onToggleMiniVideo}
          className={`p-1.5 rounded transition-colors ${
            isMiniVideoOpen
              ? 'text-red-400 bg-red-500/10'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
          title={isMiniVideoOpen ? 'Ẩn màn hình video' : 'Xem video'}
        >
          <Video className="w-3.5 h-3.5" />
        </button>

        {/* Compact Volume */}
        <div className="flex items-center gap-1.5 pl-1 border-l border-white/[0.06]">
          <button
            onClick={() => playerService.toggleMute()}
            className="text-zinc-400 hover:text-white transition-colors p-0.5"
            title={status.isMuted ? 'Bật âm' : 'Tắt âm'}
          >
            {status.isMuted || status.volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : status.volume < 50 ? (
              <Volume1 className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={status.isMuted ? 0 : status.volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-white/[0.1] accent-red-500 rounded-full cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
};
