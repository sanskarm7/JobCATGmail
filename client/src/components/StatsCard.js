import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const StatsCard = ({ title, value, icon, color = 'primary', onClick, active = false }) => {
  const getColor = () => {
    switch (color) {
      case 'primary':
        return '#91973d'; // JobCAT green
      case 'secondary':
        return '#FFFFFF'; // Black
      case 'error':
        return '#f44336'; // Red
      case 'success':
        return '#4caf50'; // Green
      default:
        return '#91973d';
    }
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        backgroundColor: active ? getColor() : '#111111',
        border: active ? `2px solid ${getColor()}` : '1px solid #333333',
        transition: 'transform 0.2s, border-color 0.2s, background-color 0.2s',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          transform: onClick ? 'translateY(-4px)' : 'none',
          borderColor: getColor(),
          backgroundColor: active ? getColor() : '#1a1a1a',
        },
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="div" sx={{ 
              fontWeight: 'bold', 
              color: active ? '#000000' : getColor() 
            }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ 
              opacity: 0.9, 
              color: active ? '#000000' : '#cccccc' 
            }}>
              {title}
            </Typography>
          </Box>
          <Box
            sx={{
              opacity: 0.8,
              color: active ? '#000000' : getColor(),
              '& svg': {
                fontSize: '2.5rem',
              },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard; 