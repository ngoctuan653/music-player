import { SearchResultItem } from '../models/types';
import { LocalStorageManager } from '../storage/localStore';
import { YouTubeSearchService } from './youtubeSearch';

export interface UserTasteProfile {
  topArtists: { name: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  totalPlays: number;
  primaryArtist: string | null;
  primaryGenre: string | null;
}

export interface PersonalizedSection {
  title: string;
  reason: string;
  tracks: SearchResultItem[];
}

const COMMON_GENRE_KEYWORDS = [
  'lofi',
  'chill',
  'acoustic',
  'remix',
  'pop',
  'vpop',
  'ballad',
  'rock',
  'rap',
  'hip hop',
  'edm',
  'r&b',
  'indie',
  'piano',
  'jazz',
];

export class RecommendationService {
  private static cachedSection: PersonalizedSection | null = null;
  private static lastAnalyzedHistoryHash = '';

  /**
   * Analyzes local listening history to build a private, on-device taste profile.
   * Completely local - no Google account or external tracking required.
   */
  static getTasteProfile(): UserTasteProfile {
    const history = LocalStorageManager.getHistory();
    const artistCounts: Record<string, number> = {};
    const keywordCounts: Record<string, number> = {};

    for (const track of history) {
      // 1. Channel / Artist count
      const rawArtist = (track.channelTitle || '').replace(/\s*-\s*Topic$/i, '').trim();
      if (rawArtist && rawArtist !== 'YouTube') {
        artistCounts[rawArtist] = (artistCounts[rawArtist] || 0) + 1;
      }

      // 2. Keyword / Genre analysis from song title
      const titleLower = (track.title || '').toLowerCase();
      for (const genre of COMMON_GENRE_KEYWORDS) {
        if (titleLower.includes(genre)) {
          keywordCounts[genre] = (keywordCounts[genre] || 0) + 1;
        }
      }
    }

    const topArtists = Object.entries(artistCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topKeywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count);

    return {
      topArtists,
      topKeywords,
      totalPlays: history.length,
      primaryArtist: topArtists.length > 0 ? topArtists[0].name : null,
      primaryGenre: topKeywords.length > 0 ? topKeywords[0].keyword : null,
    };
  }

  /**
   * Generates dynamic, personalized music recommendations using on-device machine learning heuristics
   */
  static async getPersonalizedSection(): Promise<PersonalizedSection> {
    const history = LocalStorageManager.getHistory();
    const currentHash = history.slice(0, 5).map(t => t.videoId).join(',');

    if (this.cachedSection && this.lastAnalyzedHistoryHash === currentHash) {
      return this.cachedSection;
    }

    const profile = this.getTasteProfile();
    const playedVideoIds = new Set(history.map(t => t.videoId));

    // Case 1: User has listened to specific artists
    if (profile.primaryArtist && profile.primaryArtist !== 'YouTube') {
      const artist = profile.primaryArtist;
      const query = `${artist} music hits official`;
      try {
        const rawResults = await YouTubeSearchService.searchDirect(query);
        // Exclude songs the user already listened to recently
        const freshTracks = rawResults.filter(t => !playedVideoIds.has(t.videoId));
        const finalTracks = freshTracks.length >= 4 ? freshTracks : rawResults;

        this.cachedSection = {
          title: 'Made For You',
          reason: `Recommended based on your love for ${artist}`,
          tracks: finalTracks.slice(0, 10),
        };
        this.lastAnalyzedHistoryHash = currentHash;
        return this.cachedSection;
      } catch (err) {
        console.warn('Error fetching artist recommendations:', err);
      }
    }

    // Case 2: User has listened to specific genres (e.g., Lofi, Acoustic, Remix)
    if (profile.primaryGenre) {
      const genre = profile.primaryGenre;
      const query = `best ${genre} music songs 2026`;
      try {
        const rawResults = await YouTubeSearchService.searchDirect(query);
        const freshTracks = rawResults.filter(t => !playedVideoIds.has(t.videoId));
        const finalTracks = freshTracks.length >= 4 ? freshTracks : rawResults;

        this.cachedSection = {
          title: 'Made For You',
          reason: `Tailored to your favorite ${genre.toUpperCase()} vibe`,
          tracks: finalTracks.slice(0, 10),
        };
        this.lastAnalyzedHistoryHash = currentHash;
        return this.cachedSection;
      } catch (err) {
        console.warn('Error fetching genre recommendations:', err);
      }
    }

    // Case 3: Fresh start (no history yet) -> Default to curated trending hits
    try {
      const defaultTracks = await YouTubeSearchService.getExploreTracks('trending');
      this.cachedSection = {
        title: 'Made For You',
        reason: 'Start playing songs to personalize your recommendation engine',
        tracks: defaultTracks.slice(0, 10),
      };
      this.lastAnalyzedHistoryHash = currentHash;
      return this.cachedSection;
    } catch {
      return {
        title: 'Made For You',
        reason: 'Start listening to train your personal music taste',
        tracks: YouTubeSearchService.getCuratedTracks(),
      };
    }
  }
}
