const request = require('supertest');
const app = require('../app');
const { authCookie, cleanup, closePool } = require('./helpers');

afterAll(async () => { await cleanup(); await closePool(); });

describe('GET /api/categories', () => {
  it('returns list of categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('categories are sorted alphabetically', async () => {
    const res = await request(app).get('/api/categories');
    const names = res.body.data.map(c => c.name);
    expect(names).toEqual([...names].sort());
  });

  it('includes default seeded categories (Travel, Portraits, Street Photography)', async () => {
    const res = await request(app).get('/api/categories');
    const slugs = res.body.data.map(c => c.slug);
    expect(slugs).toContain('travel');
    expect(slugs).toContain('portraits');
    expect(slugs).toContain('street-photography');
  });
});

describe('POST /api/categories', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ name: 'Test Unauth' });
    expect(res.status).toBe(401);
  });

  it('creates a new category and it appears in GET /api/categories', async () => {
    const name = 'Test Wildlife';
    const create = await request(app)
      .post('/api/categories')
      .set('Cookie', authCookie())
      .send({ name });
    expect(create.status).toBe(201);
    expect(create.body.data.slug).toBe('test-wildlife');

    const list = await request(app).get('/api/categories');
    const slugs = list.body.data.map(c => c.slug);
    expect(slugs).toContain('test-wildlife');
  });

  it('returns 409 on duplicate slug', async () => {
    await request(app)
      .post('/api/categories')
      .set('Cookie', authCookie())
      .send({ name: 'Test Duplicate' });

    const res = await request(app)
      .post('/api/categories')
      .set('Cookie', authCookie())
      .send({ name: 'Test Duplicate' });
    expect(res.status).toBe(409);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Cookie', authCookie())
      .send({});
    expect(res.status).toBe(400);
  });
});
