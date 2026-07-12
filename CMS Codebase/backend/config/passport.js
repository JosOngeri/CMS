const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { pool } = require('./database');
const logger = require('./logging');

// Utility to scrub PII from profile objects before logging
function scrubProfilePII(profile) {
  const scrubbed = { ...profile };
  if (scrubbed.emails) {
    scrubbed.emails = scrubbed.emails.map(email => ({
      ...email,
      value: email.value ? '[REDACTED_EMAIL]' : null
    }));
  }
  return scrubbed;
}

// Google OAuth Strategy (only if credentials are configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          logger.info({ profileId: profile.id }, 'Google OAuth authentication attempt');
          
          // Extract user information from Google profile
          const user = {
            id: profile.id,
            email: profile.emails?.[0]?.value || null,
            given_name: profile.name.givenName,
            family_name: profile.name.familyName,
            picture: profile.photos[0]?.value,
          };
          
          logger.info({ profileId: profile.id, userId: user.id }, 'Google OAuth authentication successful');
          return done(null, user);
        } catch (error) {
          logger.error({ error: error.message }, 'Google OAuth authentication failed');
          return done(error, null);
        }
      }
    )
  );
}

// Facebook OAuth Strategy (only if credentials are configured)
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${process.env.API_URL}/api/auth/facebook/callback`,
        profileFields: ['id', 'emails', 'name', 'picture'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          logger.info({ profileId: profile.id }, 'Facebook OAuth authentication attempt');
          
          // Extract user information from Facebook profile
          const user = {
            id: profile.id,
            email: profile.emails?.[0]?.value || null,
            first_name: profile.name.givenName,
            last_name: profile.name.familyName,
            picture: profile.photos,
          };
          
          logger.info({ profileId: profile.id, userId: user.id }, 'Facebook OAuth authentication successful');
          return done(null, user);
        } catch (error) {
          logger.error({ error: error.message }, 'Facebook OAuth authentication failed');
          return done(error, null);
        }
      }
    )
  );
}

// Serialize user for session
passport.serializeUser((user, done) => {
  logger.info({ userId: user.id }, 'Serializing user for session');
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    logger.info({ userId: id }, 'Deserializing user from session');
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    logger.error({ userId: id, error: error.message }, 'User deserialization failed');
    done(error, null);
  }
});

module.exports = passport;