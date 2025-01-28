import { useEffect, useState } from 'react';

export interface ScannerConfig {
  allowedTypes: string[];
  ignoreDirs: string[];
  ignoreFiles: string[];
  setAllowedTypes: React.Dispatch<React.SetStateAction<string[]>>;
  setIgnoreDirs: React.Dispatch<React.SetStateAction<string[]>>;
  setIgnoreFiles: React.Dispatch<React.SetStateAction<string[]>>;
}

/**
 * A custom hook to manage scanning config via electron-store,
 * loaded/saved via IPC.
 */
export function useFileScannerConfig(): ScannerConfig {
  // Safely access ipcRenderer inside the hook
  const ipcRenderer = window.electron?.ipcRenderer;

  // Track if we've loaded from the store yet
  const [loadedFromStore, setLoadedFromStore] = useState(false);

  const [allowedTypes, setAllowedTypes] = useState<string[]>([]);
  const [ignoreDirs, setIgnoreDirs] = useState<string[]>([]);
  const [ignoreFiles, setIgnoreFiles] = useState<string[]>([]);

  // 1) Load from electron-store on mount, merging defaults if needed
  useEffect(() => {
    (async () => {
      if (!ipcRenderer) {
        // If there's no IPC, for example in a test environment, do nothing or set defaults
        console.warn('No ipcRenderer found - possibly running in test mode');
        setLoadedFromStore(true);
        return;
      }

      try {
        console.log('Renderer calling load-config via IPC...');
        const storedConfig = await ipcRenderer.invoke('load-config');
        console.log('Renderer received load-config result:', storedConfig);

        // If stored arrays are empty or missing, fill them with defaults:
        const newAllowedTypes =
          storedConfig.allowedTypes && storedConfig.allowedTypes.length
            ? storedConfig.allowedTypes
            : [
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
              ];

        const newIgnoreDirs =
          storedConfig.ignoreDirs && storedConfig.ignoreDirs.length
            ? storedConfig.ignoreDirs
            : ['.git', 'node_modules', '__pycache__', 'dist'];

        const newIgnoreFiles =
          storedConfig.ignoreFiles && storedConfig.ignoreFiles.length
            ? storedConfig.ignoreFiles
            : ['package-lock.json'];

        setAllowedTypes(newAllowedTypes);
        setIgnoreDirs(newIgnoreDirs);
        setIgnoreFiles(newIgnoreFiles);

        // Mark that we've finished loading from the store
        setLoadedFromStore(true);
      } catch (err) {
        console.error('Error loading config from IPC:', err);
      }
    })();
  }, [ipcRenderer]);

  // 2) Only save back to electron-store AFTER we've loaded
  useEffect(() => {
    if (!loadedFromStore || !ipcRenderer) return; // Avoid overwriting on first mount or if no IPC
    console.log('Renderer calling save-config with:', {
      allowedTypes,
      ignoreDirs,
      ignoreFiles,
    });
    ipcRenderer.invoke('save-config', {
      allowedTypes,
      ignoreDirs,
      ignoreFiles,
    });
  }, [allowedTypes, ignoreDirs, ignoreFiles, loadedFromStore, ipcRenderer]);

  return {
    allowedTypes,
    ignoreDirs,
    ignoreFiles,
    setAllowedTypes,
    setIgnoreDirs,
    setIgnoreFiles,
  };
}
