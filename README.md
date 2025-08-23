# JobCAT - Job Application Tracker

JobCAT is an AI-powered job application tracker that analyzes your Gmail emails to automatically categorize and track your job applications.

<img width="1727" height="929" alt="image" src="https://github.com/user-attachments/assets/d238251d-95b0-4100-b0a4-337a39afe939" />

## 🚀 Features

- **Gmail Integration**: Automatically scans your Gmail for job-related emails
- **AI Analysis**: Uses OpenAI to analyze email content and extract key information
- **Smart Categorization**: Automatically categorizes emails by status (received, under review, interview scheduled, etc.)
- **Company Tracking**: Groups applications by company with duplicate detection
- **Real-time Sync**: Live feed showing sync progress
- **Dashboard Analytics**: Visual charts and statistics
- **Manual Controls**: Update status, urgency, and merge duplicate applications

## 🏗️ Architecture

- **Frontend**: React.js with Material-UI
- **Backend**: Node.js with Express
- **Database**: Firebase Firestore
- **Authentication**: Google OAuth 2.0
- **AI**: OpenAI GPT for email analysis
- **Deployment**: Vercel (recommended)

## 🚀 Quick Deploy to Vercel

### Prerequisites
1. Google Cloud Console account
2. Firebase project
3. OpenAI API key
4. Vercel account

### Deploy Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/JobCATGmailScraper.git
   cd JobCATGmailScraper
   ```

2. **Deploy Backend**
   ```bash
   npm run vercel:deploy
   ```

3. **Deploy Frontend**
   ```bash
   npm run vercel:deploy-client
   ```

4. **Configure Environment Variables** (see VERCEL_DEPLOYMENT.md)

5. **Update Google OAuth URLs** with your Vercel domains

## 🔧 Environment Variables

### Backend (.env)
```bash
NODE_ENV=production
SESSION_SECRET=your-secure-session-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-api-domain.vercel.app/api/auth/callback/google
OPENAI_API_KEY=sk-your-openai-api-key
FRONTEND_URL=https://your-frontend-domain.vercel.app
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL=your-firebase-email
```

### Frontend (client/.env)
```bash
REACT_APP_API_URL=https://your-api-domain.vercel.app
```

## 📁 Project Structure

```
JobCATGmailScraper/
├── server.js              # Main API server
├── auth.js                 # Google OAuth configuration
├── firebase.js             # Firebase/Firestore functions
├── gmail.js                # Gmail API integration
├── vercel.json             # Vercel deployment config
├── VERCEL_DEPLOYMENT.md    # Detailed deployment guide
└── client/                 # React frontend
    ├── src/
    │   ├── components/     # React components
    │   ├── contexts/       # React contexts
    │   └── jobcatlogo.png  # Application logo
    └── package.json
```

## 🛠️ Development Setup

1. **Install dependencies**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   cp client/.env.example client/.env
   # Fill in your actual values
   ```

3. **Start development servers**
   ```bash
   npm run dev:full
   ```

## 📚 API Documentation

### Authentication Endpoints
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/callback/google` - OAuth callback
- `GET /api/auth/status` - Check auth status
- `POST /api/auth/logout` - Logout

### Application Endpoints
- `GET /api/applications` - Get user applications
- `POST /api/update-emails` - Sync with Gmail
- `GET /api/job-summary` - Get dashboard summary
- `PUT /api/applications/:id/status` - Update application status
- `PUT /api/applications/:id/urgency` - Update application urgency
- `DELETE /api/applications/:id` - Delete application
- `POST /api/applications/merge` - Merge applications

### Utility Endpoints
- `GET /health` - Health check
- `GET /api/sync-feed` - Server-sent events for live sync

## 🔐 Security Features

- OAuth 2.0 authentication with Google
- Session-based authentication
- CORS protection
- Firebase security rules
- Environment variable configuration
- HTTPS enforcement (Vercel)

## 📊 Performance

- Incremental email sync (only new emails)
- Batch database operations
- Client-side caching
- Optimized React rendering
- Serverless functions (Vercel)

## 🐛 Troubleshooting

See `VERCEL_DEPLOYMENT.md` for detailed troubleshooting guides.

Common issues:
- **Authentication loops**: Check OAuth callback URLs
- **CORS errors**: Verify FRONTEND_URL environment variable
- **Function timeouts**: Consider Vercel Pro for longer execution time

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

- Create an issue for bugs or feature requests
- Check VERCEL_DEPLOYMENT.md for deployment help
- Review the code for implementation details

---

**Your AI-powered job application tracker is ready! 🎉**
