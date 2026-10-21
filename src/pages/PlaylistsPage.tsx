import React, { useEffect, useState } from 'react';
import {
  Plus,
  Play,
  Shuffle,
  Trash2,
  Edit2,
  Heart,
  Disc,
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
      if (confirm(`Bạn có chắc muốn xóa playlist "${activePlaylist.name}"?`)) {
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
    <div className="flex h-full overflow-hidden select-none text-xs">
      {/* Playlists Left Sub-Panel */}
      <div className="w-52 bg-[#0c0c0f] border-r border-white/[0.06] flex flex-col h-full shrink-0">
        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="uppercase tracking-wider">Playlists</span>
          <button
            onClick={() => {
              const name = prompt('Nhập tên playlist mới:');
              if (name?.trim()) {
                const pl = playlistService.createPlaylist(name.trim());
                setActivePlaylistId(pl.id);
              }
            }}
            className="p-1 hover:text-white rounded hover:bg-white/[0.04]"
            title="Tạo playlist mới"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {playlists.map((pl) => {
            const isSelected = pl.id === activePlaylist?.id;
            return (
              <button
                key={pl.id}
                onClick={() => {
                  setActivePlaylistId(pl.id);
                  setIsEditingName(false);
                }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                  isSelected
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-1">
                  {pl.id === 'favorites' ? (
                    <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 shrink-0" />
                  ) : (
                    <Disc className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  )}
                  <span className="truncate">{pl.name}</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-600 shrink-0">{pl.tracks.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Playlist Content View */}
      <div className="flex-1 overflow-y-auto p-5">
        {activePlaylist ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Header Details */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="space-y-1">
                {isEditingName ? (
                  <form onSubmit={handleSaveRename} className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      className="bg-[#141418] border border-white/[0.1] rounded px-2 py-1 text-sm font-semibold text-white focus:outline-none focus:border-red-500"
                    />
                    <button type="submit" className="p-1 text-green-400 hover:bg-white/[0.05] rounded">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1 text-zinc-400 hover:bg-white/[0.05] rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold text-zinc-100 tracking-tight">
                      {activePlaylist.name}
                    </h1>
                    {activePlaylist.id !== 'favorites' && (
                      <button
                        onClick={() => {
                          setEditNameValue(activePlaylist.name);
                          setIsEditingName(true);
                        }}
                        className="text-zinc-500 hover:text-white p-1 rounded"
                        title="Đổi tên"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                <p className="text-[11px] font-mono text-zinc-500">
                  {activePlaylist.tracks.length} BÀI HÁT
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayAll}
                  disabled={activePlaylist.tracks.length === 0}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white font-medium text-xs rounded flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Phát tất cả</span>
                </button>

                <button
                  onClick={handleShuffleAll}
                  disabled={activePlaylist.tracks.length === 0}
                  className="px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 text-zinc-300 text-xs rounded flex items-center gap-1.5 transition-colors border border-white/[0.06]"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Xáo trộn</span>
                </button>

                {activePlaylist.id !== 'favorites' && (
                  <button
                    onClick={handleDeletePlaylist}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded hover:bg-white/[0.04] border border-white/[0.06]"
                    title="Xóa playlist này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Tracks List */}
            {activePlaylist.tracks.length === 0 ? (
              <div className="py-20 text-center text-zinc-600 font-mono">
                Playlist đang trống. Hãy tìm bài hát và thêm vào playlist.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03] border border-white/[0.05] rounded-lg bg-[#0e0e11] overflow-hidden">
                {activePlaylist.tracks.map((track, idx) => (
                  <div
                    key={`${track.videoId}_${idx}`}
                    onClick={() => onPlayTrack(track, activePlaylist.tracks)}
                    className="group flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
                      <span className="w-4 text-center font-mono text-[10px] text-zinc-600 group-hover:hidden">
                        {idx + 1}
                      </span>
                      <Play className="w-3.5 h-3.5 text-zinc-200 fill-current hidden group-hover:block shrink-0" />

                      <img
                        src={track.thumbnailUrl}
                        alt=""
                        className="w-10 h-7 rounded object-cover bg-zinc-900 shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-200 truncate group-hover:text-white" title={track.title}>
                          {track.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{track.channelTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleRemoveTrack(track.videoId, e)}
                        className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-white/[0.05]"
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
          <div className="p-8 text-center text-zinc-600 font-mono">Chưa chọn playlist</div>
        )}
      </div>
    </div>
  );
};
