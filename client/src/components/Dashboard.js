import React, { useState, useEffect, useMemo } from 'react';
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
  Sort as SortIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
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
    updateApplicationUrgency,
    deleteApplication,
    mergeApplications,
    loadApplications, 
    loadJobSummary 
  } = useAuth();
  
  const [updating, setUpdating] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all'); // New filter state
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for newest first, 'asc' for oldest first

  useEffect(() => {
    // Data is now automatically loaded in AuthContext when user is authenticated
    // This ensures users see their existing applications immediately upon login
  }, []);

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
    
    if (dates.length === 0) {
      console.log('⚠️ No dates found for app:', app.company || app.aiAnalysis?.company);
      return new Date(0); // Fallback to epoch for apps with no dates
    }
    
    // Convert to Date objects and find the most recent
    const datObjects = dates.map(d => {
      let date;
      
      // Handle Firestore Timestamp objects
      if (d && typeof d === 'object' && d._seconds !== undefined) {
        // Convert Firestore Timestamp to JavaScript Date
        date = new Date(d._seconds * 1000 + (d._nanoseconds || 0) / 1000000);
      } else {
        // Handle regular date strings
        date = new Date(d);
      }
      
      if (isNaN(date.getTime())) {
        console.log('⚠️ Invalid date found:', d, 'for app:', app.company || app.aiAnalysis?.company);
        return new Date(0);
      }
      return date;
    }).filter(d => !isNaN(d.getTime())); // Filter out any remaining invalid dates
    
    if (datObjects.length === 0) {
      console.log('⚠️ All dates invalid for app:', app.company || app.aiAnalysis?.company);
      return new Date(0); // Fallback if all dates were invalid
    }
    
    return new Date(Math.max(...datObjects));
  };



  const filteredApplications = useMemo(() => {
    console.log('🔄 Recomputing filteredApplications with:', { 
      applicationsCount: applications?.length || 0, 
      activeFilter, 
      sortOrder 
    });
    
    if (!applications || applications.length === 0) return [];
    
    let filtered;
    switch (activeFilter) {
      case 'all':
        filtered = applications;
        break;
      case 'companies':
        filtered = applications; // Show all applications grouped by company
        break;
      case 'urgent':
        filtered = applications.filter(app => app.urgency === 'high' || (app.aiAnalysis && app.aiAnalysis.urgency === 'high'));
        break;
      case 'positive':
        filtered = applications.filter(app => app.sentiment === 'positive' || (app.aiAnalysis && app.aiAnalysis.sentiment === 'positive'));
        break;
      case 'under_review':
        filtered = applications.filter(app => app.status === 'under_review' || (app.aiAnalysis && app.aiAnalysis.status === 'under_review'));
        break;
      case 'interview_scheduled':
        filtered = applications.filter(app => app.status === 'interview_scheduled' || (app.aiAnalysis && app.aiAnalysis.status === 'interview_scheduled'));
        break;
      case 'follow_up_needed':
        filtered = applications.filter(app => app.status === 'follow_up_needed' || (app.aiAnalysis && app.aiAnalysis.status === 'follow_up_needed'));
        break;
      case 'received':
        filtered = applications.filter(app => app.status === 'received' || (app.aiAnalysis && app.aiAnalysis.status === 'received'));
        break;
      case 'interview_completed':
        filtered = applications.filter(app => app.status === 'interview_completed' || (app.aiAnalysis && app.aiAnalysis.status === 'interview_completed'));
        break;
      case 'offer':
        filtered = applications.filter(app => app.status === 'offer' || (app.aiAnalysis && app.aiAnalysis.status === 'offer'));
        break;
      case 'rejected':
        filtered = applications.filter(app => app.status === 'rejected' || (app.aiAnalysis && app.aiAnalysis.status === 'rejected'));
        break;
      case 'withdrawn':
        filtered = applications.filter(app => app.status === 'withdrawn' || (app.aiAnalysis && app.aiAnalysis.status === 'withdrawn'));
        break;
      default:
        filtered = applications;
        break;
    }

    // Sort by date based on sortOrder state (create a new array to avoid mutation)
    const sorted = [...filtered].sort((a, b) => {
      try {
        const dateA = getApplicationDate(a);
        const dateB = getApplicationDate(b);
        
        // Debug logging for first few applications
        if (filtered.indexOf(a) < 3 || filtered.indexOf(b) < 3) {
          console.log('📊 Sorting debug:', {
            appA: { 
              company: a.company || a.aiAnalysis?.company, 
              dateA: isNaN(dateA.getTime()) ? 'Invalid Date' : dateA.toISOString(), 
              rawDate: a.date || a.lastEmailDate 
            },
            appB: { 
              company: b.company || b.aiAnalysis?.company, 
              dateB: isNaN(dateB.getTime()) ? 'Invalid Date' : dateB.toISOString(), 
              rawDate: b.date || b.lastEmailDate 
            },
            sortOrder,
            comparison: sortOrder === 'desc' ? (dateB - dateA) : (dateA - dateB)
          });
        }
        
        if (sortOrder === 'desc') {
          return dateB - dateA; // Descending order (newest first)
        } else {
          return dateA - dateB; // Ascending order (oldest first)
        }
      } catch (error) {
        console.error("❌ Error sorting applications:", error, {
          appA: { id: a?.id, hasDate: !!(a?.date || a?.lastEmailDate) },
          appB: { id: b?.id, hasDate: !!(b?.date || b?.lastEmailDate) }
        });
        return 0; // Keep original order if error
      }
    });
    
    // Log the final sorted order
    console.log('📋 Final sorted order:', sorted.slice(0, 5).map(app => {
      const appDate = getApplicationDate(app);
      return {
        company: app.company || app.aiAnalysis?.company,
        date: isNaN(appDate.getTime()) ? 'Invalid Date' : appDate.toISOString(),
        subject: app.subject
      };
    }));
    
    return sorted;
  }, [applications, activeFilter, sortOrder]);

  const getFilterTitle = () => {
    const filterTitles = {
      'all': 'All Job Application Emails',
      'companies': 'Applications by Company',
      'urgent': 'Urgent Applications',
      'positive': 'Positive Updates',
      'under_review': 'Under Review',
      'interview_scheduled': 'Interview Scheduled',
      'follow_up_needed': 'Follow Up Needed',
      'received': 'Recently Received',
      'interview_completed': 'Interview Completed',
      'offer': 'Job Offers',
      'rejected': 'Rejected Applications',
      'withdrawn': 'Withdrawn Applications'
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
              error.includes('Gmail access not properly authorized') || error.includes('Session expired') ? (
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
                  onClick={() => setActiveFilter('companies')}
                  active={activeFilter === 'companies'}
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
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Sort Controls - only show for email lists, not company view */}
                {activeFilter !== 'companies' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#cccccc', display: { xs: 'none', sm: 'block' } }}>
                      Sort by date:
                    </Typography>
                    <Button
                      variant={sortOrder === 'desc' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => {
                        console.log('Setting sort order to desc');
                        setSortOrder('desc');
                      }}
                      startIcon={<ArrowDownwardIcon />}
                      sx={{
                        minWidth: { xs: '40px', sm: 'auto' },
                        backgroundColor: sortOrder === 'desc' ? '#91973d' : 'transparent',
                        borderColor: '#91973d',
                        color: sortOrder === 'desc' ? '#000000' : '#91973d',
                        '&:hover': {
                          backgroundColor: sortOrder === 'desc' ? '#a3a94a' : 'rgba(145, 151, 61, 0.1)',
                          borderColor: '#a3a94a',
                          color: sortOrder === 'desc' ? '#000000' : '#a3a94a',
                        },
                        '& .MuiButton-startIcon': {
                          margin: { xs: 0, sm: '0 8px 0 -4px' }
                        }
                      }}
                    >
                      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Newest</Box>
                    </Button>
                    <Button
                      variant={sortOrder === 'asc' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => {
                        console.log('Setting sort order to asc');
                        setSortOrder('asc');
                      }}
                      startIcon={<ArrowUpwardIcon />}
                      sx={{
                        minWidth: { xs: '40px', sm: 'auto' },
                        backgroundColor: sortOrder === 'asc' ? '#91973d' : 'transparent',
                        borderColor: '#91973d',
                        color: sortOrder === 'asc' ? '#000000' : '#91973d',
                        '&:hover': {
                          backgroundColor: sortOrder === 'asc' ? '#a3a94a' : 'rgba(145, 151, 61, 0.1)',
                          borderColor: '#a3a94a',
                          color: sortOrder === 'asc' ? '#000000' : '#a3a94a',
                        },
                        '& .MuiButton-startIcon': {
                          margin: { xs: 0, sm: '0 8px 0 -4px' }
                        }
                      }}
                    >
                      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Oldest</Box>
                    </Button>
                  </Box>
                )}
                
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
            </Box>
            
            {activeFilter === 'companies' ? (
              <CompanyView 
                applications={filteredApplications} 
                onStatusUpdate={updateApplicationStatus}
                onUrgencyUpdate={updateApplicationUrgency}
                onDeleteApplication={deleteApplication}
                onMergeApplications={mergeApplications}
                sortOrder={sortOrder}
              />
            ) : filteredApplications.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#111111', border: '1px solid #333333' }}>
                <Typography variant="h6" color="text.secondary">
                  {activeFilter === 'all' ? 'No job applications found' : `No applications found for "${getFilterTitle()}"`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeFilter === 'all' 
                    ? (applications && applications.length === 0 && !loading 
                        ? 'Click "Sync with Gmail" to fetch your job application emails.' 
                        : 'Try syncing to check for new applications.')
                    : 'Try selecting a different filter or sync for new applications.'}
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                                  {filteredApplications.map((application) => (
                    <Grid item xs={12} key={application.id}>
                      <EmailCard 
                        email={application} 
                        onStatusUpdate={updateApplicationStatus}
                        onUrgencyUpdate={updateApplicationUrgency}
                        onDeleteApplication={deleteApplication}
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