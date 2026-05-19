const router = require('express').Router();
const passport = require('passport');
const { handleCallback, logout, me } = require('../controllers/authController');
const verifyJWT = require('../middleware/auth');

router.get('/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/admin?error=unauthorized`,
  }),
  handleCallback
);

router.post('/logout', logout);
router.get('/me', verifyJWT, me);

module.exports = router;
