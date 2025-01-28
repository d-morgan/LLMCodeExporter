import ElectronStore from 'electron-store';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { gatherFiles } from './src/FileScanner';

const isDev = process.env.NODE_ENV === 'development';

interface StoreSchema {
  fileScannerConfig?: {
    allowedTypes?: string[];
    ignoreDirs?: string[];
    ignoreFiles?: string[];
  };
}

let store: ElectronStore<StoreSchema> | null = null;

console.log('>>> electron-main.ts loaded: Registering IPC handlers...');

console.log('>>> isDev value:', isDev, process.env.NODE_ENV);

function createWindow() {
  console.log('>>> createWindow() called');
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist', 'index.html'));
  }
}

/** ------------------- IPC Handlers ------------------- */

ipcMain.handle('select-directory', async () => {
  console.log('>>> IPC: select-directory called');
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

interface ScanFilesArgs {
  directory: string;
  config: {
    allowedFileTypes?: string[];
    ignoreDirs?: string[];
    ignoreFiles?: string[];
    maxFileSizeBytes?: number;
  };
}

ipcMain.handle(
  'scan-files',
  async (event, { directory, config }: ScanFilesArgs) => {
    console.log('>>> IPC: scan-files called');
    if (!directory) return [];

    // If user passes no ignoreFiles, default them
    if (!config.ignoreFiles) {
      config.ignoreFiles = ['package-lock.json'];
    }

    const fileList = await gatherFiles(directory, config);
    console.log('>>> gatherFiles returned:', fileList);
    const results: { filePath: string; content: string }[] = [];

    for (const filePath of fileList) {
      try {
        const content = await fsExtra.readFile(filePath, 'utf-8');
        const relativePath = path.relative(directory, filePath);
        results.push({ filePath: relativePath, content });
      } catch (err) {
        console.error(`Error reading file ${filePath}:`, err);
      }
    }

    return results;
  }
);

ipcMain.handle('is-directory', async (event, droppedPath: string) => {
  console.log('>>> IPC: is-directory called');
  try {
    const stat = await fsExtra.lstat(droppedPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
});

ipcMain.handle(
  'create-export-file',
  async (event, { aggregatedOutput }: { aggregatedOutput: string }) => {
    console.log('>>> IPC: create-export-file called');
    try {
      const result = await dialog.showSaveDialog({
        title: 'Save Exported Code',
        defaultPath: 'exportedCode.md',
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }

      await fsExtra.writeFile(result.filePath, aggregatedOutput, 'utf-8');
      return { canceled: false, filePath: result.filePath };
    } catch (error: any) {
      console.error('Failed to create export file:', error);
      return { error: error.message };
    }
  }
);

/** Save config to electron-store */
ipcMain.handle('save-config', (event, config) => {
  console.log('>>> IPC: save-config called with:', config);
  if (!store) {
    console.warn('Store not initialised yet! Cannot save config.');
    return;
  }
  store.set('fileScannerConfig', config);
  return store.get('fileScannerConfig'); // optional
});

/** Load config from electron-store */
ipcMain.handle('load-config', () => {
  console.log('>>> IPC: load-config called');
  if (!store) {
    console.warn('Store not initialised yet! Returning default config.');
    return {};
  }
  const loaded = store.get('fileScannerConfig') || {};
  console.log('>>> returning config:', loaded);
  return loaded;
});

/** ------------------- App Lifecycle ------------------- */

app.whenReady().then(() => {
  console.log('>>> app.whenReady() called. Creating store...');
  // Provide defaults here so the user always has them:
  store = new ElectronStore<StoreSchema>({
    name: 'user-preferences',
    fileExtension: 'json',
    defaults: {
      fileScannerConfig: {
        allowedTypes: [
          '.js',
          '.jsx',
          '.ts',
          '.tsx',
          '.py',
          '.java',
          '.rb',
          '.go',
          '.cs',
          '.cpp',
          '.html',
          '.css',
          '.swift',
        ],
        ignoreDirs: ['.git', 'node_modules', '__pycache__', 'dist'],
        ignoreFiles: ['package-lock.json'],
      },
    },
  });

  console.log('>>> electron-store initialised successfully.');
  createWindow();

  // Auto-update checks
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update ready',
        message: 'A new version has been downloaded. Quit and install now?',
        buttons: ['Yes', 'Later'],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
