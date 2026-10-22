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

    const newPl = playlistService.createPlaylist(newPlaylistName.trim());
    playlistService.addTrackToPlaylist(newPl.id, track);
    setAddedIds((prev) => [...prev, newPl.id]);
    setNewPlaylistName('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 text-xs select-none">
      <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold text-zinc-200 uppercase tracking-wider">
            Add to Playlist
          </span>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-0.5 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2.5 bg-[#232323]">
          <img src={track.thumbnailUrl} alt="" className="w-10 h-7 rounded object-cover bg-zinc-900 border border-white/[0.06]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{track.title}</p>
            <p className="text-[10px] text-zinc-400 truncate">{track.channelTitle}</p>
          </div>
        </div>

        {/* Playlists list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {playlists.map((pl) => {
            const alreadyIn = pl.tracks.some((t) => t.videoId === track.videoId);
            const justAdded = addedIds.includes(pl.id);
            const isIncluded = alreadyIn || justAdded;

            return (
              <button
                key={pl.id}
                onClick={() => !isIncluded && handleAdd(pl.id)}
                disabled={isIncluded}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  isIncluded
                    ? 'bg-white/[0.03] text-zinc-500 cursor-default'
                    : 'hover:bg-white/[0.06] text-zinc-300'
                }`}
              >
                <div className="truncate pr-2">
                  <p className="font-medium truncate">{pl.name}</p>
                  <p className="text-[10px] font-mono text-zinc-500">{pl.tracks.length} tracks</p>
                </div>
                {isIncluded && <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Create playlist section */}
        <div className="p-3 border-t border-white/[0.08] bg-[#232323]">
          {isCreating ? (
            <form onSubmit={handleCreateAndAdd} className="space-y-2">
              <input
                type="text"
                autoFocus
                placeholder="Playlist name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full bg-[#1c1c1e] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#fc3c44]"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2.5 py-1 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="px-3 py-1 bg-[#fc3c44] text-white font-medium rounded-lg hover:bg-[#e0343b] disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors border border-white/[0.06]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create new playlist</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
