import React, { KeyboardEvent } from 'react';
import { Box, Typography, Chip, TextField, IconButton } from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import AddIcon from '@mui/icons-material/Add';

interface Props {
  title: string;
  items: string[];
  onRemove: (item: string) => void;
  value: string;
  onChange: (val: string) => void;
  onAdd: () => void;
  onKeyPress: (e: KeyboardEvent<HTMLInputElement>) => void;
  color: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  placeholder: string;
  darkMode: boolean;
}

const ConfigSection: React.FC<Props> = ({
  title,
  items,
  onRemove,
  value,
  onChange,
  onAdd,
  onKeyPress,
  color,
  placeholder,
  darkMode,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="h6"
        gutterBottom
        sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}
      >
        <PaletteIcon color={color} sx={{ mr: 1 }} />
        {title}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {items.map((item) => (
          <Chip
            key={item}
            label={item}
            onDelete={() => onRemove(item)}
            color={color}
            variant="filled"
            sx={{ fontWeight: 'bold' }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          variant="filled"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          size="small"
          sx={{
            '& .MuiFilledInput-root': {
              backgroundColor: darkMode ? '#2c2c2c' : '#f2f2f2',
              color: darkMode ? '#fff' : '#000',
            },
            '& .MuiFilledInput-underline:before': { borderBottom: 0 },
          }}
        />
        <IconButton color={color} onClick={onAdd} sx={{ borderRadius: 1 }}>
          <AddIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default ConfigSection;
