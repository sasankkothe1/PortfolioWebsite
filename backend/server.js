require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/media',      require('./routes/media'));
app.use('/api/carousels',  require('./routes/carousels'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tags',       require('./routes/tags'));
app.use('/api/events',     require('./routes/events'));

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File is too large (max 200 MB). For videos, compress with HandBrake first. Note: Cloudinary free plan also limits files to 10 MB.',
    });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

async function seedAdminIfNeeded() {
  const pool = require('./db/pool');
  const bcrypt = require('bcrypt');
  const { rows } = await pool.query('SELECT 1 FROM users LIMIT 1');
  if (rows.length > 0) return; // admin already exists
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return;
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [ADMIN_USERNAME, hash]
  );
  console.log(`Admin user "${ADMIN_USERNAME}" created automatically.`);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`);
  await seedAdminIfNeeded().catch(err => console.error('Admin seed error:', err));
});
