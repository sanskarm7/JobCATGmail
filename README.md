
# JobCAT - Your Email Companion for Job Applications

JobCAT automatically analyzes your Gmail inbox to track job application statuses using AI. The application identifies job-related emails, extracts application status updates, and presents them in an organized dashboard for efficient job search management.

## Core Functionality

**Automated Email Analysis**
- Connects to Gmail via OAuth2 authentication
- Identifies job application emails using keyword filtering and AI classification
- Extracts company names, job positions, application status, sentiment, and urgency
- Categorizes status as received, under review, interview scheduled, interview completed, offer, rejected, or follow-up needed

**Interactive Dashboard**
- Real-time statistics showing total applications, urgent emails, and positive updates
- Visual status distribution charts with color-coded categories
- Filterable application list by status, sentiment, or urgency
- Company-grouped view showing all applications organized by employer
- Manual status editing capabilities for user control

**Data Management**
- Incremental email synchronization to avoid reprocessing
- Firebase Firestore database for persistent application tracking
- Smart deduplication to prevent multiple entries for the same application
- Historical email tracking with status progression over time

## Technical Implementation

**Backend**: Node.js, Express, Gmail API, OpenAI GPT-4o-mini, Firebase Firestore, Passport.js OAuth2
**Frontend**: React 18, Material-UI, React Router, Axios, Recharts
**Authentication**: Google OAuth2 with Gmail read/modify permissions
**AI Processing**: OpenAI API for email classification and data extraction

## Setup Requirements

**Prerequisites**: Node.js v14+, Google Cloud Console account, OpenAI API key, Firebase project

**Environment Variables**: Create `.env` file with Google OAuth credentials, session secret, OpenAI API key, and Firebase service account

**Configuration**: Enable Gmail API in Google Cloud Console, set OAuth redirect URI to `http://localhost:3000/api/auth/callback/google`, configure Firebase Firestore database

**Installation**: Run `npm run install:all` to install dependencies, then `npm run dev:full` to start both backend (port 3000) and frontend (port 3001)

**Usage**: Navigate to `http://localhost:3001`, authenticate with Google, grant Gmail permissions, click "Sync" to analyze emails

## Key API Endpoints

- `POST /api/update-emails` - Incremental email synchronization
- `GET /api/applications` - Retrieve stored job applications
- `PUT /api/applications/:id/status` - Update application status
- `GET /api/job-summary` - Application statistics and metrics
- `GET /api/auth/google` - Google OAuth authentication 
