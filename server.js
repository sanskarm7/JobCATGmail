// Only load .env in local development
if (!process.env.VERCEL) {
  require("dotenv").config();
}

// Debug environment variables in production
if (process.env.VERCEL) {
  console.log("🔍 Environment check:");
  console.log("VERCEL:", !!process.env.VERCEL);
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("GOOGLE_CLIENT_ID:", !!process.env.GOOGLE_CLIENT_ID);
  console.log("GOOGLE_CLIENT_SECRET:", !!process.env.GOOGLE_CLIENT_SECRET);
  console.log("GOOGLE_CALLBACK_URL:", !!process.env.GOOGLE_CALLBACK_URL);
  console.log("SESSION_SECRET:", !!process.env.SESSION_SECRET);
  console.log("OPENAI_API_KEY:", !!process.env.OPENAI_API_KEY);
}

const express = require("express");
const session = require("express-session");
const passport = require("./auth");
const { fetchIncrementalJobEmails } = require("./gmail");
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
const cors = require("cors");

const activeSyncSessions = new Map();

function streamLog(userId, level, message, data = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    id: Date.now()
  };
  
  const originalLog = level === 'error' ? console.error : console.log;
  originalLog(`${message}${data ? ` ${JSON.stringify(data)}` : ''}`);
  
  if (activeSyncSessions.has(userId)) {
    const res = activeSyncSessions.get(userId);
    try {
      res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    } catch (error) {
      console.error('❌ Error streaming log:', error);
      activeSyncSessions.delete(userId);
    }
  }
}

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

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL]
    : 'http://localhost:3001',
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
    res.redirect(process.env.NODE_ENV === 'production' 
      ? `${process.env.FRONTEND_URL}/dashboard`
      : 'http://localhost:3001/dashboard');
  } catch (error) {
    console.error("❌ OAuth callback error:", error);
    res.redirect(process.env.NODE_ENV === 'production'
      ? `${process.env.FRONTEND_URL}/login?error=auth_failed`
      : 'http://localhost:3001/login?error=auth_failed');
  }
});

app.get("/api/applications", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = req.user.id;
    const applications = await getUserApplications(userId);
    
    res.json({
      success: true,
      applications: applications
    });
  } catch (error) {
    console.error("❌ Error loading applications:", error);
    res.status(500).json({ error: "Failed to load applications" });
  }
});

app.post("/api/update-emails", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = req.user.id;
    const logger = createSyncLogger(userId);
    
    logger.log("🔄 Starting incremental email sync...");
    
    logger.step(1, "Loading Applications", "Getting existing applications for company lookup");
    const existingApplications = await getUserApplications(userId);
    logger.success(`Loaded ${existingApplications.length} existing applications`);
    
    logger.step(2, "Checking Last Sync", "Determining sync starting point");
    const lastScrapeTime = await getLastScrapeTime(userId);
    if (lastScrapeTime) {
      logger.log(`📅 Last sync: ${new Date(lastScrapeTime).toLocaleString()}`);
    } else {
      logger.log("📅 First sync - will check last 50 days");
    }
    
    logger.step(3, "Analyzing Emails", "Scanning emails with AI and company matching");
    const newEmails = await fetchIncrementalJobEmails(req.user.accessToken, lastScrapeTime, existingApplications, logger);
    
    logger.step(4, "Storing Data", "Saving new applications to database");
    const storageResult = await storeApplications(userId, newEmails);
    logger.success(`Stored ${storageResult.storedCount} new applications, updated ${storageResult.updatedCount} existing`);
    
    logger.step(5, "Updating Sync Time", "Recording sync completion time");
    await updateLastScrapeTime(userId);
    logger.success("Sync timestamp updated");
    
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

app.put("/api/applications/:applicationId/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { applicationId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    await updateApplicationStatus(userId, applicationId, status);
    res.json({
      success: true,
      message: "Status updated successfully"
    });
  } catch (error) {
    console.error("❌ Error updating application status:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

app.put("/api/applications/:applicationId/urgency", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { applicationId } = req.params;
    const { urgency } = req.body;
    const userId = req.user.id;

    if (!urgency) {
      return res.status(400).json({ error: "Urgency is required" });
    }

    await updateApplicationUrgency(userId, applicationId, urgency);
    res.json({
      success: true,
      message: "Urgency updated successfully"
    });
  } catch (error) {
    console.error("❌ Error updating application urgency:", error);
    res.status(500).json({ error: "Failed to update urgency" });
  }
});

app.delete("/api/applications/:applicationId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    await deleteApplication(userId, applicationId);
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

app.post("/api/applications/merge", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { applicationIds, primaryApplicationId } = req.body;
    const userId = req.user.id;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length < 2) {
      return res.status(400).json({ error: "At least 2 application IDs are required for merging" });
    }

    const result = await mergeApplications(userId, applicationIds, primaryApplicationId);
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

app.get("/api/job-summary", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = req.user.id;
    const summary = await generateSummaryFromDB(userId);
    
    const applications = await getUserApplications(userId);
    const recentApplications = applications
      .sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt))
      .slice(0, 10);
    
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



app.get("/api/auth/status", (req, res) => {
  const isAuth = req.isAuthenticated();
  res.json({ 
    authenticated: isAuth,
    user: req.user ? { id: req.user.id, displayName: req.user.displayName } : null
  });
});

app.get("/api/sync-feed", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userId = req.user.id;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : 'http://localhost:3001',
    'Access-Control-Allow-Credentials': 'true'
  });

  activeSyncSessions.set(userId, res);
  
  const initialMessage = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: '🔗 Live feed connected',
    id: Date.now()
  };
  res.write(`data: ${JSON.stringify(initialMessage)}\n\n`);

  req.on('close', () => {
    activeSyncSessions.delete(userId);
  });

  req.on('error', (error) => {
    console.error('❌ SSE error:', error);
    activeSyncSessions.delete(userId);
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("❌ Logout error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});

app.get("/", (req, res) => {
  res.json({ message: "JobCAT API" });
});

// Health check endpoint for production monitoring
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
