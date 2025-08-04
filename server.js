require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("./auth");
const { fetchJobEmails, analyzeAllJobEmails } = require("./gmail");
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
    const emails = await fetchJobEmails(req.user.accessToken);
    console.log("✅ OAuth callback completed successfully");
    // Redirect to frontend dashboard after successful authentication
    res.redirect('http://localhost:3001/dashboard');
  } catch (error) {
    console.error("❌ Error in OAuth callback:", error);
    res.redirect('http://localhost:3001/login?error=auth_failed');
  }
});

// New endpoint for comprehensive job email analysis
app.get("/api/job-emails", async (req, res) => {
  if (!req.isAuthenticated()) {
    console.log("❌ Unauthenticated request to /api/job-emails");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    console.log("📧 Starting job email analysis...");
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

// Endpoint to get email analysis summary
app.get("/api/job-summary", async (req, res) => {
  if (!req.isAuthenticated()) {
    console.log("❌ Unauthenticated request to /api/job-summary");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    console.log("📊 Starting job summary analysis...");
    console.log("🔍 Step 1: Fetching emails from Gmail...");
    const jobEmails = await analyzeAllJobEmails(req.user.accessToken);
    console.log(`📧 Step 2: Found ${jobEmails.length} job-related emails`);
    
    // Generate summary statistics
    console.log("📈 Step 3: Generating summary statistics...");
    const summary = {
      totalApplications: jobEmails.length,
      statusBreakdown: {},
      companies: [...new Set(jobEmails.map(email => email.aiAnalysis.company))],
      urgentEmails: jobEmails.filter(email => email.aiAnalysis.urgency === "high"),
      positiveUpdates: jobEmails.filter(email => email.aiAnalysis.sentiment === "positive"),
      needsFollowUp: jobEmails.filter(email => email.aiAnalysis.status === "follow_up_needed")
    };

    // Count statuses
    jobEmails.forEach(email => {
      const status = email.aiAnalysis.status;
      summary.statusBreakdown[status] = (summary.statusBreakdown[status] || 0) + 1;
    });

    console.log("📊 Summary generated:");
    console.log(`   - Total applications: ${summary.totalApplications}`);
    console.log(`   - Companies: ${summary.companies.length}`);
    console.log(`   - Urgent emails: ${summary.urgentEmails.length}`);
    console.log(`   - Positive updates: ${summary.positiveUpdates.length}`);
    console.log(`   - Status breakdown:`, summary.statusBreakdown);

    res.json({
      success: true,
      summary,
      recentEmails: jobEmails.slice(0, 10) // Last 10 emails
    });
  } catch (error) {
    console.error("❌ Error generating summary:", error);
    if (error.message.includes("Gmail access not properly authorized")) {
      res.status(403).json({ 
        error: "Gmail access not properly authorized. Please re-authenticate.",
        code: "GMAIL_AUTH_ERROR"
      });
    } else {
      res.status(500).json({ error: "Failed to generate summary" });
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
