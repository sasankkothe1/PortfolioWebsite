const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 7 * 24 * 3600 * 1000,
};

function cookieOptions() {
  if (process.env.NODE_ENV === 'production') {
    return { ...COOKIE_OPTIONS, secure: true, sameSite: 'none' };
  }
  return { ...COOKIE_OPTIONS, sameSite: 'strict' };
}

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.cookie('token', token, cookieOptions());
  res.json({ user: { id: user.id, username: user.username } });
}

async function logout(req, res) {
  res.clearCookie('token', cookieOptions());
  res.json({ message: 'Logged out' });
}

async function me(req, res) {
  res.json(req.user);
}

module.exports = { login, logout, me };
