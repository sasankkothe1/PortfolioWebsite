const request = require('supertest');
const pool = require('../db/pool');
const { TEST_PREFIX, authCookie, cleanup, closePool } = require('./helpers');

jest.mock('../lib/cloudinary', () => {
  const { mockCloudinaryResult, TEST_PREFIX } = require('./helpers');
  return {
    uploader: {
      upload_stream: jest.fn((opts, cb) => {
        process.nextTick(() => cb(null, mockCloudinaryResult({
          public_id: `${TEST_PREFIX}feed_${Date.now()}`,
        })));
        return { end: jest.fn() };
      }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
    url: jest.fn(() => 'https://res.cloudinary.com/test/mock.jpg'),
  };
});
jest.mock('../lib/sseClients', () => ({ broadcast: jest.fn(), addClient: jest.fn(), removeClient: jest.fn() }));

const app = require('../app');

// Seed a known media row directly so feed tests don't depend on upload tests.
let seededId, categoryId;

beforeAll(async () => {
  const cat = await pool.query(
    `INSERT INTO categories (name, slug) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = $1 RETURNING id`,
    [`${TEST_PREFIX}Feed Cat`, 'test-feed-cat']
  );
  categoryId = cat.rows[0].id;

  const med = await pool.query(
    `INSERT INTO media (cloudinary_id, url, thumbnail_url, type, title, category_id, tags, width, height)
     VALUES ($1, $2, $3, 'image', $4, $5, $6, 100, 100) RETURNING id`,
    [
      `${TEST_PREFIX}feed_seed`,
      'https://res.cloudinary.com/test/seed.jpg',
      'https://res.cloudinary.com/test/seed.jpg',
      `${TEST_PREFIX}Seeded Photo`,
      categoryId,
      ['ocean', 'blue'],
    ]
  );
  seededId = med.rows[0].id;
});

afterAll(async () => { await cleanup(); await closePool(); });

describe('GET /api/media/feed', () => {
  it('returns paginated list with pagination metadata', async () => {
    const res = await request(app).get('/api/media/feed');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('totalPages');
  });

  it('respects limit param', async () => {
    const res = await request(app).get('/api/media/feed?limit=1');
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });

  it('page 2 returns different items than page 1', async () => {
    const p1 = await request(app).get('/api/media/feed?page=1&limit=1');
    const p2 = await request(app).get('/api/media/feed?page=2&limit=1');
    if (p1.body.pagination.totalPages >= 2) {
      const ids1 = p1.body.data.map(i => i.id);
      const ids2 = p2.body.data.map(i => i.id);
      expect(ids1).not.toEqual(ids2);
    }
  });

  it('filters by category slug', async () => {
    const res = await request(app).get('/api/media/feed?category=test-feed-cat');
    expect(res.status).toBe(200);
    const ids = res.body.data.map(i => i.id);
    expect(ids).toContain(seededId);
    // Should not return items from other categories
    res.body.data.forEach(item => {
      expect(item.category_slug).toBe('test-feed-cat');
    });
  });

  it('filters by tag search', async () => {
    const res = await request(app).get('/api/media/feed?search=ocean');
    expect(res.status).toBe(200);
    const ids = res.body.data.map(i => i.id);
    expect(ids).toContain(seededId);
  });

  it('returns no results for non-existent tag', async () => {
    const res = await request(app).get('/api/media/feed?search=zzznomatch999');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });

  it('total count in pagination matches actual data', async () => {
    const res = await request(app).get('/api/media/feed?limit=100');
    expect(res.body.pagination.total).toBe(res.body.data.length);
  });
});

describe('GET /api/media/:id', () => {
  it('returns correct item', async () => {
    const res = await request(app).get(`/api/media/${seededId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(seededId);
    expect(res.body.data.title).toBe(`${TEST_PREFIX}Seeded Photo`);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/media/999999999');
    expect(res.status).toBe(404);
  });
});
