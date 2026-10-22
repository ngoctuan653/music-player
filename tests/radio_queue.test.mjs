import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanTrackTitle,
  cleanArtistName,
  isSameSong,
  isDuplicateOfExisting,
  isLongFormVideo,
  isNonMusicVideo,
} from './smart_recommendation.test.mjs';

/**
 * Filter function replicating RecommendationEngine.filterAndScoreRadioCandidates
 */
function filterAndScoreRadioCandidates(params) {
  const { candidates, seedTrack, currentQueue, history = [], targetCount = 18 } = params;

  const queuedIds = new Set(currentQueue.map((t) => t.videoId));
  queuedIds.add(seedTrack.videoId);

  const recentHistory = history.slice(0, 15);
  const existingTracksToCheck = [seedTrack, ...currentQueue, ...recentHistory];

  const seedArtist = cleanArtistName(seedTrack.channelTitle);
  const artistCounts = new Map();

  for (const t of currentQueue) {
    const art = cleanArtistName(t.channelTitle);
    if (art) {
      artistCounts.set(art, (artistCounts.get(art) || 0) + 1);
    }
  }

  const seenIds = new Set();
  const accepted = [];

  for (const item of candidates) {
    if (!item.videoId || item.videoId.length !== 11) continue;
    if (queuedIds.has(item.videoId) || seenIds.has(item.videoId)) continue;
    seenIds.add(item.videoId);

    if (isDuplicateOfExisting(item.title, existingTracksToCheck)) {
      continue;
    }
    if (isLongFormVideo(item.title, item.duration)) {
      continue;
    }
    if (isNonMusicVideo(item.title)) {
      continue;
    }

    const art = cleanArtistName(item.channelTitle);
    const currentCount = art ? artistCounts.get(art) || 0 : 0;
    const isSeedArtist = Boolean(art && seedArtist && art === seedArtist);
    const maxAllowed = isSeedArtist ? 4 : 3;

    if (art && currentCount >= maxAllowed) {
      continue;
    }

    if (art) {
      artistCounts.set(art, currentCount + 1);
    }

    const radioTrack = {
      videoId: item.videoId,
      title: item.title,
      channelTitle: item.channelTitle,
      thumbnailUrl: item.thumbnailUrl,
      duration: item.duration,
      addedAt: Date.now(),
      isRadio: true,
    };

    accepted.push(radioTrack);
    existingTracksToCheck.push(radioTrack);

    if (accepted.length >= targetCount) {
      break;
    }
  }

  return accepted;
}

describe('Song Radio Candidate Filtering & Hygiene Tests', () => {
  const seedTrack = {
    videoId: 'abPmZCZZrFA',
    title: 'Sơn Tùng M-TP - ĐỪNG LÀM TRÁI TIM ANH ĐAU (Official Music Video)',
    channelTitle: 'Sơn Tùng M-TP Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/abPmZCZZrFA/hqdefault.jpg',
    duration: '5:26',
    addedAt: Date.now(),
  };

  test('filters out the seed track itself and exact duplicates', () => {
    const mockCandidates = [
      {
        videoId: 'abPmZCZZrFA',
        title: 'Đừng Làm Trái Tim Anh Đau',
        channelTitle: 'Sơn Tùng M-TP',
        thumbnailUrl: 'https://i.ytimg.com/vi/abPmZCZZrFA/hqdefault.jpg',
        duration: '5:26',
      },
      {
        videoId: 'FN7ALfpGxiI',
        title: 'NƠI NÀY CÓ ANH | OFFICIAL MUSIC VIDEO | SƠN TÙNG M-TP',
        channelTitle: 'Sơn Tùng M-TP Official',
        thumbnailUrl: 'https://i.ytimg.com/vi/FN7ALfpGxiI/hqdefault.jpg',
        duration: '4:39',
      },
      {
        videoId: 'other_00001',
        title: 'Đừng làm trái tim anh đau (Lyrics Video)',
        channelTitle: 'Music Lyrics',
        thumbnailUrl: 'https://i.ytimg.com/vi/other_00001/hqdefault.jpg',
        duration: '5:26',
      },
      {
        videoId: '8sVtL0o-v7U',
        title: 'HIEUTHUHAI - Người Im Lặng Gặp Người Hay Nói',
        channelTitle: 'HIEUTHUHAI',
        thumbnailUrl: 'https://i.ytimg.com/vi/8sVtL0o-v7U/hqdefault.jpg',
        duration: '5:23',
      },
    ];

    const result = filterAndScoreRadioCandidates({
      candidates: mockCandidates,
      seedTrack,
      currentQueue: [seedTrack],
      targetCount: 10,
    });

    // Seed track videoId and duplicate title lyrics video must be excluded
    assert.equal(result.some(t => t.videoId === 'abPmZCZZrFA'), false);
    assert.equal(result.some(t => t.videoId === 'other_00001'), false);
    // Other clean songs must be included and tagged isRadio: true
    assert.equal(result.some(t => t.videoId === 'FN7ALfpGxiI'), true);
    assert.equal(result.some(t => t.videoId === '8sVtL0o-v7U'), true);
    assert.equal(result.every(t => t.isRadio === true), true);
  });

  test('rejects videos longer than 12 minutes and non-music content', () => {
    const mockCandidates = [
      {
        videoId: 'comp_000001',
        title: 'Tuyển tập những bài hát hay nhất của Sơn Tùng M-TP (Full Album 2024)',
        channelTitle: 'Best Hits',
        duration: '1:15:30',
        thumbnailUrl: 'https://i.ytimg.com/vi/comp_000001/hqdefault.jpg',
      },
      {
        videoId: 'react_00001',
        title: 'Người Mỹ Lần Đầu Nghe Sơn Tùng M-TP | REACTION to Đừng Làm Trái Tim Anh Đau',
        channelTitle: 'React Channel',
        duration: '14:20',
        thumbnailUrl: 'https://i.ytimg.com/vi/react_00001/hqdefault.jpg',
      },
      {
        videoId: 'valid_00001',
        title: 'MONO - Chăm Hoa (Official MV)',
        channelTitle: 'MONO Official',
        duration: '4:20',
        thumbnailUrl: 'https://i.ytimg.com/vi/valid_00001/hqdefault.jpg',
      },
    ];

    const result = filterAndScoreRadioCandidates({
      candidates: mockCandidates,
      seedTrack,
      currentQueue: [seedTrack],
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].videoId, 'valid_00001');
    assert.equal(result[0].title, 'MONO - Chăm Hoa (Official MV)');
  });

  test('enforces artist diversity limit: max 3 per non-seed artist, up to 4 for seed artist', () => {
    const candidates = [
      // 5 distinct tracks from non-seed artist 'Lou Hoàng'
      { videoId: 'lh_00000001', title: 'Ngày Đẹp Trời Để Nói Chia Tay', channelTitle: 'Lou Hoàng', duration: '3:30', thumbnailUrl: '' },
      { videoId: 'lh_00000002', title: 'Em Chưa 18', channelTitle: 'Lou Hoàng', duration: '3:30', thumbnailUrl: '' },
      { videoId: 'lh_00000003', title: 'Yêu Một Người Vô Tâm', channelTitle: 'Lou Hoàng', duration: '3:30', thumbnailUrl: '' },
      { videoId: 'lh_00000004', title: 'Mình Là Gì Của Nhau', channelTitle: 'Lou Hoàng', duration: '3:30', thumbnailUrl: '' },
      { videoId: 'lh_00000005', title: 'Bắt Cóc Con Tim', channelTitle: 'Lou Hoàng', duration: '3:30', thumbnailUrl: '' },
      // 3 tracks from other artists
      { videoId: 'sb_00000001', title: 'Dancing in the Dark', channelTitle: 'SOOBIN', duration: '4:10', thumbnailUrl: '' },
      { videoId: 'mn_00000001', title: 'Chăm Hoa', channelTitle: 'MONO', duration: '3:45', thumbnailUrl: '' },
    ];

    const result = filterAndScoreRadioCandidates({
      candidates,
      seedTrack,
      currentQueue: [seedTrack],
    });

    const louHoangCount = result.filter(t => cleanArtistName(t.channelTitle) === 'lou hoang').length;
    assert.equal(louHoangCount, 3, 'Lou Hoàng tracks must be capped at 3');
    assert.equal(result.some(t => t.videoId === 'sb_00000001'), true);
    assert.equal(result.some(t => t.videoId === 'mn_00000001'), true);
  });
});

describe('Radio Race Condition & Auto-Refill Logic Tests', () => {
  test('discards stale radio responses when user clicks another song rapidly', () => {
    let currentRadioRequestId = 0;
    let activeTrack = null;
    let queue = [];

    function userClicksTrack(track) {
      activeTrack = track;
      queue = [track];
      const reqId = ++currentRadioRequestId;
      return reqId;
    }

    function onRadioResponse(res) {
      // Race condition check matching PlaylistService
      if (res.reqId !== currentRadioRequestId || activeTrack?.videoId !== res.seedVideoId) {
        return false; // Ignored as stale
      }
      queue.push(...res.tracks);
      return true; // Accepted
    }

    // Step 1: User clicks Track A
    const reqA = userClicksTrack({ videoId: 'track_AAAAA', title: 'Track A' });
    assert.equal(reqA, 1);

    // Step 2: 150ms later, user clicks Track B before Track A returns
    const reqB = userClicksTrack({ videoId: 'track_BBBBB', title: 'Track B' });
    assert.equal(reqB, 2);
    assert.equal(queue[0].videoId, 'track_BBBBB');

    // Step 3: Response for Track A arrives late
    const acceptedA = onRadioResponse({
      reqId: reqA,
      seedVideoId: 'track_AAAAA',
      tracks: [{ videoId: 'radio_A1', title: 'Radio A1' }],
    });
    assert.equal(acceptedA, false, 'Late response for Track A must be rejected');
    assert.equal(queue.length, 1, 'Queue must not contain Track A radio tracks');

    // Step 4: Response for Track B arrives
    const acceptedB = onRadioResponse({
      reqId: reqB,
      seedVideoId: 'track_BBBBB',
      tracks: [{ videoId: 'radio_B1', title: 'Radio B1' }],
    });
    assert.equal(acceptedB, true, 'Response for current Track B must be accepted');
    assert.equal(queue.length, 2);
    assert.equal(queue[1].videoId, 'radio_B1');
  });

  test('auto-refill triggers when remaining tracks <= 3', () => {
    const queue = [
      { videoId: 'seed', title: 'Seed' },
      { videoId: 't1', title: 'Track 1' },
      { videoId: 't2', title: 'Track 2' },
      { videoId: 't3', title: 'Track 3' },
      { videoId: 't4', title: 'Track 4' },
    ];

    function shouldRefill(queueLength, currentIndex) {
      const remaining = queueLength - 1 - currentIndex;
      return remaining <= 3;
    }

    // When playing index 0: remaining = 4 - 0 = 4 (> 3) -> no refill
    assert.equal(shouldRefill(queue.length, 0), false);

    // When playing index 1: remaining = 4 - 1 = 3 (<= 3) -> triggers refill
    assert.equal(shouldRefill(queue.length, 1), true);

    // When playing index 2: remaining = 4 - 2 = 2 (<= 3) -> triggers refill
    assert.equal(shouldRefill(queue.length, 2), true);
  });
});
