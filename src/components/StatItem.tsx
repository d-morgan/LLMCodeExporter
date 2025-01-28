import React from 'react';
import { Box, Typography } from '@mui/material';

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  darkMode: boolean;
}

const StatItem: React.FC<StatItemProps> = ({
  icon,
  label,
  value,
  darkMode,
}) => {
  return (
    <Box minWidth={70} textAlign="center">
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: 'primary.light',
          color: 'primary.contrastText',
          mb: 0.5,
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle2" fontWeight="600">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: darkMode ? '#ccc' : 'text.secondary',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

export default StatItem;
