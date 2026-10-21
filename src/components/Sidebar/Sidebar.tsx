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
    { id: 'home', label: 'Khám phá', icon: Compass },
    { id: 'search', label: 'Tìm kiếm', icon: Search },
    { id: 'queue', label: 'Hàng đợi', icon: ListMusic },
    { id: 'playlists', label: 'Danh sách phát', icon: FolderHeart },
    { id: 'history', label: 'Lịch sử', icon: History },
    { id: 'settings', label: 'Cài đặt', icon: Sliders },
  ];

  return (
    <aside className="w-48 bg-[#0c0c0f] flex flex-col h-full border-r border-white/[0.06] select-none text-xs shrink-0">
      {/* Navigation */}
      <div className="p-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as ActivePage)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded transition-all text-left relative ${
                isActive
                  ? 'bg-white/[0.06] text-white font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-red-500 rounded-r" />
              )}
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-400' : 'text-zinc-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mx-2 my-1 border-t border-white/[0.05]" />

      {/* Playlists Header */}
      <div className="px-3 py-1 flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
        <span>Playlists</span>
        <button
          onClick={onCreatePlaylistClick}
          className="p-0.5 hover:text-white rounded transition-colors"
          title="Tạo playlist"
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
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-colors truncate text-[11px]"
          >
            {pl.id === 'favorites' ? (
              <Heart className="w-3.5 h-3.5 text-red-500 shrink-0 fill-red-500/80" />
            ) : (
              <Disc className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            )}
            <span className="truncate flex-1">{pl.name}</span>
            <span className="text-[10px] font-mono text-zinc-600 shrink-0">{pl.tracks.length}</span>
          </button>
        ))}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 border-t border-white/[0.05] text-[10px] font-mono text-zinc-600 flex items-center justify-between">
        <span>HI-FI BUS</span>
        <span className="text-zinc-700">v1.1</span>
      </div>
    </aside>
  );
};
