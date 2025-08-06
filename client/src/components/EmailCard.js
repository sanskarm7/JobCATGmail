import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Button,
  Collapse,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

const EmailCard = ({ email, onStatusUpdate }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statusOptions = [
    { value: 'received', label: 'Received', color: '#7a7f35' },
    { value: 'under_review', label: 'Under Review', color: '#a3a94a' },
    { value: 'interview_scheduled', label: 'Interview Scheduled', color: '#0165FC' },
    { value: 'interview_completed', label: 'Interview Completed', color: '#0165FC' },
    { value: 'offer', label: 'Offer', color: '#d3af37' },
    { value: 'rejected', label: 'Rejected', color: '#950606' },
    { value: 'follow_up_needed', label: 'Follow Up Needed', color: '#91973d' },
    { value: 'withdrawn', label: 'Withdrawn', color: '#666666' },
    { value: 'other', label: 'Other', color: '#999999' },
  ];

  const handleStatusEdit = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleStatusChange = async (newStatus) => {
    setAnchorEl(null);
    if (newStatus === analysis.status) return;
    
    setIsUpdating(true);
    try {
      if (onStatusUpdate) {
        await onStatusUpdate(email.id || email.gmailId, newStatus);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  // Use the same color scheme as StatusChart for consistency
  const getStatusColor = (status) => {
    const colorMap = {
      'received': '#7a7f35', // Dark jobcat green for applied
      'under_review': '#a3a94a', // Lighter jobcat green for under review
      'interview_scheduled': '#0165FC', // Blue for interviewing
      'interview_completed': '#0165FC', // Blue for interviewing
      'offer': '#d3af37', // Gold for acceptance
      'rejected': '#950606', // Red for rejection
      'follow_up_needed': '#91973d', // Jobcat green for follow up needed
      'other': '#333333', // Dark gray for other
    };
    return colorMap[status] || '#666666';
  };

  const getSentimentColor = (sentiment) => {
    const colorMap = {
      'positive': '#4caf50', // Green
      'negative': '#950606', // Red (same as rejection)
      'neutral': '#666666', // Gray
    };
    return colorMap[sentiment] || '#666666';
  };

  const getUrgencyColor = (urgency) => {
    const colorMap = {
      'high': '#950606', // Red (same as rejection)
      'medium': '#d3af37', // Gold (same as offer)
      'low': '#4caf50', // Green
    };
    return colorMap[urgency] || '#666666';
  };

  // Handle both old and new data structures
  const getAnalysisData = () => {
    if (email.aiAnalysis) {
      // Old structure (from Gmail API)
      return email.aiAnalysis;
    } else {
      // New structure (from Firebase)
      return {
        company: email.company,
        position: email.position,
        status: email.status,
        urgency: email.urgency,
        sentiment: email.sentiment,
        nextAction: email.nextAction,
        importantDates: email.importantDates || [],
        confidence: email.confidence,
        keyDetails: email.keyDetails || "No additional details"
      };
    }
  };

  const analysis = getAnalysisData();

  return (
    <Card sx={{ mb: 2, backgroundColor: '#111111', border: '1px solid #333333' }}>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            {/* Status Chip with Edit Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label={analysis.status.replace('_', ' ').toUpperCase()}
                size="small"
                sx={{
                  backgroundColor: getStatusColor(analysis.status),
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  '& .MuiChip-label': {
                    padding: '4px 8px',
                  },
                }}
              />
              <Tooltip title="Edit Status">
                <IconButton
                  size="small"
                  onClick={handleStatusEdit}
                  disabled={isUpdating}
                  sx={{
                    color: '#91973d',
                    padding: '2px',
                    '&:hover': {
                      backgroundColor: 'rgba(145, 151, 61, 0.1)',
                    },
                  }}
                >
                  {isUpdating ? <CheckIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
            
            {/* Status Edit Menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  backgroundColor: '#111111',
                  border: '1px solid #333333',
                  '& .MuiMenuItem-root': {
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#222222',
                    },
                  },
                },
              }}
            >
              {statusOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  disabled={option.value === analysis.status}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    opacity: option.value === analysis.status ? 0.5 : 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      backgroundColor: option.color,
                      borderRadius: '50%',
                    }}
                  />
                  {option.label}
                  {option.value === analysis.status && <CheckIcon fontSize="small" sx={{ ml: 'auto' }} />}
                </MenuItem>
              ))}
            </Menu>
            
            {/* Sentiment and Urgency Row */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={analysis.sentiment.toUpperCase()}
                size="small"
                sx={{
                  backgroundColor: getSentimentColor(analysis.sentiment),
                  color: '#ffffff',
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  '& .MuiChip-label': {
                    padding: '2px 6px',
                  },
                }}
              />
              <Chip
                label={`${analysis.urgency.toUpperCase()} URGENCY`}
                size="small"
                sx={{
                  backgroundColor: getUrgencyColor(analysis.urgency),
                  color: '#ffffff',
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  '& .MuiChip-label': {
                    padding: '2px 6px',
                  },
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Email Content Preview/Expand */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {email.preview || (email.body && email.body.substring(0, 150) + (email.body.length > 150 ? "..." : "")) || "No content available"}
          </Typography>
          
          {(email.body && email.body.length > 150) && (
            <Button
              size="small"
              onClick={() => setIsExpanded(!isExpanded)}
              endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ 
                color: '#91973d',
                textTransform: 'none',
                p: 0,
                minHeight: 'auto',
                '&:hover': { backgroundColor: 'transparent', color: '#a3a94a' }
              }}
            >
              {isExpanded ? 'Show Less' : 'Read More'}
            </Button>
          )}
          
          <Collapse in={isExpanded}>
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#0a0a0a', borderRadius: 1, border: '1px solid #333333' }}>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {email.body || "Full content not available"}
              </Typography>
              {email.htmlContent && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.disabled" sx={{ mb: 1, display: 'block' }}>
                    Raw HTML content (for debugging):
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.disabled" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: '200px',
                      overflow: 'auto',
                      p: 1,
                      backgroundColor: '#111111',
                      borderRadius: 0.5
                    }}
                  >
                    {email.htmlContent.substring(0, 500) + (email.htmlContent.length > 500 ? "..." : "")}
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>

        <Divider sx={{ my: 2, borderColor: '#333333' }} />

        <Typography variant="h6" gutterBottom>
          Application Details
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" mb={1}>
              <BusinessIcon sx={{ mr: 1, color: '#91973d' }} />
              <Typography variant="body2">
                <strong>Company:</strong> {analysis.company}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" mb={1}>
              <WorkIcon sx={{ mr: 1, color: '#91973d' }} />
              <Typography variant="body2">
                <strong>Position:</strong> {analysis.position}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" mb={1}>
              <ScheduleIcon sx={{ mr: 1, color: '#91973d' }} />
              <Typography variant="body2">
                <strong>Next Action:</strong> {analysis.nextAction}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" mb={1}>
              <InfoIcon sx={{ mr: 1, color: '#91973d' }} />
              <Typography variant="body2">
                <strong>Confidence:</strong> {Math.round((analysis.confidence || 0) * 100)}%
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Key Details:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {analysis.keyDetails}
            </Typography>
            {analysis.importantDates && analysis.importantDates.length > 0 && (
              <Box mt={1}>
                <Typography variant="body2">
                  <strong>Important Dates:</strong>
                </Typography>
                {analysis.importantDates.map((date, index) => (
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