import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use ipcRenderer
contextBridge.exposeInMainWorld('electronAPI', {
  // SRT operations
  startSender: (config: any) => ipcRenderer.invoke('srt:start-sender', config),
  startReceiver: (config: any) => ipcRenderer.invoke('srt:start-receiver', config),
  startDualReceiver: (config: any) => ipcRenderer.invoke('srt:start-dual-receiver', config),
  stop: () => ipcRenderer.invoke('srt:stop'),
  getStats: () => ipcRenderer.invoke('srt:get-stats'),
  getDualStats: () => ipcRenderer.invoke('srt:get-dual-stats'),
  getActivePath: () => ipcRenderer.invoke('srt:get-active-path'),

  // Event listeners
  onData: (callback: (data: ArrayBuffer) => void) => {
    ipcRenderer.on('srt:data', (_, data) => callback(data));
  },
  onStats: (callback: (stats: any) => void) => {
    ipcRenderer.on('srt:stats', (_, stats) => callback(stats));
  },
  onDualStats: (callback: (stats: any) => void) => {
    ipcRenderer.on('srt:dual-stats', (_, stats) => callback(stats));
  },
  onPathSwitched: (callback: (info: any) => void) => {
    ipcRenderer.on('srt:path-switched', (_, info) => callback(info));
  },
  onDualPathStarted: (callback: (info: any) => void) => {
    ipcRenderer.on('srt:dual-path-started', (_, info) => callback(info));
  },
  onError: (callback: (error: string) => void) => {
    ipcRenderer.on('srt:error', (_, error) => callback(error));
  },
  onConnection: (callback: (info: any) => void) => {
    ipcRenderer.on('srt:connection', (_, info) => callback(info));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type definitions for TypeScript
export interface ElectronAPI {
  startSender: (config: SRTConfig) => Promise<{ success: boolean; error?: string }>;
  startReceiver: (config: SRTConfig) => Promise<{ success: boolean; error?: string }>;
  startDualReceiver: (config: SRTConfig) => Promise<{ success: boolean; error?: string }>;
  stop: () => Promise<{ success: boolean; error?: string }>;
  getStats: () => Promise<{ success: boolean; stats?: any; error?: string }>;
  getDualStats: () => Promise<{ success: boolean; stats?: any; error?: string }>;
  getActivePath: () => Promise<{ success: boolean; path?: string; error?: string }>;
  onData: (callback: (data: ArrayBuffer) => void) => void;
  onStats: (callback: (stats: any) => void) => void;
  onDualStats: (callback: (stats: any) => void) => void;
  onPathSwitched: (callback: (info: any) => void) => void;
  onDualPathStarted: (callback: (info: any) => void) => void;
  onError: (callback: (error: string) => void) => void;
  onConnection: (callback: (info: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

export interface SRTConfig {
  mode: 'sender' | 'receiver' | 'dual-receiver';
  host?: string;
  port: number;
  latency?: number;
  passphrase?: string;
  streamId?: string;
  inputSource?: string;
  redundantHost?: string;
  redundantPort?: number;
  redundantPassphrase?: string;
  redundantStreamId?: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
