import { playerService } from './playerService';
import { playlistService } from './playlistService';
import { PlayerStatus } from '../models/types';



class MediaSessionService {
  private audioCtx: AudioContext | null = null;
  private isInitialized = false;
  private lastTrackId: string | null = null;

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Setup continuous Web Audio stream so Windows SMTC permanently hooks to our application
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
        const buffer = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate, this.audioCtx.sampleRate);
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gain = this.audioCtx.createGain();
        gain.gain.value = 0.0001; // virtually silent, but active stream to Windows WASAPI
        source.connect(gain);
        gain.connect(this.audioCtx.destination);
        source.start();
      }
    } catch (e) {
      console.warn('Could not initialize AudioContext SMTC keeper:', e);
    }

    // 2. Setup standard W3C Media Session API
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          playerService.play();
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          playerService.pause();
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
          playlistService.playNext();
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
          playlistService.playPrevious();
        });

        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            playerService.seekTo(details.seekTime);
          }
        });

        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skipTime = details.seekOffset || 10;
          const cur = playerService.getStatus().currentTime;
          playerService.seekTo(Math.max(0, cur - skipTime));
        });

        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skipTime = details.seekOffset || 10;
          const status = playerService.getStatus();
          playerService.seekTo(Math.min(status.duration, status.currentTime + skipTime));
        });

        navigator.mediaSession.setActionHandler('stop', () => {
          playerService.pause();
        });
      } catch (err) {
        console.warn('Error configuring mediaSession action handlers:', err);
      }
    }

    // 3. Setup webview media action bridge & Electron media shortcuts receiver
    playerService.onMediaAction = (action: string) => {
      switch (action) {
        case 'nextTrack':
          playlistService.playNext();
          break;
        case 'prevTrack':
          playlistService.playPrevious();
          break;
        case 'volumeUp':
          playerService.setVolume(playerService.getStatus().volume + 5);
          break;
        case 'volumeDown':
          playerService.setVolume(playerService.getStatus().volume - 5);
          break;
        case 'toggleMute':
          playerService.toggleMute();
          break;
        default:
          break;
      }
    };

    if (window.electronAPI?.onMediaControl) {
      window.electronAPI.onMediaControl((action: string) => {
        switch (action) {
          case 'togglePlayPause':
            playerService.togglePlayPause();
            break;
          case 'play':
            playerService.play();
            break;
          case 'pause':
            playerService.pause();
            break;
          case 'nextTrack':
            playlistService.playNext();
            break;
          case 'prevTrack':
            playlistService.playPrevious();
            break;
          case 'volumeUp':
            playerService.setVolume(playerService.getStatus().volume + 5);
            break;
          case 'volumeDown':
            playerService.setVolume(playerService.getStatus().volume - 5);
            break;
          case 'toggleMute':
            playerService.toggleMute();
            break;
          default:
            break;
        }
      });
    }

    // 4. Subscribe to player status updates to sync SMTC metadata & playback state
    playerService.subscribe((status: PlayerStatus) => {
      this.syncState(status);
    });

    // Initial sync
    this.syncState(playerService.getStatus());
  }

  private syncState(status: PlayerStatus): void {
    const isPlaying = status.isPlaying && !status.isBuffering;

    // Toggle active audio keeper to keep Windows SMTC session alive
    if (this.audioCtx) {
      if (isPlaying) {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      } else {
        if (this.audioCtx.state === 'running') {
          this.audioCtx.suspend().catch(() => {});
        }
      }
    }

    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      const track = status.currentTrack;
      if (track && track.videoId !== this.lastTrackId) {
        this.lastTrackId = track.videoId;

        const artworkList: MediaImage[] = [];
        if (track.thumbnailUrl) {
          artworkList.push(
            { src: track.thumbnailUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: track.thumbnailUrl, sizes: '128x128', type: 'image/jpeg' },
            { src: track.thumbnailUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: track.thumbnailUrl, sizes: '512x512', type: 'image/jpeg' }
          );
        }

        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || 'YouTube Music',
          artist: track.channelTitle || 'YouTube Music Desktop',
          album: 'YouTube Music Desktop',
          artwork: artworkList,
        });

        playerService.updateWebviewMetadata(track);
      }

      // Sync position state if available
      if ('setPositionState' in navigator.mediaSession && status.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(0, status.duration),
            playbackRate: 1.0,
            position: Math.max(0, Math.min(status.duration, status.currentTime)),
          });
        } catch {
          // Ignore invalid position edge cases
        }
      }
    } catch (err) {
      console.warn('Error updating MediaSession state:', err);
    }
  }
}

export const mediaSessionService = new MediaSessionService();
