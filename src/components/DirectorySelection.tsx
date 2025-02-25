import React, { DragEvent } from 'react';
import {
  Paper,
  Button,
  Box,
  Chip,
  Tooltip,
  Typography,
  Badge,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface Props {
  darkMode: boolean;
  selectedDir: string;
  setSelectedDir: React.Dispatch<React.SetStateAction<string>>;
  handleSelectDirectory: () => Promise<void>;
  isDragging: boolean;
  handleDragOver: (e: DragEvent<HTMLDivElement>) => void;
  handleDragLeave: () => void;
  handleDrop: (e: DragEvent<HTMLDivElement>) => Promise<void>;
  isWatching: boolean;
}

const DirectorySelection: React.FC<Props> = ({
  darkMode,
  selectedDir,
  setSelectedDir,
  handleSelectDirectory,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  isWatching,
}) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        border: '2px dashed',
        borderRadius: 3,
        textAlign: 'center',
        position: 'relative',
        transition: 'border-color 0.3s ease',
        borderColor: isDragging ? 'secondary.main' : 'primary.main',
        '&:hover': { borderColor: 'secondary.main' },
        backgroundColor: 'inherit',
        color: 'inherit',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Button
        variant="contained"
        startIcon={<FolderOpenIcon />}
        onClick={handleSelectDirectory}
        sx={{ borderRadius: 2, px: 4 }}
      >
        Select or Drag Project Folder
      </Button>

      {selectedDir && (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column' }}>
          <Tooltip title={selectedDir} arrow>
            <Chip
              label={selectedDir.split(/[/\\]/).pop() || selectedDir}
              color="success"
              variant="filled"
              sx={{
                fontWeight: 'bold',
                maxWidth: 250,
                mx: 'auto',
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              }}
              onDelete={() => setSelectedDir('')}
            />
          </Tooltip>
          <Typography
            variant="caption"
            sx={{
              mt: 1,
              maxWidth: 300,
              mx: 'auto',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: darkMode ? '#ccc' : 'textSecondary',
            }}
          >
            {selectedDir}
          </Typography>

          {isWatching ? (
            <Chip
              icon={<VisibilityIcon />}
              label="Auto-Updating Files"
              color="info"
              size="small"
              variant="outlined"
              sx={{
                mt: 1,
                maxWidth: 250,
                mx: 'auto',
                fontSize: '0.75rem',
              }}
            />
          ) : (
            selectedDir && (
              <Chip
                label="Watching Inactive - Toggle to Enable"
                color="warning"
                size="small"
                variant="outlined"
                sx={{
                  mt: 1,
                  maxWidth: 250,
                  mx: 'auto',
                  fontSize: '0.75rem',
                }}
              />
            )
          )}
        </Box>
      )}
    </Paper>
  );
};

export default DirectorySelection;
