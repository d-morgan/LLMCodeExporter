import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { ScannedFile } from '../hooks/useScanFiles';

interface Props {
  darkMode: boolean;
  scannedFiles: ScannedFile[];
  selectedDir: string;
}

export const generateProjectStructure = (
  scannedFiles: ScannedFile[],
  selectedDir: string
): string => {
  if (!scannedFiles.length) return '';

  // Create a nested structure
  const fileStructure: { [key: string]: any } = {};

  // Sort files by path to ensure a consistent structure
  const sortedFiles = [...scannedFiles].sort((a, b) =>
    a.filePath.localeCompare(b.filePath)
  );

  // Build the nested structure
  sortedFiles.forEach((file) => {
    // Split the path into segments
    const pathSegments = file.filePath.split('/');

    // Start at the root of the structure
    let current = fileStructure;

    // Navigate through the path
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];

      // If we're at the last segment (the file itself)
      if (i === pathSegments.length - 1) {
        current[segment] = 'file';
      } else {
        // We're in a directory
        if (!current[segment]) {
          current[segment] = {};
        }
        current = current[segment];
      }
    }
  });

  // Function to render the structure as text
  const renderStructure = (obj: any, prefix = '', isLast = true): string => {
    let result = '';
    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const isLastItem = i === keys.length - 1;

      // Generate the line prefix
      const linePrefix = prefix + (isLast ? '    ' : '│   ');

      // Generate the branch symbol
      const branchSymbol = isLastItem ? '└── ' : '├── ';

      // Add the current line
      result += prefix + branchSymbol + key + '\n';

      // If it's a directory, recursively render its contents
      if (obj[key] !== 'file') {
        result += renderStructure(obj[key], linePrefix, isLastItem);
      }
    }

    return result;
  };

  // Get the root directory name from the first file
  const rootDir = selectedDir.split('/').pop() || 'Project';

  // Return the formatted structure
  return `Project Structure: ${rootDir}\n${renderStructure(fileStructure)}`;
};

const ProjectStructureViewer: React.FC<Props> = ({
  darkMode,
  scannedFiles,
  selectedDir,
}) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [structureText, setStructureText] = useState<string>('');

  const handleOpenDialog = () => {
    const generatedStructure = generateProjectStructure(
      scannedFiles,
      selectedDir
    );
    setStructureText(generatedStructure);
    setDialogOpen(true);
    navigator.clipboard.writeText(generatedStructure);
  };

  return (
    <>
      <Button
        variant="contained"
        color="info"
        onClick={handleOpenDialog}
        startIcon={<AccountTreeIcon />}
        disabled={scannedFiles.length === 0}
      >
        Project Structure
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            backgroundColor: darkMode ? '#1e1e1e' : 'background.paper',
            color: darkMode ? '#fff' : 'inherit',
          }}
        >
          Project Structure
        </DialogTitle>
        <DialogContent
          sx={{
            backgroundColor: darkMode ? '#1e1e1e' : 'background.paper',
            color: darkMode ? '#fff' : 'inherit',
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              backgroundColor: darkMode ? '#282c34' : '#f5f5f5',
              color: darkMode ? '#fff' : 'inherit',
              fontFamily: 'monospace',
              overflowX: 'auto',
              whiteSpace: 'pre',
              borderRadius: 1,
              mt: 2,
            }}
          >
            {structureText}
          </Paper>
        </DialogContent>
        <DialogActions
          sx={{ backgroundColor: darkMode ? '#1e1e1e' : 'background.paper' }}
        >
          <Button onClick={() => setDialogOpen(false)} color="primary">
            Close
          </Button>
          <Button
            onClick={() => navigator.clipboard.writeText(structureText)}
            color="success"
            startIcon={<ContentCopyIcon />}
          >
            Copy to Clipboard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProjectStructureViewer;
