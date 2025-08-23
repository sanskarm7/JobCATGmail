const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("❌ Missing Google OAuth credentials:");
  console.error("GOOGLE_CLIENT_ID:", !!process.env.GOOGLE_CLIENT_ID);
  console.error("GOOGLE_CLIENT_SECRET:", !!process.env.GOOGLE_CLIENT_SECRET);
  console.error("GOOGLE_CALLBACK_URL:", !!process.env.GOOGLE_CALLBACK_URL);
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: [
        "profile", 
        "email", 
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
      accessType: "offline",
      prompt: "consent"
    },
    (accessToken, refreshToken, profile, done) => {
      profile.accessToken = accessToken;
      profile.refreshToken = refreshToken;
      return done(null, profile);
    }
  )
);

module.exports = passport;
