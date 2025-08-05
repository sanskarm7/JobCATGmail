import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

const CompanyView = ({ applications, onStatusUpdate }) => {
  const [editingStatus, setEditingStatus] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions = [
    { value: 'received', label: 'Received', color: '#7a7f35' },
    { value: 'under_review', label: 'Under Review', color: '#a3a94a' },
    { value: 'interview_scheduled', label: 'Interview Scheduled', color: '#0165FC' },
    { value: 'interview_completed', label: 'Interview Completed', color: '#0165FC' },
    { value: 'offer', label: 'Offer', color: '#d3af37' },
    { value: 'rejected', label: 'Rejected', color: '#950606' },
    { value: 'follow_up_needed', label: 'Follow Up Needed', color: '#91973d' },
    { value: 'other', label: 'Other', color: '#666666' },
  ];

  // Group applications by company
  const companiesByName = applications.reduce((acc, app) => {
    const company = app.company || app.aiAnalysis?.company || 'Unknown Company';
    if (!acc[company]) {
      acc[company] = [];
    }
    acc[company].push(app);
    return acc;
  }, {});

  // Sort companies by number of applications (descending)
  const sortedCompanies = Object.entries(companiesByName)
    .sort(([, a], [, b]) => b.length - a.length);

  const getStatusColor = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.color : '#666666';
  };

  const getStatusLabel = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : status.replace('_', ' ');
  };

  const handleStatusEdit = (application, event) => {
    setEditingStatus(application);
    setAnchorEl(event.currentTarget);
  };

  const handleStatusChange = async (newStatus) => {
    setAnchorEl(null);
    if (!editingStatus || newStatus === getApplicationStatus(editingStatus)) return;
    
    setIsUpdating(true);
    try {
      if (onStatusUpdate) {
        await onStatusUpdate(editingStatus.id || editingStatus.gmailId, newStatus);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
      setEditingStatus(null);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setEditingStatus(null);
  };

  const getApplicationStatus = (app) => {
    return app.status || app.aiAnalysis?.status || 'other';
  };

  const getApplicationPosition = (app) => {
    return app.position || app.aiAnalysis?.position || 'Unknown Position';
  };

  const getApplicationSentiment = (app) => {
    return app.sentiment || app.aiAnalysis?.sentiment || 'neutral';
  };

  const getApplicationUrgency = (app) => {
    return app.urgency || app.aiAnalysis?.urgency || 'low';
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      'positive': '#4caf50',
      'negative': '#950606',
      'neutral': '#666666',
    };
    return colors[sentiment] || '#666666';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      'high': '#950606',
      'medium': '#d3af37',
      'low': '#4caf50',
    };
    return colors[urgency] || '#666666';
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown Date';
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ color: '#ffffff', mb: 3 }}>
        Applications by Company
      </Typography>

      {sortedCompanies.map(([companyName, companyApplications]) => (
        <Accordion 
          key={companyName}
          sx={{
            backgroundColor: '#111111',
            border: '1px solid #333333',
            mb: 2,
            '&:before': {
              display: 'none',
            },
            '&.Mui-expanded': {
              margin: '0 0 16px 0',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#91973d' }} />}
            sx={{
              backgroundColor: '#000000',
              borderBottom: '1px solid #333333',
              '& .MuiAccordionSummary-content': {
                alignItems: 'center',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <BusinessIcon sx={{ color: '#91973d', mr: 2 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>
                  {companyName}
                </Typography>
                <Typography variant="body2" sx={{ color: '#cccccc' }}>
                  {companyApplications.length} application{companyApplications.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                {/* Show status distribution for this company */}
                {Object.entries(
                  companyApplications.reduce((acc, app) => {
                    const status = getApplicationStatus(app);
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([status, count]) => (
                  <Chip
                    key={status}
                    label={`${count}`}
                    size="small"
                    sx={{
                      backgroundColor: getStatusColor(status),
                      color: '#ffffff',
                      minWidth: '32px',
                    }}
                  />
                ))}
              </Box>
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ backgroundColor: '#111111', p: 0 }}>
            <Grid container spacing={0}>
              {companyApplications.map((application, index) => (
                <Grid item xs={12} key={application.id || application.gmailId}>
                  <Card 
                    sx={{ 
                      backgroundColor: index % 2 === 0 ? '#111111' : '#0a0a0a',
                      border: 'none',
                      borderRadius: 0,
                      boxShadow: 'none',
                      borderBottom: index < companyApplications.length - 1 ? '1px solid #333333' : 'none',
                    }}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <WorkIcon sx={{ color: '#91973d', mr: 1, fontSize: '1.2rem' }} />
                            <Typography variant="h6" sx={{ color: '#ffffff' }}>
                              {getApplicationPosition(application)}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <ScheduleIcon sx={{ color: '#91973d', mr: 0.5, fontSize: '1rem' }} />
                              <Typography variant="body2" sx={{ color: '#cccccc' }}>
                                Applied: {formatDate(application.date || application.lastEmailDate)}
                              </Typography>
                            </Box>
                            
                            {application.lastEmailDate && application.lastEmailDate !== application.date && (
                              <Typography variant="body2" sx={{ color: '#cccccc' }}>
                                Last Update: {formatDate(application.lastEmailDate)}
                              </Typography>
                            )}
                          </Box>

                          {application.nextAction && (
                            <Typography variant="body2" sx={{ color: '#a3a94a', fontStyle: 'italic' }}>
                              Next: {application.nextAction}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                          {/* Status with Edit */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={getStatusLabel(getApplicationStatus(application)).toUpperCase()}
                              size="small"
                              sx={{
                                backgroundColor: getStatusColor(getApplicationStatus(application)),
                                color: '#ffffff',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                            <Tooltip title="Edit Status">
                              <IconButton
                                size="small"
                                onClick={(e) => handleStatusEdit(application, e)}
                                disabled={isUpdating}
                                sx={{
                                  color: '#91973d',
                                  padding: '2px',
                                  '&:hover': {
                                    backgroundColor: 'rgba(145, 151, 61, 0.1)',
                                  },
                                }}
                              >
                                {isUpdating && editingStatus === application ? 
                                  <CheckIcon fontSize="small" /> : 
                                  <EditIcon fontSize="small" />
                                }
                              </IconButton>
                            </Tooltip>
                          </Box>

                          {/* Sentiment and Urgency */}
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Chip
                              label={getApplicationSentiment(application).toUpperCase()}
                              size="small"
                              sx={{
                                backgroundColor: getSentimentColor(getApplicationSentiment(application)),
                                color: '#ffffff',
                                fontSize: '0.7rem',
                              }}
                            />
                            <Chip
                              label={`${getApplicationUrgency(application).toUpperCase()}`}
                              size="small"
                              sx={{
                                backgroundColor: getUrgencyColor(getApplicationUrgency(application)),
                                color: '#ffffff',
                                fontSize: '0.7rem',
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

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
            disabled={editingStatus && option.value === getApplicationStatus(editingStatus)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              opacity: editingStatus && option.value === getApplicationStatus(editingStatus) ? 0.5 : 1,
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
            {editingStatus && option.value === getApplicationStatus(editingStatus) && 
              <CheckIcon fontSize="small" sx={{ ml: 'auto' }} />
            }
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default CompanyView;