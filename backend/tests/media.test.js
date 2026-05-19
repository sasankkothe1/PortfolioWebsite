const request = require('supertest');
const { mockCloudinaryResult, TEST_PREFIX, TEST_IMAGE_BUFFER, authCookie, cleanup, closePool } = require('./helpers');

// Mock Cloudinary and SSE before importing app.
jest.mock('../lib/cloudinary', () => {
  const { mockCloudinaryResult } = require('./helpers');
  return {
    uploader: {
      upload_stream: jest.fn((opts, cb) => {
        process.nextTick(() => cb(null, mockCloudinaryResult()));
        return { end: jest.fn() };
      }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
    url: jest.fn(() => 'https://res.cloudinary.com/test/mock.jpg'),
  };
});
jest.mock('../lib/sseClients', () => ({ broadcast: jest.fn(), addClient: jest.fn(), removeClient: jest.fn() }));

const app = require('../app');

let createdMediaId;

afterAll(async () => { await cleanup(); await closePool(); });

describe('POST /api/media — upload single image', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/media')
      .attach('file', TEST_IMAGE_BUFFER, { filename: 'test.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when no file attached', async () => {
    const res = await request(app)
      .post('/api/media')
      .set('Cookie', authCookie())
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  it('creates media record and returns 201', async () => {
    const res = await request(app)
      .post('/api/media')
      .set('Cookie', authCookie())
      .field('title', `${TEST_PREFIX}Photo`)
      .field('tags', 'sunset')
      .field('tags', 'travel')
      .attach('file', TEST_IMAGE_BUFFER, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('image');
    expect(res.body.data.title).toBe(`${TEST_PREFIX}Photo`);
    expect(res.body.data.tags).toContain('sunset');
    expect(res.body.data.tags).toContain('travel');
    createdMediaId = res.body.data.id;
  });

  it('uploaded item appears in /api/media/feed', async () => {
    const res = await request(app).get('/api/media/feed');
    const ids = res.body.data.map(i => i.id);
    expect(ids).toContain(createdMediaId);
  });
});

describe('GET /api/media/:id', () => {
  it('returns the correct media item', async () => {
    const res = await request(app).get(`/api/media/${createdMediaId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdMediaId);
  });

  it('returns 404 for unknown ID', async () => {
    const res = await request(app).get('/api/media/999999999');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/media/:id — edit metadata', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch(`/api/media/${createdMediaId}`)
      .send({ title: 'Hacked' });
    expect(res.status).toBe(401);
  });

  it('updates title, tags and reflects in feed', async () => {
    const newTitle = `${TEST_PREFIX}Updated`;
    const patch = await request(app)
      .patch(`/api/media/${createdMediaId}`)
      .set('Cookie', authCookie())
      .send({ title: newTitle, tags: ['newcoast'] });
    expect(patch.status).toBe(200);
    expect(patch.body.data.title).toBe(newTitle);
    expect(patch.body.data.tags).toContain('newcoast');

    // Verify reflected in feed
    const feed = await request(app).get('/api/media/feed');
    const item = feed.body.data.find(i => i.id === createdMediaId);
    expect(item).toBeDefined();
    expect(item.tags).toContain('newcoast');
  });
});

describe('DELETE /api/media/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete(`/api/media/${createdMediaId}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown ID', async () => {
    const res = await request(app)
      .delete('/api/media/999999999')
      .set('Cookie', authCookie());
    expect(res.status).toBe(404);
  });

  it('deletes item and it no longer appears in feed', async () => {
    const del = await request(app)
      .delete(`/api/media/${createdMediaId}`)
      .set('Cookie', authCookie());
    expect(del.status).toBe(204);

    const feed = await request(app).get('/api/media/feed');
    const ids = feed.body.data.map(i => i.id);
    expect(ids).not.toContain(createdMediaId);
  });
});
