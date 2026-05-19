// Set env vars before any module is loaded so pool, jwt, passport all use test values.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';
process.env.ADMIN_EMAILS = 'admin@test.com';
process.env.BACKEND_URL = 'http://localhost:3001';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

// Use TEST_DATABASE_URL if set (for CI), otherwise fall back to localhost dev DB.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    'postgresql://portfolio_user:localpassword@localhost:5432/portfolio';
}
