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
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Merge as MergeIcon,
} from '@mui/icons-material';

const CompanyView = ({ applications, onStatusUpdate, onUrgencyUpdate, onMergeApplications }) => {
  const [editingStatus, setEditingStatus] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Selection and merge state
  const [selectedApplications, setSelectedApplications] = useState(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedPrimary, setSelectedPrimary] = useState('');
  const [merging, setMerging] = useState(false);

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

  // Get the most recent date from an application
  const getApplicationDate = (app) => {
    // Try different date fields and return the most recent one
    const dates = [
      app.lastEmailDate,
      app.date,
      app.scrapedAt,
      app.updatedAt,
      app.aiAnalysis?.date
    ].filter(Boolean); // Remove null/undefined values
    
    if (dates.length === 0) return new Date(0); // Fallback to epoch for apps with no dates
    
    // Convert to Date objects and find the most recent
    const datObjects = dates.map(d => new Date(d));
    return new Date(Math.max(...datObjects));
  };

  // Group applications by company
  const companiesByName = applications.reduce((acc, app) => {
    const company = app.company || app.aiAnalysis?.company || 'Unknown Company';
    if (!acc[company]) {
      acc[company] = [];
    }
    acc[company].push(app);
    return acc;
  }, {});

  // Sort companies by number of applications (descending) and sort applications within each company by date (newest first)
  const sortedCompanies = Object.entries(companiesByName)
    .map(([company, apps]) => [
      company, 
      apps.sort((a, b) => {
        const dateA = getApplicationDate(a);
        const dateB = getApplicationDate(b);
        return dateB - dateA; // Descending order (newest first)
      })
    ])
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

  // Selection handlers
  const handleSelectApplication = (applicationId) => {
    setSelectedApplications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(applicationId)) {
        newSet.delete(applicationId);
      } else {
        newSet.add(applicationId);
      }
      return newSet;
    });
  };

  const handleSelectAllInCompany = (companyApplications) => {
    const companyIds = companyApplications.map(app => app.id || app.gmailId);
    const allSelected = companyIds.every(id => selectedApplications.has(id));
    
    setSelectedApplications(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all in this company
        companyIds.forEach(id => newSet.delete(id));
      } else {
        // Select all in this company
        companyIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedApplications(new Set());
  };

  // Merge handlers
  const handleMergeSelected = () => {
    if (selectedApplications.size < 2) return;
    
    const applicationIds = Array.from(selectedApplications);
    setSelectedPrimary(applicationIds[0]); // Default to first selected
    setMergeDialogOpen(true);
  };

  const handleConfirmMerge = async () => {
    if (!onMergeApplications || selectedApplications.size < 2) return;
    
    setMerging(true);
    try {
      const applicationIds = Array.from(selectedApplications);
      await onMergeApplications(applicationIds, selectedPrimary);
      
      // Clear selection and close dialog
      setSelectedApplications(new Set());
      setMergeDialogOpen(false);
      setSelectedPrimary('');
    } catch (error) {
      console.error('Failed to merge applications:', error);
    } finally {
      setMerging(false);
    }
  };

  const handleCloseMergeDialog = () => {
    if (!merging) {
      setMergeDialogOpen(false);
      setSelectedPrimary('');
    }
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

  const selectedAppsData = applications.filter(app => 
    selectedApplications.has(app.id || app.gmailId)
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {selectedApplications.size > 0 && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: '#91973d' }}>
              {selectedApplications.size} selected
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={clearSelection}
              sx={{ 
                color: '#ffffff',
                borderColor: '#666666',
                '&:hover': { borderColor: '#91973d' }
              }}
            >
              Clear
            </Button>
            {selectedApplications.size >= 2 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<MergeIcon />}
                onClick={handleMergeSelected}
                sx={{ 
                  backgroundColor: '#91973d',
                  '&:hover': { backgroundColor: '#7a7f35' }
                }}
              >
                Merge Selected
              </Button>
            )}
          </Box>
        )}
      </Box>

      {sortedCompanies.map(([companyName, companyApplications]) => {
        const companyIds = companyApplications.map(app => app.id || app.gmailId);
        const someSelected = companyIds.some(id => selectedApplications.has(id));
        const allSelected = companyIds.every(id => selectedApplications.has(id));
        
        return (
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
              {companyApplications.length > 1 && (
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={() => handleSelectAllInCompany(companyApplications)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    color: '#91973d',
                    '&.Mui-checked': { color: '#91973d' },
                    '&.MuiCheckbox-indeterminate': { color: '#91973d' },
                    mr: 1
                  }}
                />
              )}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <Checkbox
                            checked={selectedApplications.has(application.id || application.gmailId)}
                            onChange={() => handleSelectApplication(application.id || application.gmailId)}
                            sx={{
                              color: '#91973d',
                              '&.Mui-checked': { color: '#91973d' },
                              mr: 1,
                              p: 0.5
                            }}
                          />
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
        );
      })}

      {/* Merge Confirmation Dialog */}
      <Dialog 
        open={mergeDialogOpen} 
        onClose={handleCloseMergeDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#111111',
            border: '1px solid #333333',
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid #333333' }}>
          Merge Selected Applications
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedApplications.size >= 2 && (
            <>
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 2,
                  backgroundColor: '#2a1f00',
                  border: '1px solid #d3af37',
                  '& .MuiAlert-icon': { color: '#d3af37' },
                  '& .MuiAlert-message': { color: '#ffffff' }
                }}
              >
                This will combine {selectedApplications.size} applications into one. This action cannot be undone.
              </Alert>
              
              <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
                Select which application should be the primary (keep its basic information):
              </Typography>
              
              <FormControl component="fieldset">
                <RadioGroup
                  value={selectedPrimary}
                  onChange={(e) => setSelectedPrimary(e.target.value)}
                >
                  {selectedAppsData.map((app) => (
                    <FormControlLabel
                      key={app.id || app.gmailId}
                      value={app.id || app.gmailId}
                      control={<Radio sx={{ color: '#91973d', '&.Mui-checked': { color: '#91973d' } }} />}
                      label={
                        <Box>
                          <Typography variant="body1" sx={{ color: '#ffffff' }}>
                            {getApplicationPosition(app)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#cccccc' }}>
                            Applied: {formatDate(app.lastEmailDate || app.date)}
                          </Typography>
                        </Box>
                      }
                      sx={{ mb: 1 }}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #333333', p: 2 }}>
          <Button 
            onClick={handleCloseMergeDialog} 
            disabled={merging}
            sx={{ color: '#ffffff' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmMerge}
            disabled={merging || !selectedPrimary}
            variant="contained"
            sx={{ 
              backgroundColor: '#91973d',
              '&:hover': { backgroundColor: '#7a7f35' },
              '&:disabled': { backgroundColor: '#333333' }
            }}
          >
            {merging ? 'Merging...' : 'Merge Applications'}
          </Button>
        </DialogActions>
      </Dialog>

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