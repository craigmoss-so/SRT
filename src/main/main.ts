import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { SRTManager } from './srt-manager';
import { SimpleHTTPServer } from './http-server';

let mainWindow: BrowserWindow | null = null;
let srtManager: SRTManager | null = null;
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
  srtManager = new SRTManager();

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

    srtManager.on('error', (error) => {
      mainWindow?.webContents.send('srt:error', error);
    });

    srtManager.on('connection', (info) => {
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
  if (httpServer) {
    await httpServer.stop();
  }
});

// IPC handlers for SRT operations
ipcMain.handle('srt:start-sender', async (_, config) => {
  try {
    if (!srtManager) throw new Error('SRT Manager not initialized');
    await srtManager.startSender(config);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('srt:start-receiver', async (_, config) => {
  try {
    if (!srtManager) throw new Error('SRT Manager not initialized');
    await srtManager.startReceiver(config);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('srt:stop', async () => {
  try {
    if (!srtManager) throw new Error('SRT Manager not initialized');
    await srtManager.stop();
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
