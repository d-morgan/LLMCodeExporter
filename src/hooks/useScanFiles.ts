import { useState } from 'react';

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

  const handleSelectFile = (file: ScannedFile) => {
    if (selectedFile && selectedFile.filePath === file.filePath) {
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
    }
  };

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
  };
}
