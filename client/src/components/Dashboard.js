import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CompanyView from './CompanyView';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  LinearProgress,
  Paper,
  Chip,
} from '@mui/material';
import {
  Update as UpdateIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  PriorityHigh as PriorityIcon,
  TrendingUp as TrendingIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassIcon,
} from '@mui/icons-material';
import StatsCard from './StatsCard';
import EmailCard from './EmailCard';
import StatusChart from './StatusChart';

const Dashboard = () => {
  const { 
    isAuthenticated, 
    loading, 
    user, 
    applications, 
    summary, 
    error, 
    logout, 
    updateJobEmails, 
    updateApplicationStatus,
    loadApplications, 
    loadJobSummary 
  } = useAuth();
  
  const [updating, setUpdating] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all'); // New filter state

  useEffect(() => {
    // Don't automatically load data on mount
    // User should click "Sync" to load their data
  }, []);

  // Filter applications based on active filter
  const getFilteredApplications = () => {
    if (!applications || applications.length === 0) return [];
    
    switch (activeFilter) {
      case 'all':
        return applications;
      case 'urgent':
        return applications.filter(app => app.urgency === 'high' || (app.aiAnalysis && app.aiAnalysis.urgency === 'high'));
      case 'positive':
        return applications.filter(app => app.sentiment === 'positive' || (app.aiAnalysis && app.aiAnalysis.sentiment === 'positive'));
      case 'under_review':
        return applications.filter(app => app.status === 'under_review' || (app.aiAnalysis && app.aiAnalysis.status === 'under_review'));
      case 'interview_scheduled':
        return applications.filter(app => app.status === 'interview_scheduled' || (app.aiAnalysis && app.aiAnalysis.status === 'interview_scheduled'));
      case 'follow_up_needed':
        return applications.filter(app => app.status === 'follow_up_needed' || (app.aiAnalysis && app.aiAnalysis.status === 'follow_up_needed'));
      case 'received':
        return applications.filter(app => app.status === 'received' || (app.aiAnalysis && app.aiAnalysis.status === 'received'));
      case 'interview_completed':
        return applications.filter(app => app.status === 'interview_completed' || (app.aiAnalysis && app.aiAnalysis.status === 'interview_completed'));
      case 'offer':
        return applications.filter(app => app.status === 'offer' || (app.aiAnalysis && app.aiAnalysis.status === 'offer'));
      case 'rejected':
        return applications.filter(app => app.status === 'rejected' || (app.aiAnalysis && app.aiAnalysis.status === 'rejected'));
      default:
        return applications;
    }
  };

  const filteredApplications = getFilteredApplications();

  const getFilterTitle = () => {
    const filterTitles = {
      'all': 'All Job Applications',
      'companies': 'Applications by Company',
      'urgent': 'Urgent Applications',
      'positive': 'Positive Updates',
      'under_review': 'Under Review',
      'interview_scheduled': 'Interview Scheduled',
      'follow_up_needed': 'Follow Up Needed',
      'received': 'Recently Received',
      'interview_completed': 'Interview Completed',
      'offer': 'Job Offers',
      'rejected': 'Rejected Applications'
    };
    return filterTitles[activeFilter] || 'Job Applications';
  };

  const getLoadingIcon = () => {
    switch (loadingStep) {
      case 'analyzing':
        return <SyncIcon sx={{ fontSize: 40, color: '#91973d' }} />;
      case 'processing':
        return <HourglassIcon sx={{ fontSize: 40, color: '#91973d' }} />;
      case 'updating':
        return <UpdateIcon sx={{ fontSize: 40, color: '#91973d' }} />;
      case 'complete':
        return <CheckCircleIcon sx={{ fontSize: 40, color: '#91973d' }} />;
      default:
        return <EmailIcon sx={{ fontSize: 40, color: '#91973d' }} />;
    }
  };

  const getLoadingMessage = () => {
    switch (loadingStep) {
      case 'analyzing':
        return 'Analyzing emails with AI...';
      case 'processing':
        return 'Processing applications...';
      case 'updating':
        return 'Syncing with Gmail...';
      case 'complete':
        return 'Update complete!';
      default:
        return 'Connecting to Gmail...';
    }
  };

  const handleUpdate = async () => {
    try {
      console.log("🔄 Starting incremental update...");
      setUpdating(true);
      // setError(null); // This line was removed from the new_code, so it's removed here.
      
      // Simulate progress updates
      setLoadingStep('updating');
      setProgress(20);
      
      setTimeout(() => {
        setLoadingStep('analyzing');
        setProgress(50);
      }, 1000);
      
      setTimeout(() => {
        setLoadingStep('processing');
        setProgress(80);
      }, 2000);
      
      const result = await updateJobEmails();
      
      setLoadingStep('complete');
      setProgress(100);
      
      setTimeout(() => {
        setUpdating(false);
        setLoadingStep('');
        setProgress(0);
      }, 1500);
      
      console.log("✅ Update completed successfully:", result);
    } catch (error) {
      console.error("❌ Update failed:", error);
      setUpdating(false);
      setLoadingStep('');
      setProgress(0);
    }
  };

  const handleReauthenticate = () => {
    window.location.href = 'http://localhost:3000/api/auth/google';
  };

  const handleLogout = () => {
    logout();
  };

  const loadData = () => {
    loadJobSummary();
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={8}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              backgroundColor: '#111111',
              border: '1px solid #333333',
            }}
          >
            <Box
              sx={{
                backgroundColor: '#000000',
                color: 'white',
                padding: 4,
                textAlign: 'center',
                borderBottom: '1px solid #333333',
              }}
            >
              <Typography variant="h4" component="h1" gutterBottom>
                JobCAT
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Job Collector and Tracker
              </Typography>
            </Box>

            <Box sx={{ p: 4, backgroundColor: '#111111' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                <SyncIcon sx={{ fontSize: 40, color: '#91973d' }} />
                <Typography variant="h6" sx={{ ml: 2 }}>
                  Loading...
                </Typography>
              </Box>

              <LinearProgress 
                variant="indeterminate"
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  mb: 2,
                  backgroundColor: '#333333',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: '#91973d',
                  }
                }} 
              />

              <Typography variant="body2" color="text.secondary" align="center">
                Checking authentication and loading your data...
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (updating) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={8}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              backgroundColor: '#111111',
              border: '1px solid #333333',
            }}
          >
            <Box
              sx={{
                backgroundColor: '#000000',
                color: 'white',
                padding: 4,
                textAlign: 'center',
                borderBottom: '1px solid #333333',
              }}
            >
              <Typography variant="h4" component="h1" gutterBottom>
                JobCAT
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Job Collector and Tracker
              </Typography>
            </Box>

            <Box sx={{ p: 4, backgroundColor: '#111111' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                {getLoadingIcon()}
                <Typography variant="h6" sx={{ ml: 2 }}>
                  {getLoadingMessage()}
                </Typography>
              </Box>

              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  mb: 2,
                  backgroundColor: '#333333',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: '#91973d',
                  }
                }} 
              />

              <Typography variant="body2" color="text.secondary" align="center">
                {loadingStep === 'analyzing' && 'Using AI to classify emails and extract key information...'}
                {loadingStep === 'processing' && 'Extracting company names, positions, and status updates...'}
                {loadingStep === 'updating' && 'Checking for new emails and updating your applications...'}
                {loadingStep === 'complete' && 'Preparing your dashboard...'}
                {!['analyzing', 'processing', 'updating', 'complete'].includes(loadingStep) && 'Please wait while we process your emails...'}
              </Typography>

              {loadingStep === 'analyzing' && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    This may take a few moments as we analyze each email with AI
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#000000' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            JobCAT
          </Typography>
          <Button
            color="inherit"
            startIcon={<UpdateIcon />}
            onClick={handleUpdate}
            disabled={updating}
            sx={{ mr: 2 }}
          >
            {updating ? 'Updating...' : 'Sync'}
          </Button>
          <Button
            color="inherit"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              error.includes('Gmail access not properly authorized') ? (
                <Button color="inherit" size="small" onClick={handleReauthenticate}>
                  Re-authenticate
                </Button>
              ) : (
                <Button color="inherit" size="small" onClick={loadData}>
                  Retry
                </Button>
              )
            }
          >
            {error}
          </Alert>
        )}

        {summary && (
          <>
            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Total Applications"
                  value={summary.totalApplications}
                  icon={<EmailIcon />}
                  color="primary"
                  onClick={() => setActiveFilter('companies')}
                  active={activeFilter === 'companies'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Companies Applied"
                  value={summary.companies.length}
                  icon={<BusinessIcon />}
                  color="secondary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Urgent Emails"
                  value={summary.urgentEmails.length}
                  icon={<PriorityIcon />}
                  color="error"
                  onClick={() => setActiveFilter('urgent')}
                  active={activeFilter === 'urgent'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Positive Updates"
                  value={summary.positiveUpdates.length}
                  icon={<TrendingIcon />}
                  color="success"
                  onClick={() => setActiveFilter('positive')}
                  active={activeFilter === 'positive'}
                />
              </Grid>
            </Grid>

            {/* Status Breakdown */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                      Application Status Breakdown
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Object.entries(summary.statusBreakdown).map(([status, count]) => (
                        <Chip
                          key={status}
                          label={`${status.replace('_', ' ')}: ${count}`}
                          color={getStatusColor(status)}
                          variant={activeFilter === status ? "filled" : "outlined"}
                          onClick={() => setActiveFilter(status)}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: activeFilter === status ? 'inherit' : 'rgba(145, 151, 61, 0.1)',
                            },
                            backgroundColor: activeFilter === status ? '#91973d' : 'transparent',
                            color: activeFilter === status ? '#000000' : '#ffffff',
                            borderColor: activeFilter === status ? '#91973d' : '#666666',
                          }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <StatusChart statusBreakdown={summary.statusBreakdown} />
              </Grid>
            </Grid>

            {/* Filtered Applications */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: '#ffffff', mb: 0 }}>
                {getFilterTitle()}
              </Typography>
              {activeFilter !== 'all' && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setActiveFilter('all')}
                  sx={{
                    borderColor: '#91973d',
                    color: '#91973d',
                    '&:hover': {
                      borderColor: '#7a7f35',
                      backgroundColor: 'rgba(145, 151, 61, 0.1)',
                    },
                  }}
                >
                  Show All
                </Button>
              )}
            </Box>
            
            {activeFilter === 'companies' ? (
              <CompanyView 
                applications={applications} 
                onStatusUpdate={updateApplicationStatus}
              />
            ) : filteredApplications.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#111111', border: '1px solid #333333' }}>
                <Typography variant="h6" color="text.secondary">
                  {activeFilter === 'all' ? 'No job applications found' : `No applications found for "${getFilterTitle()}"`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeFilter === 'all' ? 'Try syncing to check for new applications.' : 'Try selecting a different filter or sync for new applications.'}
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                                  {filteredApplications.map((application) => (
                    <Grid item xs={12} key={application.id}>
                      <EmailCard 
                        email={application} 
                        onStatusUpdate={updateApplicationStatus}
                      />
                    </Grid>
                  ))}
              </Grid>
            )}
          </>
        )}

        {!summary && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h4" gutterBottom sx={{ color: '#91973d' }}>
              Welcome to JobCAT
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              Job Collector and Tracker
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Ready to track your job applications? Click "Sync" to connect with your Gmail and start analyzing your job-related emails.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<UpdateIcon />}
              onClick={handleUpdate}
              sx={{
                backgroundColor: '#91973d',
                '&:hover': {
                  backgroundColor: '#7a7f35',
                },
              }}
            >
              Start Syncing
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
};

// Helper function for status colors
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

export default Dashboard; 