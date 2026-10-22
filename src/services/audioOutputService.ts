const SINK_STORAGE_KEY = 'ytm_preferred_audio_sink';

export type AudioDeviceListener = (devices: MediaDeviceInfo[], activeDeviceId: string) => void;

class AudioOutputService {
  private devices: MediaDeviceInfo[] = [];
  private activeDeviceId: string = 'default';
  private listeners: Set<AudioDeviceListener> = new Set();
  private isInitialized: boolean = false;

  constructor() {
    this.activeDeviceId = localStorage.getItem(SINK_STORAGE_KEY) || 'default';
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      await this.refreshDevices();

      // Listen for plug/unplug of speakers, headphones, DACs
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        await this.refreshDevices();
      });
    }
  }

  public async refreshDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      // First try enumerating devices
      let allDevices = await navigator.mediaDevices.enumerateDevices();
      let outputs = allDevices.filter(d => d.kind === 'audiooutput');

      // If device labels are empty (happens before initial media permission in Chromium)
      if (outputs.length > 0 && !outputs.some(d => d.label)) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop tracks immediately after getting labels permission
          stream.getTracks().forEach(t => t.stop());
          allDevices = await navigator.mediaDevices.enumerateDevices();
          outputs = allDevices.filter(d => d.kind === 'audiooutput');
        } catch {
          // If mic permission rejected, continue with available device IDs
        }
      }

      this.devices = outputs;

      // Ensure activeDeviceId exists or fallback to default
      if (this.activeDeviceId !== 'default' && !this.devices.some(d => d.deviceId === this.activeDeviceId)) {
        this.activeDeviceId = 'default';
        localStorage.setItem(SINK_STORAGE_KEY, 'default');
      }

      this.notify();
      return this.devices;
    } catch (e) {
      console.warn('Could not enumerate audio output devices:', e);
      return [];
    }
  }

  public getDevices(): MediaDeviceInfo[] {
    return [...this.devices];
  }

  public getActiveDeviceId(): string {
    return this.activeDeviceId;
  }

  public getActiveDeviceLabel(): string {
    if (this.activeDeviceId === 'default') {
      const defaultDev = this.devices.find(d => d.deviceId === 'default');
      return defaultDev?.label || 'Loa mặc định (System)';
    }
    const dev = this.devices.find(d => d.deviceId === this.activeDeviceId);
    return dev?.label || 'Loa hệ thống';
  }

  public async setOutputDevice(deviceId: string): Promise<boolean> {
    this.activeDeviceId = deviceId;
    localStorage.setItem(SINK_STORAGE_KEY, deviceId);
    this.notify();

    await this.applySinkToAllMedia(deviceId);
    return true;
  }

  public async applySinkToAllMedia(targetDeviceId?: string): Promise<void> {
    const sinkId = targetDeviceId || this.activeDeviceId;

    // Apply to DOM audio and video elements
    const mediaElements = Array.from(document.querySelectorAll<HTMLMediaElement>('video, audio'));
    for (const el of mediaElements) {
      if (typeof (el as any).setSinkId === 'function') {
        try {
          await (el as any).setSinkId(sinkId);
        } catch (err) {
          console.warn('Failed to setSinkId on element:', err);
        }
      }
    }

    // Apply to webview guest video element
    const wv = document.getElementById('yt-player-webview') as any;
    if (wv && typeof wv.executeJavaScript === 'function') {
      try {
        await wv.executeJavaScript(`
          if (document.querySelector('video') && typeof document.querySelector('video').setSinkId === 'function') {
            document.querySelector('video').setSinkId('${sinkId}').catch(() => {});
          }
        `);
      } catch (e) {
        console.warn('Failed to setSinkId on webview:', e);
      }
    }

    // Apply through Electron IPC to all cross-origin subframes & webviews
    if (window.electronAPI?.setAudioOutputDevice) {
      try {
        await window.electronAPI.setAudioOutputDevice(sinkId);
      } catch (e) {
        console.warn('Failed to route audio device via Electron IPC:', e);
      }
    }
  }

  public subscribe(listener: AudioDeviceListener): () => void {
    this.listeners.add(listener);
    listener(this.devices, this.activeDeviceId);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.devices, this.activeDeviceId);
      } catch (e) {
        console.error('Error in audio output listener:', e);
      }
    });
  }
}

export const audioOutputService = new AudioOutputService();

