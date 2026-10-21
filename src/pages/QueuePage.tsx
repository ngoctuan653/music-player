import React, { useEffect, useState } from 'react';
import { ListMusic, Trash2, Play, Volume2, X } from 'lucide-react';
import { TrackReference } from '../models/types';
import { playlistService } from '../services/playlistService';

export const QueuePage: React.FC = () => {
  const [queue, setQueue] = useState<TrackReference[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  useEffect(() => {
    return playlistService.subscribeQueue((q, idx) => {
      setQueue(q);
      setCurrentIndex(idx);
    });
  }, []);

  const handlePlayIndex = (idx: number) => {
    playlistService.playIndex(idx);
  };

  const handleRemove = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    playlistService.removeFromQueue(idx);
  };

  const handleClear = () => {
    playlistService.clearQueue();
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-red-500" />
            <span>Hàng đợi phát</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {queue.length} bài hát trong hàng đợi
          </p>
        </div>

        {queue.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-red-950/40 text-gray-300 hover:text-red-400 text-xs transition-colors border border-[#333]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa danh sách</span>
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="py-20 text-center text-gray-500 space-y-2">
          <ListMusic className="w-12 h-12 mx-auto text-gray-600 mb-3 opacity-40" />
          <p className="text-sm font-medium">Hàng đợi đang trống</p>
          <p className="text-xs text-gray-600">
            Hãy chọn một bài hát từ Trang chủ hoặc Tìm kiếm để bắt đầu phát.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {queue.map((track, idx) => {
            const isPlaying = idx === currentIndex;
            return (
              <div
                key={`${track.videoId}_${idx}`}
                onClick={() => handlePlayIndex(idx)}
                className={`group flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border ${
                  isPlaying
                    ? 'bg-red-950/20 border-red-800/40 text-white'
                    : 'hover:bg-[#1a1a1a] border-transparent text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                  <div className="w-6 text-center text-xs font-mono shrink-0">
                    {isPlaying ? (
                      <Volume2 className="w-4 h-4 text-red-500 animate-pulse mx-auto" />
                    ) : (
                      <span className="text-gray-500 group-hover:hidden">{idx + 1}</span>
                    )}
                    {!isPlaying && (
                      <Play className="w-3.5 h-3.5 text-gray-400 fill-current hidden group-hover:block mx-auto" />
                    )}
                  </div>

                  <img
                    src={track.thumbnailUrl}
                    alt=""
                    className="w-12 h-8 rounded object-cover bg-[#242424] shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs md:text-sm font-medium truncate ${
                        isPlaying ? 'text-red-400 font-semibold' : 'text-gray-200'
                      }`}
                      title={track.title}
                    >
                      {track.title}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate" title={track.channelTitle}>
                      {track.channelTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleRemove(idx, e)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[#252525] rounded transition-colors"
                    title="Xóa khỏi hàng đợi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
