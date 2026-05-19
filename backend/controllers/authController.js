const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

const allowedEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

passport.use(new GoogleStrategy({
  clientID:    process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value?.toLowerCase();
  if (!email || !allowedEmails.includes(email)) return done(null, false);
  done(null, { email, name: profile.displayName });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

function cookieOptions() {
  return process.env.NODE_ENV === 'production'
    ? { httpOnly: true, secure: true, sameSite: 'none', maxAge: 7 * 24 * 3600 * 1000 }
    : { httpOnly: true, sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000 };
}

function handleCallback(req, res) {
  const token = jwt.sign(
    { email: req.user.email, name: req.user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.cookie('token', token, cookieOptions());
  req.session.destroy(() => {
    res.redirect(`${process.env.FRONTEND_URL}/admin/dashboard`);
  });
}

function logout(req, res) {
  const opts = cookieOptions();
  delete opts.maxAge;
  res.clearCookie('token', opts);
  res.json({ message: 'Logged out' });
}

function me(req, res) {
  res.json(req.user);
}

module.exports = { handleCallback, logout, me };
