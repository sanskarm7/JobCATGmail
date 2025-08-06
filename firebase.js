const admin = require("firebase-admin");
const serviceAccount = require("./firebaseServiceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Firebase utility functions
async function getUserApplications(userId) {
  try {
    console.log(`📊 Fetching applications for user: ${userId}`);
    const applicationsRef = db.collection('users').doc(userId).collection('applications');
    const snapshot = await applicationsRef.get();
    
    const applications = [];
    snapshot.forEach(doc => {
      applications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Found ${applications.length} applications for user ${userId}`);
    return applications;
  } catch (error) {
    console.error(`❌ Error fetching applications for user ${userId}:`, error);
    throw error;
  }
}

async function getLastScrapeTime(userId) {
  try {
    console.log(`📅 Fetching last scrape time for user: ${userId}`);
    const metaRef = db.collection('users').doc(userId).collection('meta').doc('lastScrape');
    const doc = await metaRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      console.log(`✅ Last scrape time: ${data.timestamp}`);
      return data.timestamp;
    } else {
      console.log(`📅 No previous scrape found for user ${userId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error fetching last scrape time for user ${userId}:`, error);
    throw error;
  }
}

async function updateLastScrapeTime(userId) {
  try {
    console.log(`📅 Updating last scrape time for user: ${userId}`);
    const metaRef = db.collection('users').doc(userId).collection('meta').doc('lastScrape');
    await metaRef.set({
      timestamp: new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Last scrape time updated for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error updating last scrape time for user ${userId}:`, error);
    throw error;
  }
}

async function storeApplication(userId, application) {
  try {
    console.log(`💾 Storing application ${application.gmailId} for user: ${userId}`);
    const applicationRef = db.collection('users').doc(userId).collection('applications').doc(application.gmailId);
    
    // Prepare the data for storage
    const applicationData = {
      gmailId: application.gmailId,
      subject: application.subject,
      from: application.from,
      date: application.date,
      body: application.body,
      company: application.aiAnalysis.company,
      position: application.aiAnalysis.position,
      status: application.aiAnalysis.status,
      urgency: application.aiAnalysis.urgency,
      sentiment: application.aiAnalysis.sentiment,
      nextAction: application.aiAnalysis.nextAction,
      importantDates: application.aiAnalysis.importantDates || [],
      confidence: application.aiAnalysis.confidence,
      scrapedAt: application.scrapedAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await applicationRef.set(applicationData);
    console.log(`✅ Application ${application.gmailId} stored successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Error storing application ${application.gmailId} for user ${userId}:`, error);
    throw error;
  }
}

// Generate a consistent ID from company and position
function generateApplicationId(company, position) {
  return `${company.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${position.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

async function storeApplications(userId, applications) {
  try {
    console.log(`💾 Storing ${applications.length} applications for user: ${userId}`);
    
    const batch = db.batch();
    let storedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    
    for (const application of applications) {
      try {
        // Use company+position as the key for deduplication
        const applicationId = generateApplicationId(application.aiAnalysis.company, application.aiAnalysis.position);
        const applicationRef = db.collection('users').doc(userId).collection('applications').doc(applicationId);
        
        // Check if application already exists
        const existingDoc = await applicationRef.get();
        if (existingDoc.exists) {
          const existingData = existingDoc.data();
          
          // Only update if this is a newer email and status has progressed
          const existingDate = new Date(existingData.date);
          const newDate = new Date(application.date);
          
          if (newDate > existingDate && !existingData.manuallyUpdated) {
            console.log(`🔄 Updating existing application: ${applicationId} with newer status`);
            
            const updatedData = {
              ...existingData,
              status: application.aiAnalysis.status,
              sentiment: application.aiAnalysis.sentiment,
              urgency: application.aiAnalysis.urgency,
              nextAction: application.aiAnalysis.nextAction,
              lastEmailDate: application.date,
              lastEmailSubject: application.subject,
              lastEmailFrom: application.from,
              lastGmailId: application.gmailId,
              // Update with latest email content
              body: application.body,
              htmlContent: application.htmlContent,
              preview: application.preview,
              scrapedAt: application.scrapedAt,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              emailHistory: admin.firestore.FieldValue.arrayUnion({
                gmailId: application.gmailId,
                subject: application.subject,
                date: application.date,
                status: application.aiAnalysis.status,
                sentiment: application.aiAnalysis.sentiment,
                body: application.body,
                htmlContent: application.htmlContent
              })
            };
            
            batch.update(applicationRef, updatedData);
            updatedCount++;
          } else {
            console.log(`⏭️ Application ${applicationId} already exists with newer/manual data, skipping`);
            skippedCount++;
            continue;
          }
        } else {
          // New application
          console.log(`✅ Storing new application: ${applicationId}`);
          
          const applicationData = {
            id: applicationId, // Add the generated ID
            gmailId: application.gmailId,
            subject: application.subject,
            from: application.from,
            date: application.date,
            body: application.body, // Clean text content
            htmlContent: application.htmlContent, // Original HTML content
            preview: application.preview, // Short preview text
            company: application.aiAnalysis.company,
            position: application.aiAnalysis.position,
            status: application.aiAnalysis.status,
            urgency: application.aiAnalysis.urgency,
            sentiment: application.aiAnalysis.sentiment,
            nextAction: application.aiAnalysis.nextAction,
            importantDates: application.aiAnalysis.importantDates || [],
            confidence: application.aiAnalysis.confidence,
            scrapedAt: application.scrapedAt,
            lastEmailDate: application.date,
            lastEmailSubject: application.subject,
            lastEmailFrom: application.from,
            lastGmailId: application.gmailId,
            manuallyUpdated: false,
            emailHistory: [{
              gmailId: application.gmailId,
              subject: application.subject,
              date: application.date,
              status: application.aiAnalysis.status,
              sentiment: application.aiAnalysis.sentiment
            }],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          batch.set(applicationRef, applicationData);
          storedCount++;
        }
      } catch (error) {
        console.error(`❌ Error preparing application ${application.gmailId}:`, error);
        // Continue with other applications
      }
    }
    
    // Commit the batch
    await batch.commit();
    console.log(`✅ Batch write completed: ${storedCount} new, ${updatedCount} updated, ${skippedCount} skipped`);
    
    return { storedCount, updatedCount, skippedCount };
  } catch (error) {
    console.error(`❌ Error storing applications for user ${userId}:`, error);
    throw error;
  }
}

async function updateApplicationStatus(userId, applicationId, newStatus) {
  try {
    console.log(`🔄 Updating application ${applicationId} status to ${newStatus} for user: ${userId}`);
    const applicationRef = db.collection('users').doc(userId).collection('applications').doc(applicationId);
    
    // Check if application exists
    const doc = await applicationRef.get();
    if (!doc.exists) {
      throw new Error(`Application ${applicationId} not found`);
    }
    
    await applicationRef.update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      manuallyUpdated: true
    });
    
    console.log(`✅ Application ${applicationId} status updated to ${newStatus}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating application status for ${applicationId}:`, error);
    throw error;
  }
}

async function generateSummaryFromDB(userId) {
  try {
    console.log(`📊 Generating summary from database for user: ${userId}`);
    const applications = await getUserApplications(userId);
    
    if (applications.length === 0) {
      return {
        totalApplications: 0,
        statusBreakdown: {},
        companies: [],
        urgentEmails: [],
        positiveUpdates: [],
        needsFollowUp: []
      };
    }
    
    const summary = {
      totalApplications: applications.length,
      statusBreakdown: {},
      companies: [...new Set(applications.map(app => app.company))],
      urgentEmails: applications.filter(app => app.urgency === "high"),
      positiveUpdates: applications.filter(app => app.sentiment === "positive"),
      needsFollowUp: applications.filter(app => app.status === "follow_up_needed")
    };

    // Count statuses
    applications.forEach(app => {
      const status = app.status;
      summary.statusBreakdown[status] = (summary.statusBreakdown[status] || 0) + 1;
    });

    console.log(`📊 Summary generated from DB:`);
    console.log(`   - Total applications: ${summary.totalApplications}`);
    console.log(`   - Companies: ${summary.companies.length}`);
    console.log(`   - Urgent emails: ${summary.urgentEmails.length}`);
    console.log(`   - Positive updates: ${summary.positiveUpdates.length}`);
    console.log(`   - Status breakdown:`, summary.statusBreakdown);
    
    return summary;
  } catch (error) {
    console.error(`❌ Error generating summary from DB for user ${userId}:`, error);
    throw error;
  }
}

// Merge multiple applications into a single consolidated application
async function mergeApplications(userId, applicationIds, primaryApplicationId) {
  try {
    console.log(`🔄 Merging ${applicationIds.length} applications for user: ${userId}`);
    
    // Get all applications to merge
    const applicationsToMerge = [];
    const batch = db.batch();
    
    for (const appId of applicationIds) {
      const appDoc = await db.collection('users').doc(userId).collection('applications').doc(appId).get();
      if (appDoc.exists) {
        applicationsToMerge.push({ id: appId, ...appDoc.data() });
      }
    }
    
    if (applicationsToMerge.length < 2) {
      throw new Error('At least 2 applications are required for merging');
    }
    
    // Find the primary application or use the first one
    let primaryApp = applicationsToMerge.find(app => app.id === primaryApplicationId) || applicationsToMerge[0];
    const otherApps = applicationsToMerge.filter(app => app.id !== primaryApp.id);
    
    // Sort all applications by date to determine latest updates
    const allAppsSorted = applicationsToMerge.sort((a, b) => {
      const dateA = new Date(a.lastEmailDate || a.date || a.scrapedAt || 0);
      const dateB = new Date(b.lastEmailDate || b.date || b.scrapedAt || 0);
      return dateB - dateA;
    });
    
    const latestApp = allAppsSorted[0];
    
    // Create merged application data
    const mergedApp = {
      ...primaryApp,
      // Use latest status if not manually updated
      status: primaryApp.manuallyUpdated ? primaryApp.status : latestApp.status,
      sentiment: latestApp.sentiment || primaryApp.sentiment,
      urgency: latestApp.urgency || primaryApp.urgency,
      nextAction: latestApp.nextAction || primaryApp.nextAction,
      lastEmailDate: latestApp.lastEmailDate || latestApp.date,
      lastEmailSubject: latestApp.lastEmailSubject || latestApp.subject,
      lastEmailFrom: latestApp.lastEmailFrom || latestApp.from,
      lastGmailId: latestApp.lastGmailId || latestApp.gmailId,
      
      // Combine email history from all applications
      emailHistory: [
        ...(primaryApp.emailHistory || []),
        ...otherApps.flatMap(app => app.emailHistory || [
          {
            gmailId: app.gmailId || app.id,
            subject: app.subject,
            date: app.date,
            status: app.status,
            sentiment: app.sentiment
          }
        ])
      ].sort((a, b) => new Date(a.date) - new Date(b.date)),
      
      // Track merge metadata
      mergedFrom: applicationIds.filter(id => id !== primaryApp.id),
      mergedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      manuallyMerged: true
    };
    
    // Update the primary application with merged data
    const primaryAppRef = db.collection('users').doc(userId).collection('applications').doc(primaryApp.id);
    batch.set(primaryAppRef, mergedApp);
    
    // Delete the other applications
    otherApps.forEach(app => {
      const appRef = db.collection('users').doc(userId).collection('applications').doc(app.id);
      batch.delete(appRef);
    });
    
    // Commit all changes
    await batch.commit();
    
    console.log(`✅ Successfully merged ${applicationIds.length} applications into ${primaryApp.id}`);
    
    return {
      success: true,
      mergedApplicationId: primaryApp.id,
      deletedApplicationIds: otherApps.map(app => app.id),
      mergedCount: applicationIds.length
    };
    
  } catch (error) {
    console.error(`❌ Error merging applications for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  db,
  getUserApplications,
  getLastScrapeTime,
  updateLastScrapeTime,
  storeApplication,
  storeApplications,
  updateApplicationStatus,
  mergeApplications,
  generateSummaryFromDB
};