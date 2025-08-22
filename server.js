require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("./auth");
const { fetchJobEmails, analyzeAllJobEmails, fetchIncrementalJobEmails } = require("./gmail");
const { 
  getUserApplications, 
  getLastScrapeTime, 
  updateLastScrapeTime, 
  storeApplications, 
  updateApplicationStatus,
  updateApplicationUrgency,
  deleteApplication,
  mergeApplications,
  generateSummaryFromDB 
} = require("./firebase");

// Live feed system for streaming logs
const activeSyncSessions = new Map(); // userId -> response object

// Enhanced logger that streams to SSE clients
function streamLog(userId, level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data,
    id: Date.now()
  };
  
  // Always log to console
  const originalLog = level === 'error' ? console.error : console.log;
  originalLog(`${message}${data ? ` ${JSON.stringify(data)}` : ''}`);
  
  // Stream to connected SSE clients
  console.log(`📤 Attempting to stream log to user ${userId}. Active sessions: ${activeSyncSessions.size}`);
  if (activeSyncSessions.has(userId)) {
    const res = activeSyncSessions.get(userId);
    try {
      console.log(`📤 Streaming log: ${level} - ${message}`);
      res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    } catch (error) {
      console.error('❌ Error streaming log:', error);
      activeSyncSessions.delete(userId);
    }
  } else {
    console.log(`⚠️ No active SSE session for user ${userId}`);
  }
}

// Create a scoped logger for a specific user session
function createSyncLogger(userId) {
  return {
    log: (message, data) => streamLog(userId, 'info', message, data),
    error: (message, data) => streamLog(userId, 'error', message, data),
    step: (stepNumber, title, message) => streamLog(userId, 'step', `📋 Step ${stepNumber}: ${title}`, { step: stepNumber, title, message }),
    progress: (current, total, message) => streamLog(userId, 'progress', message, { current, total, percentage: Math.round((current / total) * 100) }),
    success: (message, data) => streamLog(userId, 'success', `✅ ${message}`, data),
    warning: (message, data) => streamLog(userId, 'warning', `⚠️ ${message}`, data),
    company: (message, data) => streamLog(userId, 'company', `🏢 ${message}`, data),
    ai: (message, data) => streamLog(userId, 'ai', `🤖 ${message}`, data),
    email: (message, data) => streamLog(userId, 'email', `📧 ${message}`, data)
  };
}
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3001',
  credentials: true
}));
app.use(
  session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/auth/google", passport.authenticate("google"));

app.get("/api/auth/callback/google", passport.authenticate("google", { failureRedirect: "/" }), async (req, res) => {
  try {
    console.log("🔐 OAuth callback received - user authenticated");
    console.log("✅ OAuth callback completed successfully");
    // Redirect to frontend dashboard after successful authentication
    res.redirect('http://localhost:3001/dashboard');
  } catch (error) {
    console.error("❌ Error in OAuth callback:", error);
    res.redirect('http://localhost:3001/login?error=auth_failed');
  }
});

// Load applications from database
app.get("/api/applications", async (req, res) => {
  if (!req.isAuthenticated()) {
    console.log("❌ Unauthenticated request to /api/applications");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    console.log("📊 Loading applications from database...");
    const userId = req.user.id;
    const applications = await getUserApplications(userId);
    
    console.log(`✅ Loaded ${applications.length} applications from database`);
    res.json({
      success: true,
      applications: applications
    });
  } catch (error) {
    console.error("❌ Error loading applications:", error);
    res.status(500).json({ error: "Failed to load applications" });
  }
});

// Incremental sync endpoint
app.post("/api/update-emails", async (req, res) => {
  if (!req.isAuthenticated()) {
    console.log("❌ Unauthenticated request to /api/update-emails");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = req.user.id;
    console.log(`🔄 Starting sync for user: ${userId}`);
    const logger = createSyncLogger(userId);
    
    // Test that logging works immediately
    logger.log("🔄 Starting incremental email sync...");
    logger.log("🧪 Testing live feed connection...");
    
    // Step 1: Get existing applications for company lookup
    logger.step(1, "Loading Applications", "Getting existing applications for company lookup");
    const existingApplications = await getUserApplications(userId);
    logger.success(`Loaded ${existingApplications.length} existing applications`);
    
    // Step 2: Get last scrape time
    logger.step(2, "Checking Last Sync", "Determining sync starting point");
    const lastScrapeTime = await getLastScrapeTime(userId);
    if (lastScrapeTime) {
      logger.log(`📅 Last sync: ${new Date(lastScrapeTime).toLocaleString()}`);
    } else {
      logger.log("📅 First sync - will check last 50 days");
    }
    
    // Step 3: Fetch new emails since last scrape (with company matching)
    logger.step(3, "Analyzing Emails", "Scanning emails with AI and company matching");
    const newEmails = await fetchIncrementalJobEmails(req.user.accessToken, lastScrapeTime, existingApplications, logger);
    
    // Step 4: Store new applications in database
    logger.step(4, "Storing Data", "Saving new applications to database");
    const storageResult = await storeApplications(userId, newEmails);
    logger.success(`Stored ${storageResult.storedCount} new applications, updated ${storageResult.updatedCount} existing`);
    
    // Step 5: Update last scrape time
    logger.step(5, "Updating Sync Time", "Recording sync completion time");
    await updateLastScrapeTime(userId);
    logger.success("Sync timestamp updated");
    
    // Step 6: Generate summary from database
    logger.step(6, "Generating Summary", "Calculating application statistics");
    const summary = await generateSummaryFromDB(userId);
    logger.success("Summary generated successfully");
    
    logger.success("Incremental sync completed successfully!");
    res.json({
      success: true,
      newEmailsCount: storageResult.storedCount,
      updatedEmailsCount: storageResult.updatedCount || 0,
      skippedCount: storageResult.skippedCount,
      summary: summary
    });
  } catch (error) {
    console.error("❌ Error in incremental sync:", error);
    if (error.message.includes("Gmail access not properly authorized")) {
      res.status(403).json({ 
        error: "Gmail access not properly authorized. Please re-authenticate.",
        code: "GMAIL_AUTH_ERROR"
      });
    } else {
      res.status(500).json({ error: "Failed to sync emails" });
    }
  }
});

// Update application status
app.put("/api/applications/:applicationId/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    console.log("❌ Unauthenticated request to update application status");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { applicationId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    console.log(`🔄 Updating application ${applicationId} status to ${status} for user ${userId}`);
    await updateApplicationStatus(userId, applicationId, status);
    
    console.log("✅ Application status updated successfully");
    res.json({
      success: true,
      message: "Status updated successfully"
    });
  } catch (error) {
    console.error("❌ Error updating application status:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Update application urgency
app.put("/api/applications/:applicationId/urgency", async (req, res) => {
  if (!req.isAuthenticated()) {
    console.log("❌ Unauthenticated request to update application urgency");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { applicationId } = req.params;
    const { urgency } = req.body;
    const userId = req.user.id;

    if (!urgency) {
      return res.status(400).json({ error: "Urgency is required" });
    }

    console.log(`🔄 Updating application ${applicationId} urgency to ${urgency} for user ${userId}`);
    await updateApplicationUrgency(userId, applicationId, urgency);
    
    console.log("✅ Application urgency updated successfully");
    res.json({
      success: true,
      message: "Urgency updated successfully"
    });
  } catch (error) {
    console.error("❌ Error updating application urgency:", error);
    res.status(500).json({ error: "Failed to update urgency" });
  }
});

// Delete application
app.delete("/api/applications/:applicationId", async (req, res) => {
  if (!req.isAuthenticated()) {
    console.log("❌ Unauthenticated request to delete application");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    console.log(`🗑️ Deleting application ${applicationId} for user ${userId}`);
    await deleteApplication(userId, applicationId);
    
    console.log("✅ Application deleted successfully");
    res.json({
      success: true,
      message: "Application deleted successfully"
    });
  } catch (error) {
    console.error("❌ Error deleting application:", error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: "Application not found" });
    } else {
      res.status(500).json({ error: "Failed to delete application" });
    }
  }
});

// Merge selected applications
app.post("/api/applications/merge", async (req, res) => {
  if (!req.isAuthenticated()) {
    console.log("❌ Unauthenticated request to merge applications");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { applicationIds, primaryApplicationId } = req.body;
    const userId = req.user.id;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length < 2) {
      return res.status(400).json({ error: "At least 2 application IDs are required for merging" });
    }

    console.log(`🔄 Merging ${applicationIds.length} applications for user ${userId}`);
    const result = await mergeApplications(userId, applicationIds, primaryApplicationId);
    
    console.log("✅ Applications merged successfully");
    res.json({
      success: true,
      mergedApplicationId: result.mergedApplicationId,
      deletedApplicationIds: result.deletedApplicationIds,
      mergedCount: result.mergedCount,
      message: `Successfully merged ${result.mergedCount} applications`
    });
  } catch (error) {
    console.error("❌ Error merging applications:", error);
    res.status(500).json({ error: "Failed to merge applications" });
  }
});

// Get summary from database
app.get("/api/job-summary", async (req, res) => {
  if (!req.isAuthenticated()) {
    console.log("❌ Unauthenticated request to /api/job-summary");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    console.log("📊 Generating summary from database...");
    const userId = req.user.id;
    const summary = await generateSummaryFromDB(userId);
    
    // Get recent applications for display
    const applications = await getUserApplications(userId);
    const recentApplications = applications
      .sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt))
      .slice(0, 10);
    
    console.log("✅ Summary generated from database");
    res.json({
      success: true,
      summary,
      recentEmails: recentApplications
    });
  } catch (error) {
    console.error("❌ Error generating summary:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

// Legacy endpoint for full analysis (kept for backward compatibility)
app.get("/api/job-emails", async (req, res) => {
  if (!req.isAuthenticated()) {
    console.log("❌ Unauthenticated request to /api/job-emails");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    console.log("📧 Starting full job email analysis...");
    const jobEmails = await analyzeAllJobEmails(req.user.accessToken);
    console.log(`✅ Found ${jobEmails.length} job-related emails`);
    res.json({
      success: true,
      count: jobEmails.length,
      emails: jobEmails
    });
  } catch (error) {
    console.error("❌ Error analyzing job emails:", error);
    if (error.message.includes("Gmail access not properly authorized")) {
      res.status(403).json({ 
        error: "Gmail access not properly authorized. Please re-authenticate.",
        code: "GMAIL_AUTH_ERROR"
      });
    } else {
      res.status(500).json({ error: "Failed to analyze emails" });
    }
  }
});

// Check authentication status
app.get("/api/auth/status", (req, res) => {
  console.log("🔍 Checking authentication status...");
  const isAuth = req.isAuthenticated();
  console.log(`   - Authenticated: ${isAuth}`);
  if (isAuth) {
    console.log(`   - User: ${req.user.displayName || req.user.id}`);
  }
  res.json({ 
    authenticated: isAuth,
    user: req.user ? { id: req.user.id, displayName: req.user.displayName } : null
  });
});

// Server-Sent Events endpoint for live sync feed
app.get("/api/sync-feed", (req, res) => {
  console.log('📡 SSE connection attempt from:', req.isAuthenticated() ? req.user.id : 'unauthenticated');
  
  if (!req.isAuthenticated()) {
    console.log('❌ SSE connection rejected - not authenticated');
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userId = req.user.id;
  console.log(`✅ SSE connection established for user: ${userId}`);
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:3001',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Store the response object for this user
  activeSyncSessions.set(userId, res);
  console.log(`📡 Active SSE sessions: ${activeSyncSessions.size}`);
  
  // Send initial connection message
  const initialMessage = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: '🔗 Live feed connected',
    id: Date.now()
  };
  console.log('📤 Sending initial SSE message:', initialMessage);
  res.write(`data: ${JSON.stringify(initialMessage)}\n\n`);

  // Clean up on client disconnect
  req.on('close', () => {
    activeSyncSessions.delete(userId);
    console.log(`📡 SSE client disconnected: ${userId}. Active sessions: ${activeSyncSessions.size}`);
  });

  req.on('error', (error) => {
    console.error('❌ SSE error:', error);
    activeSyncSessions.delete(userId);
  });
});

// Logout endpoint
app.post("/api/auth/logout", (req, res) => {
  console.log("🚪 User logging out...");
  req.logout((err) => {
    if (err) {
      console.error("❌ Logout error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    console.log("✅ Logout successful");
    res.json({ success: true });
  });
});

app.get("/", (req, res) => {
  res.json({ message: "JobCAT API" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
