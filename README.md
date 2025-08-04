
# Job Application Email Analyzer

An AI-powered Gmail integration that intelligently analyzes your job application emails to track application status, extract key information, and provide insights about your job search progress.

## Features

### 🤖 AI-Powered Email Analysis
- **Intelligent Classification**: Automatically identifies job-related emails without hardcoded keywords
- **Status Detection**: Categorizes emails as received, under review, interview scheduled, offer, rejected, etc.
- **Sentiment Analysis**: Determines if updates are positive, negative, or neutral
- **Urgency Assessment**: Identifies high-priority emails that need immediate attention
- **Data Extraction**: Extracts company names, positions, important dates, and next actions

### 📊 Modern React Dashboard
- **Real-time Statistics**: Track total applications, companies, urgent emails, and positive updates
- **Interactive Charts**: Visual representation of application status distribution
- **Email Cards**: Detailed view of each email with AI analysis
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Material-UI**: Beautiful, modern interface with smooth animations

### 🔍 Advanced Features
- **Confidence Scoring**: AI provides confidence levels for each analysis
- **Key Details Extraction**: Automatically identifies important information from emails
- **Next Action Suggestions**: AI recommends what you should do next
- **Date Tracking**: Extracts and highlights important dates and deadlines

## Tech Stack

### Backend
- **Node.js** with Express
- **Google OAuth2** for Gmail access
- **OpenAI GPT-3.5-turbo** for email analysis
- **Passport.js** for authentication

### Frontend
- **React 18** with hooks
- **Material-UI** for modern UI components
- **React Router** for navigation
- **Axios** for API communication
- **Recharts** for data visualization

## Setup Instructions

### 1. Prerequisites
- Node.js (v14 or higher)
- Google Cloud Console account
- OpenAI API key

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Session
SESSION_SECRET=your_session_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

### 3. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Copy Client ID and Client Secret to your `.env` file

### 4. OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and get your API key
3. Add the API key to your `.env` file

### 5. Installation

```bash
# Install all dependencies (backend + frontend)
npm run install:all

# Or install separately:
npm install
cd client && npm install
```

### 6. Running the Application

#### Development Mode (Recommended)
```bash
# Run both backend and frontend simultaneously
npm run dev:full
```

#### Separate Development Servers
```bash
# Terminal 1 - Backend (Port 3000)
npm run dev

# Terminal 2 - Frontend (Port 3001)
npm run client
```

#### Production Build
```bash
# Build the React app
npm run client:build

# Start production server
npm start
```

### 7. Usage

1. Open your browser and go to `http://localhost:3001`
2. Click "Login with Google" to authenticate
3. Grant permission to access your Gmail
4. The AI will analyze your emails and display results in the dashboard

## Project Structure

```
JobCATGmailScraper/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   └── App.js         # Main app component
│   └── package.json
├── server.js              # Express backend
├── gmail.js               # Gmail API integration
├── auth.js                # Authentication setup
└── package.json           # Backend dependencies
```

## API Endpoints

### Backend (Port 3000)
- `GET /api/auth/status` - Check authentication status
- `GET /api/job-emails` - Get all analyzed job emails
- `GET /api/job-summary` - Get summary statistics
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/callback/google` - OAuth callback

### Frontend (Port 3001)
- `/` - Redirects to dashboard
- `/login` - Login page
- `/dashboard` - Main dashboard (protected)

## Key Components

### React Components
- **Login**: Beautiful login page with Google OAuth
- **Dashboard**: Main application interface with statistics and email list
- **EmailCard**: Individual email display with AI analysis
- **StatsCard**: Reusable statistics cards with gradients
- **StatusChart**: Pie chart for status distribution
- **ProtectedRoute**: Authentication-based routing

### Backend Services
- **Gmail Integration**: Fetches and processes emails
- **AI Analysis**: OpenAI-powered email classification
- **Authentication**: Secure OAuth2 flow
- **API Routes**: RESTful endpoints for frontend

## Features in Detail

### Email Analysis Process
1. **Authentication**: Secure OAuth2 with Google
2. **Email Fetching**: Retrieves emails from last 90 days
3. **AI Processing**: Each email analyzed by OpenAI GPT-3.5-turbo
4. **Data Extraction**: Structured data extraction from email content
5. **Classification**: Status, sentiment, and urgency categorization
6. **Dashboard Display**: Modern React interface with Material-UI

### AI Analysis Components
- **isJobApplication**: Boolean indicating if email is job-related
- **company**: Extracted company name
- **position**: Job position/title
- **status**: Application status (received, under_review, interview_scheduled, etc.)
- **sentiment**: Email tone (positive, negative, neutral)
- **urgency**: Priority level (high, medium, low)
- **nextAction**: Recommended next steps
- **importantDates**: Array of relevant dates
- **confidence**: AI confidence score (0-1)
- **keyDetails**: Important information summary

## Development

### Available Scripts
- `npm run dev` - Start backend development server
- `npm run client` - Start React development server
- `npm run dev:full` - Start both servers simultaneously
- `npm run client:build` - Build React app for production
- `npm run install:all` - Install all dependencies

### Environment Variables
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `SESSION_SECRET` - Express session secret
- `OPENAI_API_KEY` - OpenAI API key

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Google OAuth credentials are correct
   - Ensure redirect URI matches exactly: `http://localhost:3000/api/auth/callback/google`
   - Check that Gmail API is enabled

2. **OpenAI API Errors**
   - Verify API key is valid and has sufficient credits
   - Check API rate limits
   - Ensure proper error handling in code

3. **Port Conflicts**
   - Backend runs on port 3000
   - Frontend runs on port 3001
   - Ensure ports are available

4. **CORS Issues**
   - Backend is configured with CORS for development
   - Check that frontend is making requests to correct backend URL

## Future Enhancements

### Planned Features
- **Database Integration**: Store analysis results for historical tracking
- **Email Notifications**: Get alerts for important updates
- **Calendar Integration**: Auto-schedule follow-ups and interviews
- **Analytics Dashboard**: Track application success rates and trends
- **Multi-User Support**: Team collaboration features
- **Custom AI Models**: Fine-tuned models for specific industries

### Advanced AI Features
- **Predictive Analytics**: Predict interview/offer probability
- **Response Time Analysis**: Learn company response patterns
- **Smart Follow-up Suggestions**: AI-powered follow-up recommendations
- **Resume Optimization**: Suggest improvements based on application outcomes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

**Note**: This application requires access to your Gmail account. Ensure you understand the permissions being granted and review the privacy implications before use. 