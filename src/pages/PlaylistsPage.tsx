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
  X,
  Volume2
} from 'lucide-react';
import { Playlist, TrackReference } from '../models/types';
import { playlistService } from '../services/playlistService';
import { playerService } from '../services/playerService';

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
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubPl = playlistService.subscribePlaylists((all) => {
      setPlaylists(all);
      if (all.length > 0 && !all.some((p) => p.id === activePlaylistId)) {
        setActivePlaylistId(all[0].id);
      }
    });

    const unsubPlayer = playerService.subscribe((s) => {
      setCurrentPlayingId(s.currentTrack?.videoId || null);
    });

    return () => {
      unsubPl();
      unsubPlayer();
    };
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
      if (confirm(`Are you sure you want to delete playlist "${activePlaylist.name}"?`)) {
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
      <div className="w-52 bg-[#1c1c1e] border-r border-white/[0.08] flex flex-col h-full shrink-0">
        <div className="p-3 border-b border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="uppercase tracking-wider">Playlists</span>
          <button
            onClick={() => {
              const name = prompt('Enter new playlist name:');
              if (name?.trim()) {
                const pl = playlistService.createPlaylist(name.trim());
                setActivePlaylistId(pl.id);
              }
            }}
            className="p-1 hover:text-white rounded hover:bg-white/[0.04]"
            title="Create new playlist"
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
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
                  isSelected
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-1">
                  {pl.id === 'favorites' ? (
                    <Heart className="w-3.5 h-3.5 text-[#fc3c44] fill-[#fc3c44] shrink-0" />
                  ) : (
                    <Disc className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
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
      <div className="flex-1 overflow-y-auto p-6 bg-[#131313]">
        {activePlaylist ? (
          <div className="space-y-5 max-w-4xl mx-auto">
            {/* Header Details Hero */}
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end bg-[#1c1c1e] p-6 rounded-2xl border border-white/[0.06] shadow-sm">
              <div className="w-32 h-32 rounded-xl bg-[#232323] border border-white/[0.08] flex items-center justify-center shrink-0 shadow-md">
                {activePlaylist.id === 'favorites' ? (
                  <Heart className="w-14 h-14 text-[#fc3c44] fill-[#fc3c44]" />
                ) : (
                  <Disc className="w-14 h-14 text-zinc-600" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#fc3c44] font-semibold">
                  Playlist
                </span>
                {isEditingName ? (
                  <form onSubmit={handleSaveRename} className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      className="bg-[#232323] border border-white/[0.1] rounded px-3 py-1 text-lg font-bold text-white focus:outline-none focus:border-[#fc3c44]"
                    />
                    <button type="submit" className="p-1.5 text-green-400 hover:bg-white/[0.05] rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1.5 text-zinc-400 hover:bg-white/[0.05] rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-bold text-white tracking-tight truncate">
                      {activePlaylist.name}
                    </h1>
                    {activePlaylist.id !== 'favorites' && (
                      <button
                        onClick={() => {
                          setEditNameValue(activePlaylist.name);
                          setIsEditingName(true);
                        }}
                        className="text-zinc-500 hover:text-white p-1 rounded"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs font-mono text-zinc-400">
                  {activePlaylist.tracks.length} SONGS
                </p>

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    onClick={handlePlayAll}
                    disabled={activePlaylist.tracks.length === 0}
                    className="px-5 py-2 bg-[#fc3c44] hover:bg-[#e0343b] disabled:opacity-30 text-white font-medium text-xs rounded-full flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    <span>Play All</span>
                  </button>

                  <button
                    onClick={handleShuffleAll}
                    disabled={activePlaylist.tracks.length === 0}
                    className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30 text-zinc-200 text-xs rounded-full flex items-center gap-1.5 transition-colors border border-white/[0.08]"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Shuffle</span>
                  </button>

                  {activePlaylist.id !== 'favorites' && (
                    <button
                      onClick={handleDeletePlaylist}
                      className="p-2 text-zinc-500 hover:text-[#fc3c44] rounded-full hover:bg-white/[0.04] border border-white/[0.06]"
                      title="Delete this playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tracks List */}
            {activePlaylist.tracks.length === 0 ? (
              <div className="py-24 text-center text-zinc-500 font-mono text-sm">
                Playlist is empty. Search for tracks and add them here.
              </div>
            ) : (
              <div className="bg-[#1c1c1e] border border-white/[0.08] divide-y divide-white/[0.06] rounded-xl overflow-hidden shadow-sm">
                {activePlaylist.tracks.map((track, idx) => {
                  const isPlaying = track.videoId === currentPlayingId;
                  return (
                    <div
                      key={`${track.videoId}_${idx}`}
                      onClick={() => onPlayTrack(track, activePlaylist.tracks)}
                      className={`group flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.06] transition-colors cursor-pointer ${
                        isPlaying ? 'bg-white/[0.04]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div className="w-5 text-center font-mono text-xs shrink-0">
                          {isPlaying ? (
                            <Volume2 className="w-4 h-4 text-[#fc3c44] animate-pulse mx-auto" />
                          ) : (
                            <span className="text-zinc-500 group-hover:hidden">{idx + 1}</span>
                          )}
                          {!isPlaying && (
                            <Play className="w-3.5 h-3.5 text-zinc-300 fill-current hidden group-hover:block mx-auto" />
                          )}
                        </div>

                        <img
                          src={track.thumbnailUrl}
                          alt=""
                          className="w-12 h-12 rounded-md object-cover bg-zinc-900 shrink-0 border border-white/[0.06]"
                        />

                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${isPlaying ? 'text-[#fc3c44]' : 'text-zinc-200 group-hover:text-white'}`} title={track.title}>
                            {track.title}
                          </p>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{track.channelTitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleRemoveTrack(track.videoId, e)}
                          className="p-1.5 text-zinc-400 hover:text-[#fc3c44] rounded-md hover:bg-white/[0.08]"
                          title="Remove from playlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-600 font-mono">No playlist selected</div>
        )}
      </div>
    </div>
  );
};
