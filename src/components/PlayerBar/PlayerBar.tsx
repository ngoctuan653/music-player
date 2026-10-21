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
  AlertCircle
} from 'lucide-react';
import { PlayerStatus, RepeatMode } from '../../models/types';
import { playerService } from '../../services/playerService';
import { playlistService } from '../../services/playlistService';

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
    <footer className="h-20 bg-[#141414] border-t border-[#252525] px-4 flex items-center justify-between select-none z-40 relative">
      {/* Error alert toast if player encounters error */}
      {status.error && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-900/90 text-red-200 text-xs px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur border border-red-700">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{status.error}</span>
        </div>
      )}

      {/* Left: Track Info */}
      <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
        {currentTrack ? (
          <>
            <div className="w-12 h-12 rounded bg-[#202020] overflow-hidden shrink-0 relative group">
              <img
                src={currentTrack.thumbnailUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
              {status.isBuffering && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="overflow-hidden min-w-0 pr-2">
              <p className="text-sm font-medium text-white truncate hover:underline cursor-pointer" title={currentTrack.title}>
                {currentTrack.title}
              </p>
              <p className="text-xs text-gray-400 truncate hover:underline cursor-pointer" title={currentTrack.channelTitle}>
                {currentTrack.channelTitle}
              </p>
            </div>

            <button
              onClick={handleToggleFavorite}
              className={`p-1.5 rounded-full transition-colors shrink-0 ${
                isFavorite
                  ? 'text-red-500 hover:text-red-400'
                  : 'text-gray-400 hover:text-white hover:bg-[#252525]'
              }`}
              title={isFavorite ? 'Bỏ thích' : 'Yêu thích'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
            </button>
          </>
        ) : (
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>Chưa có bài hát nào được chọn</span>
          </div>
        )}
      </div>

      {/* Center: Controls & Timeline */}
      <div className="flex flex-col items-center max-w-[560px] w-2/4">
        {/* Buttons */}
        <div className="flex items-center gap-4 mb-1">
          <button
            onClick={() => playerService.toggleShuffle()}
            className={`p-1.5 rounded-full transition-colors ${
              status.isShuffled ? 'text-red-500 font-bold' : 'text-gray-400 hover:text-white'
            }`}
            title={status.isShuffled ? 'Tắt phát ngẫu nhiên' : 'Bật phát ngẫu nhiên'}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrev}
            disabled={!currentTrack}
            className="p-1.5 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Bài trước đó"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={handleTogglePlay}
            disabled={!currentTrack}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            title={status.isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {status.isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={!currentTrack}
            className="p-1.5 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Bài tiếp theo"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-1.5 rounded-full transition-colors ${
              status.repeatMode !== 'off' ? 'text-red-500' : 'text-gray-400 hover:text-white'
            }`}
            title={`Lặp lại: ${status.repeatMode}`}
          >
            {status.repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Timeline Slider */}
        <div className="w-full flex items-center gap-2 text-[11px] text-gray-400 font-mono">
          <span className="w-9 text-right">{formatTime(displayTime)}</span>
          <div className="relative flex-1 flex items-center group h-3">
            <div className="w-full h-1 bg-[#333333] rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-150"
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
          <span className="w-9">{formatTime(status.duration)}</span>
        </div>
      </div>

      {/* Right: Auxiliary Controls */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
        {/* Toggle mini player preview */}
        <button
          onClick={onToggleMiniVideo}
          className={`p-2 rounded-lg transition-colors ${
            isMiniVideoOpen
              ? 'bg-red-600/20 text-red-500'
              : 'text-gray-400 hover:text-white hover:bg-[#252525]'
          }`}
          title={isMiniVideoOpen ? 'Ẩn màn hình video YouTube' : 'Mở xem video YouTube'}
        >
          <Video className="w-4 h-4" />
        </button>

        {/* View Queue button */}
        <button
          onClick={onOpenQueue}
          className="p-2 text-gray-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
          title="Xem hàng đợi phát"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Volume */}
        <div className="flex items-center gap-2 group">
          <button
            onClick={() => playerService.toggleMute()}
            className="text-gray-400 hover:text-white transition-colors"
            title={status.isMuted ? 'Bật âm' : 'Tắt âm'}
          >
            {status.isMuted || status.volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : status.volume < 50 ? (
              <Volume1 className="w-4 h-4" />
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
            className="w-20 h-1 bg-[#333333] accent-red-600 rounded-full cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
};

