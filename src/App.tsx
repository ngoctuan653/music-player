import React, { useState, useEffect } from 'react';
import { ActivePage, TrackReference } from './models/types';
import { LocalStorageManager } from './storage/localStore';
import { playlistService } from './services/playlistService';
import { playerService } from './services/playerService';
import { TitleBar } from './components/TitleBar/TitleBar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { PlayerBar } from './components/PlayerBar/PlayerBar';
import { EmbeddedPlayer } from './components/EmbeddedPlayer/EmbeddedPlayer';
import { AddToPlaylistModal } from './components/PlaylistModal/AddToPlaylistModal';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { QueuePage } from './pages/QueuePage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isMiniVideoOpen, setIsMiniVideoOpen] = useState(false);
  const [modalTrack, setModalTrack] = useState<TrackReference | null>(null);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');

  useEffect(() => {
    LocalStorageManager.init();

    // Listen to media keys and system tray controls from Electron main process
    if (window.electronAPI?.onMediaControl) {
      const cleanup = window.electronAPI.onMediaControl((action: string) => {
        if (action === 'togglePlayPause') {
          playerService.togglePlayPause();
        } else if (action === 'nextTrack') {
          playlistService.playNext();
        } else if (action === 'prevTrack') {
          playlistService.playPrevious();
        }
      });
      return cleanup;
    }
  }, []);

  const handlePlayTrack = (track: TrackReference, sourceList?: TrackReference[]) => {
    playlistService.playTrackNow(track, sourceList);
  };

  const handleOpenAddToPlaylist = (track: TrackReference) => {
    setModalTrack(track);
  };

  const handleNavigateToSearch = (query: string = '') => {
    setSearchInitialQuery(query);
    setActivePage('search');
  };

  const handleSelectPlaylistFromSidebar = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    setActivePage('playlists');
  };

  const handleCreatePlaylistPrompt = () => {
    const name = prompt('Nhập tên danh sách phát mới:');
    if (name?.trim()) {
      const pl = playlistService.createPlaylist(name.trim());
      setSelectedPlaylistId(pl.id);
      setActivePage('playlists');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f0f0f] text-[#f1f1f1] select-none overflow-hidden font-sans">
      {/* Frameless Top Window Bar */}
      <TitleBar />

      {/* Main Body: Sidebar + Dynamic Page Content */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          activePage={activePage}
          onNavigate={(page) => {
            setActivePage(page);
            if (page !== 'playlists') setSelectedPlaylistId(null);
          }}
          onSelectPlaylist={handleSelectPlaylistFromSidebar}
          onCreatePlaylistClick={handleCreatePlaylistPrompt}
        />

        <main className="flex-1 overflow-y-auto bg-[#101010] relative">
          {activePage === 'home' && (
            <HomePage
              onPlayTrack={handlePlayTrack}
              onOpenAddToPlaylist={handleOpenAddToPlaylist}
              onNavigateToSearch={handleNavigateToSearch}
            />
          )}

          {activePage === 'search' && (
            <SearchPage
              onPlayTrack={handlePlayTrack}
              onOpenAddToPlaylist={handleOpenAddToPlaylist}
              initialQuery={searchInitialQuery}
              onNavigateToSettings={() => setActivePage('settings')}
            />
          )}

          {activePage === 'queue' && <QueuePage />}

          {activePage === 'playlists' && (
            <PlaylistsPage
              onPlayTrack={handlePlayTrack}
              selectedPlaylistId={selectedPlaylistId}
            />
          )}

          {activePage === 'history' && (
            <HistoryPage
              onPlayTrack={handlePlayTrack}
              onOpenAddToPlaylist={handleOpenAddToPlaylist}
            />
          )}

          {activePage === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Embedded YouTube Player (Singleton, never destroyed on route change) */}
      <EmbeddedPlayer
        isOpen={isMiniVideoOpen}
        onClose={() => setIsMiniVideoOpen(false)}
      />

      {/* Add To Playlist Dialog Modal */}
      {modalTrack && (
        <AddToPlaylistModal
          track={modalTrack}
          onClose={() => setModalTrack(null)}
        />
      )}

      {/* Bottom Sticky Player Bar */}
      <PlayerBar
        isMiniVideoOpen={isMiniVideoOpen}
        onToggleMiniVideo={() => setIsMiniVideoOpen(!isMiniVideoOpen)}
        onOpenQueue={() => setActivePage('queue')}
      />
    </div>
  );
};
