import React, { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { TrackReference, Playlist } from '../../models/types';
import { playlistService } from '../../services/playlistService';

interface AddToPlaylistModalProps {
  track: TrackReference | null;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ track, onClose }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  useEffect(() => {
    return playlistService.subscribePlaylists((all) => {
      setPlaylists(all);
    });
  }, []);

  if (!track) return null;

  const handleAdd = (playlistId: string) => {
    const success = playlistService.addTrackToPlaylist(playlistId, track);
    if (success) {
      setAddedIds((prev) => [...prev, playlistId]);
    }
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const newPl = playlistService.createPlaylist(newPlaylistName);
    playlistService.addTrackToPlaylist(newPl.id, track);
    setAddedIds((prev) => [...prev, newPl.id]);
    setNewPlaylistName('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-xs select-none">
      <div className="bg-[#111114] border border-white/[0.08] rounded-lg w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold text-zinc-200 uppercase tracking-wider">
            Thêm vào Playlist
          </span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-0.5 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2.5 bg-[#0a0a0c]">
          <img src={track.thumbnailUrl} alt="" className="w-9 h-6 rounded object-cover bg-zinc-900" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-200 truncate">{track.title}</p>
            <p className="text-[10px] text-zinc-500 truncate">{track.channelTitle}</p>
          </div>
        </div>

        {/* Playlists list */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {playlists.map((pl) => {
            const alreadyIn = pl.tracks.some((t) => t.videoId === track.videoId);
            const justAdded = addedIds.includes(pl.id);
            const isIncluded = alreadyIn || justAdded;

            return (
              <button
                key={pl.id}
                onClick={() => !isIncluded && handleAdd(pl.id)}
                disabled={isIncluded}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                  isIncluded
                    ? 'bg-white/[0.03] text-zinc-500 cursor-default'
                    : 'hover:bg-white/[0.04] text-zinc-300'
                }`}
              >
                <div className="truncate pr-2">
                  <p className="font-medium truncate">{pl.name}</p>
                  <p className="text-[10px] font-mono text-zinc-600">{pl.tracks.length} bài</p>
                </div>
                {isIncluded && <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Create playlist section */}
        <div className="p-2 border-t border-white/[0.06] bg-[#0c0c0f]">
          {isCreating ? (
            <form onSubmit={handleCreateAndAdd} className="space-y-1.5">
              <input
                type="text"
                autoFocus
                placeholder="Tên playlist..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full bg-[#16161a] border border-white/[0.1] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-red-500"
              />
              <div className="flex justify-end gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2 py-0.5 text-zinc-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="px-2.5 py-0.5 bg-red-600 text-white font-medium rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Tạo
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Tạo playlist mới</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
