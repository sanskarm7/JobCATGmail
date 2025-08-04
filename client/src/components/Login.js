import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Container,
  Paper,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';

const Login = () => {
  const { isAuthenticated, loading, login } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

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
            <Typography variant="h3" component="h1" gutterBottom>
              Job Application Email Analyzer
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              AI-powered analysis of your job application emails
            </Typography>
          </Box>

          <CardContent sx={{ padding: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom align="center">
              Get Started
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
              Login with your Google account to analyze your job application emails and track your application status.
            </Typography>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={login}
              startIcon={<GoogleIcon />}
              sx={{
                py: 1.5,
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                },
              }}
            >
              Login with Google
            </Button>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Features:
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  Intelligent email classification using AI
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Automatic status tracking and sentiment analysis
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Urgency assessment and priority alerts
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Comprehensive dashboard with analytics
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login; 