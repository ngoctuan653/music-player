import React, { useEffect, useState } from 'react';
import { 
  Compass, 
  Search, 
  ListMusic, 
  FolderHeart, 
  History, 
  Sliders, 
  Plus, 
  Disc,
  Heart
} from 'lucide-react';
import { ActivePage, Playlist } from '../../models/types';
import { playlistService } from '../../services/playlistService';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onSelectPlaylist?: (playlistId: string) => void;
  onCreatePlaylistClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  onSelectPlaylist,
  onCreatePlaylistClick,
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    return playlistService.subscribePlaylists((all) => {
      setPlaylists(all);
    });
  }, []);

  const navItems = [
    { id: 'home', label: 'Explore', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'queue', label: 'Queue', icon: ListMusic },
    { id: 'playlists', label: 'Playlists', icon: FolderHeart },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <aside className="w-[200px] bg-[#1c1c1e] flex flex-col h-full border-r border-white/[0.08] select-none text-xs shrink-0">
      {/* Library Section Header */}
      <div className="px-3 pt-3 pb-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
        Library
      </div>

      {/* Navigation */}
      <div className="px-2 py-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as ActivePage)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors text-left relative ${
                isActive
                  ? 'bg-white/[0.08] text-white font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-[#fc3c44] rounded-r" />
              )}
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#fc3c44]' : 'text-zinc-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mx-3 my-2 border-t border-white/[0.06]" />

      {/* Playlists Header */}
      <div className="px-3 py-1 flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
        <span>Playlists</span>
        <button
          onClick={onCreatePlaylistClick}
          className="p-0.5 text-zinc-500 hover:text-white rounded transition-colors"
          title="Create playlist"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Playlists items */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {playlists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => {
              onNavigate('playlists');
              if (onSelectPlaylist) onSelectPlaylist(pl.id);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors truncate text-[11px]"
          >
            {pl.id === 'favorites' ? (
              <Heart className="w-3.5 h-3.5 text-[#fc3c44] shrink-0 fill-[#fc3c44]" />
            ) : (
              <Disc className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            )}
            <span className="truncate flex-1">{pl.name}</span>
            <span className="text-[10px] font-mono text-zinc-600 shrink-0">{pl.tracks.length}</span>
          </button>
        ))}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 border-t border-white/[0.06] text-[10px] font-mono text-zinc-500 flex items-center justify-between">
        <span>Apple Music Theme</span>
        <span className="text-zinc-600 font-semibold">DARK</span>
      </div>
    </aside>
  );
};
