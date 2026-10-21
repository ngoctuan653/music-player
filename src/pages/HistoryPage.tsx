import React, { useEffect, useState } from 'react';
import { History as HistoryIcon, Trash2, Play, Plus, FolderPlus } from 'lucide-react';
import { TrackReference } from '../models/types';
import { LocalStorageManager } from '../storage/localStore';
import { playlistService } from '../services/playlistService';

interface HistoryPageProps {
  onPlayTrack: (track: TrackReference) => void;
  onOpenAddToPlaylist: (track: TrackReference) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onPlayTrack,
  onOpenAddToPlaylist,
}) => {
  const [history, setHistory] = useState<TrackReference[]>([]);

  useEffect(() => {
    setHistory(LocalStorageManager.getHistory());
  }, []);

  const handleClearHistory = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử nghe nhạc?')) {
      LocalStorageManager.clearHistory();
      setHistory([]);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-red-500" />
            <span>Lịch sử nghe nhạc</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Các bài hát bạn đã nghe gần đây trên ứng dụng ({history.length})
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-red-950/40 text-gray-300 hover:text-red-400 text-xs transition-colors border border-[#333]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa lịch sử</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-20 text-center text-gray-500 space-y-2">
          <HistoryIcon className="w-12 h-12 mx-auto text-gray-600 mb-3 opacity-40" />
          <p className="text-sm font-medium">Chưa có lịch sử nghe</p>
          <p className="text-xs text-gray-600">
            Khi bạn phát một bài hát từ Trang chủ hoặc Tìm kiếm, bài hát đó sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {history.map((track, idx) => (
            <div
              key={`${track.videoId}_${idx}`}
              onClick={() => onPlayTrack(track)}
              className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-[#1a1a1a] transition-colors cursor-pointer border border-transparent hover:border-[#2d2d2d]"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                <span className="w-6 text-center text-xs font-mono text-gray-500 group-hover:hidden">
                  {idx + 1}
                </span>
                <Play className="w-4 h-4 text-white fill-white hidden group-hover:block mx-1 shrink-0" />

                <img
                  src={track.thumbnailUrl}
                  alt=""
                  className="w-12 h-8 rounded object-cover bg-[#242424] shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs md:text-sm font-medium text-gray-200 truncate group-hover:text-red-400 transition-colors"
                    title={track.title}
                  >
                    {track.title}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate" title={track.channelTitle}>
                    {track.channelTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playlistService.enqueueEnd(track);
                  }}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-[#252525] rounded transition-colors"
                  title="Thêm vào hàng đợi"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddToPlaylist(track);
                  }}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-[#252525] rounded transition-colors"
                  title="Thêm vào playlist"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
