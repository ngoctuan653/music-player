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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1f1f1f] border border-[#333] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-[#2d2d2d] flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Thêm vào playlist</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-[#2d2d2d] flex items-center gap-3 bg-[#181818]">
          <img src={track.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{track.title}</p>
            <p className="text-[11px] text-gray-400 truncate">{track.channelTitle}</p>
          </div>
        </div>

        {/* Playlists list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {playlists.map((pl) => {
            const alreadyIn = pl.tracks.some((t) => t.videoId === track.videoId);
            const justAdded = addedIds.includes(pl.id);
            const isIncluded = alreadyIn || justAdded;

            return (
              <button
                key={pl.id}
                onClick={() => !isIncluded && handleAdd(pl.id)}
                disabled={isIncluded}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-colors ${
                  isIncluded
                    ? 'bg-[#282828] text-gray-400 cursor-default'
                    : 'hover:bg-[#2a2a2a] text-gray-200'
                }`}
              >
                <div className="truncate pr-2">
                  <p className="font-medium truncate">{pl.name}</p>
                  <p className="text-[10px] text-gray-500">{pl.tracks.length} bài hát</p>
                </div>
                {isIncluded && <Check className="w-4 h-4 text-green-500 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Create playlist section */}
        <div className="p-3 border-t border-[#2d2d2d] bg-[#1a1a1a]">
          {isCreating ? (
            <form onSubmit={handleCreateAndAdd} className="space-y-2">
              <input
                type="text"
                autoFocus
                placeholder="Tên playlist..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full bg-[#252525] border border-[#3d3d3d] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2.5 py-1 text-gray-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="px-3 py-1 bg-red-600 text-white font-medium rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Tạo & Thêm
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#252525] rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo playlist mới</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

