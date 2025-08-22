const { google } = require("googleapis");
const OpenAI = require("openai");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchJobEmails(accessToken) {
  try {
    console.log("🔐 Setting up Gmail authentication...");
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

    console.log("📧 Initializing Gmail API...");
  const gmail = google.gmail({ version: "v1", auth });

    console.log("🔍 Searching for job-related emails...");
  const res = await gmail.users.messages.list({
    userId: "me",
      q: 'subject:"thank you for applying" OR subject:"application received" OR subject:"application" OR subject:"interview" OR subject:"position" OR subject:"job" newer_than:50d',
      maxResults: 10, // Increased from 10 to get more comprehensive results
  });

  const messages = res.data.messages || [];
    console.log(`📨 Found ${messages.length} potential job emails`);

  const detailedMessages = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      console.log(`📝 Processing email ${i + 1}/${messages.length}...`);
      
    const msgRes = await gmail.users.messages.get({ userId: "me", id: msg.id });
    const headers = msgRes.data.payload.headers;
      const emailContent = extractEmailBody(msgRes.data.payload);

    const subject = headers.find((h) => h.name === "Subject")?.value;
    const from = headers.find((h) => h.name === "From")?.value;
    const date = headers.find((h) => h.name === "Date")?.value;

      console.log(`   Subject: ${subject}`);
      console.log(`   From: ${from}`);

      // Pre-filter with keywords before sending to AI
      const isLikelyJobEmail = checkJobKeywords(subject, emailContent.plainText, from);
      
      if (isLikelyJobEmail) {
        console.log(`   ✅ Likely job email - sending to AI for analysis`);
        // Analyze email content with AI using original content
        console.log(`   🤖 Analyzing with AI...`);
        const aiAnalysis = await analyzeEmailWithAI(subject, emailContent.originalContent, from);
        console.log(`   ✅ Analysis complete: ${aiAnalysis.isJobApplication ? 'Job-related' : 'Not job-related'}`);
        
        detailedMessages.push({ 
          gmailId: msg.id,
          subject, 
          from, 
          date, 
          body: emailContent.plainText, // Clean text for display
          htmlContent: emailContent.htmlContent, // Full HTML content
          preview: emailContent.plainText.substring(0, 150) + (emailContent.plainText.length > 150 ? "..." : ""),
          aiAnalysis 
        });
      } else {
        console.log(`   ⏭️ Not likely job-related - skipping AI analysis`);
        // Add a basic analysis without AI
        const basicAnalysis = {
          isJobApplication: false,
          company: "Unknown",
          position: "Unknown",
          status: "other",
          sentiment: "neutral",
          urgency: "low",
          nextAction: "No action needed",
          importantDates: [],
          confidence: 0.1,
          keyDetails: "Pre-filtered as non-job email"
        };
        
        detailedMessages.push({ 
          gmailId: msg.id,
          subject, 
          from, 
          date, 
          body: emailContent.plainText, // Clean text for display
          htmlContent: emailContent.htmlContent, // Full HTML content
          preview: emailContent.plainText.substring(0, 150) + (emailContent.plainText.length > 150 ? "..." : ""),
          aiAnalysis: basicAnalysis
        });
      }
    }

    console.log(`✅ Processed ${detailedMessages.length} emails successfully`);
    return detailedMessages;
  } catch (error) {
    console.error("❌ Error fetching job emails:", error);
    if (error.message.includes("insufficient authentication scopes")) {
      throw new Error("Gmail access not properly authorized. Please re-authenticate with Google.");
    }
    throw error;
  }
}

// Extract clean text from HTML content
function extractTextFromHTML(html) {
  if (!html) return "";
  
  // Remove HTML tags and decode HTML entities
  let text = html
    .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove CSS
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove JavaScript
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  return text;
}

function extractEmailBody(payload) {
  let htmlBody = "";
  let plainBody = "";
  
  if (payload.parts) {
    // Multipart message - look for both plain and HTML parts
    for (let part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body.data) {
        plainBody = Buffer.from(part.body.data, 'base64').toString();
      } else if (part.mimeType === "text/html" && part.body.data) {
        htmlBody = Buffer.from(part.body.data, 'base64').toString();
      }
    }
  } else if (payload.body.data) {
    // Simple message
    const content = Buffer.from(payload.body.data, 'base64').toString();
    if (payload.mimeType === "text/html") {
      htmlBody = content;
    } else {
      plainBody = content;
    }
  }
  
  // Prefer plain text, but extract from HTML if plain text isn't available
  let cleanText = plainBody;
  if (!cleanText && htmlBody) {
    cleanText = extractTextFromHTML(htmlBody);
  }
  
  return {
    plainText: cleanText || plainBody,
    htmlContent: htmlBody,
    originalContent: plainBody || htmlBody // For AI analysis (use original)
  };
}

// Pre-filter emails using keywords to avoid unnecessary AI calls
function checkJobKeywords(subject, body, from) {
  const text = `${subject} ${body} ${from}`.toLowerCase();
  
  // STRICT: Only keywords that indicate actual application process
  const strictApplicationKeywords = [
    'thank you for applying',
    'application received',
    'application submitted',
    'we received your application',
    'your application has been',
    'application under review',
    'application status update',
    'interview scheduled',
    'interview invitation',
    'interview confirmation',
    'next steps in your application',
    'application process',
    'follow up on your application',
    'application update',
    'your application is being',
    'application review',
    'application progress'
  ];
  
  // Company-specific job application patterns
  const applicationPatterns = [
    /@([^.]+)\.workday\.com/i,  // Workday applications
    /@([^.]+)\.greenhouse\.io/i, // Greenhouse applications
    /@([^.]+)\.lever\.co/i,     // Lever applications
    /@([^.]+)\.bamboohr\.com/i, // BambooHR applications
    /@([^.]+)\.icims\.com/i,    // iCIMS applications
    /@([^.]+)\.smartrecruiters\.com/i, // SmartRecruiters
    /@([^.]+)\.jobvite\.com/i,  // Jobvite applications
    /@([^.]+)\.myworkdayjobs\.com/i, // Workday jobs
    /@([^.]+)\.myworkday\.com/i, // Workday
    /@([^.]+)\.hirevue\.com/i,  // HireVue interviews
    /@([^.]+)\.modernhire\.com/i, // Modern Hire
    /@([^.]+)\.interview\.io/i, // Interview.io
    /@([^.]+)\.pymetrics\.com/i, // Pymetrics
    /@([^.]+)\.codesignal\.com/i, // CodeSignal
    /@([^.]+)\.hackerrank\.com/i, // HackerRank
  ];
  
  // Check for strict application keywords first
  const hasStrictKeywords = strictApplicationKeywords.some(keyword => text.includes(keyword));
  if (hasStrictKeywords) {
    console.log(`   🔍 Found strict application keywords: ${strictApplicationKeywords.find(keyword => text.includes(keyword))}`);
    return true;
  }
  
  // Check for application platform patterns
  for (const pattern of applicationPatterns) {
    const match = from.match(pattern);
    if (match) {
      console.log(`   🔍 Found application platform email: ${match[0]}`);
      return true;
    }
  }
  
  // Check for specific company career emails (only major companies)
  const careerEmailPatterns = [
    /@([^.]+)\.careers\.([^.]+)\.com/i,  // company.careers.domain.com
    /@careers\.([^.]+)\.com/i,           // careers.company.com
    /@jobs\.([^.]+)\.com/i,              // jobs.company.com
    /@([^.]+)\.jobs\.com/i,              // company.jobs.com
    /@([^.]+)\.talent\.([^.]+)\.com/i,   // company.talent.domain.com
  ];
  
  for (const pattern of careerEmailPatterns) {
    const match = from.match(pattern);
    if (match) {
      console.log(`   🔍 Found career email: ${match[0]}`);
      return true;
    }
  }
  
  // Check for specific job offer/status keywords
  const statusKeywords = [
    'job offer',
    'offer letter',
    'offer extended',
    'offer accepted',
    'offer declined',
    'application rejected',
    'not moving forward',
    'position filled',
    'candidate selected',
    'final round',
    'onsite interview',
    'technical interview',
    'phone screen',
    'recruiter call'
  ];
  
  const hasStatusKeywords = statusKeywords.some(keyword => text.includes(keyword));
  if (hasStatusKeywords) {
    console.log(`   🔍 Found status keywords: ${statusKeywords.find(keyword => text.includes(keyword))}`);
    return true;
  }
  
  console.log(`   🔍 No strict application keywords found - skipping AI analysis`);
  return false;
}

// Truncate text to fit within token limits
function truncateText(text, maxTokens = 8000) {
  // Rough estimation: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  
  // Try to truncate at sentence boundaries
  const sentences = text.split(/[.!?]+/);
  let truncated = "";
  
  for (const sentence of sentences) {
    if ((truncated + sentence).length < maxChars) {
      truncated += sentence + ".";
    } else {
      break;
    }
  }
  
  return truncated || text.substring(0, maxChars);
}

// Clean AI response and extract valid JSON
function cleanAIResponse(response) {
  try {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Try to parse as JSON
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("❌ Failed to parse AI response as JSON:", error);
    console.error("📄 Raw response:", response);
    
    // Try to extract JSON from the response using regex
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error("❌ Failed to extract JSON from response:", parseError);
        
        // Try to fix common JSON issues
        let fixedJson = jsonMatch[0];
        
        // Fix incomplete strings by adding quotes
        fixedJson = fixedJson.replace(/([^"])\s*$/g, '$1"');
        
        // Fix incomplete arrays by adding closing brackets
        const openBrackets = (fixedJson.match(/\[/g) || []).length;
        const closeBrackets = (fixedJson.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
          fixedJson += ']'.repeat(openBrackets - closeBrackets);
        }
        
        // Fix incomplete objects by adding closing braces
        const openBraces = (fixedJson.match(/\{/g) || []).length;
        const closeBraces = (fixedJson.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
          fixedJson += '}'.repeat(openBraces - closeBraces);
        }
        
        try {
          return JSON.parse(fixedJson);
        } catch (finalError) {
          console.error("❌ Failed to fix JSON:", finalError);
        }
      }
    }
    
    // Return default response if all parsing fails
    return {
      isJobApplication: false,
      company: "Unknown",
      position: "Unknown",
      status: "other",
      sentiment: "neutral",
      urgency: "low",
      nextAction: "Review manually",
      importantDates: [],
      confidence: 0,
      keyDetails: "Failed to parse AI response"
    };
  }
}

async function analyzeEmailWithAI(subject, body, from) {
  try {
    console.log(`   🤖 Sending email to OpenAI for analysis...`);
    
    // Truncate body to prevent context overflow
    const truncatedBody = truncateText(body, 6000); // Leave room for prompt
    
    const prompt = `
    Analyze this email and determine if it's related to a job application that the user has ACTUALLY STARTED. Be very strict - only classify as a job application if the user has submitted an application or is actively in the hiring process.
    
    Email Subject: ${subject}
    From: ${from}
    Email Body: ${truncatedBody}
    
    IMPORTANT CRITERIA:
    - Only classify as job application if user has SUBMITTED an application
    - Skip job postings, newsletters, marketing emails, or general career content
    - Skip emails about jobs the user hasn't applied to
    - Skip recruitment emails for positions user didn't apply for
    - Focus on actual application status updates, interview scheduling, offers, rejections
    
    Please provide:
    1. isJobApplication: boolean (true ONLY if this is about an application the user submitted)
    2. company: string (extract company name)
    3. position: string (extract job position/title)
    4. status: string (one of: "received", "under_review", "interview_scheduled", "interview_completed", "offer", "rejected", "follow_up_needed", "other")
    5. sentiment: string (one of: "positive", "negative", "neutral")
    6. urgency: string (one of: "high", "medium", "low")
    7. nextAction: string (what the user should do next)
    8. importantDates: array of dates mentioned
    9. confidence: number (0-1, how confident you are in the analysis)
    10. keyDetails: string (important details from the email)
    
    Respond with only valid JSON, no additional text or markdown formatting. Keep the response concise but complete.
    `;

    console.log(`   📤 Making OpenAI API request...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using GPT-4o-mini for larger context and lower cost
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that analyzes job application emails. Be VERY STRICT - only classify emails as job applications if the user has actually submitted an application or is actively in the hiring process. Ignore job postings, newsletters, and marketing emails. Always respond with valid JSON only, no markdown formatting or code blocks. Keep responses concise but complete."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent results
      max_tokens: 1000 // Increased from 500 to allow complete JSON responses
    });

    const response = completion.choices[0].message.content;
    console.log(`   📥 Received AI response, parsing JSON...`);
    
    const result = cleanAIResponse(response);
    console.log(`   ✅ AI analysis result:`, {
      isJobApplication: result.isJobApplication,
      company: result.company,
      status: result.status,
      confidence: result.confidence
    });
    
    return result;
  } catch (error) {
    console.error("❌ AI analysis failed:", error);
    return {
      isJobApplication: false,
      company: "Unknown",
      position: "Unknown",
      status: "other",
      sentiment: "neutral",
      urgency: "low",
      nextAction: "Review manually",
      importantDates: [],
      confidence: 0,
      keyDetails: "AI analysis failed"
    };
  }
}

// New function to get all emails and analyze them
async function analyzeAllJobEmails(accessToken) {
  try {
    console.log("🔐 Setting up Gmail authentication for full analysis...");
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    console.log("📧 Initializing Gmail API for full analysis...");
    const gmail = google.gmail({ version: "v1", auth });

    // Get all emails from the last 90 days
    console.log("🔍 Fetching all emails from the last 90 days...");
    const res = await gmail.users.messages.list({
      userId: "me",
      q: 'newer_than:90d',
      maxResults: 20,
    });

    const messages = res.data.messages || [];
    console.log(`📨 Found ${messages.length} total emails to analyze`);

    const jobEmails = [];
    let aiProcessedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      console.log(`📝 Analyzing email ${i + 1}/${messages.length}...`);
      
      const msgRes = await gmail.users.messages.get({ userId: "me", id: msg.id });
      const headers = msgRes.data.payload.headers;
      const body = extractEmailBody(msgRes.data.payload);

      const subject = headers.find((h) => h.name === "Subject")?.value;
      const from = headers.find((h) => h.name === "From")?.value;
      const date = headers.find((h) => h.name === "Date")?.value;

      console.log(`   Subject: ${subject}`);
      console.log(`   From: ${from}`);

      // Pre-filter with keywords before sending to AI
      const isLikelyJobEmail = checkJobKeywords(subject, body, from);
      
      if (isLikelyJobEmail) {
        console.log(`   ✅ Likely job email - sending to AI for analysis`);
        aiProcessedCount++;
        
        // Analyze with AI
        console.log(`   🤖 Analyzing with AI...`);
        const aiAnalysis = await analyzeEmailWithAI(subject, body, from);

        // Only include emails that are likely job-related with high confidence
        if (aiAnalysis.isJobApplication && aiAnalysis.confidence > 0.7) {
          console.log(`   ✅ High-confidence job application found: ${aiAnalysis.company} - ${aiAnalysis.position} (confidence: ${aiAnalysis.confidence})`);
          jobEmails.push({
            id: msg.id,
            subject,
            from,
            date,
            body: body.substring(0, 300) + "...",
            aiAnalysis
          });
        } else {
          console.log(`   ⏭️ AI determined not job-related or low confidence (${aiAnalysis.confidence})`);
        }
      } else {
        console.log(`   ⏭️ Pre-filtered as non-job email - skipping AI analysis`);
        skippedCount++;
      }
    }

    console.log(`✅ Analysis complete!`);
    console.log(`   - Total emails processed: ${messages.length}`);
    console.log(`   - Emails sent to AI: ${aiProcessedCount}`);
    console.log(`   - Emails skipped (pre-filtered): ${skippedCount}`);
    console.log(`   - Job-related emails found: ${jobEmails.length}`);
    console.log(`   - Cost savings: ~${Math.round((skippedCount / messages.length) * 100)}% fewer AI calls`);
    
    return jobEmails;
  } catch (error) {
    console.error("❌ Error analyzing all job emails:", error);
    if (error.message.includes("insufficient authentication scopes")) {
      throw new Error("Gmail access not properly authorized. Please re-authenticate with Google.");
    }
    throw error;
  }
}

// New function for incremental email scraping
async function fetchIncrementalJobEmails(accessToken, sinceDate = null) {
  try {
    console.log("🔐 Setting up Gmail authentication for incremental analysis...");
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    console.log("📧 Initializing Gmail API for incremental analysis...");
    const gmail = google.gmail({ version: "v1", auth });

    // Build query based on date and job-related keywords
    const jobKeywords = 'subject:"thank you for applying" OR subject:"application received" OR subject:"application" OR subject:"interview" OR subject:"position" OR subject:"job"';
    let query = `(${jobKeywords}) newer_than:50d`; // Default to 50 days
    if (sinceDate) {
      const daysSince = Math.ceil((Date.now() - new Date(sinceDate).getTime()) / (1000 * 60 * 60 * 24));
      query = `(${jobKeywords}) newer_than:${daysSince}d`;
      console.log(`📅 Fetching job-related emails since ${sinceDate} (${daysSince} days ago)`);
    } else {
      console.log("📅 No last scrape date found, fetching job-related emails from last 50 days");
    }

    console.log(`🔍 Fetching emails with query: ${query}`);
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 500, // Increased from 100 to ensure we don't miss emails
    });

    const messages = res.data.messages || [];
    console.log(`📨 Found ${messages.length} emails to analyze`);

    const jobEmails = [];
    let aiProcessedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      console.log(`📝 Analyzing email ${i + 1}/${messages.length} (ID: ${msg.id})...`);
      
      const msgRes = await gmail.users.messages.get({ userId: "me", id: msg.id });
      const headers = msgRes.data.payload.headers;
      const emailContent = extractEmailBody(msgRes.data.payload);

      const subject = headers.find((h) => h.name === "Subject")?.value;
      const from = headers.find((h) => h.name === "From")?.value;
      const date = headers.find((h) => h.name === "Date")?.value;

      console.log(`   Subject: ${subject}`);
      console.log(`   From: ${from}`);

      // Pre-filter with keywords before sending to AI
      const isLikelyJobEmail = checkJobKeywords(subject, emailContent.plainText, from);
      
      if (isLikelyJobEmail) {
        console.log(`   ✅ Likely job email - sending to AI for analysis`);
        aiProcessedCount++;
        
        // Analyze with AI using original content
        console.log(`   🤖 Analyzing with AI...`);
        const aiAnalysis = await analyzeEmailWithAI(subject, emailContent.originalContent, from);

        // Only include emails that are likely job-related with high confidence
        if (aiAnalysis.isJobApplication && aiAnalysis.confidence > 0.7) {
          console.log(`   ✅ High-confidence job application found: ${aiAnalysis.company} - ${aiAnalysis.position} (confidence: ${aiAnalysis.confidence})`);
          jobEmails.push({
            gmailId: msg.id, // Use Gmail ID as document key
            subject,
            from,
            date,
            body: emailContent.plainText, // Clean text for display
            htmlContent: emailContent.htmlContent, // Full HTML content
            preview: emailContent.plainText.substring(0, 150) + (emailContent.plainText.length > 150 ? "..." : ""),
            aiAnalysis,
            scrapedAt: new Date().toISOString()
          });
        } else {
          console.log(`   ⏭️ AI determined not job-related or low confidence (${aiAnalysis.confidence})`);
        }
      } else {
        console.log(`   ⏭️ Pre-filtered as non-job email - skipping AI analysis`);
        skippedCount++;
      }
    }

    console.log(`✅ Incremental analysis complete!`);
    console.log(`   - Total emails processed: ${messages.length}`);
    console.log(`   - Emails sent to AI: ${aiProcessedCount}`);
    console.log(`   - Emails skipped (pre-filtered): ${skippedCount}`);
    console.log(`   - Job-related emails found: ${jobEmails.length}`);
    console.log(`   - Cost savings: ~${Math.round((skippedCount / messages.length) * 100)}% fewer AI calls`);
    
    return jobEmails;
  } catch (error) {
    console.error("❌ Error in incremental email analysis:", error);
    if (error.message.includes("insufficient authentication scopes")) {
      throw new Error("Gmail access not properly authorized. Please re-authenticate with Google.");
    }
    throw error;
  }
}

module.exports = { fetchJobEmails, analyzeAllJobEmails, fetchIncrementalJobEmails };
