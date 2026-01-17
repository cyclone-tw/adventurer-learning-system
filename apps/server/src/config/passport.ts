import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { config } from './index.js';
import User from '../models/User.js';

export const configurePassport = () => {
  // Only configure Google Strategy if credentials are provided
  if (!config.google.clientId || !config.google.clientSecret) {
    console.warn('Google OAuth credentials not configured. Google login will be disabled.');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: any, user?: any) => void
      ) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('無法取得 Google 帳號的電子郵件'));
          }

          // Check if user exists by googleId
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            // Update last login
            user.lastLoginAt = new Date();
            await user.save();
            return done(null, user);
          }

          // Check if user exists by email (might have registered with email/password before)
          user = await User.findOne({ email: email.toLowerCase() });

          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.avatarUrl = profile.photos?.[0]?.value;
            user.lastLoginAt = new Date();
            await user.save();
            return done(null, user);
          }

          // Create new user (default role is student)
          user = await User.create({
            email: email.toLowerCase(),
            googleId: profile.id,
            displayName: profile.displayName || email.split('@')[0],
            avatarUrl: profile.photos?.[0]?.value,
            role: 'student', // New Google users are always students
            lastLoginAt: new Date(),
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
};

export default passport;
