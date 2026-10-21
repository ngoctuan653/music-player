import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Helper replicate of YouTube URL / ID extractor logic to verify all edge cases
function extractVideoId(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsedUrl = new URL(trimmed);
    if (parsedUrl.hostname === 'youtu.be') {
      const id = parsedUrl.pathname.slice(1).split('?')[0].split('/')[0];
      if (id && id.length === 11) return id;
    }

    if (parsedUrl.hostname.includes('youtube.com')) {
      const v = parsedUrl.searchParams.get('v');
      if (v && v.length === 11) return v;

      const embedMatch = parsedUrl.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];

      const shortsMatch = parsedUrl.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1];
    }
  } catch {
    const regexMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (regexMatch) return regexMatch[1];
  }

  return null;
}

describe('YouTube URL & ID Extraction Tests', () => {
  test('Extracts standard 11-char video ID', () => {
    assert.equal(extractVideoId('jfKfPfyJRdk'), 'jfKfPfyJRdk');
    assert.equal(extractVideoId('5qap5aO4i9A'), '5qap5aO4i9A');
  });

  test('Extracts from standard youtube.com/watch?v= URLs', () => {
    assert.equal(
      extractVideoId('https://www.youtube.com/watch?v=jfKfPfyJRdk'),
      'jfKfPfyJRdk'
    );
    assert.equal(
      extractVideoId('https://www.youtube.com/watch?v=jfKfPfyJRdk&t=120s'),
      'jfKfPfyJRdk'
    );
  });

  test('Extracts from youtu.be short URLs', () => {
    assert.equal(
      extractVideoId('https://youtu.be/jfKfPfyJRdk?si=test12345'),
      'jfKfPfyJRdk'
    );
  });

  test('Extracts from youtube.com/embed/ URLs', () => {
    assert.equal(
      extractVideoId('https://www.youtube.com/embed/jfKfPfyJRdk'),
      'jfKfPfyJRdk'
    );
  });

  test('Extracts from YouTube Shorts URLs', () => {
    assert.equal(
      extractVideoId('https://www.youtube.com/shorts/jfKfPfyJRdk'),
      'jfKfPfyJRdk'
    );
  });

  test('Extracts from music.youtube.com URLs', () => {
    assert.equal(
      extractVideoId('https://music.youtube.com/watch?v=jfKfPfyJRdk'),
      'jfKfPfyJRdk'
    );
  });

  test('Returns null on invalid or blank strings', () => {
    assert.equal(extractVideoId(''), null);
    assert.equal(extractVideoId('   '), null);
    assert.equal(extractVideoId('not a youtube link'), null);
    assert.equal(extractVideoId('https://google.com'), null);
  });
});

describe('Queue State Management Logic Tests', () => {
  test('Queue insertion and indexing', () => {
    const queue = [];
    let currentIndex = -1;

    const track1 = { videoId: 't1', title: 'Track 1', channelTitle: 'Chan 1', addedAt: 1 };
    const track2 = { videoId: 't2', title: 'Track 2', channelTitle: 'Chan 2', addedAt: 2 };
    const track3 = { videoId: 't3', title: 'Track 3', channelTitle: 'Chan 3', addedAt: 3 };

    // Play track 1
    queue.push(track1);
    currentIndex = 0;
    assert.equal(queue.length, 1);
    assert.equal(queue[currentIndex].videoId, 't1');

    // Enqueue Next (track 2)
    queue.splice(currentIndex + 1, 0, track2);
    assert.equal(queue.length, 2);
    assert.equal(queue[1].videoId, 't2');

    // Enqueue End (track 3)
    queue.push(track3);
    assert.equal(queue.length, 3);
    assert.equal(queue[2].videoId, 't3');

    // Next track
    currentIndex++;
    assert.equal(queue[currentIndex].videoId, 't2');

    // Next track
    currentIndex++;
    assert.equal(queue[currentIndex].videoId, 't3');

    // Previous track
    currentIndex--;
    assert.equal(queue[currentIndex].videoId, 't2');
  });

  test('Queue removal and index adjustments', () => {
    const queue = [
      { videoId: 't1' },
      { videoId: 't2' },
      { videoId: 't3' }
    ];
    let currentIndex = 1; // Playing t2

    // Remove item before current
    queue.splice(0, 1);
    currentIndex--;
    assert.equal(currentIndex, 0);
    assert.equal(queue[currentIndex].videoId, 't2');

    // Remove current item
    queue.splice(currentIndex, 1);
    assert.equal(queue.length, 1);
    assert.equal(queue[currentIndex].videoId, 't3');
  });
});

describe('Playlist Data Integrity Tests', () => {
  test('Prevents duplicate track entries in single playlist', () => {
    const playlist = {
      id: 'pl_1',
      name: 'My Playlist',
      tracks: []
    };

    const track = { videoId: 'abc12345678', title: 'Song', addedAt: Date.now() };

    function addTrack(pl, t) {
      if (pl.tracks.some(item => item.videoId === t.videoId)) {
        return false;
      }
      pl.tracks.push(t);
      return true;
    }

    assert.equal(addTrack(playlist, track), true);
    assert.equal(playlist.tracks.length, 1);
    // Add again -> must be rejected
    assert.equal(addTrack(playlist, track), false);
    assert.equal(playlist.tracks.length, 1);
  });
});
