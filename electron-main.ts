import ElectronStore from 'electron-store';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as chokidar from 'chokidar';
import { gatherFiles } from './src/FileScanner';

const isDev = process.env.NODE_ENV === 'development';

interface StoreSchema {
  fileScannerConfig?: {
    allowedTypes?: string[];
    ignoreDirs?: string[];
    ignoreFiles?: string[];
    enableWatching?: boolean;
  };
  lastSelectedDirectory?: string;
}

let store: ElectronStore<StoreSchema> | null = null;
let refreshDebounceTimer: NodeJS.Timeout | null = null;
let refreshPending = false;

let watcher: chokidar.FSWatcher | null = null;
let currentWatchDir: string | null = null;
let mainWindow: BrowserWindow | null = null;
let cachedFiles: { filePath: string; content: string }[] = []; // Store cached files

console.log('>>> electron-main.ts loaded: Registering IPC handlers...');

console.log('>>> isDev value:', isDev, process.env.NODE_ENV);

function createWindow() {
  console.log('>>> createWindow() called');
  mainWindow = new BrowserWindow({
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

  // Add focus event listener to refresh files when the window regains focus
  mainWindow.on('focus', () => {
    console.log('>>> Window gained focus');
    if (currentWatchDir && store) {
      const config = store.get('fileScannerConfig');
      if (config) {
        console.log('>>> Refreshing files on focus');
        // Don't start a new watcher, just refresh files using the existing watcher
        if (watcher) {
          console.log('>>> Using existing watcher to refresh files');
          refreshFiles(currentWatchDir, {
            allowedFileTypes: config.allowedTypes,
            ignoreDirs: config.ignoreDirs,
            ignoreFiles: config.ignoreFiles,
            enableWatching: !!watcher, // Only keep watching if already watching
          });
        } else {
          console.log(
            '>>> No active watcher found on focus, watcher is disabled'
          );
        }
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
    enableWatching?: boolean;
  };
}

ipcMain.handle(
  'scan-files',
  async (event, { directory, config }: ScanFilesArgs) => {
    console.log('>>> IPC: scan-files called');
    if (!directory) return [];

    if (!config.ignoreFiles) {
      config.ignoreFiles = ['package-lock.json'];
    }

    console.log('>>> Scan config:', {
      directory,
      allowedFileTypes: config.allowedFileTypes,
      ignoreDirs: config.ignoreDirs,
      ignoreFiles: config.ignoreFiles,
      enableWatching: config.enableWatching,
    });

    const fileList = await gatherFiles(directory, config);
    console.log('>>> gatherFiles returned:', fileList);
    const results: { filePath: string; content: string }[] = [];

    for (const filePath of fileList) {
      try {
        const ext = path.extname(filePath).toLowerCase();
        console.log(`>>> Processing file: ${filePath} (${ext})`);

        const content = await fsExtra.readFile(filePath, 'utf-8');
        const relativePath = path.relative(directory, filePath);
        results.push({ filePath: relativePath, content });
        console.log(`>>> Added to results: ${relativePath}`);
      } catch (err) {
        console.error(`Error reading file ${filePath}:`, err);
      }
    }

    cachedFiles = results;

    refreshFiles(directory, config);

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

/** Get last selected directory */
ipcMain.handle('get-last-directory', () => {
  console.log('>>> IPC: get-last-directory called');
  if (!store) {
    console.warn('Store not initialised yet! Returning null.');
    return null;
  }
  const lastDir = store.get('lastSelectedDirectory');
  console.log('>>> returning last directory:', lastDir);
  return lastDir;
});

/** Get cached files */
ipcMain.handle('get-cached-files', () => {
  console.log('>>> IPC: get-cached-files called');
  return cachedFiles;
});

/** Toggle file watching */
ipcMain.handle(
  'toggle-file-watching',
  (event, params: { shouldWatch: boolean; directory?: string }) => {
    const { shouldWatch, directory: directoryToWatch } = params;
    console.log(
      `>>> IPC: toggle-file-watching called with: shouldWatch=${shouldWatch}, directory=${
        directoryToWatch || currentWatchDir || 'NONE'
      }`
    );

    // If shouldWatch is undefined, just return the current state without changing anything
    if (shouldWatch === undefined) {
      console.log(
        `>>> Received undefined shouldWatch value, returning current state: ${!!watcher}`
      );
      return !!watcher;
    }

    if (!shouldWatch) {
      console.log('>>> Stopping file watching from renderer request');
      stopWatching();
      return false;
    } else if (shouldWatch) {
      // Use the explicitly provided directory if available, otherwise fall back to currentWatchDir
      const directory = directoryToWatch || currentWatchDir;

      // Check if we have a directory to watch and configuration
      if (directory && store) {
        const config = store.get('fileScannerConfig');
        if (config) {
          console.log(`>>> Re-enabling file watching for: ${directory}`);

          currentWatchDir = directory;

          startWatching(directory, {
            allowedFileTypes: config.allowedTypes,
            ignoreDirs: config.ignoreDirs,
            ignoreFiles: config.ignoreFiles,
          });
          return true;
        } else {
          console.log('>>> Cannot enable watching: No config found');
        }
      } else {
        console.log('>>> Cannot enable watching: No directory selected');
        if (!directory) {
          console.log(
            '>>> directoryToWatch and currentWatchDir are both null/undefined'
          );
        }
        if (!store) {
          console.log('>>> store is null or undefined');
        }
      }
      return false;
    }

    return !!watcher;
  }
);

/** ------------------- File Watching Functions ------------------- */

function startWatching(directory: string, config: ScanFilesArgs['config']) {
  console.log(`>>> Starting to watch directory: ${directory}`);

  try {
    stopWatching();

    // Start a new watcher
    watcher = chokidar.watch(directory, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        ...(config.ignoreDirs || []).map((dir) => `**/${dir}/**`),
        ...(config.ignoreFiles || []),
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100, // 100ms
        pollInterval: 50, // 50ms
      },
      alwaysStat: true,
      depth: undefined, // Unlimited depth
      followSymlinks: false,
      usePolling: true, // Set to true for more reliable detection across different OSes
      interval: 2000, // Poll every 1 second (lower values may cause high CPU usage)
      binaryInterval: 5000, // Poll binary files less frequently
    });

    // Log the watching config
    console.log('>>> Watch config:', {
      directory,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        ...(config.ignoreDirs || []).map((dir) => `**/${dir}/**`),
        ...(config.ignoreFiles || []),
      ],
      allowedFileTypes: config.allowedFileTypes,
      usePolling: true,
    });

    // Define what happens on different events
    watcher
      .on('all', (event, path) => {
        // Skip certain events and paths that might create excessive noise
        if (path.includes('node_modules') || path.includes('.git')) {
          return; // Skip these paths entirely
        }

        // Catch all events in one handler for reliability
        console.log(`>>> File event: ${event} on path: ${path}`);

        // Only refresh for meaningful events
        if (['add', 'change', 'unlink'].includes(event)) {
          refreshFiles(directory, config);
        }
      })
      .on('error', (error: unknown) => {
        console.error(`>>> Watcher error:`, error);
        // Notify renderer about the error
        if (mainWindow) {
          mainWindow.webContents.send('file-watching-changed', false);
          // Send the error message if it's an Error object, otherwise send a generic message
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown watcher error';
          mainWindow.webContents.send('file-watching-error', errorMessage);
          console.log('>>> Notified renderer that file watching failed');
        }
      })
      .on('ready', () => {
        console.log('>>> Initial scan complete. File watcher ready');
        // Do an initial refresh when the watcher is ready
        refreshFiles(directory, config);

        // Notify the renderer that watching has started
        if (mainWindow) {
          mainWindow.webContents.send('file-watching-changed', true);
          console.log('>>> Notified renderer that file watching has started');
        }
      });

    console.log('>>> File watcher started successfully');
    return true;
  } catch (err) {
    console.error('>>> Error starting file watcher:', err);
    // Make sure we clean up any partially initialized state
    if (watcher) {
      try {
        watcher.close();
      } catch (closeErr) {
        console.error(
          '>>> Error closing watcher after failed start:',
          closeErr
        );
      }
      watcher = null;
    }

    // Notify renderer about the error
    if (mainWindow) {
      mainWindow.webContents.send('file-watching-changed', false);
      console.log('>>> Notified renderer that file watching failed');
    }

    return false;
  }
}

// Function to stop watching
function stopWatching() {
  if (watcher) {
    console.log('>>> Stopping existing file watcher');
    watcher.close();
    watcher = null;
    // Don't clear currentWatchDir when stopping the watcher
    // We need to remember which directory was selected even when watching is off
    // currentWatchDir = null;

    // Notify the renderer that watching has stopped
    if (mainWindow) {
      mainWindow.webContents.send('file-watching-changed', false);
      console.log('>>> Notified renderer that file watching has stopped');
    }
  }
}

// Function to refresh files and send to renderer
async function refreshFiles(
  directory: string,
  config: ScanFilesArgs['config']
) {
  console.log('>>> refreshFiles called with config:', {
    directory,
    allowedFileTypes: config.allowedFileTypes?.length,
    ignoreDirs: config.ignoreDirs?.length,
    ignoreFiles: config.ignoreFiles?.length,
    enableWatching: config.enableWatching,
  });

  // Always track the current directory, even if we're not watching it
  // This ensures we know which directory to watch when toggling watching on later
  currentWatchDir = directory;

  // Also save it as the last selected directory
  if (store) {
    store.set('lastSelectedDirectory', directory);
  }

  // If there's already a pending refresh, don't start another one
  if (refreshPending) {
    console.log('>>> Refresh already pending, skipping this call');
    return;
  }

  // Cancel any existing debounce timer
  if (refreshDebounceTimer) {
    clearTimeout(refreshDebounceTimer);
    refreshDebounceTimer = null;
  }

  // Set a debounce timer to prevent too many refreshes in quick succession
  refreshPending = true;
  refreshDebounceTimer = setTimeout(async () => {
    console.log('>>> Refreshing files after debounce');

    if (!mainWindow) {
      console.log('>>> Main window is not available, skipping refresh');
      refreshPending = false;
      return;
    }

    try {
      // Get the latest files
      console.log('>>> Starting file scan with config:', {
        allowedFileTypes: config.allowedFileTypes,
        ignoreDirs: config.ignoreDirs,
        ignoreFiles: config.ignoreFiles,
        enableWatching: config.enableWatching,
      });

      const fileList = await gatherFiles(directory, config);
      console.log(`>>> Found ${fileList.length} files matching criteria`);

      const results: { filePath: string; content: string }[] = [];

      for (const filePath of fileList) {
        try {
          // Log the file extension for debugging
          const ext = path.extname(filePath).toLowerCase();

          // Check if allowed file type (duplicate of what's in FileScanner.ts for clarity)
          const isAllowedType =
            !config.allowedFileTypes ||
            config.allowedFileTypes.length === 0 ||
            config.allowedFileTypes.includes(ext);

          if (!isAllowedType) {
            console.log(
              `>>> Skipping file due to type filter: ${filePath} (${ext})`
            );
            continue;
          }

          const content = await fsExtra.readFile(filePath, 'utf-8');
          const relativePath = path.relative(directory, filePath);
          results.push({ filePath: relativePath, content });
          console.log(`>>> Added file to results: ${relativePath}`);
        } catch (err) {
          console.error(`Error reading file ${filePath}:`, err);
        }
      }

      // Cache the results
      cachedFiles = results;

      console.log(`>>> Sending ${results.length} files to renderer`);
      // Send the updated files to the renderer
      mainWindow.webContents.send('files-updated', results);

      // Only start watching if it's a new request with enableWatching: true
      // and we weren't already watching
      if (config.enableWatching === true) {
        console.log(
          '>>> enableWatching is true, ensuring file watching is active'
        );

        if (!watcher) {
          // Start a new watcher
          console.log('>>> No watcher exists, starting a new one');
          startWatching(directory, config);
        } else if (currentWatchDir !== directory) {
          // If directory changed, restart watcher
          console.log('>>> Directory changed, restarting watcher');
          startWatching(directory, config);
        } else {
          console.log('>>> Watcher already exists for this directory');
          // Just notify that we're watching in case UI state is out of sync
          mainWindow.webContents.send('file-watching-changed', true);
        }
      } else if (config.enableWatching === false) {
        // Explicitly stop watching if enableWatching is false
        console.log(
          '>>> enableWatching is false, stopping any active watchers'
        );
        stopWatching();
      }
    } catch (error) {
      console.error('Error refreshing files:', error);
      // Ensure we stop watching if there was an error during the scan
      if (config.enableWatching === true) {
        stopWatching();
      }
    } finally {
      refreshPending = false;
    }
  }, 300); // 300ms debounce
}

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
      lastSelectedDirectory: '',
    },
  });

  console.log('>>> electron-store initialised successfully.');
  createWindow();

  // Try to load the last selected directory and start watching
  if (store) {
    const lastDir = store.get('lastSelectedDirectory');
    const config = store.get('fileScannerConfig');

    if (lastDir && config && mainWindow) {
      console.log(`>>> Auto-loading last directory: ${lastDir}`);
      // We'll wait for the window to finish loading before starting
      mainWindow.webContents.on('did-finish-load', () => {
        // Just load the files without starting watching - the UI will indicate watching is off
        console.log('>>> Loading files from last directory without watching');
        refreshFiles(lastDir, {
          allowedFileTypes: config.allowedTypes,
          ignoreDirs: config.ignoreDirs,
          ignoreFiles: config.ignoreFiles,
          enableWatching: false, // Don't start watching automatically
        });
      });
    }
  }

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
