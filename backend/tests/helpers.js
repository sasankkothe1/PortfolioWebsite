const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const TEST_PREFIX = '__TEST__';

// A 1×1 transparent PNG — smallest valid image for upload tests.
const TEST_IMAGE_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

function makeToken(email = 'admin@test.com') {
  return jwt.sign(
    { email, name: 'Test Admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function authCookie(email) {
  return `token=${makeToken(email)}`;
}

// Delete all data created by tests (identified by __TEST__ prefix).
async function cleanup() {
  try {
    await pool.query(
      `DELETE FROM media WHERE cloudinary_id LIKE $1 OR title LIKE $1`,
      [`${TEST_PREFIX}%`]
    );
    await pool.query(`DELETE FROM carousels WHERE title LIKE $1`, [`${TEST_PREFIX}%`]);
    await pool.query(`DELETE FROM categories WHERE slug LIKE 'test-%'`);
  } catch {
    // DB may not be available in all test environments; cleanup is best-effort.
  }
}

async function closePool() {
  try { await pool.end(); } catch { /* ignore */ }
}

// Cloudinary mock factory — returns a jest-compatible mock module.
const mockCloudinaryResult = (overrides = {}) => ({
  public_id: `${TEST_PREFIX}mock_${Date.now()}`,
  secure_url: 'https://res.cloudinary.com/test/image/upload/mock.jpg',
  width: 100,
  height: 100,
  duration: null,
  eager: [{ secure_url: 'https://res.cloudinary.com/test/video/upload/mock_thumb.jpg' }],
  ...overrides,
});

module.exports = {
  TEST_PREFIX,
  TEST_IMAGE_BUFFER,
  makeToken,
  authCookie,
  cleanup,
  closePool,
  mockCloudinaryResult,
};
