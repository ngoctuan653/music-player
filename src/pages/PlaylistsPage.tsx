import React, { useEffect, useState } from 'react';
import {
  FolderHeart,
  Plus,
  Play,
  Shuffle,
  Trash2,
  Edit2,
  Heart,
  Music,
  Check,
  X
} from 'lucide-react';
import { Playlist, TrackReference } from '../models/types';
import { playlistService } from '../services/playlistService';

interface PlaylistsPageProps {
  onPlayTrack: (track: TrackReference, sourceList?: TrackReference[]) => void;
  selectedPlaylistId?: string | null;
}

export const PlaylistsPage: React.FC<PlaylistsPageProps> = ({
  onPlayTrack,
  selectedPlaylistId: propSelectedId,
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>('favorites');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  useEffect(() => {
    return playlistService.subscribePlaylists((all) => {
      setPlaylists(all);
      if (all.length > 0 && !all.some((p) => p.id === activePlaylistId)) {
        setActivePlaylistId(all[0].id);
      }
    });
  }, [activePlaylistId]);

  useEffect(() => {
    if (propSelectedId) {
      setActivePlaylistId(propSelectedId);
    }
  }, [propSelectedId]);

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) || playlists[0];

  const handlePlayAll = () => {
    if (activePlaylist && activePlaylist.tracks.length > 0) {
      onPlayTrack(activePlaylist.tracks[0], activePlaylist.tracks);
    }
  };

  const handleShuffleAll = () => {
    if (activePlaylist && activePlaylist.tracks.length > 0) {
      const shuffled = [...activePlaylist.tracks].sort(() => Math.random() - 0.5);
      onPlayTrack(shuffled[0], shuffled);
    }
  };

  const handleRemoveTrack = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePlaylist) {
      playlistService.removeTrackFromPlaylist(activePlaylist.id, videoId);
    }
  };

  const handleDeletePlaylist = () => {
    if (activePlaylist && activePlaylist.id !== 'favorites') {
      if (confirm(`Bạn có chắc chắn muốn xóa playlist "${activePlaylist.name}"?`)) {
        playlistService.deletePlaylist(activePlaylist.id);
        setActivePlaylistId('favorites');
      }
    }
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (activePlaylist && editNameValue.trim()) {
      playlistService.renamePlaylist(activePlaylist.id, editNameValue.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Playlists Left Sub-Panel */}
      <div className="w-64 bg-[#141414] border-r border-[#262626] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[#262626] flex items-center justify-between">
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <FolderHeart className="w-4 h-4 text-red-500" />
            <span>Danh sách phát</span>
          </h2>
          <button
            onClick={() => {
              const name = prompt('Nhập tên playlist mới:');
              if (name?.trim()) {
                const pl = playlistService.createPlaylist(name.trim());
                setActivePlaylistId(pl.id);
              }
            }}
            className="p-1 hover:text-white hover:bg-[#262626] rounded text-gray-400"
            title="Tạo playlist mới"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {playlists.map((pl) => {
            const isSelected = pl.id === activePlaylist?.id;
            return (
              <button
                key={pl.id}
                onClick={() => {
                  setActivePlaylistId(pl.id);
                  setIsEditingName(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-red-600/20 text-red-400 font-semibold border border-red-600/30'
                    : 'text-gray-300 hover:bg-[#202020]'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  {pl.id === 'favorites' ? (
                    <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 shrink-0" />
                  ) : (
                    <Music className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  )}
                  <span className="truncate">{pl.name}</span>
                </div>
                <span className="text-[10px] text-gray-500 shrink-0">{pl.tracks.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Playlist Content Right View */}
      <div className="flex-1 overflow-y-auto p-6">
        {activePlaylist ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header Details */}
            <div className="flex items-start justify-between pb-6 border-b border-[#262626]">
              <div className="space-y-2">
                {isEditingName ? (
                  <form onSubmit={handleSaveRename} className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      className="bg-[#242424] border border-[#444] rounded px-3 py-1 text-lg font-bold text-white focus:outline-none focus:border-red-500"
                    />
                    <button type="submit" className="p-1.5 text-green-400 hover:bg-[#333] rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1.5 text-gray-400 hover:bg-[#333] rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                      {activePlaylist.name}
                    </h1>
                    {activePlaylist.id !== 'favorites' && (
                      <button
                        onClick={() => {
                          setEditNameValue(activePlaylist.name);
                          setIsEditingName(true);
                        }}
                        className="text-gray-400 hover:text-white p-1 rounded"
                        title="Đổi tên"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  {activePlaylist.description || `${activePlaylist.tracks.length} bài hát`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayAll}
                  disabled={activePlaylist.tracks.length === 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-medium text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Phát tất cả</span>
                </button>

                <button
                  onClick={handleShuffleAll}
                  disabled={activePlaylist.tracks.length === 0}
                  className="px-3 py-2 bg-[#262626] hover:bg-[#333] disabled:opacity-40 text-gray-200 text-xs rounded-xl flex items-center gap-2 transition-all"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Ngẫu nhiên</span>
                </button>

                {activePlaylist.id !== 'favorites' && (
                  <button
                    onClick={handleDeletePlaylist}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors border border-[#333]"
                    title="Xóa playlist này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Tracks List */}
            {activePlaylist.tracks.length === 0 ? (
              <div className="py-16 text-center text-gray-500 space-y-2">
                <Music className="w-10 h-10 mx-auto text-gray-600 mb-2 opacity-50" />
                <p className="text-sm">Playlist này chưa có bài hát nào</p>
                <p className="text-xs text-gray-600">
                  Tìm kiếm bài hát hoặc dán link YouTube và nhấn "Thêm vào playlist" để gom nhóm bài hát.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {activePlaylist.tracks.map((track, idx) => (
                  <div
                    key={`${track.videoId}_${idx}`}
                    onClick={() => onPlayTrack(track, activePlaylist.tracks)}
                    className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-[#1c1c1c] transition-colors cursor-pointer border border-transparent hover:border-[#2d2d2d]"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                      <span className="w-6 text-center text-xs font-mono text-gray-500 group-hover:hidden">
                        {idx + 1}
                      </span>
                      <Play className="w-4 h-4 text-white fill-white hidden group-hover:block mx-1 shrink-0" />

                      <img
                        src={track.thumbnailUrl}
                        alt=""
                        className="w-12 h-8 rounded object-cover bg-[#222] shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs md:text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">{track.channelTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleRemoveTrack(track.videoId, e)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[#252525] rounded transition-colors"
                        title="Xóa khỏi playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">Chưa chọn playlist</div>
        )}
      </div>
    </div>
  );
};
