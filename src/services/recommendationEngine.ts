import { SearchResultItem, TrackReference } from '../models/types';
import { YouTubeSearchService } from './youtubeSearch';
import { RecommendationService } from './recommendationService';

/**
 * Advanced Title Normalizer
 * Cleans out video/channel wrappers, noisy keywords, punctuation, diacritics
 * to extract the pure musical track identity.
 */
export function cleanTrackTitle(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[đĐ]/g, 'd')           // handle Vietnamese đ
    .replace(/\([^)]*\)/g, ' ')       // remove (anything in parentheses)
    .replace(/\[[^\]]*\]/g, ' ')       // remove [anything in brackets]
    .replace(/\{[^}]*\}/g, ' ')       // remove {anything in braces}
    // Remove "Artist - Title" or "Channel | Title" prefix if present
    .replace(/^.+?\s*[-–—|:]\s*/, ' ')
    // Remove audio/video/marketing junk keywords
    .replace(/\b(official|music|video|mv|audio|lyrics?|lyric|visualizer|remastered?|hd|4k|1080p|full|prod|by|feat|ft|explicit|version|ver|live|acoustic|karaoke|beat|instrumental|cover|remix|speed\s*up|slowed|reverb|nhac\s*tre|hay\s*nhat|mv\s*official|official\s*mv|audio\s*official|official\s*audio|phim\s*ngan|ost|soundtrack)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Advanced Artist / Channel Name Normalizer
 */
export function cleanArtistName(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/\s*-\s*topic\s*$/i, '')
    .replace(/\b(official|records?|music|vevo|entertainment|channel|media|prod|production)\b/gi, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Checks if two tracks are basically the same song (duplicate titles, remixes, lyrics, live ver, etc.)
 */
export function isSameSong(titleA: string, titleB: string): boolean {
  const cA = cleanTrackTitle(titleA);
  const cB = cleanTrackTitle(titleB);
  if (!cA || !cB) return false;
  if (cA === cB) return true;

  // If one title contains the other and length is significant (>= 4 chars)
  if (cA.includes(cB) && cB.length >= 4) return true;
  if (cB.includes(cA) && cA.length >= 4) return true;

  // Word overlap comparison (Jaccard similarity on tokens > 2 chars)
  const wordsA = new Set(cA.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(cB.split(' ').filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  const minWords = Math.min(wordsA.size, wordsB.size);
  const ratio = overlap / minWords;

  // If >= 65% of significant words match, it's the same song
  return ratio >= 0.65;
}

/**
 * Check if candidate title duplicates any title in the given list of tracks
 */
export function isDuplicateOfExisting(
  candidateTitle: string,
  existingTracks: (TrackReference | SearchResultItem)[]
): boolean {
  for (const track of existingTracks) {
    if (track && track.title && isSameSong(candidateTitle, track.title)) {
      return true;
    }
  }
  return false;
}

/**
 * Detects if a video is unwanted long-form content (> 12 mins, full albums, nonstop, etc.)
 */
export function isLongFormVideo(title: string, duration?: string): boolean {
  const lower = title.toLowerCase();
  const markers = [
    'full album', 'playlist', 'discography', 'nonstop', 'tuyen tap',
    'lien khuc', 'podcast', 'audiobook', '1 hour', '10 hours',
    '2 hours', '3 hours', 'tap hop', 'tong hop'
  ];
  if (markers.some(m => lower.includes(m))) return true;

  if (duration && /^\d+:\d{2}(?::\d{2})?$/.test(duration)) {
    const parts = duration.split(':').map(Number);
    const seconds = parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + parts[1];
    return seconds > 12 * 60; // > 12 minutes
  }
  return false;
}

/**
 * Detects non-music videos (vlogs, reactions, memes, reviews, gameplay)
 */
export function isNonMusicVideo(title: string): boolean {
  const lower = title.toLowerCase();
  const nonMusicMarkers = [
    'reaction', 'reacts to', 'review', 'interview', 'trailer', 'teaser',
    'behind the scenes', 'hau truong', 'gameplay', 'walkthrough',
    'tutorial', 'huong dan', 'unboxing', 'vlog', 'prank', 'parody', 'che'
  ];
  return nonMusicMarkers.some(m => lower.includes(m));
}

export class RecommendationEngine {
  /**
   * Main intelligent next-track selector:
   * 1. Extracts context & strictly prevents duplicate titles
   * 2. Enforces artist diversity (breaks continuous same-artist loops)
   * 3. Pulls high-affinity recommendations from YouTube Watch Next, Radio mix, and Taste Profile
   * 4. Multi-factor scoring + weighted selection
   */
  static async getSmartNextTrack(params: {
    currentTrack: TrackReference;
    currentQueue: TrackReference[];
    history: TrackReference[];
  }): Promise<TrackReference | null> {
    const { currentTrack, currentQueue, history } = params;

    // 1. Gather recent videoIds to avoid repeating recently played songs
    const queuedIds = new Set(currentQueue.map(t => t.videoId));
    const recentHistory = history.slice(0, 25);
    const recentHistoryIds = new Set(recentHistory.map(t => t.videoId));

    // Combine recent tracks for duplicate title check
    const recentTracksToCheck: (TrackReference | SearchResultItem)[] = [
      currentTrack,
      ...currentQueue,
      ...recentHistory.slice(0, 15),
    ];

    // 2. Analyze recent artists to prevent artist repetition
    const recentArtists: string[] = [];
    const currentArtist = cleanArtistName(currentTrack.channelTitle);
    if (currentArtist) recentArtists.push(currentArtist);

    // Prior tracks in queue
    const queueBefore = currentQueue.slice(-3);
    for (const t of queueBefore) {
      const art = cleanArtistName(t.channelTitle);
      if (art) recentArtists.push(art);
    }
    // Also recent history
    for (const t of recentHistory.slice(0, 3)) {
      const art = cleanArtistName(t.channelTitle);
      if (art) recentArtists.push(art);
    }

    const sameArtistCount = recentArtists.filter(a => a === currentArtist).length;
    // If current artist has played 2 or more times recently, strictly break the loop!
    const mustSwitchArtist = sameArtistCount >= 2;

    // 3. User Taste Profile for intelligent cross-pollination
    const tasteProfile = RecommendationService.getTasteProfile();
    const favoriteArtists = tasteProfile.topArtists
      .map(a => cleanArtistName(a.name))
      .filter(a => a && a !== currentArtist && a !== 'youtube');

    // 4. Candidate Gathering (Multi-Strategy)
    const rawCandidates: SearchResultItem[] = [];

    // Strategy A: YouTube Watch Next (Up Next / Related videos)
    try {
      const related = await YouTubeSearchService.getRelatedTracks(currentTrack.videoId);
      rawCandidates.push(...related);
    } catch (e) {
      console.warn('Watch next query error:', e);
    }

    // Strategy B: Contextual discovery & smart radio mix
    if (rawCandidates.length < 8) {
      const cleanTitle = cleanTrackTitle(currentTrack.title);
      const queries: string[] = [];
      if (cleanTitle) {
        queries.push(`${cleanTitle} radio mix`);
      }
      if (favoriteArtists.length > 0) {
        const randomFav = favoriteArtists[Math.floor(Math.random() * favoriteArtists.length)];
        queries.push(`${randomFav} top songs official`);
      } else if (currentTrack.channelTitle) {
        queries.push(`${cleanArtistName(currentTrack.channelTitle)} similar songs radio`);
      }

      for (const q of queries.slice(0, 2)) {
        try {
          const direct = await YouTubeSearchService.searchDirect(q);
          rawCandidates.push(...direct);
        } catch {
          // ignore
        }
      }
    }

    // Strategy C: Curated fallback if needed
    if (rawCandidates.length === 0) {
      try {
        const trending = await YouTubeSearchService.getExploreTracks('trending');
        rawCandidates.push(...trending);
      } catch {
        rawCandidates.push(...YouTubeSearchService.getCuratedTracks());
      }
    }

    // 5. Filter & Deduplicate
    const seenCandidateIds = new Set<string>();
    const eligibleCandidates: { item: SearchResultItem; score: number }[] = [];

    for (const item of rawCandidates) {
      if (!item.videoId || seenCandidateIds.has(item.videoId)) continue;
      seenCandidateIds.add(item.videoId);

      // Hard filter: Cannot be currently playing or in current queue
      if (item.videoId === currentTrack.videoId || queuedIds.has(item.videoId)) {
        continue;
      }

      // Hard filter: Cannot have played in recent history
      if (recentHistoryIds.has(item.videoId)) {
        continue;
      }

      // Hard filter: Cannot have the same song title as any recent or queued song
      if (isDuplicateOfExisting(item.title, recentTracksToCheck)) {
        continue;
      }

      // Hard filter: No podcasts / long-form videos
      if (isLongFormVideo(item.title, item.duration)) {
        continue;
      }

      // Hard filter: No non-music videos
      if (isNonMusicVideo(item.title)) {
        continue;
      }

      // 6. Intelligent Scoring
      let score = 50;
      const candidateArtist = cleanArtistName(item.channelTitle);

      // ARTIST DIVERSITY RULES:
      if (candidateArtist && currentArtist) {
        if (candidateArtist === currentArtist) {
          if (mustSwitchArtist) {
            // Already played 2+ times, heavy penalty to break loop!
            score -= 40;
          } else {
            // Discourage same artist loop
            score -= 15;
          }
        } else {
          // Different artist! Big bonus for variety
          score += 25;

          // Extra bonus if candidate artist is one of user's favorite artists!
          if (favoriteArtists.includes(candidateArtist)) {
            score += 20;
          }
        }
      }

      // QUALITY & MUSIC METRICS:
      const lowerTitle = item.title.toLowerCase();
      if (lowerTitle.includes('official audio') || lowerTitle.includes('official music video')) {
        score += 10;
      } else if (lowerTitle.includes('audio') || lowerTitle.includes('video')) {
        score += 5;
      }

      if (item.channelTitle.toLowerCase().endsWith('- topic')) {
        score += 8;
      }

      eligibleCandidates.push({ item, score });
    }

    if (eligibleCandidates.length === 0) {
      // Graceful fallback: take first candidate not in queue or history
      for (const item of rawCandidates) {
        if (item.videoId !== currentTrack.videoId && !queuedIds.has(item.videoId)) {
          return {
            videoId: item.videoId,
            title: item.title,
            channelTitle: item.channelTitle,
            thumbnailUrl: item.thumbnailUrl,
            duration: item.duration,
            addedAt: Date.now(),
          };
        }
      }
      return null;
    }

    // Sort by descending score
    eligibleCandidates.sort((a, b) => b.score - a.score);

    // Pick among top 3 candidates (weighted slightly to #1) for natural musical serendipity
    const topCandidates = eligibleCandidates.slice(0, 3);
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)].item;

    return {
      videoId: chosen.videoId,
      title: chosen.title,
      channelTitle: chosen.channelTitle,
      thumbnailUrl: chosen.thumbnailUrl,
      duration: chosen.duration,
      addedAt: Date.now(),
    };
  }
}
