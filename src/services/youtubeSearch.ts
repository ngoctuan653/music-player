import { SearchResultItem, CommentItem } from '../models/types';

// Curated demo tracks fallback when offline
const CURATED_DEMO_TRACKS: SearchResultItem[] = [
  {
    videoId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio 📚 - beats to relax/study to',
    channelTitle: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    duration: 'LIVE',
  },
  {
    videoId: '5qap5aO4i9A',
    title: 'lofi hip hop radio 💤 - beats to sleep/chill to',
    channelTitle: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    duration: 'LIVE',
  },
  {
    videoId: 'DWcJFNfaw9c',
    title: 'synthwave radio 🌌 - beats to chill/game to',
    channelTitle: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg',
    duration: 'LIVE',
  },
  {
    videoId: 'kJQP7kiw5Fk',
    title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
    channelTitle: 'Luis Fonsi',
    thumbnailUrl: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    duration: '4:42',
  },
  {
    videoId: 'JGwWNGJdvx8',
    title: 'Ed Sheeran - Shape of You (Official Music Video)',
    channelTitle: 'Ed Sheeran',
    thumbnailUrl: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
    duration: '4:24',
  },
  {
    videoId: 'kXYiU_JCYtU',
    title: 'Numb [Official Music Video] - Linkin Park',
    channelTitle: 'Linkin Park',
    thumbnailUrl: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg',
    duration: '3:07',
  },
  {
    videoId: 'YQHsXMglC9A',
    title: 'Adele - Hello (Official Music Video)',
    channelTitle: 'Adele',
    thumbnailUrl: 'https://i.ytimg.com/vi/YQHsXMglC9A/hqdefault.jpg',
    duration: '6:07',
  },
  {
    videoId: 'fJ9rUzIMcZQ',
    title: 'Queen – Bohemian Rhapsody (Official Video Remastered)',
    channelTitle: 'Queen Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    duration: '5:59',
  }
];

async function safeFetchText(url: string): Promise<{ ok: boolean; status: number; text?: string; error?: string }> {
  if (typeof window !== 'undefined' && window.electronAPI?.fetchNet) {
    try {
      const result = await window.electronAPI.fetchNet(url);
      if (result.ok && result.data) {
        return { ok: true, status: result.status, text: result.data };
      }
      return { ok: false, status: result.status, error: result.error || `HTTP ${result.status}` };
    } catch (e: any) {
      console.warn('Electron IPC fetchNet error, fallback to browser fetch', e);
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    const text = await res.text();
    return { ok: true, status: res.status, text };
  } catch (err: any) {
    return { ok: false, status: 500, error: err.message || 'Lỗi mạng' };
  }
}

async function safeFetchJson(url: string): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const textRes = await safeFetchText(url);
  if (!textRes.ok || !textRes.text) {
    return { ok: false, status: textRes.status, error: textRes.error };
  }
  try {
    const data = JSON.parse(textRes.text);
    return { ok: true, status: textRes.status, data };
  } catch {
    return { ok: false, status: 500, error: 'Không thể phân tích phản hồi JSON' };
  }
}

export class YouTubeSearchService {
  /**
   * Extract video ID from various YouTube URL formats or return valid 11-char ID
   */
  static extractVideoId(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Direct 11 character ID check (standard YouTube video ID)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    try {
      const parsedUrl = new URL(trimmed);
      
      // youtu.be/<id>
      if (parsedUrl.hostname === 'youtu.be') {
        const id = parsedUrl.pathname.slice(1).split('?')[0].split('/')[0];
        if (id && id.length === 11) return id;
      }

      // youtube.com / music.youtube.com / www.youtube.com
      if (parsedUrl.hostname.includes('youtube.com')) {
        // /watch?v=<id>
        const v = parsedUrl.searchParams.get('v');
        if (v && v.length === 11) return v;

        // /embed/<id>
        const embedMatch = parsedUrl.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
        if (embedMatch) return embedMatch[1];

        // /shorts/<id>
        const shortsMatch = parsedUrl.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
        if (shortsMatch) return shortsMatch[1];
      }
    } catch {
      // Not a full URL, fallback regex
      const regexMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (regexMatch) return regexMatch[1];
    }

    return null;
  }

  /**
   * Fetch video info via YouTube oEmbed (Free, no API key required)
   */
  static async fetchInfoViaOEmbed(videoId: string): Promise<SearchResultItem> {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    try {
      const res = await safeFetchJson(oembedUrl);
      if (res.ok && res.data) {
        return {
          videoId,
          title: res.data.title || `YouTube Video (${videoId})`,
          channelTitle: res.data.author_name || 'YouTube',
          thumbnailUrl: res.data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    } catch (e) {
      console.warn('oEmbed fetch error, fallback to default metadata', e);
    }

    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      channelTitle: 'YouTube',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  /**
   * Parse YouTube HTML search results (Native zero-API-key search engine with Duration)
   */
  static parseYouTubeSearchResults(html: string): SearchResultItem[] {
    try {
      const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (!match) return [];
      const data = JSON.parse(match[1]);
      const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const results: SearchResultItem[] = [];

      for (const section of sections) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const vr = item.videoRenderer;
          if (vr && vr.videoId) {
            const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.accessibility?.accessibilityData?.label || '';
            const channel = vr.ownerText?.runs?.map((r: any) => r.text).join('') || '';
            const thumbs = vr.thumbnail?.thumbnails || [];
            const thumbUrl = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
            const duration = vr.lengthText?.simpleText ||
              vr.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || '';

            results.push({
              videoId: vr.videoId,
              title: title || `YouTube Video (${vr.videoId})`,
              channelTitle: channel || 'YouTube',
              thumbnailUrl: thumbUrl.startsWith('//') ? 'https:' + thumbUrl : thumbUrl,
              duration: duration || undefined,
            });
          }
        }
      }
      return results;
    } catch (err) {
      console.warn('Error parsing YouTube HTML search results:', err);
      return [];
    }
  }

  /**
   * Search YouTube via Direct Web Search Engine (Free, instant, no key required)
   */
  static async searchDirect(query: string): Promise<SearchResultItem[]> {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await safeFetchText(searchUrl);
    if (res.ok && res.text) {
      const parsed = this.parseYouTubeSearchResults(res.text);
      if (parsed.length > 0) {
        return parsed;
      }
    }
    return [];
  }

  /**
   * Search YouTube: attempts YouTube Data API v3 if key provided,
   * otherwise automatically uses Direct YouTube Search Engine
   */
  static async search(query: string, apiKey?: string): Promise<{ items: SearchResultItem[]; error?: string; source?: 'api' | 'direct' }> {
    const q = query.trim();
    if (!q) {
      return { items: CURATED_DEMO_TRACKS, source: 'direct' };
    }

    // Check if user entered a direct YouTube URL or Video ID
    const extractedId = this.extractVideoId(q);
    if (extractedId) {
      const item = await this.fetchInfoViaOEmbed(extractedId);
      return { items: [item], source: 'direct' };
    }

    // If API key is provided and looks like a Google API key, try official API first
    if (apiKey && apiKey.trim().length > 10) {
      try {
        const params = new URLSearchParams({
          part: 'snippet',
          type: 'video',
          maxResults: '25',
          q: q,
          key: apiKey.trim(),
        });

        const res = await safeFetchJson(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
        
        if (res.ok && res.data?.items) {
          const items: SearchResultItem[] = res.data.items.map((item: any) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            publishedAt: item.snippet.publishedAt,
          }));
          return { items, source: 'api' };
        }
      } catch (err) {
        console.warn('YouTube Data API exception, falling back to Direct Search Engine:', err);
      }
    }

    // Direct YouTube Search (No API key needed)
    try {
      const directResults = await this.searchDirect(q);
      if (directResults.length > 0) {
        return {
          items: directResults,
          source: 'direct',
        };
      }
    } catch (e) {
      console.warn('Direct search engine error:', e);
    }

    // Curated fallback if offline or no results
    const filtered = CURATED_DEMO_TRACKS.filter(item => 
      item.title.toLowerCase().includes(q.toLowerCase()) || 
      item.channelTitle.toLowerCase().includes(q.toLowerCase())
    );

    return {
      items: filtered.length > 0 ? filtered : CURATED_DEMO_TRACKS,
      source: 'direct',
    };
  }

  /**
   * Fetch top comments for a YouTube video
   */
  static async fetchComments(videoId: string, apiKey?: string): Promise<CommentItem[]> {
    // 1. If user provided a YouTube Data API Key, try official commentThreads API
    if (apiKey && apiKey.trim().length > 10) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=30&key=${apiKey.trim()}`;
        const res = await safeFetchJson(url);
        if (res.ok && res.data?.items) {
          return res.data.items.map((item: any) => {
            const snip = item.snippet?.topLevelComment?.snippet;
            return {
              id: item.id,
              author: snip?.authorDisplayName || 'Người dùng YouTube',
              authorThumb: snip?.authorProfileImageUrl,
              content: snip?.textDisplay || snip?.textOriginal || '',
              publishedTime: snip?.publishedAt ? new Date(snip.publishedAt).toLocaleDateString('vi-VN') : '',
              likeCount: snip?.likeCount || 0,
            };
          });
        }
      } catch (err) {
        console.warn('Google API commentThreads error, falling back to Invidious...', err);
      }
    }

    // 2. Direct Invidious API fallback (Free, no key required)
    const instances = [
      `https://inv.nadeko.net/api/v1/comments/${videoId}`,
      `https://vid.puffyan.us/api/v1/comments/${videoId}`,
      `https://invidious.nerdvpn.de/api/v1/comments/${videoId}`,
    ];

    for (const instUrl of instances) {
      try {
        const res = await safeFetchJson(instUrl);
        if (res.ok && res.data?.comments) {
          return res.data.comments.map((c: any) => ({
            id: c.commentId || Math.random().toString(36),
            author: c.author || 'Người dùng YouTube',
            authorThumb: c.authorThumbnails?.[0]?.url,
            content: (c.contentHtml || c.content || '').replace(/<[^>]+>/g, ''),
            publishedTime: c.publishedText || '',
            likeCount: c.likeCount || 0,
          }));
        }
      } catch {
        // try next instance
      }
    }

    return [];
  }

  static getCuratedTracks(): SearchResultItem[] {
    return CURATED_DEMO_TRACKS;
  }
}
