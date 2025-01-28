import React from 'react';
import { Paper, Box, Typography, Chip, IconButton } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  vs,
  vscDarkPlus,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { ScannedFile } from '../hooks/useScanFiles';
import { getFileLanguage } from '../utils/fileUtils';

interface Props {
  darkMode: boolean;
  selectedFile: ScannedFile | null;
  scannedFiles: ScannedFile[];
}

const CodeViewer: React.FC<Props> = ({
  darkMode,
  selectedFile,
  scannedFiles,
}) => {
  // Adjust prism style so we don't double-set background
  const styleCopy = darkMode ? { ...vscDarkPlus } : { ...vs };
  if (styleCopy.pre) {
    delete styleCopy.pre.background;
    delete styleCopy.pre.backgroundColor;
  }
  if (styleCopy.code) {
    delete styleCopy.code.background;
    delete styleCopy.code.backgroundColor;
  }

  // Local handler for copying a single file
  const handleCopySingleFile = () => {
    if (!selectedFile) return;
    const singleFileOutput = `### File: \`${selectedFile.filePath}\`\n\`\`\`\n${selectedFile.content}\n\`\`\``;
    navigator.clipboard.writeText(singleFileOutput);
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        width: 700,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        backgroundColor: darkMode ? '#1e1e1e' : 'background.paper',
        borderColor: darkMode ? 'grey.700' : 'grey.300',
        color: darkMode ? '#fff' : 'inherit',
      }}
    >
      {/* Header Row */}
      <Box
        sx={{
          p: 2,
          borderBottom: (theme) =>
            `1px solid ${darkMode ? 'grey.700' : 'grey.300'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {selectedFile ? selectedFile.filePath : 'No file selected'}
          </Typography>
          {selectedFile && (
            <IconButton
              size="small"
              onClick={handleCopySingleFile}
              sx={{ color: darkMode ? '#fff' : 'inherit' }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        <Chip
          label={`${selectedFile ? 1 : scannedFiles.length} file${
            selectedFile ? '' : 's'
          }`}
          size="small"
          color="info"
        />
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          whiteSpace: 'pre',
          position: 'relative',
          backgroundColor: darkMode ? '#1e1e1e' : '#f8f9fa',
          p: 2,
          color: darkMode ? '#fff' : 'inherit',
        }}
      >
        {selectedFile ? (
          <SyntaxHighlighter
            language={getFileLanguage(selectedFile.filePath)}
            style={styleCopy}
            customStyle={{
              margin: 0,
              backgroundColor: 'transparent',
              fontSize: '0.85rem',
            }}
          >
            {selectedFile.content}
          </SyntaxHighlighter>
        ) : (
          <Typography
            variant="body2"
            sx={{ color: darkMode ? 'grey.400' : 'grey.700' }}
          >
            Select a file on the left to preview its contents.
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default CodeViewer;
