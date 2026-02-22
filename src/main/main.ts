import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { DualPathSRTManager } from './dual-path-srt-manager';
import { XStreamManager } from './xstream-manager';
import { OllamaService } from './ollama-service';
import { SimpleHTTPServer } from './http-server';

let mainWindow: BrowserWindow | null = null;
let srtManager: DualPathSRTManager | null = null;
let xstreamManager: XStreamManager | null = null;
let ollamaService: OllamaService | null = null;
let httpServer: SimpleHTTPServer | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset', // Beautiful macOS style
    backgroundColor: '#1e1e1e',
    show: false, // Show when ready
  });

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  createWindow();
  srtManager = new DualPathSRTManager();
  xstreamManager = new XStreamManager();
  ollamaService = new OllamaService();

  // Set up Ollama token streaming
  if (ollamaService) {
    ollamaService.on('token', (token: string) => {
      mainWindow?.webContents.send('ollama:token', token);
    });
  }

  // Start HTTP server for HLS streaming
  const streamDir = path.join(process.cwd(), 'stream');
  httpServer = new SimpleHTTPServer(8080, streamDir);
  try {
    await httpServer.start();
    console.log('HTTP server started for HLS streaming');
  } catch (error) {
    console.error('Failed to start HTTP server:', error);
  }

  // Set up SRT event forwarding after initialization
  if (srtManager) {
    srtManager.on('data', (data) => {
      mainWindow?.webContents.send('srt:data', data);
    });

    srtManager.on('stats', (stats) => {
      mainWindow?.webContents.send('srt:stats', stats);
    });

    srtManager.on('dual-stats', (dualStats) => {
      mainWindow?.webContents.send('srt:dual-stats', dualStats);
    });

    srtManager.on('path-switched', (switchInfo) => {
      mainWindow?.webContents.send('srt:path-switched', switchInfo);
    });

    srtManager.on('error', (error) => {
      mainWindow?.webContents.send('srt:error', error);
    });

    srtManager.on('connection', (info) => {
      mainWindow?.webContents.send('srt:connection', info);
    });

    srtManager.on('dual-path-started', (info) => {
      mainWindow?.webContents.send('srt:dual-path-started', info);
    });
  }

  // Set up XStream event forwarding
  if (xstreamManager) {
    xstreamManager.on('stats', (stats) => {
      mainWindow?.webContents.send('srt:stats', stats);
    });

    xstreamManager.on('error', (error) => {
      mainWindow?.webContents.send('srt:error', error);
    });

    xstreamManager.on('connection', (info) => {
      mainWindow?.webContents.send('srt:connection', info);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Cleanup
  if (srtManager) {
    await srtManager.stop();
  }
  if (xstreamManager) {
    await xstreamManager.stop();
  }
  if (httpServer) {
    await httpServer.stop();
  }
});

// IPC handlers for SRT and XStream operations
ipcMain.handle('srt:start-sender', async (_, config) => {
  try {
    // Check if this is an XStream source
    if (config.sourceType === 'xstream') {
      if (!xstreamManager) throw new Error('XStream Manager not initialized');
      const xstreamConfig = {
        baseUrl: config.xstreamBaseUrl,
        username: config.xstreamUsername,
        password: config.xstreamPassword,
        mode: config.mode,
      };
      await xstreamManager.startSender(xstreamConfig);
    } else {
      // Default to SRT
      if (!srtManager) throw new Error('SRT Manager not initialized');
      await srtManager.startSender(config);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('srt:start-receiver', async (_, config) => {
  try {
    // Check if this is an XStream source
    if (config.sourceType === 'xstream') {
      if (!xstreamManager) throw new Error('XStream Manager not initialized');
      const xstreamConfig = {
        baseUrl: config.xstreamBaseUrl,
        username: config.xstreamUsername,
        password: config.xstreamPassword,
        mode: config.mode,
      };
      await xstreamManager.startReceiver(xstreamConfig);
    } else {
      // Default to SRT
      if (!srtManager) throw new Error('SRT Manager not initialized');
      await srtManager.startReceiver(config);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('srt:stop', async () => {
  try {
    // Stop both managers (only the active one will have a running process)
    if (srtManager) {
      await srtManager.stop();
    }
    if (xstreamManager) {
      await xstreamManager.stop();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('srt:get-stats', async () => {
  try {
    if (!srtManager) throw new Error('SRT Manager not initialized');
    const stats = await srtManager.getStats();
    return { success: true, stats };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('srt:start-dual-receiver', async (_, config) => {
  try {
    if (!srtManager) throw new Error('SRT Manager not initialized');
    await srtManager.startDualReceiver(config);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('srt:get-dual-stats', async () => {
  try {
    if (!srtManager) throw new Error('SRT Manager not initialized');
    const dualStats = srtManager.getDualStats();
    return { success: true, stats: dualStats };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('srt:get-active-path', async () => {
  try {
    if (!srtManager) throw new Error('SRT Manager not initialized');
    const activePath = srtManager.getActivePath();
    return { success: true, path: activePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Ollama IPC handlers
ipcMain.handle('ollama:get-models', async () => {
  try {
    if (!ollamaService) throw new Error('Ollama service not initialized');
    const models = await ollamaService.getAvailableModels();
    return { success: true, models };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('ollama:set-model', async (_, model: string) => {
  try {
    if (!ollamaService) throw new Error('Ollama service not initialized');
    ollamaService.setModel(model);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('ollama:get-model', async () => {
  try {
    if (!ollamaService) throw new Error('Ollama service not initialized');
    const model = ollamaService.getModel();
    return { success: true, model };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('ollama:chat', async (_, message: string) => {
  try {
    if (!ollamaService) throw new Error('Ollama service not initialized');
    const response = await ollamaService.chat(message);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('ollama:analyze-metrics', async () => {
  try {
    if (!ollamaService) throw new Error('Ollama service not initialized');
    const analysis = await ollamaService.analyzeMetrics();
    return { success: true, analysis };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('ollama:analyze-alert', async (_, alertType: string, value: number) => {
  try {
    if (!ollamaService) throw new Error('Ollama service not initialized');
    const analysis = await ollamaService.analyzeAlert(alertType, value);
    return { success: true, analysis };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('ollama:update-metrics', async (_, metrics) => {
  try {
    if (!ollamaService) throw new Error('Ollama service not initialized');
    ollamaService.updateMetrics(metrics);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('ollama:clear-conversation', async () => {
  try {
    if (!ollamaService) throw new Error('Ollama service not initialized');
    ollamaService.clearConversation();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('ollama:check-connection', async () => {
  try {
    if (!ollamaService) throw new Error('Ollama service not initialized');
    const connected = await ollamaService.checkConnection();
    return { success: true, connected };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('ollama:set-base-url', async (_, url: string) => {
  try {
    if (!ollamaService) throw new Error('Ollama service not initialized');
    ollamaService.setBaseUrl(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
