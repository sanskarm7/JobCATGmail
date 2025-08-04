import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  PriorityHigh as PriorityIcon,
  TrendingUp as TrendingIcon,
  Warning as WarningIcon,
  Search as SearchIcon,
  Psychology as PsychologyIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import EmailCard from './EmailCard';
import StatsCard from './StatsCard';
import StatusChart from './StatusChart';

const Dashboard = () => {
  const { user, logout, getJobSummary } = useAuth();
  const [summary, setSummary] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState('initializing');
  const [progress, setProgress] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      setLoadingStep('connecting');
      
      console.log('🔄 Starting data load process...');
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);

      console.log('📡 Making API request to /api/job-summary...');
      setLoadingStep('fetching');
      const data = await getJobSummary();
      
      console.log('✅ API response received:', data);
      
      clearInterval(progressInterval);
      setProgress(100);
      setLoadingStep('complete');
      
      console.log('📊 Processing summary data...');
      
      // Small delay to show completion
      setTimeout(() => {
        setSummary(data.summary);
        setEmails(data.recentEmails);
        setLoading(false);
        console.log('🎉 Dashboard loaded successfully!');
      }, 500);
      
    } catch (err) {
      console.error('❌ Error loading data:', err);
      if (err.response?.data?.code === 'GMAIL_AUTH_ERROR') {
        setError('Gmail access not properly authorized. Please re-authenticate with Google.');
      } else {
        setError(err.message || 'Failed to load data');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleReauthenticate = () => {
    window.location.href = 'http://localhost:3000/api/auth/google';
  };

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

  const getLoadingMessage = () => {
    const messages = {
      initializing: 'Initializing email analyzer...',
      connecting: 'Connecting to Gmail...',
      fetching: 'Fetching your emails...',
      analyzing: 'Analyzing job application emails with AI...',
      processing: 'Processing email content...',
      complete: 'Analysis complete!'
    };
    return messages[loadingStep] || 'Processing...';
  };

  const getLoadingIcon = () => {
    switch (loadingStep) {
      case 'initializing':
        return <CircularProgress size={24} />;
      case 'connecting':
        return <EmailIcon sx={{ fontSize: 24 }} />;
      case 'fetching':
        return <SearchIcon sx={{ fontSize: 24 }} />;
      case 'analyzing':
        return <PsychologyIcon sx={{ fontSize: 24 }} />;
      case 'processing':
        return <CircularProgress size={24} />;
      case 'complete':
        return <CheckCircleIcon sx={{ fontSize: 24, color: 'success.main' }} />;
      default:
        return <CircularProgress size={24} />;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
              background: 'white',
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: 4,
                textAlign: 'center',
              }}
            >
              <Typography variant="h4" component="h1" gutterBottom>
                Job Application Email Analyzer
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                AI-powered analysis of your job application emails
              </Typography>
            </Box>

            <Box sx={{ p: 4 }}>
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
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                  }
                }} 
              />

              <Typography variant="body2" color="text.secondary" align="center">
                {loadingStep === 'analyzing' && 'Using AI to classify emails and extract key information...'}
                {loadingStep === 'processing' && 'Extracting company names, positions, and status updates...'}
                {loadingStep === 'complete' && 'Preparing your dashboard...'}
                {!['analyzing', 'processing', 'complete'].includes(loadingStep) && 'Please wait while we process your emails...'}
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
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Job Application Email Analyzer
          </Typography>
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
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  title="Positive Updates"
                  value={summary.positiveUpdates.length}
                  icon={<TrendingIcon />}
                  color="success"
                />
              </Grid>
            </Grid>

            {/* Status Breakdown */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Application Status Breakdown
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Object.entries(summary.statusBreakdown).map(([status, count]) => (
                        <Chip
                          key={status}
                          label={`${status.replace('_', ' ')}: ${count}`}
                          color={getStatusColor(status)}
                          variant="outlined"
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

            {/* Recent Emails */}
            <Typography variant="h5" gutterBottom>
              Recent Job Application Emails
            </Typography>
            {emails.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No job application emails found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try refreshing or check back later.
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {emails.map((email) => (
                  <Grid item xs={12} key={email.id}>
                    <EmailCard email={email} />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default Dashboard; 