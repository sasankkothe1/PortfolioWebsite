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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
