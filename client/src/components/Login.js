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
            <Typography variant="h3" component="h1" gutterBottom>
              JobCAT
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Your Email Companion for Job Applications
            </Typography>
          </Box>

          <CardContent sx={{ padding: 4, backgroundColor: '#111111' }}>
            <Typography variant="h5" component="h2" gutterBottom align="center">
              Get Started
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
              Login with your Google account to track your job applications and get intelligent insights.
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
                backgroundColor: '#91973d',
                '&:hover': {
                  backgroundColor: '#7a7f35',
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
                <Typography component="li" variant="body2" color="text.secondary">
                  Incremental updates to save processing time
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