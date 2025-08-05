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
  generateSummaryFromDB 
} = require("./firebase");
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
    console.log("🔄 Starting incremental email sync...");
    const userId = req.user.id;
    
    // Step 1: Get last scrape time
    console.log("📅 Step 1: Checking last scrape time...");
    const lastScrapeTime = await getLastScrapeTime(userId);
    
    // Step 2: Fetch new emails since last scrape
    console.log("📧 Step 2: Fetching new emails...");
    const newEmails = await fetchIncrementalJobEmails(req.user.accessToken, lastScrapeTime);
    
    // Step 3: Store new applications in database
    console.log("💾 Step 3: Storing new applications...");
    const storageResult = await storeApplications(userId, newEmails);
    
    // Step 4: Update last scrape time
    console.log("📅 Step 4: Updating last scrape time...");
    await updateLastScrapeTime(userId);
    
    // Step 5: Generate summary from database
    console.log("📊 Step 5: Generating summary...");
    const summary = await generateSummaryFromDB(userId);
    
    console.log("✅ Incremental sync completed successfully");
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
