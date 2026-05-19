const request = require('supertest');
const { mockCloudinaryResult, TEST_PREFIX, TEST_IMAGE_BUFFER, authCookie, cleanup, closePool } = require('./helpers');

jest.mock('../lib/cloudinary', () => {
  const { mockCloudinaryResult } = require('./helpers');
  let callCount = 0;
  return {
    uploader: {
      upload_stream: jest.fn((opts, cb) => {
        const id = ++callCount;
        process.nextTick(() => cb(null, mockCloudinaryResult({
          public_id: `${require('./helpers').TEST_PREFIX}carousel_img_${id}_${Date.now()}`,
          secure_url: `https://res.cloudinary.com/test/image/upload/mock_${id}.jpg`,
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

let carousel1Id, carousel2Id;

afterAll(async () => { await cleanup(); await closePool(); });

describe('POST /api/carousels — upload', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/carousels')
      .attach('files', TEST_IMAGE_BUFFER, { filename: 'a.png', contentType: 'image/png' })
      .attach('files', TEST_IMAGE_BUFFER, { filename: 'b.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('creates first carousel with correct image count', async () => {
    const res = await request(app)
      .post('/api/carousels')
      .set('Cookie', authCookie())
      .field('title', `${TEST_PREFIX}Carousel One`)
      .field('tags', 'mountain')
      .field('cover_index', '1')
      .attach('files', TEST_IMAGE_BUFFER, { filename: 'img1.png', contentType: 'image/png' })
      .attach('files', TEST_IMAGE_BUFFER, { filename: 'img2.png', contentType: 'image/png' })
      .attach('files', TEST_IMAGE_BUFFER, { filename: 'img3.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.images).toHaveLength(3);
    expect(res.body.data.carousel.title).toBe(`${TEST_PREFIX}Carousel One`);
    carousel1Id = res.body.data.carousel.id;
  });

  it('images are in upload order (carousel_order 0,1,2)', async () => {
    const res = await request(app).get(`/api/carousels/${carousel1Id}`);
    const orders = res.body.data.images.map(i => i.carousel_order);
    expect(orders).toEqual([0, 1, 2]);
  });

  it('cover_index=1 sets second image as cover', async () => {
    const res = await request(app).get(`/api/carousels/${carousel1Id}`);
    const carousel = res.body.data;
    const coverImage = carousel.images.find(i => i.id === carousel.cover_media_id);
    expect(coverImage.carousel_order).toBe(1);
  });

  it('carousel appears in feed as type carousel', async () => {
    const res = await request(app).get('/api/media/feed');
    const carousel = res.body.data.find(i => i.carousel_id === carousel1Id);
    expect(carousel).toBeDefined();
    expect(carousel.type).toBe('carousel');
  });

  it('creates second carousel independently', async () => {
    const res = await request(app)
      .post('/api/carousels')
      .set('Cookie', authCookie())
      .field('title', `${TEST_PREFIX}Carousel Two`)
      .field('tags', 'ocean')
      .attach('files', TEST_IMAGE_BUFFER, { filename: 'c.png', contentType: 'image/png' })
      .attach('files', TEST_IMAGE_BUFFER, { filename: 'd.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.images).toHaveLength(2);
    carousel2Id = res.body.data.carousel.id;
  });

  it('both carousels appear in feed independently', async () => {
    const res = await request(app).get('/api/media/feed');
    const carouselIds = res.body.data
      .filter(i => i.type === 'carousel')
      .map(i => i.carousel_id);
    expect(carouselIds).toContain(carousel1Id);
    expect(carouselIds).toContain(carousel2Id);
  });
});

describe('PATCH /api/carousels/:id — edit', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch(`/api/carousels/${carousel1Id}`)
      .send({ title: 'Hacked' });
    expect(res.status).toBe(401);
  });

  it('updates title, tags and syncs to member images', async () => {
    const res = await request(app)
      .patch(`/api/carousels/${carousel1Id}`)
      .set('Cookie', authCookie())
      .send({ title: `${TEST_PREFIX}Carousel One Updated`, tags: ['alpine'] });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe(`${TEST_PREFIX}Carousel One Updated`);
    expect(res.body.data.tags).toContain('alpine');

    // Member images should have the same tags
    const detail = await request(app).get(`/api/carousels/${carousel1Id}`);
    detail.body.data.images.forEach(img => {
      expect(img.tags).toContain('alpine');
    });
  });
});

describe('DELETE /api/carousels/:id', () => {
  it('deletes first carousel; second is still in feed', async () => {
    const del = await request(app)
      .delete(`/api/carousels/${carousel1Id}`)
      .set('Cookie', authCookie());
    expect(del.status).toBe(204);

    const feed = await request(app).get('/api/media/feed');
    const carouselIds = feed.body.data
      .filter(i => i.type === 'carousel')
      .map(i => i.carousel_id);
    expect(carouselIds).not.toContain(carousel1Id);
    expect(carouselIds).toContain(carousel2Id);
  });

  it('deleted carousel images are no longer fetchable', async () => {
    const res = await request(app).get(`/api/carousels/${carousel1Id}`);
    expect(res.status).toBe(404);
  });

  it('deletes second carousel; no carousels remain in feed', async () => {
    await request(app)
      .delete(`/api/carousels/${carousel2Id}`)
      .set('Cookie', authCookie());

    const feed = await request(app).get('/api/media/feed');
    const carousels = feed.body.data.filter(i => i.type === 'carousel');
    expect(carousels).toHaveLength(0);
  });
});
