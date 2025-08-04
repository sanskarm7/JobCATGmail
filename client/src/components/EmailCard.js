import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

const EmailCard = ({ email }) => {
  const getStatusColor = (status) => {
    const colors = {
      received: 'primary',
      under_review: 'warning',
      interview_scheduled: 'success',
      interview_completed: 'info',
      offer: 'success',
      rejected: 'error',
      follow_up_needed: 'warning',
      other: 'default',
    };
    return colors[status] || 'default';
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      positive: 'success',
      negative: 'error',
      neutral: 'default',
    };
    return colors[sentiment] || 'default';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      high: 'error',
      medium: 'warning',
      low: 'success',
    };
    return colors[urgency] || 'default';
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" component="h3" gutterBottom>
              {email.subject}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              From: {email.from}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Date: {new Date(email.date).toLocaleDateString()}
            </Typography>
          </Box>
          <Box>
            <Chip
              label={email.aiAnalysis.status.replace('_', ' ')}
              color={getStatusColor(email.aiAnalysis.status)}
              size="small"
              sx={{ mb: 1 }}
            />
            <Chip
              label={email.aiAnalysis.sentiment}
              color={getSentimentColor(email.aiAnalysis.sentiment)}
              size="small"
              sx={{ mb: 1, ml: 1 }}
            />
            <Chip
              label={`${email.aiAnalysis.urgency} urgency`}
              color={getUrgencyColor(email.aiAnalysis.urgency)}
              size="small"
              sx={{ ml: 1 }}
            />
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {email.body}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          AI Analysis
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" mb={1}>
              <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body2">
                <strong>Company:</strong> {email.aiAnalysis.company}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" mb={1}>
              <WorkIcon sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="body2">
                <strong>Position:</strong> {email.aiAnalysis.position}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" mb={1}>
              <ScheduleIcon sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="body2">
                <strong>Next Action:</strong> {email.aiAnalysis.nextAction}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" mb={1}>
              <InfoIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">
                <strong>Confidence:</strong> {Math.round(email.aiAnalysis.confidence * 100)}%
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Key Details:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {email.aiAnalysis.keyDetails}
            </Typography>
            {email.aiAnalysis.importantDates && email.aiAnalysis.importantDates.length > 0 && (
              <Box mt={1}>
                <Typography variant="body2">
                  <strong>Important Dates:</strong>
                </Typography>
                {email.aiAnalysis.importantDates.map((date, index) => (
                  <Chip
                    key={index}
                    label={date}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default EmailCard; 