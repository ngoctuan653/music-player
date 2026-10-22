import { Playlist, TrackReference, QueueSourceInfo } from '../models/types';
import { LocalStorageManager } from '../storage/localStore';
import { playerService } from './playerService';
import { RecommendationEngine } from './recommendationEngine';

type QueueListener = (
  queue: TrackReference[],
  currentIndex: number,
  queueSource: QueueSourceInfo | null
) => void;
type PlaylistsListener = (playlists: Playlist[]) => void;

class PlaylistService {
  private queue: TrackReference[] = [];
  private currentIndex: number = -1;
  private queueSource: QueueSourceInfo | null = null;
  private currentRadioRequestId: number = 0;
  private isRefillingRadio: boolean = false;
  private playlists: Playlist[] = [];
  private queueListeners: Set<QueueListener> = new Set();
  private playlistsListeners: Set<PlaylistsListener> = new Set();

  constructor() {
    this.playlists = LocalStorageManager.getPlaylists();
    const saved = LocalStorageManager.getSavedQueue();
    if (saved && saved.queue && saved.queue.length > 0) {
      this.queue = saved.queue;
      this.currentIndex = Math.max(0, Math.min(saved.currentIndex, saved.queue.length - 1));
      this.queueSource = saved.queueSource || null;
    }

    // Set callback on player service when a track ends
    playerService.onTrackEndedCallback = () => {
      this.handleTrackEnded();
    };
  }

  // ---- Queue Operations ----

  public getQueue(): TrackReference[] {
    return [...this.queue];
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getQueueSource(): QueueSourceInfo | null {
    return this.queueSource;
  }

  public getCurrentTrack(): TrackReference | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex];
    }
    return null;
  }

  /**
   * Starts playback of the selected track and spins up an infinite, continuous Song Radio
   * populated with 15–20 same-vibe songs.
   * - Preserves any user-added manual tracks (isManual: true).
   * - Increments currentRadioRequestId to discard stale race-condition responses.
   * - Sets queueSource metadata for QueuePage UI.
   */
  public async playTrackWithRadio(track: TrackReference): Promise<void> {
    const seedTrack: TrackReference = { ...track, isRadio: false, isManual: false };

    // Capture upcoming manual queue items if user explicitly queued them
    const upcomingManualTracks = this.queue.filter(
      (t, idx) => idx > this.currentIndex && Boolean(t.isManual)
    );

    // Initial state: seed track playing now, followed by manual tracks
    this.queue = [seedTrack, ...upcomingManualTracks];
    this.currentIndex = 0;
    this.queueSource = {
      type: 'radio',
      seedTitle: seedTrack.title,
      seedVideoId: seedTrack.videoId,
    };

    this.persistQueue();
    this.notifyQueue();
    LocalStorageManager.addToHistory(seedTrack);
    playerService.playTrack(seedTrack);

    // Monotonic request counter for race-condition prevention
    const reqId = ++this.currentRadioRequestId;

    if (window.electronAPI?.fetchYouTubeRadio) {
      try {
        const res = await window.electronAPI.fetchYouTubeRadio({
          videoId: seedTrack.videoId,
          reqId,
        });

        // Strict race-condition check: discard if user has clicked another track
        if (
          res.reqId !== this.currentRadioRequestId ||
          this.getCurrentTrack()?.videoId !== seedTrack.videoId
        ) {
          return;
        }

        const history = LocalStorageManager.getHistory();
        const filteredRadio = RecommendationEngine.filterAndScoreRadioCandidates({
          candidates: res.tracks,
          seedTrack,
          currentQueue: this.queue,
          history,
          targetCount: 18,
        });

        if (filteredRadio.length > 0) {
          this.queue.push(...filteredRadio);
          this.persistQueue();
          this.notifyQueue();
        }
      } catch (err) {
        console.warn('Error fetching YouTube Radio in playTrackWithRadio:', err);
      }
    }
  }

  public playTrackNow(track: TrackReference, sourceList?: TrackReference[]): void {
    void sourceList;

    // When starting fresh or when queue is empty / not currently playing, start Song Radio
    if (this.queue.length === 0 || this.currentIndex === -1 || !this.getCurrentTrack()) {
      void this.playTrackWithRadio(track);
      return;
    }

    const existingIdx = this.queue.findIndex(t => t.videoId === track.videoId);
    if (existingIdx !== -1) {
      this.currentIndex = existingIdx;
    } else {
      this.queue.splice(this.currentIndex + 1, 0, track);
      this.currentIndex = this.currentIndex + 1;
    }

    this.persistQueue();
    this.notifyQueue();
    LocalStorageManager.addToHistory(track);
    playerService.playTrack(track);
    void this.checkAndRefillRadioQueue();
  }

  public enqueueNext(track: TrackReference): void {
    const manualTrack: TrackReference = { ...track, isManual: true, isRadio: false };
    if (this.queue.length === 0) {
      void this.playTrackWithRadio(manualTrack);
      return;
    }
    this.queue.splice(this.currentIndex + 1, 0, manualTrack);
    this.persistQueue();
    this.notifyQueue();
  }

  public enqueueEnd(track: TrackReference): void {
    const manualTrack: TrackReference = { ...track, isManual: true, isRadio: false };
    if (this.queue.length === 0) {
      void this.playTrackWithRadio(manualTrack);
      return;
    }
    this.queue.push(manualTrack);
    this.persistQueue();
    this.notifyQueue();
  }

  public removeFromQueue(index: number): void {
    if (index < 0 || index >= this.queue.length) return;
    
    this.queue.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      if (this.queue.length === 0) {
        this.currentIndex = -1;
      } else if (this.currentIndex >= this.queue.length) {
        this.currentIndex = this.queue.length - 1;
        playerService.playTrack(this.queue[this.currentIndex]);
      } else {
        playerService.playTrack(this.queue[this.currentIndex]);
      }
    }

    this.persistQueue();
    this.notifyQueue();
    void this.checkAndRefillRadioQueue();
  }

  public clearQueue(): void {
    this.queue = [];
    this.currentIndex = -1;
    this.queueSource = null;
    this.persistQueue();
    this.notifyQueue();
  }

  public playIndex(index: number): void {
    if (index >= 0 && index < this.queue.length) {
      this.currentIndex = index;
      const track = this.queue[this.currentIndex];
      LocalStorageManager.addToHistory(track);
      playerService.playTrack(track);
      this.persistQueue();
      this.notifyQueue();
      void this.checkAndRefillRadioQueue();
    }
  }

  public async playNext(): Promise<void> {
    if (this.queue.length === 0) return;

    const status = playerService.getStatus();
    if (status.isShuffled && this.queue.length > 1) {
      let nextIdx = Math.floor(Math.random() * this.queue.length);
      while (nextIdx === this.currentIndex) {
        nextIdx = Math.floor(Math.random() * this.queue.length);
      }
      this.playIndex(nextIdx);
      return;
    }

    if (this.currentIndex + 1 < this.queue.length) {
      this.playIndex(this.currentIndex + 1);
    } else if (status.repeatMode === 'all') {
      this.playIndex(0);
    } else {
      const settings = LocalStorageManager.getSettings();
      if (settings.autoPlayNext && this.queue.length > 0) {
        const current = this.getCurrentTrack();
        if (current) {
          const related = await this.findRelatedTrack(current);
          if (related) {
            this.queue.push(related);
            this.currentIndex = this.queue.length - 1;
            this.persistQueue();
            this.notifyQueue();
            LocalStorageManager.addToHistory(related);
            playerService.playTrack(related);
            void this.checkAndRefillRadioQueue();
          }
        }
      }
    }
  }

  /**
   * Auto-refill: When remaining radio tracks <= 3, fetch the next batch seamlessly
   * using the last track as seed. Ensures an infinite, never-ending song stream.
   */
  public async checkAndRefillRadioQueue(): Promise<void> {
    const settings = LocalStorageManager.getSettings();
    if (!settings.autoPlayNext) return;
    if (this.isRefillingRadio) return;

    const remaining = this.queue.length - 1 - this.currentIndex;
    if (remaining > 3) return;

    this.isRefillingRadio = true;
    try {
      const lastTrack = this.queue[this.queue.length - 1] || this.getCurrentTrack();
      if (!lastTrack) return;

      const reqId = ++this.currentRadioRequestId;
      if (window.electronAPI?.fetchYouTubeRadio) {
        const res = await window.electronAPI.fetchYouTubeRadio({
          videoId: lastTrack.videoId,
          reqId,
        });

        // Verify request is still relevant
        if (res.reqId !== this.currentRadioRequestId) {
          return;
        }

        const history = LocalStorageManager.getHistory();
        const nextBatch = RecommendationEngine.filterAndScoreRadioCandidates({
          candidates: res.tracks,
          seedTrack: lastTrack,
          currentQueue: this.queue,
          history,
          targetCount: 15,
        });

        if (nextBatch.length > 0) {
          this.queue.push(...nextBatch);
          this.persistQueue();
          this.notifyQueue();
        }
      }
    } catch (err) {
      console.warn('Radio auto-refill failed:', err);
    } finally {
      this.isRefillingRadio = false;
    }
  }

  private async findRelatedTrack(current: TrackReference): Promise<TrackReference | null> {
    try {
      const history = LocalStorageManager.getHistory();
      return await RecommendationEngine.getSmartNextTrack({
        currentTrack: current,
        currentQueue: this.queue,
        history,
      });
    } catch (error) {
      console.warn('Could not find smart related track:', error);
      return null;
    }
  }

  public playPrevious(): void {
    if (this.queue.length === 0) return;

    const status = playerService.getStatus();
    // If track has been playing for more than 4 seconds, restart current track
    if (status.currentTime > 4) {
      playerService.seekTo(0);
      return;
    }

    if (this.currentIndex - 1 >= 0) {
      this.playIndex(this.currentIndex - 1);
    } else {
      playerService.seekTo(0);
    }
  }

  private handleTrackEnded(): void {
    const status = playerService.getStatus();
    if (status.repeatMode === 'one' && this.currentIndex !== -1) {
      playerService.seekTo(0);
      playerService.play();
      return;
    }

    void this.playNext();
  }

  private persistQueue(): void {
    LocalStorageManager.saveQueue(this.queue, this.currentIndex, this.queueSource);
  }

  public subscribeQueue(listener: QueueListener): () => void {
    this.queueListeners.add(listener);
    listener(this.queue, this.currentIndex, this.queueSource);
    return () => {
      this.queueListeners.delete(listener);
    };
  }

  private notifyQueue(): void {
    this.queueListeners.forEach(listener =>
      listener(this.queue, this.currentIndex, this.queueSource)
    );
  }


  // ---- Playlist Operations ----

  public getPlaylists(): Playlist[] {
    return [...this.playlists];
  }

  public createPlaylist(name: string, description?: string): Playlist {
    const newPlaylist: Playlist = {
      id: 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim() || 'Playlist mới',
      description: description?.trim() || '',
      tracks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.playlists.push(newPlaylist);
    this.persistPlaylists();
    this.notifyPlaylists();
    return newPlaylist;
  }

  public renamePlaylist(id: string, newName: string): void {
    const pl = this.playlists.find(p => p.id === id);
    if (pl) {
      pl.name = newName.trim();
      pl.updatedAt = Date.now();
      this.persistPlaylists();
      this.notifyPlaylists();
    }
  }

  public deletePlaylist(id: string): void {
    if (id === 'favorites') return; // Cannot delete favorites
    this.playlists = this.playlists.filter(p => p.id !== id);
    this.persistPlaylists();
    this.notifyPlaylists();
  }

  public addTrackToPlaylist(playlistId: string, track: TrackReference): boolean {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (!pl) return false;

    // Avoid duplicates in the same playlist
    if (pl.tracks.some(t => t.videoId === track.videoId)) {
      return false;
    }

    pl.tracks.push({ ...track, addedAt: Date.now() });
    pl.updatedAt = Date.now();
    this.persistPlaylists();
    this.notifyPlaylists();
    return true;
  }

  public removeTrackFromPlaylist(playlistId: string, videoId: string): void {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (pl) {
      pl.tracks = pl.tracks.filter(t => t.videoId !== videoId);
      pl.updatedAt = Date.now();
      this.persistPlaylists();
      this.notifyPlaylists();
    }
  }

  public isFavorite(videoId: string): boolean {
    const favorites = this.playlists.find(p => p.id === 'favorites');
    return favorites ? favorites.tracks.some(t => t.videoId === videoId) : false;
  }

  public toggleFavorite(track: TrackReference): boolean {
    const favorites = this.playlists.find(p => p.id === 'favorites');
    if (!favorites) return false;

    const exists = favorites.tracks.some(t => t.videoId === track.videoId);
    if (exists) {
      favorites.tracks = favorites.tracks.filter(t => t.videoId !== track.videoId);
    } else {
      favorites.tracks.unshift({ ...track, addedAt: Date.now() });
    }
    favorites.updatedAt = Date.now();
    this.persistPlaylists();
    this.notifyPlaylists();
    return !exists;
  }

  private persistPlaylists(): void {
    LocalStorageManager.savePlaylists(this.playlists);
  }

  public subscribePlaylists(listener: PlaylistsListener): () => void {
    this.playlistsListeners.add(listener);
    listener(this.playlists);
    return () => {
      this.playlistsListeners.delete(listener);
    };
  }

  private notifyPlaylists(): void {
    this.playlistsListeners.forEach(listener => listener(this.playlists));
  }
}

export const playlistService = new PlaylistService();
