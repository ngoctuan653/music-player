import React, { useEffect, useState } from 'react';
import { 
  Home, 
  Search, 
  ListMusic, 
  FolderHeart, 
  History, 
  Settings, 
  Plus, 
  Headphones,
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
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'search', label: 'Tìm kiếm', icon: Search },
    { id: 'queue', label: 'Hàng đợi phát', icon: ListMusic },
    { id: 'playlists', label: 'Danh sách phát', icon: FolderHeart },
    { id: 'history', label: 'Lịch sử nghe', icon: History },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-[#121212] flex flex-col h-full border-r border-[#222222] select-none text-sm">
      {/* Nav List */}
      <div className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as ActivePage)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-red-600/15 text-red-500 font-semibold'
                  : 'text-gray-300 hover:text-white hover:bg-[#1f1f1f]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-red-500' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mx-3 my-2 border-t border-[#262626]" />

      {/* Playlist Section Header */}
      <div className="px-4 py-2 flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
        <span>Playlist của bạn</span>
        <button
          onClick={onCreatePlaylistClick}
          className="p-1 hover:text-white hover:bg-[#222] rounded transition-colors"
          title="Tạo playlist mới"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Playlists List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {playlists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => {
              onNavigate('playlists');
              if (onSelectPlaylist) onSelectPlaylist(pl.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-gray-300 hover:text-white hover:bg-[#1a1a1a] transition-colors truncate text-xs"
          >
            {pl.id === 'favorites' ? (
              <Heart className="w-4 h-4 text-red-500 shrink-0 fill-red-500" />
            ) : (
              <Headphones className="w-4 h-4 text-gray-500 shrink-0" />
            )}
            <span className="truncate flex-1">{pl.name}</span>
            <span className="text-[10px] text-gray-500 shrink-0">{pl.tracks.length}</span>
          </button>
        ))}
      </div>

      {/* Bottom Info */}
      <div className="p-3 border-t border-[#222222] text-[11px] text-gray-500 flex items-center justify-between">
        <span>Windows Desktop</span>
        <span className="text-gray-600">v1.0.0</span>
      </div>
    </aside>
  );
};

