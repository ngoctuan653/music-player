import { SearchResultItem } from '../models/types';

// Curated demo tracks when offline or without API key
const CURATED_DEMO_TRACKS: SearchResultItem[] = [
  {
    videoId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio 📚 - beats to relax/study to',
    channelTitle: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
  },
  {
    videoId: '5qap5aO4i9A',
    title: 'lofi hip hop radio 💤 - beats to sleep/chill to',
    channelTitle: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
  },
  {
    videoId: 'DWcJFNfaw9c',
    title: 'synthwave radio 🌌 - beats to chill/game to',
    channelTitle: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg',
  },
  {
    videoId: 'kJQP7kiw5Fk',
    title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
    channelTitle: 'Luis Fonsi',
    thumbnailUrl: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
  },
  {
    videoId: 'JGwWNGJdvx8',
    title: 'Ed Sheeran - Shape of You (Official Music Video)',
    channelTitle: 'Ed Sheeran',
    thumbnailUrl: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
  },
  {
    videoId: 'kXYiU_JCYtU',
    title: 'Numb [Official Music Video] - Linkin Park',
    channelTitle: 'Linkin Park',
    thumbnailUrl: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg',
  },
  {
    videoId: 'YQHsXMglC9A',
    title: 'Adele - Hello (Official Music Video)',
    channelTitle: 'Adele',
    thumbnailUrl: 'https://i.ytimg.com/vi/YQHsXMglC9A/hqdefault.jpg',
  },
  {
    videoId: 'fJ9rUzIMcZQ',
    title: 'Queen – Bohemian Rhapsody (Official Video Remastered)',
    channelTitle: 'Queen Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
  }
];

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
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = await response.json();
        return {
          videoId,
          title: data.title || `YouTube Video (${videoId})`,
          channelTitle: data.author_name || 'YouTube',
          thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
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
   * Search YouTube videos via YouTube Data API v3 or curated fallback
   */
  static async search(query: string, apiKey?: string): Promise<{ items: SearchResultItem[]; error?: string }> {
    const q = query.trim();
    if (!q) {
      return { items: CURATED_DEMO_TRACKS };
    }

    // Check if user entered a direct YouTube URL or Video ID
    const extractedId = this.extractVideoId(q);
    if (extractedId) {
      const item = await this.fetchInfoViaOEmbed(extractedId);
      return { items: [item] };
    }

    // If API key is not provided, return filtered curated demo tracks with a hint
    if (!apiKey) {
      const filtered = CURATED_DEMO_TRACKS.filter(item => 
        item.title.toLowerCase().includes(q.toLowerCase()) || 
        item.channelTitle.toLowerCase().includes(q.toLowerCase())
      );
      
      return {
        items: filtered.length > 0 ? filtered : CURATED_DEMO_TRACKS,
        error: !apiKey 
          ? 'Chưa cấu hình YouTube API Key. Bạn có thể dán link YouTube bất kỳ để nghe ngay, hoặc vào Cài đặt để thêm API Key nhằm tìm kiếm mọi video.'
          : undefined,
      };
    }

    // Query official YouTube Data API v3
    try {
      const params = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        maxResults: '25',
        q: q,
        key: apiKey,
      });

      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 403) {
          return {
            items: CURATED_DEMO_TRACKS,
            error: 'YouTube API Key hết hạn mức (Quota Exceeded) hoặc không có quyền truy cập YouTube Data API v3.',
          };
        }
        if (response.status === 400) {
          return {
            items: CURATED_DEMO_TRACKS,
            error: 'YouTube API Key không hợp lệ. Vui lòng kiểm tra lại trong phần Cài đặt.',
          };
        }
        return {
          items: CURATED_DEMO_TRACKS,
          error: `Lỗi kết nối YouTube API (HTTP ${response.status}).`,
        };
      }

      const data = await response.json();
      const items: SearchResultItem[] = (data.items || []).map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        publishedAt: item.snippet.publishedAt,
      }));

      return { items };
    } catch (err: any) {
      return {
        items: CURATED_DEMO_TRACKS,
        error: `Không thể kết nối đến máy chủ YouTube: ${err.message || 'Lỗi mạng'}`,
      };
    }
  }

  static getCuratedTracks(): SearchResultItem[] {
    return CURATED_DEMO_TRACKS;
  }
}

