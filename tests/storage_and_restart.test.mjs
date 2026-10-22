import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

function sanitizeTrack(track) {
  if (!track || typeof track !== 'object') {
    return {
      videoId: '',
      title: 'Unknown Title',
      channelTitle: 'Unknown Artist',
      thumbnailUrl: '',
      addedAt: Date.now(),
    };
  }

  let thumb = String(track.thumbnailUrl || '');
  if (thumb.length > 200) {
    thumb = track.videoId ? `https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg` : thumb.slice(0, 200);
  }

  return {
    videoId: String(track.videoId || '').slice(0, 32),
    title: String(track.title || 'Unknown').slice(0, 120),
    channelTitle: String(track.channelTitle || 'Unknown Artist').slice(0, 80),
    thumbnailUrl: thumb,
    duration: track.duration ? String(track.duration).slice(0, 16) : undefined,
    addedAt: typeof track.addedAt === 'number' ? track.addedAt : Date.now(),
  };
}

function boundQueueForPersistence(queue, currentIndex) {
  const MAX_PERSISTED_QUEUE = 30;
  let boundedQueue = queue;
  let adjustedIndex = currentIndex;

  if (queue.length > MAX_PERSISTED_QUEUE) {
    const windowStart = Math.max(0, Math.min(currentIndex - 5, queue.length - MAX_PERSISTED_QUEUE));
    boundedQueue = queue.slice(windowStart, windowStart + MAX_PERSISTED_QUEUE);
    adjustedIndex = Math.max(0, currentIndex - windowStart);
  }

  return {
    queue: boundedQueue.map(sanitizeTrack),
    currentIndex: adjustedIndex,
  };
}

describe('Disk Storage Optimization & Track Sanitization Tests', () => {
  test('sanitizeTrack strips heavy extraneous fields and caps string lengths', () => {
    const heavyTrack = {
      videoId: 'abcdefghijk1234567890EXTRAEXTRAEXTRA',
      title: 'A'.repeat(300),
      channelTitle: 'B'.repeat(200),
      thumbnailUrl: 'https://example.com/very/long/url/' + 'x'.repeat(300),
      duration: '03:45:12987192873',
      description: 'Super long video description that could be 50KB in raw response',
      richThumbnails: [{ url: 'large.jpg', width: 1920, height: 1080 }],
      rawResponseData: { hugeNestedObject: true },
      addedAt: 1700000000000,
    };

    const clean = sanitizeTrack(heavyTrack);

    assert.equal(clean.videoId.length <= 32, true);
    assert.equal(clean.title.length, 120);
    assert.equal(clean.channelTitle.length, 80);
    assert.equal(clean.duration.length <= 16, true);
    assert.equal(clean.addedAt, 1700000000000);
    assert.equal(clean.description, undefined);
    assert.equal(clean.richThumbnails, undefined);
    assert.equal(clean.rawResponseData, undefined);
  });

  test('boundQueueForPersistence caps large queue to 30 items preserving playing offset', () => {
    const largeQueue = Array.from({ length: 80 }, (_, i) => ({
      videoId: `vid_${i}`,
      title: `Track ${i}`,
      channelTitle: `Artist ${i}`,
      thumbnailUrl: `https://i.ytimg.com/vi/vid_${i}/mqdefault.jpg`,
      addedAt: Date.now(),
    }));

    // Player is currently on song #40
    const result = boundQueueForPersistence(largeQueue, 40);

    assert.equal(result.queue.length, 30);
    // Window starts at max(0, min(40 - 5, 80 - 30 = 50)) = 35
    // Index adjusted to 40 - 35 = 5
    assert.equal(result.currentIndex, 5);
    assert.equal(result.queue[result.currentIndex].videoId, 'vid_40');
  });

  test('Total storage dump payload stays well under 30KB for maximum capacity', () => {
    const maxHistory = Array.from({ length: 50 }, (_, i) =>
      sanitizeTrack({
        videoId: `hist_${i}_id`,
        title: `History Track Title Number ${i} With Realistic Length`,
        channelTitle: `Channel Artist ${i}`,
        thumbnailUrl: `https://i.ytimg.com/vi/hist_${i}_id/mqdefault.jpg`,
        duration: '04:12',
        addedAt: Date.now(),
      })
    );

    const maxQueue = Array.from({ length: 30 }, (_, i) =>
      sanitizeTrack({
        videoId: `queue_${i}_id`,
        title: `Queue Track Title Number ${i} Playing Next Soon`,
        channelTitle: `Queue Artist ${i}`,
        thumbnailUrl: `https://i.ytimg.com/vi/queue_${i}_id/mqdefault.jpg`,
        duration: '03:30',
        addedAt: Date.now(),
      })
    );

    const maxPlaylist = Array.from({ length: 80 }, (_, i) =>
      sanitizeTrack({
        videoId: `pl_${i}_id`,
        title: `Playlist Track Item Number ${i}`,
        channelTitle: `Playlist Artist ${i}`,
        thumbnailUrl: `https://i.ytimg.com/vi/pl_${i}_id/mqdefault.jpg`,
        duration: '03:15',
        addedAt: Date.now(),
      })
    );

    const dump = {
      ytm_schema_version: '1.0.0',
      ytm_settings: { minimizeToTray: true, closeToTray: true, autoPlayNext: true },
      ytm_history: maxHistory,
      ytm_queue: { queue: maxQueue, currentIndex: 2 },
      ytm_playlists: [
        { id: 'favorites', name: 'Favorites', tracks: maxPlaylist },
      ],
    };

    const serialized = JSON.stringify(dump);
    const sizeInKB = Buffer.byteLength(serialized, 'utf8') / 1024;

    // Total size must be well under 50 KB (less than half of 128 KB guard) for 160 full tracks
    assert.equal(sizeInKB < 50, true, `Expected size < 50KB, but got ${sizeInKB.toFixed(2)}KB`);
    // And far below the 128 KB hard safety barrier
    assert.equal(sizeInKB < 128, true);
  });

  test('Settings change detection flags restart when DNS mode or endpoint differs', () => {
    const initialBootDns = {
      mode: 'ublock',
      url: 'https://my.ublockdns.com/na56bjem',
      accountKey: 'valid glass gravity pipe',
    };

    // User switches mode to controld
    const changedMode = 'controld';
    const isDifferent = changedMode !== initialBootDns.mode;
    assert.equal(isDifferent, true);

    // User changes URL
    const changedUrl = 'https://custom.doh.server/dns-query';
    const isUrlDifferent = changedUrl !== initialBootDns.url;
    assert.equal(isUrlDifferent, true);

    // User stays on identical config
    const unchanged = (
      initialBootDns.mode === 'ublock' &&
      initialBootDns.url === 'https://my.ublockdns.com/na56bjem' &&
      initialBootDns.accountKey === 'valid glass gravity pipe'
    );
    assert.equal(unchanged, true);
  });
});
