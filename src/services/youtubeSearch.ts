import { SearchResultItem, CommentItem } from '../models/types';

/**
 * Filter out long-form continuous playlists, compilations, and podcasts.
 * Ensures Explore and recommendation feeds only contain genuine individual hit singles.
 */
export function isIndividualSong(item: SearchResultItem): boolean {
  // 1. Duration check
  if (item.duration) {
    // If format is H:MM:SS (e.g. 1:12:00, 2:34:09), reject immediately!
    if (/^\d+:\d{2}:\d{2}$/.test(item.duration)) {
      return false;
    }
    // Parse MM:SS
    const parts = item.duration.split(':').map(Number);
    if (parts.length === 2) {
      const totalSec = parts[0] * 60 + parts[1];
      // A standard music single is between 1 minute (60s) and 7 minutes (420s)
      if (totalSec > 7 * 60 || totalSec < 60) {
        return false;
      }
    }
  }

  // 2. Keyword blacklist check on title
  const lower = item.title.toLowerCase();
  const blacklist = [
    'top 100', 'top 50', 'top 40', 'top 30', 'top 20', 'top 10',
    'playlist', 'compilation', 'full album', 'album', 'nonstop',
    'tuyen tap', 'lien khuc', 'tong hop', 'tap hop', 'nhung bai hat hay nhat',
    'best songs of', 'greatest hits', 'discography', 'medley',
    '1 hour', '2 hour', '3 hour', '10 hour', '1 tieng', '2 tieng', '3 tieng',
    'mashup', 'mixtape', 'dj set', 'megamix', 'vol.', 'ranking'
  ];
  if (blacklist.some(b => lower.includes(b))) {
    return false;
  }

  return true;
}

export const BILLBOARD_HOT_100_TRACKS: SearchResultItem[] = [
  {
    videoId: 'ekr2nIex040',
    title: 'ROSÉ & Bruno Mars - APT. (Official Music Video)',
    channelTitle: 'ROSÉ',
    thumbnailUrl: 'https://i.ytimg.com/vi/ekr2nIex040/hqdefault.jpg',
    duration: '2:53',
  },
  {
    videoId: 'kPa7bsKwL-c',
    title: 'Lady Gaga, Bruno Mars - Die With A Smile (Official Music Video)',
    channelTitle: 'Lady Gaga',
    thumbnailUrl: 'https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg',
    duration: '4:12',
  },
  {
    videoId: 'eVli-tstM5E',
    title: 'Sabrina Carpenter - Espresso (Official Music Video)',
    channelTitle: 'Sabrina Carpenter',
    thumbnailUrl: 'https://i.ytimg.com/vi/eVli-tstM5E/hqdefault.jpg',
    duration: '3:20',
  },
  {
    videoId: 'V9PVRfjEBTI',
    title: 'Billie Eilish - BIRDS OF A FEATHER (Official Music Video)',
    channelTitle: 'Billie Eilish',
    thumbnailUrl: 'https://i.ytimg.com/vi/V9PVRfjEBTI/hqdefault.jpg',
    duration: '3:14',
  },
  {
    videoId: 'KEG7b851Ric',
    title: 'Sabrina Carpenter - Taste (Official Video)',
    channelTitle: 'Sabrina Carpenter',
    thumbnailUrl: 'https://i.ytimg.com/vi/KEG7b851Ric/hqdefault.jpg',
    duration: '2:37',
  },
  {
    videoId: 'Oa_RSwwpPaA',
    title: 'Benson Boone - Beautiful Things (Official Music Video)',
    channelTitle: 'Benson Boone',
    thumbnailUrl: 'https://i.ytimg.com/vi/Oa_RSwwpPaA/hqdefault.jpg',
    duration: '3:00',
  },
  {
    videoId: 'H58vbISgq4w',
    title: 'Kendrick Lamar - Not Like Us (Official Music Video)',
    channelTitle: 'Kendrick Lamar',
    thumbnailUrl: 'https://i.ytimg.com/vi/H58vbISgq4w/hqdefault.jpg',
    duration: '4:34',
  },
  {
    videoId: '4QIZE708gJ4',
    title: 'Post Malone ft. Morgan Wallen - I Had Some Help (Official Music Video)',
    channelTitle: 'Post Malone',
    thumbnailUrl: 'https://i.ytimg.com/vi/4QIZE708gJ4/hqdefault.jpg',
    duration: '2:58',
  },
  {
    videoId: '5EpyN_6dqyk',
    title: 'The Weeknd, Playboi Carti - Timeless (Official Music Video)',
    channelTitle: 'The Weeknd',
    thumbnailUrl: 'https://i.ytimg.com/vi/5EpyN_6dqyk/hqdefault.jpg',
    duration: '4:16',
  },
  {
    videoId: 'JGwWNGJdvx8',
    title: 'Ed Sheeran - Shape of You (Official Music Video)',
    channelTitle: 'Ed Sheeran',
    thumbnailUrl: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
    duration: '4:24',
  },
  {
    videoId: 'kJQP7kiw5Fk',
    title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
    channelTitle: 'Luis Fonsi',
    thumbnailUrl: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    duration: '4:42',
  },
  {
    videoId: 'kXYiU_JCYtU',
    title: 'Linkin Park - Numb (Official Music Video)',
    channelTitle: 'Linkin Park',
    thumbnailUrl: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg',
    duration: '3:07',
  },
];

export const BILLBOARD_VIETNAM_TRACKS: SearchResultItem[] = [
  {
    videoId: 'abPmZCZZrFA',
    title: 'Sơn Tùng M-TP - ĐỪNG LÀM TRÁI TIM ANH ĐAU (Official Music Video)',
    channelTitle: 'Sơn Tùng M-TP Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/abPmZCZZrFA/hqdefault.jpg',
    duration: '3:42',
  },
  {
    videoId: 'WyxZuea88L4',
    title: 'HIEUTHUHAI - TRÌNH (prod. by Kewtiie) - Official Music Video',
    channelTitle: 'HIEUTHUHAI',
    thumbnailUrl: 'https://i.ytimg.com/vi/WyxZuea88L4/hqdefault.jpg',
    duration: '3:15',
  },
  {
    videoId: 'h6RONxjPBf4',
    title: 'Vũ. x Dear Jane - Những Lời Hứa Bỏ Quên (Official Music Video)',
    channelTitle: 'Vũ. Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/h6RONxjPBf4/hqdefault.jpg',
    duration: '4:23',
  },
  {
    videoId: 'zoEtcR5EW08',
    title: 'Sơn Tùng M-TP - CHÚNG TA CỦA TƯƠNG LAI (Official Music Video)',
    channelTitle: 'Sơn Tùng M-TP Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/zoEtcR5EW08/hqdefault.jpg',
    duration: '3:36',
  },
  {
    videoId: 'zepHPnUDROE',
    title: 'Wren Evans - Từng Quen (Official Visualizer)',
    channelTitle: 'Wren Evans',
    thumbnailUrl: 'https://i.ytimg.com/vi/zepHPnUDROE/hqdefault.jpg',
    duration: '2:56',
  },
  {
    videoId: 'SeWt7IpZ0CA',
    title: 'SOOBIN - GIÁ NHƯ (Official Music Video)',
    channelTitle: 'SOOBIN Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/SeWt7IpZ0CA/hqdefault.jpg',
    duration: '3:45',
  },
  {
    videoId: '7ig2lXjozdw',
    title: 'Quang Hùng MasterD - Thuỷ Triều (Official Visualizer)',
    channelTitle: 'Quang Hùng MasterD',
    thumbnailUrl: 'https://i.ytimg.com/vi/7ig2lXjozdw/hqdefault.jpg',
    duration: '3:10',
  },
  {
    videoId: 'wvcSGGdnnII',
    title: 'GREY D, Chillies - đưa em về nhà (Official Music Video)',
    channelTitle: 'GREY D',
    thumbnailUrl: 'https://i.ytimg.com/vi/wvcSGGdnnII/hqdefault.jpg',
    duration: '3:30',
  },
  {
    videoId: 'Z1D26z9l8y8',
    title: 'Da LAB - Bầu Trời Mới (Official Music Video)',
    channelTitle: 'Da LAB Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/Z1D26z9l8y8/hqdefault.jpg',
    duration: '3:40',
  },
  {
    videoId: '0xAW6MAT_Wo',
    title: 'Lou Hoàng - Ngày Đẹp Trời Để Nói Chia Tay (Official Music Video)',
    channelTitle: 'Lou Hoàng Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/0xAW6MAT_Wo/hqdefault.jpg',
    duration: '4:05',
  },
  {
    videoId: 'h_1t3-6oWz4',
    title: 'Phan Mạnh Quỳnh - Sau Lời Từ Khước (OST MAI) - Official MV',
    channelTitle: 'Phan Mạnh Quỳnh Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/h_1t3-6oWz4/hqdefault.jpg',
    duration: '3:50',
  },
];

export const BILLBOARD_GLOBAL_TRACKS: SearchResultItem[] = [
  {
    videoId: 'ekr2nIex040',
    title: 'ROSÉ & Bruno Mars - APT. (Official Music Video)',
    channelTitle: 'ROSÉ',
    thumbnailUrl: 'https://i.ytimg.com/vi/ekr2nIex040/hqdefault.jpg',
    duration: '2:53',
  },
  {
    videoId: 'bB3-CUMERIU',
    title: 'JENNIE - Mantra (Official Music Video)',
    channelTitle: 'JENNIE',
    thumbnailUrl: 'https://i.ytimg.com/vi/bB3-CUMERIU/hqdefault.jpg',
    duration: '2:16',
  },
  {
    videoId: 'kPa7bsKwL-c',
    title: 'Lady Gaga, Bruno Mars - Die With A Smile (Official Music Video)',
    channelTitle: 'Lady Gaga',
    thumbnailUrl: 'https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg',
    duration: '4:12',
  },
  {
    videoId: 'iYWGRGiYdHU',
    title: 'LISA - Moonlit Floor (Official Video)',
    channelTitle: 'LLOUD Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/iYWGRGiYdHU/hqdefault.jpg',
    duration: '2:35',
  },
  {
    videoId: 'eVli-tstM5E',
    title: 'Sabrina Carpenter - Espresso (Official Music Video)',
    channelTitle: 'Sabrina Carpenter',
    thumbnailUrl: 'https://i.ytimg.com/vi/eVli-tstM5E/hqdefault.jpg',
    duration: '3:20',
  },
  {
    videoId: 'V9PVRfjEBTI',
    title: 'Billie Eilish - BIRDS OF A FEATHER (Official Music Video)',
    channelTitle: 'Billie Eilish',
    thumbnailUrl: 'https://i.ytimg.com/vi/V9PVRfjEBTI/hqdefault.jpg',
    duration: '3:14',
  },
  {
    videoId: 'phuiiNCxRMg',
    title: 'aespa - Supernova (Official Music Video)',
    channelTitle: 'SMTOWN',
    thumbnailUrl: 'https://i.ytimg.com/vi/phuiiNCxRMg/hqdefault.jpg',
    duration: '3:00',
  },
  {
    videoId: 'Oa_RSwwpPaA',
    title: 'Benson Boone - Beautiful Things (Official Music Video)',
    channelTitle: 'Benson Boone',
    thumbnailUrl: 'https://i.ytimg.com/vi/Oa_RSwwpPaA/hqdefault.jpg',
    duration: '3:00',
  },
  {
    videoId: 'H58vbISgq4w',
    title: 'Kendrick Lamar - Not Like Us (Official Music Video)',
    channelTitle: 'Kendrick Lamar',
    thumbnailUrl: 'https://i.ytimg.com/vi/H58vbISgq4w/hqdefault.jpg',
    duration: '4:34',
  },
  {
    videoId: 'Vk5-c_v4gMU',
    title: 'ILLIT - Magnetic (Official MV)',
    channelTitle: 'HYBE LABELS',
    thumbnailUrl: 'https://i.ytimg.com/vi/Vk5-c_v4gMU/hqdefault.jpg',
    duration: '2:40',
  },
  {
    videoId: '5EpyN_6dqyk',
    title: 'The Weeknd, Playboi Carti - Timeless (Official Music Video)',
    channelTitle: 'The Weeknd',
    thumbnailUrl: 'https://i.ytimg.com/vi/5EpyN_6dqyk/hqdefault.jpg',
    duration: '4:16',
  },
];

export const KPOP_HITS_TRACKS: SearchResultItem[] = [
  {
    videoId: 'ekr2nIex040',
    title: 'ROSÉ & Bruno Mars - APT. (Official Music Video)',
    channelTitle: 'ROSÉ',
    thumbnailUrl: 'https://i.ytimg.com/vi/ekr2nIex040/hqdefault.jpg',
    duration: '2:53',
  },
  {
    videoId: 'bB3-CUMERIU',
    title: 'JENNIE - Mantra (Official Music Video)',
    channelTitle: 'JENNIE',
    thumbnailUrl: 'https://i.ytimg.com/vi/bB3-CUMERIU/hqdefault.jpg',
    duration: '2:16',
  },
  {
    videoId: 'iYWGRGiYdHU',
    title: 'LISA - Moonlit Floor (Official Video)',
    channelTitle: 'LLOUD Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/iYWGRGiYdHU/hqdefault.jpg',
    duration: '2:35',
  },
  {
    videoId: 'phuiiNCxRMg',
    title: 'aespa - Supernova (Official Music Video)',
    channelTitle: 'SMTOWN',
    thumbnailUrl: 'https://i.ytimg.com/vi/phuiiNCxRMg/hqdefault.jpg',
    duration: '3:00',
  },
  {
    videoId: 'Q3K0TOvTOno',
    title: 'NewJeans - How Sweet (Official Music Video)',
    channelTitle: 'HYBE LABELS',
    thumbnailUrl: 'https://i.ytimg.com/vi/Q3K0TOvTOno/hqdefault.jpg',
    duration: '3:39',
  },
  {
    videoId: 'Vk5-c_v4gMU',
    title: 'ILLIT - Magnetic (Official MV)',
    channelTitle: 'HYBE LABELS',
    thumbnailUrl: 'https://i.ytimg.com/vi/Vk5-c_v4gMU/hqdefault.jpg',
    duration: '2:40',
  },
  {
    videoId: 'n6B5gQXlB-0',
    title: 'LE SSERAFIM - CRAZY (Official MV)',
    channelTitle: 'HYBE LABELS',
    thumbnailUrl: 'https://i.ytimg.com/vi/n6B5gQXlB-0/hqdefault.jpg',
    duration: '2:45',
  },
];

const CURATED_DEMO_TRACKS: SearchResultItem[] = BILLBOARD_HOT_100_TRACKS;

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
   * Generic extractor for all YouTube video renderers (search, watch-next, radio mix)
   */
  static extractVideosFromObject(data: any): SearchResultItem[] {
    const items: SearchResultItem[] = [];
    const seenIds = new Set<string>();

    function walk(node: any) {
      if (!node || typeof node !== 'object') return;

      const vr = node.compactVideoRenderer || node.videoRenderer || node.playlistPanelVideoRenderer;
      if (vr && vr.videoId && !seenIds.has(vr.videoId)) {
        seenIds.add(vr.videoId);
        const title = vr.title?.simpleText ||
          vr.title?.runs?.map((r: any) => r.text).join('') ||
          vr.title?.accessibility?.accessibilityData?.label || '';
        const channel = vr.shortBylineText?.runs?.[0]?.text ||
          vr.longBylineText?.runs?.[0]?.text ||
          vr.ownerText?.runs?.map((r: any) => r.text).join('') || 'YouTube';
        const thumbs = vr.thumbnail?.thumbnails || [];
        const thumbUrl = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
        const duration = vr.lengthText?.simpleText ||
          vr.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || '';

        if (title && vr.videoId.length === 11) {
          items.push({
            videoId: vr.videoId,
            title,
            channelTitle: channel,
            thumbnailUrl: thumbUrl.startsWith('//') ? 'https:' + thumbUrl : thumbUrl,
            duration: duration || undefined,
          });
        }
      }

      if (Array.isArray(node)) {
        for (const child of node) walk(child);
      } else {
        for (const key of Object.keys(node)) {
          if (key !== 'responseContext' && key !== 'trackingParams') {
            walk(node[key]);
          }
        }
      }
    }

    walk(data);
    return items;
  }

  /**
   * Parse YouTube HTML search results (Native zero-API-key search engine with Duration)
   */
  static parseYouTubeSearchResults(html: string): SearchResultItem[] {
    try {
      const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (!match) return [];
      const data = JSON.parse(match[1]);
      const extracted = this.extractVideosFromObject(data);
      if (extracted.length > 0) return extracted;

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
   * Parse YouTube Watch Next page HTML for related songs
   */
  static parseYouTubeWatchNext(html: string): SearchResultItem[] {
    try {
      const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (!match) return [];
      const data = JSON.parse(match[1]);
      return this.extractVideosFromObject(data);
    } catch (err) {
      console.warn('Error parsing YouTube watch next HTML:', err);
      return [];
    }
  }

  private static relatedCache: Map<string, SearchResultItem[]> = new Map();

  /**
   * Get related tracks directly from YouTube's Watch Next recommendation engine
   */
  static async getRelatedTracks(videoId: string): Promise<SearchResultItem[]> {
    if (this.relatedCache.has(videoId)) {
      return this.relatedCache.get(videoId)!;
    }
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    try {
      const res = await safeFetchText(watchUrl);
      if (res.ok && res.text) {
        const results = this.parseYouTubeWatchNext(res.text);
        if (results.length > 0) {
          this.relatedCache.set(videoId, results);
          return results;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch related tracks for video:', videoId, e);
    }
    return [];
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

  static async getMostPopular(apiKey: string, regionCode: string = 'US'): Promise<SearchResultItem[]> {
    if (!apiKey.trim()) return [];

    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      chart: 'mostPopular',
      videoCategoryId: '10',
      regionCode,
      maxResults: '25',
      key: apiKey.trim(),
    });

    const res = await safeFetchJson(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);
    if (!res.ok || !Array.isArray(res.data?.items)) return [];

    return res.data.items
      .map((item: any): SearchResultItem => ({
        videoId: item.id,
        title: item.snippet?.title || `YouTube Video (${item.id})`,
        channelTitle: item.snippet?.channelTitle || 'YouTube',
        thumbnailUrl: item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        duration: this.parseIsoDuration(item.contentDetails?.duration),
        publishedAt: item.snippet?.publishedAt,
      }))
      .filter(isIndividualSong);
  }

  private static parseIsoDuration(value?: string): string | undefined {
    if (!value) return undefined;
    const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!match) return undefined;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
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

  private static exploreCache: Map<string, SearchResultItem[]> = new Map();

  /**
   * Fetch authentic individual top hit tracks for Explore page categories
   * Guarantees NO 30-min / 1-hour / 2-hour long compilation playlists.
   */
  static async getExploreTracks(category: string = 'billboard_hot100', apiKey = ''): Promise<SearchResultItem[]> {
    if (this.exploreCache.has(category)) {
      return this.exploreCache.get(category)!;
    }

    let liveQuery = '';
    let regionCode = 'US';

    switch (category) {
      case 'billboard_vietnam':
      case 'vpop':
      case 'vpop_fresh':
        liveQuery = 'vpop official music video 2024';
        regionCode = 'VN';
        break;
      case 'billboard_global':
        liveQuery = 'global viral hits official music video';
        break;
      case 'kpop_hits':
        liveQuery = 'kpop official mv';
        regionCode = 'KR';
        break;
      case 'global_viral':
        liveQuery = 'viral songs official music video';
        break;
      case 'billboard_hot100':
      case 'trending':
      case 'tophits':
      default:
        liveQuery = 'official music video hits popular';
        break;
    }

    try {
      if (apiKey && (category === 'billboard_hot100' || category === 'billboard_global' || category === 'billboard_vietnam')) {
        const popular = await this.getMostPopular(apiKey, regionCode);
        if (popular.length > 0) {
          this.exploreCache.set(category, popular);
          return popular;
        }
      }

      const liveResults = await this.searchDirect(liveQuery);
      let validLive = liveResults.filter(item => isIndividualSong(item));

      // If primary query had too few singles, enrich with a secondary live query
      if (validLive.length < 6) {
        const fallbackQuery = category.includes('vpop') || category.includes('vietnam')
          ? 'nhac tre moi nhat official mv'
          : category.includes('kpop')
          ? 'kpop new official mv'
          : 'top hit songs official music video';
        const secondary = await this.searchDirect(fallbackQuery);
        const existingIds = new Set(validLive.map(t => t.videoId));
        for (const item of secondary) {
          if (isIndividualSong(item) && !existingIds.has(item.videoId)) {
            existingIds.add(item.videoId);
            validLive.push(item);
          }
        }
      }

      this.exploreCache.set(category, validLive);
      return validLive;
    } catch (error) {
      console.warn(`Failed to load live Explore data for ${category}:`, error);
      this.exploreCache.set(category, []);
      return [];
    }
  }

  static getCuratedTracks(): SearchResultItem[] {
    return BILLBOARD_HOT_100_TRACKS;
  }
}
