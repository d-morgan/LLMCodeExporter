import { useState, useEffect, useCallback, useRef } from 'react';

export interface ScannedFile {
  filePath: string;
  content: string;
}

/**
 * A hook to manage scanning a directory via Electron.
 */
export function useScanFiles() {
  const [selectedDir, setSelectedDir] = useState<string>('');
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ScannedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  // Add a ref to track if we're currently syncing to prevent circular updates
  const isSyncing = useRef<boolean>(false);

  const ipcRenderer = window.electron?.ipcRenderer;

  // Handle file selection
  const handleSelectFile = (file: ScannedFile) => {
    if (selectedFile && selectedFile.filePath === file.filePath) {
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
    }
  };

  // Sync watching state with main process
  useEffect(() => {
    if (!ipcRenderer) return;

    const syncWatchingState = async () => {
      try {
        // Prevent circular updates
        if (isSyncing.current) {
          console.log('Already syncing watching state, skipping');
          return;
        }

        console.log(
          `Syncing watching state with main process: ${
            isWatching ? 'ON' : 'OFF'
          }`
        );

        // Only try to enable watching if we have a directory
        if (isWatching && !selectedDir) {
          console.log('Cannot enable watching - no directory selected');
          setIsWatching(false);
          return;
        }

        // Set syncing lock
        isSyncing.current = true;

        // Apply the watching state to the main process
        console.log(
          `Calling toggle-file-watching with isWatching=${isWatching}, dir=${
            selectedDir || 'NONE'
          }`
        );

        // Pass as a single parameter object
        const result = await ipcRenderer.invoke('toggle-file-watching', {
          shouldWatch: isWatching,
          directory: selectedDir,
        });

        // If the result doesn't match what we expected, update our state
        if (result !== isWatching) {
          console.log(
            `Main process returned different watching state: ${result}`
          );
          setIsWatching(result);
        }
      } catch (error) {
        console.error('Error toggling file watching:', error);
        // If there was an error, assume watching is off
        setIsWatching(false);
      } finally {
        // Release syncing lock after a short delay to ensure events don't overlap
        setTimeout(() => {
          isSyncing.current = false;
        }, 100);
      }
    };

    syncWatchingState();
  }, [ipcRenderer, isWatching, selectedDir]);

  // Listen for file watching status changes from main process
  useEffect(() => {
    if (!ipcRenderer) return;

    const handleWatchingChanged = (event: any, isActive: boolean) => {
      console.log(`Received file-watching-changed event: ${isActive}`);

      // Prevent circular updates by checking if we're already syncing
      if (isSyncing.current) {
        console.log('Ignoring file-watching-changed event during sync');
        return;
      }

      // Update React state to match main process state
      setIsWatching(isActive);
    };

    const handleWatchingError = (event: any, errorMessage: string) => {
      console.error(`File watching error: ${errorMessage}`);
      // Display error if needed (e.g., using a toast notification)
      // For now we just log it
      setIsWatching(false);
    };

    // Add the listeners
    ipcRenderer.on('file-watching-changed', handleWatchingChanged);
    ipcRenderer.on('file-watching-error', handleWatchingError);
    console.log('File watching status listeners registered');

    // Clean up on unmount
    return () => {
      ipcRenderer.removeListener(
        'file-watching-changed',
        handleWatchingChanged
      );
      ipcRenderer.removeListener('file-watching-error', handleWatchingError);
      console.log('File watching status listeners removed');
    };
  }, [ipcRenderer]);

  // Load last directory on startup
  useEffect(() => {
    const loadLastDirectory = async () => {
      if (!ipcRenderer) return;

      try {
        const lastDir = await ipcRenderer.invoke('get-last-directory');
        if (lastDir) {
          console.log(`Loading last directory: ${lastDir}`);
          setSelectedDir(lastDir);

          // Don't set isWatching to true here - let the UI reflect
          // that watching is not active until scan/refresh is clicked
          // setIsWatching(true);

          // Instead, check if there are already scanned files
          const files = await ipcRenderer.invoke('get-cached-files');
          if (files && files.length > 0) {
            console.log(`Loading ${files.length} cached files`);
            setScannedFiles(files);

            // Auto-select the first file if there are files
            if (files.length > 0) {
              setSelectedFile(files[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading last directory:', error);
      }
    };

    loadLastDirectory();
  }, [ipcRenderer]);

  // Set up listener for file updates
  useEffect(() => {
    if (!ipcRenderer) return;

    const handleFilesUpdated = (updatedFiles: ScannedFile[]) => {
      console.log('Files updated from watcher:', updatedFiles.length);

      // Log file paths for debugging
      if (updatedFiles.length > 0) {
        console.log(
          'Received files:',
          updatedFiles.map((f) => f.filePath).join(', ')
        );
      }

      setScannedFiles(updatedFiles);

      // If there are files but no selected file yet, auto-select the first one
      if (updatedFiles.length > 0 && !selectedFile) {
        setSelectedFile(updatedFiles[0]);
        console.log('Auto-selected first file:', updatedFiles[0].filePath);
      }
      // If we have a selectedFile, try to find its updated version
      else if (selectedFile) {
        const updatedSelectedFile = updatedFiles.find(
          (f) => f.filePath === selectedFile.filePath
        );

        if (updatedSelectedFile) {
          setSelectedFile(updatedSelectedFile);
          console.log('Updated selected file:', updatedSelectedFile.filePath);
        } else {
          // If the file no longer exists, reset selection
          setSelectedFile(null);
          console.log('Selected file no longer exists, clearing selection');
        }
      }
    };

    // Add the listener
    ipcRenderer.on('files-updated', handleFilesUpdated);
    console.log('File update listener registered');

    // Clean up on unmount
    return () => {
      ipcRenderer.removeListener('files-updated', handleFilesUpdated);
      console.log('File update listener removed');
    };
  }, [ipcRenderer, selectedFile]);

  return {
    selectedDir,
    setSelectedDir,
    scannedFiles,
    setScannedFiles,
    selectedFile,
    setSelectedFile,
    handleSelectFile,
    isProcessing,
    setIsProcessing,
    isWatching,
    setIsWatching,
  };
}
