import { Playlist, TrackReference, AppSettings } from '../models/types';

const SCHEMA_VERSION = '1.0.0';

const STORAGE_KEYS = {
  VERSION: 'ytm_schema_version',
  PLAYLISTS: 'ytm_playlists',
  HISTORY: 'ytm_history',
  SETTINGS: 'ytm_settings',
  QUEUE: 'ytm_queue',
  LAST_TRACK: 'ytm_last_track',
};

const DEFAULT_SETTINGS: AppSettings = {
  minimizeToTray: true,
  closeToTray: true,
  apiKey: import.meta.env.VITE_YOUTUBE_API_KEY || '',
  autoPlayNext: true,
  theme: 'dark',
  glassEffect: 'auto',
};

const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'favorites',
    name: 'Favorites',
    description: 'Your favorite tracks',
    tracks: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'chill-mix',
    name: 'Chill & Relax',
    description: 'Relaxing beats and melodies',
    tracks: [
      {
        videoId: 'jfKfPfyJRdk',
        title: 'lofi hip hop radio 📚 - beats to relax/study to',
        channelTitle: 'Lofi Girl',
        thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
        addedAt: Date.now(),
      },
      {
        videoId: '5qap5aO4i9A',
        title: 'lofi hip hop radio 💤 - beats to sleep/chill to',
        channelTitle: 'Lofi Girl',
        thumbnailUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
        addedAt: Date.now(),
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
];

export class LocalStorageManager {
  static init(): void {
    const currentVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    if (!currentVersion) {
      localStorage.setItem(STORAGE_KEYS.VERSION, SCHEMA_VERSION);
      if (!localStorage.getItem(STORAGE_KEYS.PLAYLISTS)) {
        this.savePlaylists(DEFAULT_PLAYLISTS);
      }
      if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        this.saveSettings(DEFAULT_SETTINGS);
      }
    }
  }

  static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }

  static getPlaylists(): Playlist[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (!data) return DEFAULT_PLAYLISTS;
      const parsed: Playlist[] = JSON.parse(data);
      return parsed.map(pl => {
        if (pl.id === 'favorites' && (pl.name === 'Bài hát yêu thích' || !pl.name)) {
          return { ...pl, name: 'Favorites', description: 'Your favorite tracks' };
        }
        return pl;
      });
    } catch {
      return DEFAULT_PLAYLISTS;
    }
  }

  static savePlaylists(playlists: Playlist[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    } catch (e) {
      console.error('Failed to save playlists to localStorage', e);
    }
  }

  private static historyListeners: Set<(history: TrackReference[]) => void> = new Set();

  static subscribeHistory(listener: (history: TrackReference[]) => void): () => void {
    this.historyListeners.add(listener);
    listener(this.getHistory());
    return () => {
      this.historyListeners.delete(listener);
    };
  }

  private static notifyHistory(): void {
    const history = this.getHistory();
    this.historyListeners.forEach(listener => {
      try {
        listener(history);
      } catch (err) {
        console.warn('Error in history listener:', err);
      }
    });
  }

  static getHistory(): TrackReference[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static addToHistory(track: TrackReference): void {
    try {
      let history = this.getHistory();
      // Remove track if it already exists to move it to the front
      history = history.filter(item => item.videoId !== track.videoId);
      history.unshift({ ...track, addedAt: Date.now() });
      // Keep up to 60 tracks
      if (history.length > 60) {
        history = history.slice(0, 60);
      }
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      this.notifyHistory();
    } catch (e) {
      console.error('Failed to save history', e);
    }
  }

  static clearHistory(): void {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    this.notifyHistory();
  }

  static getSavedQueue(): { queue: TrackReference[]; currentIndex: number } | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static saveQueue(queue: TrackReference[], currentIndex: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify({ queue, currentIndex }));
    } catch (e) {
      console.error('Failed to save queue', e);
    }
  }
}
