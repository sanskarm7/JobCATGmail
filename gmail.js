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
      q: 'subject:"thank you for applying" OR subject:"application received" OR subject:"application" OR subject:"interview" OR subject:"position" OR subject:"job" newer_than:30d',
      maxResults: 10,
    });

    const messages = res.data.messages || [];
    console.log(`📨 Found ${messages.length} potential job emails`);

    const detailedMessages = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      console.log(`📝 Processing email ${i + 1}/${messages.length}...`);
      
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
        // Analyze email content with AI
        console.log(`   🤖 Analyzing with AI...`);
        const aiAnalysis = await analyzeEmailWithAI(subject, body, from);
        console.log(`   ✅ Analysis complete: ${aiAnalysis.isJobApplication ? 'Job-related' : 'Not job-related'}`);
        
        detailedMessages.push({ 
          subject, 
          from, 
          date, 
          body: body.substring(0, 500) + "...", // Truncate for display
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
          subject, 
          from, 
          date, 
          body: body.substring(0, 500) + "...", // Truncate for display
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

function extractEmailBody(payload) {
  let body = "";
  
  if (payload.parts) {
    // Multipart message
    for (let part of payload.parts) {
      if (part.mimeType === "text/plain") {
        body = Buffer.from(part.body.data, 'base64').toString();
        break;
      } else if (part.mimeType === "text/html") {
        // Fallback to HTML if no plain text
        body = Buffer.from(part.body.data, 'base64').toString();
      }
    }
  } else if (payload.body.data) {
    // Simple message
    body = Buffer.from(payload.body.data, 'base64').toString();
  }
  
  return body;
}

// Pre-filter emails using keywords to avoid unnecessary AI calls
function checkJobKeywords(subject, body, from) {
  const text = `${subject} ${body} ${from}`.toLowerCase();
  
  // Strong job-related keywords (high confidence)
  const strongJobKeywords = [
    'application', 'apply', 'position', 'job', 'role', 'hiring', 'recruitment',
    'interview', 'resume', 'cv', 'candidate', 'applicant', 'employment',
    'thank you for applying', 'application received', 'application status',
    'we received your application', 'your application has been',
    'interview scheduled', 'interview invitation', 'job offer',
    'position available', 'hiring for', 'we are hiring',
    'application submitted', 'application under review',
    'next steps', 'follow up', 'application process'
  ];
  
  // Medium job-related keywords (moderate confidence)
  const mediumJobKeywords = [
    'career', 'opportunity', 'position', 'team', 'company',
    'department', 'division', 'office', 'workplace',
    'employment', 'job opening', 'vacancy', 'posting'
  ];
  
  // Check for strong keywords first
  const hasStrongKeywords = strongJobKeywords.some(keyword => text.includes(keyword));
  if (hasStrongKeywords) {
    console.log(`   🔍 Found strong job keywords: ${strongJobKeywords.find(keyword => text.includes(keyword))}`);
    return true;
  }
  
  // Check for medium keywords
  const hasMediumKeywords = mediumJobKeywords.some(keyword => text.includes(keyword));
  if (hasMediumKeywords) {
    console.log(`   🔍 Found medium job keywords: ${mediumJobKeywords.find(keyword => text.includes(keyword))}`);
    return true;
  }
  
  // Check for company-specific patterns (e.g., noreply@company.com)
  const companyPatterns = [
    /@([^.]+)\.com/i,  // company.com
    /@([^.]+)\.org/i,  // company.org
    /@([^.]+)\.net/i,  // company.net
    /@([^.]+)\.io/i,   // company.io
    /@([^.]+)\.ai/i,   // company.ai
  ];
  
  for (const pattern of companyPatterns) {
    const match = from.match(pattern);
    if (match) {
      const company = match[1].toLowerCase();
      // Check if it's likely a job-related company email
      if (company.includes('jobs') || company.includes('careers') || company.includes('hr') || company.includes('recruit')) {
        console.log(`   🔍 Found job-related company email: ${match[0]}`);
        return true;
      }
    }
  }
  
  console.log(`   🔍 No job-related keywords found - skipping AI analysis`);
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
    Analyze this job application email and extract the following information in JSON format:
    
    Email Subject: ${subject}
    From: ${from}
    Email Body: ${truncatedBody}
    
    Please provide:
    1. isJobApplication: boolean (true if this is related to a job application)
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
          content: "You are an AI assistant that analyzes job application emails. Always respond with valid JSON only, no markdown formatting or code blocks. Keep responses concise but complete."
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
      maxResults: 100,
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

        // Only include emails that are likely job-related
        if (aiAnalysis.isJobApplication && aiAnalysis.confidence > 0.3) {
          console.log(`   ✅ Job-related email found: ${aiAnalysis.company} - ${aiAnalysis.position}`);
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

module.exports = { fetchJobEmails, analyzeAllJobEmails };
