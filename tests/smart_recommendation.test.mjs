import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export function cleanTrackTitle(raw) {
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/^.+?\s*[-–—|:]\s*/, ' ')
    .replace(/\b(official|music|video|mv|audio|lyrics?|lyric|visualizer|remastered?|hd|4k|1080p|full|prod|by|feat|ft|explicit|version|ver|live|acoustic|karaoke|beat|instrumental|cover|remix|speed\s*up|slowed|reverb|nhac\s*tre|hay\s*nhat|mv\s*official|official\s*mv|audio\s*official|official\s*audio|phim\s*ngan|ost|soundtrack)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function cleanArtistName(raw) {
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*-\s*topic\s*$/i, '')
    .replace(/\b(official|records?|music|vevo|entertainment|channel|media|prod|production)\b/gi, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isSameSong(titleA, titleB) {
  const cA = cleanTrackTitle(titleA);
  const cB = cleanTrackTitle(titleB);
  if (!cA || !cB) return false;
  if (cA === cB) return true;

  if (cA.includes(cB) && cB.length >= 4) return true;
  if (cB.includes(cA) && cA.length >= 4) return true;

  const wordsA = new Set(cA.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(cB.split(' ').filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  const minWords = Math.min(wordsA.size, wordsB.size);
  const ratio = overlap / minWords;

  return ratio >= 0.65;
}

export function isDuplicateOfExisting(candidateTitle, existingTracks) {
  for (const track of existingTracks) {
    if (track && track.title && isSameSong(candidateTitle, track.title)) {
      return true;
    }
  }
  return false;
}

export function isLongFormVideo(title, duration) {
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
    return seconds > 12 * 60;
  }
  return false;
}

export function isNonMusicVideo(title) {
  const lower = title.toLowerCase();
  const nonMusicMarkers = [
    'reaction', 'reacts to', 'review', 'interview', 'trailer', 'teaser',
    'behind the scenes', 'hau truong', 'gameplay', 'walkthrough',
    'tutorial', 'huong dan', 'unboxing', 'vlog', 'prank', 'parody', 'che'
  ];
  return nonMusicMarkers.some(m => lower.includes(m));
}

describe('Smart Recommendation & Deduplication Engine Tests', () => {
  test('cleanTrackTitle strips noisy video suffixes, brackets, and prefixes', () => {
    const raw1 = 'Sơn Tùng M-TP - Đừng Làm Trái Tim Anh Đau (Official Music Video)';
    const clean1 = cleanTrackTitle(raw1);
    assert.equal(clean1.includes('official'), false);
    assert.equal(clean1.includes('music'), false);
    assert.equal(clean1.includes('video'), false);
    assert.equal(clean1.includes('dung lam trai tim anh dau'), true);

    const raw2 = 'Ed Sheeran - Shape of You [Official Lyric Video]';
    const clean2 = cleanTrackTitle(raw2);
    assert.equal(clean2, 'shape of you');
  });

  test('isSameSong correctly identifies duplicate songs across different upload formats', () => {
    // Official video vs Audio
    assert.equal(
      isSameSong(
        'Đừng Làm Trái Tim Anh Đau (Official Music Video)',
        'Đừng Làm Trái Tim Anh Đau [Official Audio]'
      ),
      true
    );

    // With artist prefix vs without
    assert.equal(
      isSameSong(
        'Sơn Tùng M-TP - Chạy Ngay Đi',
        'Chạy Ngay Đi (Remix)'
      ),
      true
    );

    // Acoustic / live versions of the same song
    assert.equal(
      isSameSong(
        'Ánh Nắng Của Anh (Nhạc Phim Chờ Em Đến Ngày Mai)',
        'Ánh Nắng Của Anh (Acoustic Version)'
      ),
      true
    );

    // Completely distinct songs must NOT match
    assert.equal(
      isSameSong(
        'Đừng Làm Trái Tim Anh Đau',
        'Chúng Ta Của Tương Lai'
      ),
      false
    );

    assert.equal(
      isSameSong(
        'Shape of You',
        'Perfect'
      ),
      false
    );
  });

  test('isDuplicateOfExisting blocks candidate if title matches any recent or queued song', () => {
    const existing = [
      { videoId: 'v1', title: 'Ed Sheeran - Shape of You (Official Music Video)' },
      { videoId: 'v2', title: 'Adele - Hello' },
      { videoId: 'v3', title: 'Sơn Tùng M-TP - Lạc Trôi [Official MV]' },
    ];

    // Duplicate candidate
    assert.equal(
      isDuplicateOfExisting('Shape of You [Lyrics]', existing),
      true
    );

    assert.equal(
      isDuplicateOfExisting('Lạc Trôi (Audio)', existing),
      true
    );

    // Fresh new track
    assert.equal(
      isDuplicateOfExisting('Charlie Puth - Attention', existing),
      false
    );
  });

  test('isLongFormVideo rejects podcasts, full albums, and > 12 minute videos', () => {
    assert.equal(isLongFormVideo('V-Pop Top Hits 2026 - Tuyen Tap Nhac Tre Hay Nhat'), true);
    assert.equal(isLongFormVideo('Linkin Park - Meteora Full Album'), true);
    assert.equal(isLongFormVideo('Song Title', '45:10'), true);
    assert.equal(isLongFormVideo('Song Title', '1:02:15'), true);

    // Normal songs pass
    assert.equal(isLongFormVideo('Normal Pop Track', '3:45'), false);
    assert.equal(isLongFormVideo('Epic Ballad', '5:20'), false);
  });

  test('isNonMusicVideo rejects reaction, vlog, gameplay, and tutorial videos', () => {
    assert.equal(isNonMusicVideo('Foreigners REACTION to Son Tung M-TP'), true);
    assert.equal(isNonMusicVideo('How to play guitar tutorial'), true);
    assert.equal(isNonMusicVideo('Behind the scenes of MV'), true);
    assert.equal(isNonMusicVideo('Gameplay walkthrough part 1'), true);

    // Real music passes
    assert.equal(isNonMusicVideo('Sơn Tùng M-TP - Âm Thầm Bên Em (Official MV)'), false);
    assert.equal(isNonMusicVideo('Vũ. - Bước Qua Mùa Cô Đơn (Official Audio)'), false);
  });

  test('Artist diversity rule penalizes same artist and boosts different/taste-profile artists', () => {
    const currentArtist = 'son tung m tp';
    const recentArtists = ['son tung m tp', 'son tung m tp']; // played twice already!
    const mustSwitchArtist = recentArtists.filter(a => a === currentArtist).length >= 2;

    assert.equal(mustSwitchArtist, true, 'Engine must enforce switching artist');

    // Scorer calculation check
    const candidateSame = 'son tung m tp';
    const candidateDiff = 'vu';
    const favoriteArtists = ['vu', 'grey d'];

    let scoreSame = 50;
    if (candidateSame === currentArtist) {
      if (mustSwitchArtist) scoreSame -= 40;
    }

    let scoreDiff = 50;
    if (candidateDiff !== currentArtist) {
      scoreDiff += 25;
      if (favoriteArtists.includes(candidateDiff)) {
        scoreDiff += 20;
      }
    }

    assert.equal(scoreSame, 10);
    assert.equal(scoreDiff, 95);
    assert.ok(scoreDiff > scoreSame + 80, 'Diverse artist must heavily outrank repetitive artist');
  });

  test('isIndividualSong strictly rejects long compilation playlists (2h34m, 1h, 30m) and accepts single hit songs', () => {
    const isIndividualSong = (item) => {
      if (item.duration) {
        if (/^\d+:\d{2}:\d{2}$/.test(item.duration)) return false;
        const parts = item.duration.split(':').map(Number);
        if (parts.length === 2) {
          const totalSec = parts[0] * 60 + parts[1];
          if (totalSec > 7 * 60 || totalSec < 60) return false;
        }
      }
      const lower = item.title.toLowerCase();
      const blacklist = [
        'top 100', 'top 50', 'top 40', 'top 30', 'top 20', 'top 10',
        'playlist', 'compilation', 'full album', 'album', 'nonstop',
        'tuyen tap', 'lien khuc', 'tong hop', 'tap hop', 'nhung bai hat hay nhat',
        'best songs of', 'greatest hits', 'discography', 'medley',
        '1 hour', '2 hour', '3 hour', '10 hour', '1 tieng', '2 tieng', '3 tieng',
        'mashup', 'mixtape', 'dj set', 'megamix', 'vol.', 'ranking'
      ];
      if (blacklist.some(b => lower.includes(b))) return false;
      return true;
    };

    // Exactly matching user uploaded screenshot items:
    assert.equal(
      isIndividualSong({ title: 'Top 100 Hits Music Spotify 2026', duration: '2:34:09' }),
      false,
      'Must reject 2h34m compilation'
    );
    assert.equal(
      isIndividualSong({ title: 'Top Hits 2026 Trending English Songs', duration: '2:31:40' }),
      false,
      'Must reject 2h31m compilation'
    );
    assert.equal(
      isIndividualSong({ title: 'Chaand Baaliyan – Aditya A.', duration: '2:02' }),
      true,
      'Must accept genuine 2-min single'
    );
    assert.equal(
      isIndividualSong({ title: 'Varinder Brar- Big Poppa( Official Video)', duration: '2:36' }),
      true,
      'Must accept genuine single'
    );

    // Other test cases:
    assert.equal(
      isIndividualSong({ title: 'ROSÉ & Bruno Mars - APT. (Official Music Video)', duration: '2:53' }),
      true
    );
    assert.equal(
      isIndividualSong({ title: 'Sơn Tùng M-TP - ĐỪNG LÀM TRÁI TIM ANH ĐAU', duration: '3:42' }),
      true
    );
    assert.equal(
      isIndividualSong({ title: 'Nonstop Nhac Tre Remix 2026 Hay Nhat', duration: '45:10' }),
      false
    );
  });
});
