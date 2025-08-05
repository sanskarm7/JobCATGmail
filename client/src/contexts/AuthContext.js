import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:3000';
axios.defaults.withCredentials = true;

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log("🔍 Checking authentication status...");
      const response = await axios.get('/api/auth/status');
      console.log("✅ Auth status response:", response.data);
      
      if (response.data.authenticated) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        console.log("✅ User authenticated:", response.data.user);
        
        // Don't automatically load applications - let user click "Sync" to load data
      } else {
        console.log("❌ User not authenticated");
        setIsAuthenticated(false);
        setUser(null);
        setApplications([]);
        setSummary(null);
      }
    } catch (error) {
      console.error("❌ Error checking auth status:", error);
      setIsAuthenticated(false);
      setUser(null);
      setApplications([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      console.log("📊 Loading applications from database...");
      const response = await axios.get('/api/applications');
      console.log("✅ Applications loaded:", response.data);
      
      if (response.data.success) {
        setApplications(response.data.applications);
        console.log(`📊 Loaded ${response.data.applications.length} applications from database`);
      }
    } catch (error) {
      console.error("❌ Error loading applications:", error);
      setError("Failed to load applications");
    }
  };

  const loadJobSummary = async () => {
    try {
      console.log("📊 Loading job summary from database...");
      const response = await axios.get('/api/job-summary');
      console.log("✅ Job summary loaded:", response.data);
      
      if (response.data.success) {
        setSummary(response.data.summary);
        setApplications(response.data.recentEmails || []);
        console.log("📊 Summary loaded from database");
      }
    } catch (error) {
      console.error("❌ Error loading job summary:", error);
      setError("Failed to load job summary");
    }
  };

  const updateJobEmails = async () => {
    try {
      console.log("🔄 Starting incremental email sync...");
      setError(null);
      
      const response = await axios.post('/api/update-emails');
      console.log("✅ Update response:", response.data);
      
      if (response.data.success) {
        console.log(`🔄 Sync completed: ${response.data.newEmailsCount} new emails, ${response.data.skippedCount} skipped`);
        setSummary(response.data.summary);
        
        // Reload applications to get updated list
        await loadApplications();
        
        return {
          success: true,
          newEmailsCount: response.data.newEmailsCount,
          skippedCount: response.data.skippedCount
        };
      }
    } catch (error) {
      console.error("❌ Error updating job emails:", error);
      if (error.response?.data?.code === "GMAIL_AUTH_ERROR") {
        setError("Gmail access not properly authorized. Please re-authenticate.");
      } else {
        setError("Failed to update job emails");
      }
      throw error;
    }
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      console.log(`🔄 Updating application ${applicationId} status to ${newStatus}...`);
      setError(null);
      
      const response = await axios.put(`/api/applications/${applicationId}/status`, {
        status: newStatus
      });
      
      if (response.data.success) {
        console.log("✅ Application status updated successfully");
        
        // Update local applications state
        setApplications(prev => prev.map(app => 
          (app.id === applicationId || app.gmailId === applicationId) 
            ? { ...app, status: newStatus, manuallyUpdated: true }
            : app
        ));
        
        // Reload summary to reflect changes
        await loadJobSummary();
        
        return true;
      }
    } catch (error) {
      console.error("❌ Error updating application status:", error);
      setError("Failed to update application status");
      throw error;
    }
  };

  const login = () => {
    console.log("🔐 Initiating Google OAuth login...");
    window.location.href = 'http://localhost:3000/api/auth/google';
  };

  const logout = async () => {
    try {
      console.log("🚪 Logging out...");
      await axios.post('/api/auth/logout');
      console.log("✅ Logout successful");
      
      setIsAuthenticated(false);
      setUser(null);
      setApplications([]);
      setSummary(null);
      setError(null);
    } catch (error) {
      console.error("❌ Error during logout:", error);
    }
  };

  const getJobEmails = async () => {
    try {
      console.log("📧 Fetching job emails...");
      const response = await axios.get('/api/job-emails');
      console.log("✅ Job emails response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching job emails:", error);
      throw error;
    }
  };

  const getJobSummary = async () => {
    try {
      console.log("📊 Fetching job summary...");
      const response = await axios.get('/api/job-summary');
      console.log("✅ Job summary response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching job summary:", error);
      throw error;
    }
  };

  const value = {
    isAuthenticated,
    loading,
    user,
    applications,
    summary,
    error,
    login,
    logout,
    getJobEmails,
    getJobSummary,
    updateJobEmails,
    updateApplicationStatus,
    loadApplications,
    loadJobSummary,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 