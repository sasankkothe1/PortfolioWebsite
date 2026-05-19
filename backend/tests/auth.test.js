const request = require('supertest');
const app = require('../app');
const { authCookie, makeToken, cleanup, closePool } = require('./helpers');

afterAll(async () => { await cleanup(); await closePool(); });

describe('GET /api/auth/me', () => {
  it('returns 401 when no cookie present', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user data when valid JWT cookie present', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie());
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@test.com');
    expect(res.body.name).toBe('Test Admin');
  });

  it('returns 401 when JWT is invalid', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'token=not-a-valid-jwt');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the token cookie and returns logged out message', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
    // Cookie should be cleared (Set-Cookie header present with empty/expired token)
    const setCookie = res.headers['set-cookie'] || [];
    const tokenCookie = setCookie.find(c => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
  });
});
