import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Divider,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Business as BusinessIcon,
  SmartToy as SmartToyIcon,
  Email as EmailIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

const LiveFeed = ({ isVisible, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [isExpanded, setIsExpanded] = useState(true);
  const [eventSource, setEventSource] = useState(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (isVisible && !eventSource) {
      console.log('🔗 Connecting to live feed...');
      
      // Connect to Server-Sent Events with full URL for better compatibility
      const sse = new EventSource('http://localhost:3000/api/sync-feed', { withCredentials: true });
      
      sse.onopen = () => {
        console.log('✅ SSE connection opened');
        setLogs(prev => [...prev, {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '🔗 Live feed connected',
          id: Date.now()
        }]);
      };
      
      sse.onmessage = (event) => {
        console.log('📡 SSE message received:', event.data);
        try {
          const logEntry = JSON.parse(event.data);
          
          setLogs(prevLogs => {
            const newLogs = [...prevLogs, logEntry];
            // Keep only last 100 logs to prevent memory issues
            return newLogs.slice(-100);
          });

          // Update step tracking
          if (logEntry.level === 'step') {
            setCurrentStep(logEntry.data);
          }

          // Update progress tracking
          if (logEntry.level === 'progress') {
            setProgress(logEntry.data);
          }

          // Auto-scroll to bottom
          setTimeout(() => {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);

        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      sse.onerror = (error) => {
        console.error('❌ SSE error:', error);
        console.error('SSE readyState:', sse.readyState);
        setLogs(prev => [...prev, {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: '❌ Live feed connection error',
          id: Date.now()
        }]);
        setEventSource(null);
      };

      setEventSource(sse);
    }

    return () => {
      if (eventSource) {
        console.log('🔌 Closing SSE connection');
        eventSource.close();
        setEventSource(null);
      }
    };
  }, [isVisible, eventSource]);

  const getLogIcon = (level) => {
    switch (level) {
      case 'success': return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 16 }} />;
      case 'error': return <ErrorIcon sx={{ color: '#f44336', fontSize: 16 }} />;
      case 'warning': return <WarningIcon sx={{ color: '#ff9800', fontSize: 16 }} />;
      case 'step': return <AssessmentIcon sx={{ color: '#91973d', fontSize: 16 }} />;
      case 'company': return <BusinessIcon sx={{ color: '#2196f3', fontSize: 16 }} />;
      case 'ai': return <SmartToyIcon sx={{ color: '#9c27b0', fontSize: 16 }} />;
      case 'email': return <EmailIcon sx={{ color: '#ff5722', fontSize: 16 }} />;
      case 'progress': return <InfoIcon sx={{ color: '#607d8b', fontSize: 16 }} />;
      default: return <InfoIcon sx={{ color: '#90a4ae', fontSize: 16 }} />;
    }
  };

  const getLogColor = (level) => {
    switch (level) {
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'step': return '#91973d';
      case 'company': return '#2196f3';
      case 'ai': return '#9c27b0';
      case 'email': return '#ff5722';
      default: return '#90a4ae';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!isVisible) return null;

  return (
    <Paper 
      elevation={3}
      sx={{ 
        position: 'fixed',
        top: 20,
        right: 20,
        width: 400,
        maxHeight: '80vh',
        backgroundColor: '#111111',
        border: '1px solid #333333',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #333333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ color: '#fff', fontSize: '1.1rem' }}>
            Live Sync Feed
          </Typography>
          {currentStep && (
            <Chip 
              label={`Step ${currentStep.step}`}
              size="small"
              sx={{ 
                backgroundColor: '#91973d',
                color: '#000',
                fontSize: '0.75rem'
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton 
            size="small" 
            onClick={() => setIsExpanded(!isExpanded)}
            sx={{ color: '#91973d' }}
          >
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <IconButton 
            size="small" 
            onClick={onClose}
            sx={{ color: '#ccc' }}
          >
            ×
          </IconButton>
        </Box>
      </Box>

      <Collapse in={isExpanded}>
        {/* Current Step */}
        {currentStep && (
          <Box sx={{ p: 2, borderBottom: '1px solid #333333' }}>
            <Typography variant="subtitle2" sx={{ color: '#91973d', mb: 1 }}>
              {currentStep.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc', mb: 2 }}>
              {currentStep.message}
            </Typography>
            
            {/* Progress Bar */}
            {progress.total > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    Progress
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    {progress.current}/{progress.total} ({progress.percentage}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={progress.percentage}
                  sx={{
                    backgroundColor: '#333333',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#91973d'
                    }
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        {/* Log Feed */}
        <Box sx={{ 
          flexGrow: 1, 
          maxHeight: '400px', 
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#222222',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#555555',
            borderRadius: '3px',
          },
        }}>
          <List dense>
            {logs.map((log, index) => (
              <ListItem 
                key={log.id || index}
                sx={{ 
                  py: 0.5,
                  borderLeft: `3px solid ${getLogColor(log.level)}`,
                  backgroundColor: log.level === 'step' ? 'rgba(145, 151, 61, 0.1)' : 'transparent'
                }}
              >
                <ListItemIcon sx={{ minWidth: 24 }}>
                  {getLogIcon(log.level)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: log.level === 'error' ? '#f44336' : '#fff',
                        fontSize: '0.85rem',
                        fontWeight: log.level === 'step' ? 'bold' : 'normal'
                      }}
                    >
                      {log.message}
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      variant="caption" 
                      sx={{ color: '#aaa', fontSize: '0.75rem' }}
                    >
                      {formatTime(log.timestamp)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
            <div ref={logsEndRef} />
          </List>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default LiveFeed;
