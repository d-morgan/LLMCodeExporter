import React from 'react';
import { Paper, Box, Typography, Stack, Divider } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { ScannedFile } from '../hooks/useScanFiles';

interface Props {
  darkMode: boolean;
  scannedFiles: ScannedFile[];
  selectedFile: ScannedFile | null;
  handleSelectFile: (file: ScannedFile) => void;
}

const FileExplorer: React.FC<Props> = ({
  darkMode,
  scannedFiles,
  selectedFile,
  handleSelectFile,
}) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        width: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        backgroundColor: darkMode ? '#1e1e1e' : 'background.paper',
        borderColor: darkMode ? 'grey.700' : 'grey.300',
        color: darkMode ? '#fff' : 'inherit',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: darkMode ? 'grey.700' : 'grey.300',
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 700,
            color: darkMode ? '#90caf9' : 'primary.main',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <FolderOpenIcon sx={{ verticalAlign: 'middle' }} />
          Project Structure
        </Typography>
        <Divider sx={{ mt: 1 }} />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Stack spacing={1}>
          {scannedFiles.map((f) => {
            const isSelected = selectedFile?.filePath === f.filePath;
            return (
              <Paper
                key={f.filePath}
                elevation={0}
                onClick={() => handleSelectFile(f)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: (theme) =>
                    isSelected
                      ? `1px solid ${theme.palette.primary.main}`
                      : '1px solid transparent',
                  backgroundColor: isSelected
                    ? darkMode
                      ? 'rgba(25, 118, 210, 0.2)'
                      : 'rgba(25, 118, 210, 0.1)'
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: darkMode ? 'grey.800' : 'grey.100',
                    transform: 'translateX(4px)',
                  },
                  color: 'inherit',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CodeIcon
                    sx={{
                      fontSize: 16,
                      mr: 1.5,
                      color: darkMode ? 'grey.400' : 'grey.600',
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Fira Code, monospace',
                      fontSize: 13,
                      color: darkMode ? 'grey.300' : 'grey.700',
                      wordBreak: 'break-word',
                    }}
                  >
                    {f.filePath.split('/').pop()}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        ml: 1,
                        color: darkMode ? 'grey.500' : 'grey.500',
                        display: 'block',
                      }}
                    >
                      {f.filePath}
                    </Typography>
                  </Typography>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      </Box>
    </Paper>
  );
};

export default FileExplorer;
