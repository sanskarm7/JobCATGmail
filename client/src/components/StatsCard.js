import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const StatsCard = ({ title, value, icon, color = 'primary' }) => {
  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color === 'primary' ? '#667eea' : 
          color === 'secondary' ? '#764ba2' : 
          color === 'error' ? '#f44336' : 
          color === 'success' ? '#4caf50' : '#667eea'} 0%, 
          ${color === 'primary' ? '#764ba2' : 
          color === 'secondary' ? '#667eea' : 
          color === 'error' ? '#d32f2f' : 
          color === 'success' ? '#388e3c' : '#764ba2'} 100%)`,
        color: 'white',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
        },
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {title}
            </Typography>
          </Box>
          <Box
            sx={{
              opacity: 0.8,
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