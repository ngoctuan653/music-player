import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-window-maximized'),
  onWindowStateChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: any, isMax: boolean) => callback(isMax);
    ipcRenderer.on('window-maximized-change', handler);
    return () => {
      ipcRenderer.removeListener('window-maximized-change', handler);
    };
  },
  onGlassEnvironment: (callback: (environment: { onBattery: boolean; gpuHealthy: boolean }) => void) => {
    const handler = (_event: any, environment: { onBattery: boolean; gpuHealthy: boolean }) => callback(environment);
    ipcRenderer.on('glass-environment', handler);
    return () => {
      ipcRenderer.removeListener('glass-environment', handler);
    };
  },
  getGlassEnvironment: () => ipcRenderer.invoke('get-glass-environment'),
  onGlassWindowVisibility: (callback: (visible: boolean) => void) => {
    const handler = (_event: any, visible: boolean) => callback(visible);
    ipcRenderer.on('glass-window-visibility', handler);
    return () => {
      ipcRenderer.removeListener('glass-window-visibility', handler);
    };
  },
  setAudioOutputDevice: (deviceId: string) => ipcRenderer.invoke('set-audio-output-device', deviceId),
  fetchNet: (url: string) => ipcRenderer.invoke('net-fetch', url),
  fetchYouTubeRadio: (params: { videoId: string; reqId: number }) => ipcRenderer.invoke('fetch-youtube-radio', params),
  getDnsConfig: () => ipcRenderer.invoke('get-dns-config'),
  setDnsConfig: (config: any) => ipcRenderer.invoke('set-dns-config', config),
  getDiskStorage: () => ipcRenderer.invoke('get-disk-storage'),
  saveDiskStorage: (data: any) => ipcRenderer.invoke('save-disk-storage', data),
  onMediaControl: (callback: (action: string) => void) => {
    const handler = (_event: any, action: string) => callback(action);
    ipcRenderer.on('media-control', handler);
    return () => {
      ipcRenderer.removeListener('media-control', handler);
    };
  },
});
