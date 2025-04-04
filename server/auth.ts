import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import { storage } from './storage';
import type { User } from '@shared/schema';

// Setup passport for authentication
export function setupAuth() {
  // Serialize and deserialize user
  passport.serializeUser((user: User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Local strategy (username/password)
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      
      if (!user || !user.password) {
        return done(null, false, { message: 'Incorrect email or password' });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect email or password' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  // Google OAuth strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await storage.getUserByGoogleId(profile.id);
        
        if (user) {
          return done(null, user);
        }
        
        // If not, check if email exists
        const email = profile.emails?.[0]?.value;
        
        if (email) {
          user = await storage.getUserByEmail(email);
          
          if (user) {
            // Update user with Google ID
            user = await storage.updateUser(user.id, { 
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value
            });
            return done(null, user);
          }
        }
        
        // Create new user
        const newUser = await storage.createUser({
          email: email || `${profile.id}@google.com`,
          username: profile.displayName || `user_${profile.id}`,
          googleId: profile.id,
          avatar: profile.photos?.[0]?.value,
          password: null
        });
        
        return done(null, newUser);
      } catch (error) {
        return done(error);
      }
    }));
  }

  return passport;
}

// Hash password helper function
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
