const router = require('express').Router();
const { login, logout, me } = require('../controllers/authController');
const verifyJWT = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', verifyJWT, me);

module.exports = router;
