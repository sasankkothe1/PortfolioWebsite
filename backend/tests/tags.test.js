const request = require('supertest');
const pool = require('../db/pool');
const { TEST_PREFIX, authCookie, cleanup, closePool, mockCloudinaryResult, TEST_IMAGE_BUFFER } = require('./helpers');

jest.mock('../lib/cloudinary', () => {
  const { mockCloudinaryResult, TEST_PREFIX } = require('./helpers');
  return {
    uploader: {
      upload_stream: jest.fn((opts, cb) => {
        process.nextTick(() => cb(null, mockCloudinaryResult({
          public_id: `${TEST_PREFIX}tags_${Date.now()}`,
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

let seededMediaId;

beforeAll(async () => {
  // Seed media with known tags directly.
  const med = await pool.query(
    `INSERT INTO media (cloudinary_id, url, thumbnail_url, type, title, tags, width, height)
     VALUES ($1, $2, $3, 'image', $4, $5, 100, 100) RETURNING id`,
    [
      `${TEST_PREFIX}tags_seed`,
      'https://res.cloudinary.com/test/tags_seed.jpg',
      'https://res.cloudinary.com/test/tags_seed.jpg',
      `${TEST_PREFIX}Tags Test Photo`,
      ['patagonia', 'landscape', 'travel'],
    ]
  );
  seededMediaId = med.rows[0].id;
});

afterAll(async () => { await cleanup(); await closePool(); });

describe('GET /api/tags/suggestions', () => {
  it('empty q returns most-used tags (up to 20)', async () => {
    const res = await request(app).get('/api/tags/suggestions?q=');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(20);
  });

  it('filtered query returns matching tags case-insensitively', async () => {
    const res = await request(app).get('/api/tags/suggestions?q=pata');
    expect(res.status).toBe(200);
    expect(res.body.data).toContain('patagonia');
  });

  it('non-matching query returns empty array', async () => {
    const res = await request(app).get('/api/tags/suggestions?q=zzznomatch999');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('Tags propagation to public gallery', () => {
  it('uploaded media with tags appears in feed with correct tags', async () => {
    const feed = await request(app).get('/api/media/feed?search=patagonia');
    const ids = feed.body.data.map(i => i.id);
    expect(ids).toContain(seededMediaId);
  });

  it('tag suggestions include seeded tags', async () => {
    const res = await request(app).get('/api/tags/suggestions?q=land');
    expect(res.body.data).toContain('landscape');
  });

  it('editing tags updates suggestions — old tag removed, new tag searchable', async () => {
    // Remove 'travel', add 'arctic'
    await request(app)
      .patch(`/api/media/${seededMediaId}`)
      .set('Cookie', authCookie())
      .send({ tags: ['patagonia', 'landscape', 'arctic'] });

    // New tag 'arctic' appears in suggestions
    const sugg = await request(app).get('/api/tags/suggestions?q=arct');
    expect(sugg.body.data).toContain('arctic');

    // Searching by new tag finds the item
    const newSearch = await request(app).get('/api/media/feed?search=arctic');
    const ids = newSearch.body.data.map(i => i.id);
    expect(ids).toContain(seededMediaId);

    // Searching by removed tag no longer finds THIS item (may find others with 'travel')
    const oldSearch = await request(app).get('/api/media/feed?search=travel');
    const travelIds = oldSearch.body.data.map(i => i.id);
    expect(travelIds).not.toContain(seededMediaId);
  });
});
