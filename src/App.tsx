import React, { useMemo, useState, DragEvent } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Collapse,
  Divider,
  IconButton,
  Stack,
  Fade,
  LinearProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

// MUI Icons
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TokenIcon from '@mui/icons-material/HistoryEdu';

// Subcomponents
import DirectorySelection from './components/DirectorySelection';
import ConfigSection from './components/ConfigSection';
import FileExplorer from './components/FileExplorer';
import CodeViewer from './components/CodeViewer';
import StatItem from './components/StatItem';

// Hooks
import { useFileScannerConfig } from './hooks/useFileScannerConfig';
import { useScanFiles } from './hooks/useScanFiles';

// Types
import { ScannedFile } from './hooks/useScanFiles';

// Utilities
import { getFileLanguage } from './utils/fileUtils';

const modelContexts = [
  { name: 'GPT-4o', limit: 128000 },
  { name: 'ChatGPT o1', limit: 128000 },
  { name: 'Claude 3.5 Sonnet', limit: 200000 },
  { name: 'Gemini 1.5 Pro (Sep)', limit: 2000000 },
  { name: 'Gemini 2.0 Flash Thinking', limit: 1000000 },
  { name: 'DeepSeek V3', limit: 64000 },
  { name: 'DeepSeek R1', limit: 64000 },
  { name: 'Llama 3', limit: 128000 },
];

const App: React.FC = () => {
  // Safely access ipcRenderer inside the component
  const ipcRenderer = window.electron?.ipcRenderer;

  // Hook states for scanning config
  const {
    allowedTypes,
    ignoreDirs,
    ignoreFiles,
    setAllowedTypes,
    setIgnoreDirs,
    setIgnoreFiles,
  } = useFileScannerConfig();

  // Directory + scanning states
  const {
    selectedDir,
    setSelectedDir,
    scannedFiles,
    setScannedFiles,
    selectedFile,
    handleSelectFile,
    isProcessing,
    setIsProcessing,
  } = useScanFiles();

  // UI states
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState(modelContexts[0]);

  // For text inputs in config
  const [newFileType, setNewFileType] = useState('');
  const [newIgnoreDir, setNewIgnoreDir] = useState('');
  const [newIgnoreFile, setNewIgnoreFile] = useState('');

  // Directory selection via IPC
  const handleSelectDirectory = async () => {
    if (!ipcRenderer) return;
    const dir = await ipcRenderer.invoke('select-directory');
    if (dir) setSelectedDir(dir);
  };

  // Drag & drop
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    if (!ipcRenderer) return;
    e.preventDefault();
    setIsDragging(false);
    const droppedPath = e.dataTransfer.files[0]?.path;
    if (droppedPath) {
      const isDir = await ipcRenderer.invoke('is-directory', droppedPath);
      if (isDir) setSelectedDir(droppedPath);
    }
  };

  // Scan files
  const handleScan = async () => {
    if (!ipcRenderer || !selectedDir) return;
    setIsProcessing(true);

    const result: ScannedFile[] = await ipcRenderer.invoke('scan-files', {
      directory: selectedDir,
      config: {
        allowedFileTypes: allowedTypes,
        ignoreDirs,
        ignoreFiles,
      },
    });

    setScannedFiles(result || []);
    if (result.length === 0) {
      // Clear selected file if no results
      handleSelectFile({ filePath: '', content: '' });
    } else {
      // optional: auto-select first file
      handleSelectFile(result[0]);
    }
    setIsProcessing(false);
  };

  // Build one big markdown block
  const aggregatedOutput = useMemo(() => {
    if (!scannedFiles.length) return '';
    return scannedFiles
      .map((f) => `### File: \`${f.filePath}\`\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');
  }, [scannedFiles]);

  // Project stats
  const projectStats = useMemo(() => {
    if (!scannedFiles.length) {
      return {
        fileCount: 0,
        lines: 0,
        chars: 0,
        tokens: 0,
        longestFileName: '',
        longestFileLines: 0,
      };
    }

    let fileCount = scannedFiles.length;
    let totalLines = 0;
    let totalChars = 0;
    let longestFileLines = 0;
    let longestFileName = '';

    scannedFiles.forEach((f) => {
      const fileLines = f.content.split('\n').length;
      totalLines += fileLines;
      totalChars += f.content.length;
      if (fileLines > longestFileLines) {
        longestFileLines = fileLines;
        longestFileName = f.filePath;
      }
    });

    // Rough estimate: 1 token ~ 4 chars
    let tokens = Math.ceil(totalChars / 4);

    return {
      fileCount,
      lines: totalLines,
      chars: totalChars,
      tokens,
      longestFileName,
      longestFileLines,
    };
  }, [scannedFiles]);

  const averageLines = useMemo(() => {
    if (!projectStats.fileCount) return 0;
    return Math.floor(projectStats.lines / projectStats.fileCount);
  }, [projectStats]);

  // Utility to add multiple items
  const addMultipleItems = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    currentItems: string[]
  ) => {
    const newItems = value
      .split(/[, ]+/)
      .map((item) => item.trim())
      .filter((item) => item && !currentItems.includes(item));

    if (newItems.length) {
      setter([...currentItems, ...newItems]);
    }
  };

  // Key press handlers
  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: 'file' | 'dir' | 'ignoreFiles'
  ) => {
    if (['Enter', ',', ' '].includes(e.key)) {
      e.preventDefault();

      if (type === 'file') {
        addMultipleItems(newFileType, setAllowedTypes, allowedTypes);
        setNewFileType('');
      } else if (type === 'dir') {
        addMultipleItems(newIgnoreDir, setIgnoreDirs, ignoreDirs);
        setNewIgnoreDir('');
      } else if (type === 'ignoreFiles') {
        addMultipleItems(newIgnoreFile, setIgnoreFiles, ignoreFiles);
        setNewIgnoreFile('');
      }
    }
  };

  // Remove item handlers
  const removeFileType = (t: string) => {
    setAllowedTypes((prev) => prev.filter((item) => item !== t));
  };
  const removeIgnoreDir = (d: string) => {
    setIgnoreDirs((prev) => prev.filter((item) => item !== d));
  };
  const removeIgnoreFile = (f: string) => {
    setIgnoreFiles((prev) => prev.filter((item) => item !== f));
  };

  // Copy entire project
  const handleCopy = () => {
    if (!aggregatedOutput) return;
    navigator.clipboard.writeText(aggregatedOutput);
  };

  // Export to file
  const handleExportFile = async () => {
    if (!ipcRenderer) return;
    const response = await ipcRenderer.invoke('create-export-file', {
      aggregatedOutput,
    });
    if (response?.error) {
      alert(`Failed to create file: ${response.error}`);
    } else if (!response?.canceled) {
      alert(`File saved to: ${response.filePath}`);
    }
  };

  const renderUsageBar = (tokens: number, limit: number) => {
    const usagePercent = Math.round((tokens / limit) * 100);
    const clampedPercent = Math.min(usagePercent, 100);
    const isOver = usagePercent > 100;

    return (
      <Box sx={{ mb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={clampedPercent}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'grey.300',
            '& .MuiLinearProgress-bar': {
              backgroundColor: isOver ? 'error.main' : 'primary.main',
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: isOver ? 'bold' : 'normal',
            color: darkMode
              ? isOver
                ? '#ff8a80'
                : '#ccc'
              : isOver
              ? 'error.main'
              : 'text.secondary',
          }}
        >
          {isOver
            ? `Exceeds limit by ~${usagePercent - 100}%`
            : `${usagePercent}% of limit`}
        </Typography>
      </Box>
    );
  };

  const currentLimit = selectedModel.limit;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: darkMode ? '#121212' : '#f0f0f0',
        color: darkMode ? '#fff' : 'inherit',
        p: 4,
      }}
    >
      <Fade in timeout={500}>
        <Paper
          elevation={8}
          sx={{
            maxWidth: 900,
            width: '100%',
            p: 4,
            borderRadius: 4,
            backgroundColor: darkMode ? '#1e1e1e' : '#fff',
            color: darkMode ? '#fff' : 'inherit',
            position: 'relative',
          }}
        >
          {/* Dark/Light Mode Toggle */}
          <IconButton
            sx={{ position: 'absolute', top: 16, right: 16 }}
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? (
              <LightModeIcon sx={{ color: '#fff' }} />
            ) : (
              <DarkModeIcon />
            )}
          </IconButton>

          <Stack spacing={3}>
            {/* Title */}
            <Typography
              variant="h3"
              fontWeight="800"
              gutterBottom
              sx={{
                textAlign: 'center',
                color: darkMode ? '#90caf9' : 'primary.main',
              }}
            >
              <CodeIcon sx={{ verticalAlign: 'middle', mr: 2 }} />
              LLM Code Exporter
            </Typography>

            {/* Directory Selection */}
            <DirectorySelection
              darkMode={darkMode}
              selectedDir={selectedDir}
              setSelectedDir={setSelectedDir}
              handleSelectDirectory={handleSelectDirectory}
              isDragging={isDragging}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
            />

            {/* Advanced Config */}
            <Box>
              <Button
                variant="contained"
                startIcon={<SettingsIcon />}
                endIcon={
                  showAdvancedConfig ? <ExpandLessIcon /> : <ExpandMoreIcon />
                }
                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                sx={{ borderRadius: 2 }}
              >
                Advanced Configuration
              </Button>

              <Collapse in={showAdvancedConfig}>
                <Box
                  sx={{
                    mt: 3,
                    p: 3,
                    bgcolor: darkMode ? '#2c2c2c' : 'grey.50',
                    borderRadius: 3,
                    color: darkMode ? '#fff' : 'inherit',
                  }}
                >
                  <ConfigSection
                    title="Allowed File Types"
                    items={allowedTypes}
                    onRemove={removeFileType}
                    value={newFileType}
                    onChange={setNewFileType}
                    onAdd={() => {
                      addMultipleItems(
                        newFileType,
                        setAllowedTypes,
                        allowedTypes
                      );
                      setNewFileType('');
                    }}
                    onKeyPress={(e) => handleKeyPress(e, 'file')}
                    color="primary"
                    placeholder="Add file types (e.g .js, .ts)"
                    darkMode={darkMode}
                  />

                  <Divider sx={{ my: 4 }} />

                  <ConfigSection
                    title="Ignored Files"
                    items={ignoreFiles}
                    onRemove={removeIgnoreFile}
                    value={newIgnoreFile}
                    onChange={setNewIgnoreFile}
                    onAdd={() => {
                      addMultipleItems(
                        newIgnoreFile,
                        setIgnoreFiles,
                        ignoreFiles
                      );
                      setNewIgnoreFile('');
                    }}
                    onKeyPress={(e) => handleKeyPress(e, 'ignoreFiles')}
                    color="warning"
                    placeholder="Add specific filenames to ignore (e.g. package-lock.json)"
                    darkMode={darkMode}
                  />

                  <Divider sx={{ my: 4 }} />

                  <ConfigSection
                    title="Ignored Directories"
                    items={ignoreDirs}
                    onRemove={removeIgnoreDir}
                    value={newIgnoreDir}
                    onChange={setNewIgnoreDir}
                    onAdd={() => {
                      addMultipleItems(newIgnoreDir, setIgnoreDirs, ignoreDirs);
                      setNewIgnoreDir('');
                    }}
                    onKeyPress={(e) => handleKeyPress(e, 'dir')}
                    color="secondary"
                    placeholder="Add directories to ignore (e.g node_modules, .git)"
                    darkMode={darkMode}
                  />
                </Box>
              </Collapse>
            </Box>

            {/* Progress indicator */}
            {isProcessing && (
              <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
            )}

            {/* Action buttons */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Tooltip title="Fetch files and build directory structure">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleScan}
                  disabled={!selectedDir || isProcessing}
                  startIcon={<PlayArrowIcon />}
                >
                  Generate
                </Button>
              </Tooltip>

              {scannedFiles.length > 0 && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleCopy}
                    startIcon={<ContentCopyIcon />}
                  >
                    Copy Project
                  </Button>

                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleExportFile}
                    startIcon={<SaveIcon />}
                  >
                    Export File
                  </Button>
                </>
              )}
            </Box>

            {/* Stats */}
            {scannedFiles.length > 0 && (
              <>
                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="text"
                    onClick={() => setShowStats(!showStats)}
                    endIcon={
                      showStats ? <ExpandLessIcon /> : <ExpandMoreIcon />
                    }
                  >
                    {showStats ? 'Hide Project Stats' : 'Show Project Stats'}
                  </Button>
                </Box>

                <Collapse in={showStats}>
                  <Paper
                    sx={{
                      mt: 2,
                      mb: 2,
                      borderRadius: 3,
                      backgroundColor: darkMode ? '#2c2c2c' : 'grey.50',
                      p: 2,
                      color: darkMode ? '#fff' : 'inherit',
                    }}
                    elevation={3}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 'bold',
                        mb: 2,
                        color: darkMode ? '#90caf9' : 'primary.main',
                      }}
                    >
                      Project Stats
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {/* Rows of stats */}
                    <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
                      <StatItem
                        icon={<InsertDriveFileIcon />}
                        label="Files"
                        value={projectStats.fileCount.toLocaleString()}
                        darkMode={darkMode}
                      />
                      <StatItem
                        icon={<FormatListNumberedIcon />}
                        label="Total Lines"
                        value={projectStats.lines.toLocaleString()}
                        darkMode={darkMode}
                      />
                      <StatItem
                        icon={<TextFieldsIcon />}
                        label="Characters"
                        value={projectStats.chars.toLocaleString()}
                        darkMode={darkMode}
                      />
                      <StatItem
                        icon={<TokenIcon />}
                        label="~Tokens"
                        value={projectStats.tokens.toLocaleString()}
                        darkMode={darkMode}
                      />
                    </Stack>

                    <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          Longest File (lines)
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: darkMode ? '#ccc' : 'text.secondary' }}
                        >
                          {projectStats.longestFileLines.toLocaleString()} lines
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.disabled' }}
                        >
                          {projectStats.longestFileName}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          Avg Lines/File
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: darkMode ? '#ccc' : 'text.secondary' }}
                        >
                          {averageLines.toLocaleString()}
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider sx={{ mb: 2 }} />

                    {/* Model selector + usage bar */}
                    <FormControl
                      size="small"
                      sx={{
                        minWidth: 200,
                        mb: 2,
                        mr: 2,
                        '& .MuiInputLabel-root': {
                          color: darkMode ? '#ccc' : 'inherit',
                        },
                        '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline':
                          {
                            borderColor: darkMode ? '#666' : 'inherit',
                          },
                        '& .MuiSvgIcon-root': {
                          color: darkMode ? '#ccc' : 'inherit',
                        },
                      }}
                    >
                      <InputLabel id="model-label">Model</InputLabel>
                      <Select
                        labelId="model-label"
                        value={selectedModel.name}
                        label="Model"
                        onChange={(e) => {
                          const chosen = modelContexts.find(
                            (m) => m.name === e.target.value
                          );
                          if (chosen) setSelectedModel(chosen);
                        }}
                        sx={{
                          color: darkMode ? '#fff' : 'inherit',
                          backgroundColor: darkMode ? '#333' : undefined,
                        }}
                      >
                        {modelContexts.map((model) => (
                          <MenuItem
                            key={model.name}
                            value={model.name}
                            sx={{
                              color: darkMode ? '#ccc' : 'inherit',
                              backgroundColor: darkMode ? '#1e1e1e' : 'inherit',
                              '&:hover': {
                                backgroundColor: darkMode
                                  ? '#2f2f2f'
                                  : 'grey.200',
                              },
                              '&.Mui-selected': {
                                backgroundColor: darkMode
                                  ? '#444'
                                  : 'action.hover',
                              },
                            }}
                          >
                            {model.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, color: darkMode ? '#ccc' : 'inherit' }}
                    >
                      Token Limit: {currentLimit.toLocaleString()}
                    </Typography>

                    {renderUsageBar(projectStats.tokens, currentLimit)}
                  </Paper>
                </Collapse>

                {/* File Explorer + Code Viewer */}
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ width: '100%', overflow: 'auto', mt: 2 }}
                >
                  <FileExplorer
                    darkMode={darkMode}
                    scannedFiles={scannedFiles}
                    selectedFile={selectedFile}
                    handleSelectFile={handleSelectFile}
                  />
                  <CodeViewer
                    darkMode={darkMode}
                    selectedFile={selectedFile}
                    scannedFiles={scannedFiles}
                  />
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      </Fade>
    </Box>
  );
};

export default App;
