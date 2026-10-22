import { Playlist, TrackReference, QueueSourceInfo } from '../models/types';
import { LocalStorageManager } from '../storage/localStore';
import { playerService } from './playerService';
import { RecommendationEngine, cleanArtistName } from './recommendationEngine';
import { RecommendationService } from './recommendationService';

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
  private shuffleHistory: number[] = [];
  private playedShuffleIndices: Set<number> = new Set();
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
    this.shuffleHistory = [];
    this.playedShuffleIndices = new Set([0]);
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
    this.shuffleHistory = this.shuffleHistory
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i));
    const nextPlayed = new Set<number>();
    for (const i of this.playedShuffleIndices) {
      if (i < index) nextPlayed.add(i);
      else if (i > index) nextPlayed.add(i - 1);
    }
    this.playedShuffleIndices = nextPlayed;

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
    this.shuffleHistory = [];
    this.playedShuffleIndices.clear();
    this.persistQueue();
    this.notifyQueue();
  }

  /**
   * Resets upcoming tracks in queue and generates a fresh new batch of radio recommendations
   * based on the current track (or if none, clears the queue).
   */
  public async regenerateQueue(): Promise<void> {
    const curTrack = this.getCurrentTrack();
    if (!curTrack) {
      this.clearQueue();
      return;
    }

    // Keep current track at index 0, clear everything else
    this.queue = [curTrack];
    this.currentIndex = 0;
    this.shuffleHistory = [];
    this.playedShuffleIndices = new Set([0]);
    this.queueSource = {
      type: 'radio',
      seedTitle: curTrack.title,
      seedVideoId: curTrack.videoId,
    };
    this.persistQueue();
    this.notifyQueue();

    const reqId = ++this.currentRadioRequestId;
    if (window.electronAPI?.fetchYouTubeRadio) {
      try {
        const res = await window.electronAPI.fetchYouTubeRadio({
          videoId: curTrack.videoId,
          reqId,
        });

        if (
          res.reqId !== this.currentRadioRequestId ||
          this.getCurrentTrack()?.videoId !== curTrack.videoId
        ) {
          return;
        }

        const history = LocalStorageManager.getHistory();
        const filteredRadio = RecommendationEngine.filterAndScoreRadioCandidates({
          candidates: res.tracks,
          seedTrack: curTrack,
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
        console.warn('Error regenerating radio queue:', err);
      }
    }
  }

  public playIndex(
    index: number,
    options?: { isShuffleNext?: boolean; isHistoryNavigation?: boolean }
  ): void {
    if (index >= 0 && index < this.queue.length) {
      const status = playerService.getStatus();

      // In shuffle mode, record manual jumps into history so Back can return
      if (
        status.isShuffled &&
        !options?.isShuffleNext &&
        !options?.isHistoryNavigation
      ) {
        if (this.currentIndex >= 0 && this.currentIndex !== index) {
          this.shuffleHistory.push(this.currentIndex);
          if (this.shuffleHistory.length > 100) this.shuffleHistory.shift();
        }
      }

      this.currentIndex = index;
      this.playedShuffleIndices.add(index);

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

    // SHUFFLE MODE: Smart non-repeating shuffle with taste & diversity scoring
    if (status.isShuffled && this.queue.length > 1) {
      // Record current track in history for Back button navigation
      if (this.currentIndex >= 0) {
        this.shuffleHistory.push(this.currentIndex);
        if (this.shuffleHistory.length > 100) {
          this.shuffleHistory.shift();
        }
        this.playedShuffleIndices.add(this.currentIndex);
      }

      // Filter unplayed candidates in the current queue
      let unplayedIndices = this.queue
        .map((_, i) => i)
        .filter((i) => i !== this.currentIndex && !this.playedShuffleIndices.has(i));

      // If all tracks in queue have been played, start a fresh cycle
      if (unplayedIndices.length === 0) {
        this.playedShuffleIndices.clear();
        if (this.currentIndex >= 0) {
          this.playedShuffleIndices.add(this.currentIndex);
        }
        unplayedIndices = this.queue
          .map((_, i) => i)
          .filter((i) => i !== this.currentIndex);

        // Auto-refill fresh songs if radio/autoPlayNext is enabled
        const settings = LocalStorageManager.getSettings();
        if (settings.autoPlayNext) {
          void this.checkAndRefillRadioQueue();
        }
      }

      if (unplayedIndices.length === 0) {
        playerService.seekTo(0);
        return;
      }

      // Prioritize manual queued tracks first
      const manualIdx = unplayedIndices.find((i) => Boolean(this.queue[i]?.isManual));
      if (manualIdx !== undefined) {
        this.playIndex(manualIdx, { isShuffleNext: true });
        return;
      }

      // Pick next song using smart recommendation scoring (artist diversity + taste profile)
      const chosenIdx = this.pickSmartShuffleIndex(unplayedIndices);
      this.playIndex(chosenIdx, { isShuffleNext: true });

      // If unplayed songs running low (<= 3), trigger seamless auto-refill
      const remainingUnplayed = unplayedIndices.length - 1;
      if (remainingUnplayed <= 3) {
        void this.checkAndRefillRadioQueue();
      }
      return;
    }

    // SEQUENTIAL MODE (Shuffle OFF)
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
   * Smart Shuffle Recommendation Selector:
   * Scores unplayed candidates to ensure artist balance, match user taste,
   * and avoid repeating consecutive artists while preserving serendipity.
   */
  private pickSmartShuffleIndex(candidates: number[]): number {
    if (candidates.length === 0) return 0;
    if (candidates.length === 1) return candidates[0];

    const curTrack = this.getCurrentTrack();
    const curArtist = cleanArtistName(curTrack?.channelTitle || '');

    // Collect artists from the last 3 played tracks to prevent clustering
    const recentArtists = new Set<string>();
    const historySample = this.shuffleHistory.slice(-3);
    for (const idx of historySample) {
      if (idx >= 0 && idx < this.queue.length) {
        const art = cleanArtistName(this.queue[idx]?.channelTitle || '');
        if (art) recentArtists.add(art);
      }
    }

    const taste = RecommendationService.getTasteProfile();
    const favArtists = new Set(taste.topArtists.map((a: { name: string }) => cleanArtistName(a.name)));
    const favGenres = taste.topKeywords.map((g: { keyword: string }) => g.keyword.toLowerCase());

    const scored = candidates.map((idx) => {
      const track = this.queue[idx];
      let score = 50;
      const artist = cleanArtistName(track?.channelTitle || '');
      const titleLower = (track?.title || '').toLowerCase();

      // 1. Artist diversity: penalize repeating the same artist consecutively
      if (artist && curArtist) {
        if (artist === curArtist) {
          score -= 35;
        } else if (recentArtists.has(artist)) {
          score -= 15;
        } else {
          score += 20;
        }
      }

      // 2. Taste profile affinity: favor user's favorite artists & genres
      if (artist && favArtists.has(artist)) {
        score += 25;
      }
      for (const g of favGenres) {
        if (titleLower.includes(g)) {
          score += 15;
          break;
        }
      }

      // 3. Controlled serendipity factor (+0 to +20) for organic, refreshing variety
      score += Math.random() * 20;

      return { idx, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Pick among the top candidates (up to top 3)
    const topPool = scored.slice(0, Math.min(3, scored.length));
    const selected = topPool[Math.floor(Math.random() * topPool.length)];
    return selected.idx;
  }

  /**
   * Auto-refill: When remaining radio tracks <= 3 (or unplayed shuffle tracks <= 3),
   * fetches the next batch seamlessly. Ensures an infinite, never-ending song stream.
   */
  public async checkAndRefillRadioQueue(): Promise<void> {
    const settings = LocalStorageManager.getSettings();
    if (!settings.autoPlayNext) return;
    if (this.isRefillingRadio) return;

    const status = playerService.getStatus();
    let remaining = this.queue.length - 1 - this.currentIndex;

    if (status.isShuffled) {
      const unplayedCount = this.queue.filter(
        (_, idx) => !this.playedShuffleIndices.has(idx) && idx !== this.currentIndex
      ).length;
      remaining = unplayedCount;
    }

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
        } else {
          // Fallback to RecommendationEngine smart related track
          const current = this.getCurrentTrack();
          if (current) {
            const smartTrack = await this.findRelatedTrack(current);
            if (smartTrack && !this.queue.some((t) => t.videoId === smartTrack.videoId)) {
              this.queue.push(smartTrack);
              this.persistQueue();
              this.notifyQueue();
            }
          }
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
    // If track has been playing for more than 4 seconds, restart current track (industry standard)
    if (status.currentTime > 4) {
      playerService.seekTo(0);
      return;
    }

    // In SHUFFLE MODE: accurately navigate back through previously played tracks
    if (status.isShuffled && this.shuffleHistory.length > 0) {
      let prevIdx = this.shuffleHistory.pop();
      // Skip invalid indices or if it matches current
      while (
        prevIdx !== undefined &&
        (prevIdx < 0 || prevIdx >= this.queue.length || prevIdx === this.currentIndex)
      ) {
        prevIdx = this.shuffleHistory.pop();
      }

      if (prevIdx !== undefined && prevIdx >= 0 && prevIdx < this.queue.length) {
        this.playIndex(prevIdx, { isHistoryNavigation: true });
        return;
      }
    }

    // Normal sequential previous
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
