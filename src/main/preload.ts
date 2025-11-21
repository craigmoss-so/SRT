import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // SRT operations
  startSender: (config: any) => ipcRenderer.invoke('srt:start-sender', config),
  startReceiver: (config: any) => ipcRenderer.invoke('srt:start-receiver', config),
  stop: () => ipcRenderer.invoke('srt:stop'),
  getStats: () => ipcRenderer.invoke('srt:get-stats'),
  startDualReceiver: (config: any) => ipcRenderer.invoke('srt:start-dual-receiver', config),
  getDualStats: () => ipcRenderer.invoke('srt:get-dual-stats'),
  getActivePath: () => ipcRenderer.invoke('srt:get-active-path'),

  // SRT event listeners
  onStats: (callback: (stats: any) => void) => {
    ipcRenderer.on('srt:stats', (_, stats) => callback(stats));
  },
  onError: (callback: (error: string) => void) => {
    ipcRenderer.on('srt:error', (_, error) => callback(error));
  },
  onConnection: (callback: (info: any) => void) => {
    ipcRenderer.on('srt:connection', (_, info) => callback(info));
  },
  onDualStats: (callback: (stats: any) => void) => {
    ipcRenderer.on('srt:dual-stats', (_, stats) => callback(stats));
  },
  onPathSwitched: (callback: (info: any) => void) => {
    ipcRenderer.on('srt:path-switched', (_, info) => callback(info));
  },

  // Ollama operations
  ollama: {
    getModels: () => ipcRenderer.invoke('ollama:get-models'),
    setModel: (model: string) => ipcRenderer.invoke('ollama:set-model', model),
    getModel: () => ipcRenderer.invoke('ollama:get-model'),
    chat: (message: string) => ipcRenderer.invoke('ollama:chat', message),
    analyzeMetrics: () => ipcRenderer.invoke('ollama:analyze-metrics'),
    analyzeAlert: (alertType: string, value: number) =>
      ipcRenderer.invoke('ollama:analyze-alert', alertType, value),
    updateMetrics: (metrics: any) => ipcRenderer.invoke('ollama:update-metrics', metrics),
    clearConversation: () => ipcRenderer.invoke('ollama:clear-conversation'),
    checkConnection: () => ipcRenderer.invoke('ollama:check-connection'),
    setBaseUrl: (url: string) => ipcRenderer.invoke('ollama:set-base-url', url),

    // Token streaming listener
    onToken: (callback: (token: string) => void) => {
      ipcRenderer.on('ollama:token', (_, token) => callback(token));
    },
    removeTokenListener: () => {
      ipcRenderer.removeAllListeners('ollama:token');
    }
  },

  // Utility to remove all listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the renderer process
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
