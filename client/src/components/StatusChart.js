import React from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const StatusChart = ({ statusBreakdown }) => {
  // Status-specific color mapping
  const getStatusColor = (status) => {
    const colorMap = {
      'received': '#7a7f35', // Dark jobcat green for applied
      'under_review': '#a3a94a', // Lighter jobcat green for under review
      'interview_scheduled': '#0165FC', // Blue for interviewing
      'interview_completed': '#0165FC', // Blue for interviewing
      'offer': '#d3af37', // Gold for acceptance
      'rejected': '#950606', // Red for rejection
      'follow_up_needed': '#91973d', // Jobcat green for follow up needed
      'withdrawn': '#666666', // Dark gray for withdrawn
      'other': '#999999', // Light gray for other
    };
    return colorMap[status] || '#999999'; // Default light gray
  };

  const data = Object.entries(statusBreakdown).map(([status, value]) => ({
    name: status.replace('_', ' '),
    value,
    color: getStatusColor(status),
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{
          backgroundColor: '#111111',
          color: '#ffffff',
          padding: '12px',
          border: '1px solid #333333',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {payload[0].name}: {payload[0].value}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card sx={{ backgroundColor: '#111111', border: '1px solid #333333' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', mb: 3 }}>
          Status Distribution
        </Typography>
        
        <Grid container spacing={2}>
          {/* Legend on the left */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {data.map((item, index) => {
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                return (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        backgroundColor: item.color,
                        borderRadius: '2px',
                        border: item.color === '#000000' ? '1px solid #333333' : 'none',
                      }}
                    />
                    <Typography variant="body2" sx={{ color: '#cccccc', flex: 1 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#91973d', fontWeight: 600 }}>
                      {item.value} ({percentage}%)
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Grid>
          
          {/* Pie chart on the right */}
          <Grid item xs={12} md={8}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default StatusChart; 