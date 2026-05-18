const pool = require('../db/pool');
const cloudinary = require('../lib/cloudinary');
const { broadcast } = require('../lib/sseClients');

// Bridges Cloudinary's callback-based upload_stream into a Promise so we can
// use await instead of nested callbacks.
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

// Parses page/limit from query string and computes the SQL OFFSET.
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.max(1, parseInt(query.limit) || 20);
  return { page, limit, offset: (page - 1) * limit };
}

// Public gallery feed — returns standalone photos/videos AND carousel covers
// in a single query, with total count included via a window function so we
// only hit the database once instead of twice.
async function listFeed(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const cat = req.query.category || null;
    const tag = req.query.search   || null;

    // COUNT(*) OVER() is a window function: Postgres calculates the total
    // number of matching rows and attaches it to every row returned, so we
    // get both the page of results and the total count in one round-trip.
    const { rows } = await pool.query(
      `WITH carousel_covers AS (
         -- Use cover_media_id when set; fall back to lowest carousel_order.
         SELECT DISTINCT ON (m.carousel_id)
           m.carousel_id, m.url, m.thumbnail_url, m.width, m.height
         FROM media m
         JOIN carousels car ON car.id = m.carousel_id
         ORDER BY
           m.carousel_id,
           (m.id = car.cover_media_id) DESC,
           m.carousel_order ASC
       ),
       feed AS (
         -- Standalone photos and videos
         SELECT
           m.id, m.url, m.thumbnail_url, m.type, m.title,
           m.category_id, m.tags, m.width, m.height, m.duration,
           m.created_at, NULL::integer AS carousel_id,
           c.name AS category_name, c.slug AS category_slug
         FROM media m
         LEFT JOIN categories c ON c.id = m.category_id
         WHERE m.carousel_id IS NULL
           AND ($1::text IS NULL OR c.slug = $1)
           AND ($2::text IS NULL OR $2 = ANY(m.tags))

         UNION ALL

         -- Carousels represented by their cover image
         SELECT
           car.id, cc.url, cc.thumbnail_url, 'carousel' AS type, car.title,
           car.category_id, car.tags, cc.width, cc.height, NULL AS duration,
           car.created_at, car.id AS carousel_id,
           cat.name AS category_name, cat.slug AS category_slug
         FROM carousels car
         LEFT JOIN categories cat ON cat.id = car.category_id
         JOIN carousel_covers cc ON cc.carousel_id = car.id
         WHERE ($1::text IS NULL OR cat.slug = $1)
           AND ($2::text IS NULL OR $2 = ANY(car.tags))
       )
       SELECT *, COUNT(*) OVER() AS total_count
       FROM feed
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [cat, tag, limit, offset]
    );

    const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const data  = rows.map(({ total_count, ...rest }) => rest); // strip internal count field

    res.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// Admin — returns all standalone media (no carousel grouping needed for the dashboard).
async function listMedia(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const cat = req.query.category || null;
    const tag = req.query.search   || null;

    const { rows } = await pool.query(
      `SELECT m.*, c.name AS category_name, c.slug AS category_slug,
              COUNT(*) OVER() AS total_count
       FROM media m
       LEFT JOIN categories c ON c.id = m.category_id
       WHERE ($1::text IS NULL OR c.slug = $1)
         AND ($2::text IS NULL OR $2 = ANY(m.tags))
       ORDER BY m.created_at DESC
       LIMIT $3 OFFSET $4`,
      [cat, tag, limit, offset]
    );

    const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const data  = rows.map(({ total_count, ...rest }) => rest);

    res.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function uploadMedia(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { title, category_id, tags } = req.body;
    const isVideo      = req.file.mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const options = { folder: 'portfolio', resource_type: resourceType };
    if (isVideo) {
      // eager asks Cloudinary to generate a thumbnail from frame 0 synchronously.
      options.eager       = [{ format: 'jpg', transformation: [{ start_offset: '0' }] }];
      options.eager_async = false;
    }

    let result;
    try {
      result = await uploadToCloudinary(req.file.buffer, options);
    } catch (cloudinaryErr) {
      if (cloudinaryErr.http_code === 400 && cloudinaryErr.message?.includes('File size too large')) {
        return res.status(413).json({
          error: `File is too large for the free Cloudinary plan (max 10 MB). ${isVideo ? 'Please compress the video before uploading.' : 'Try a smaller file.'}`,
        });
      }
      throw cloudinaryErr;
    }

    const tagsArray = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean))
      : [];

    const { rows } = await pool.query(
      `INSERT INTO media
         (cloudinary_id, url, thumbnail_url, type, title, category_id, tags, width, height, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        result.public_id,
        result.secure_url,
        isVideo
          ? (result.eager?.[0]?.secure_url ?? cloudinary.url(result.public_id, { resource_type: 'video', format: 'jpg' }))
          : result.secure_url,
        resourceType,
        title || null,
        category_id ? parseInt(category_id) : null,
        tagsArray,
        result.width  || null,
        result.height || null,
        result.duration || null,
      ]
    );

    broadcast('new_media');
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteMedia(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT * FROM media WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const media = rows[0];
    await cloudinary.uploader.destroy(media.cloudinary_id, { resource_type: media.type });
    await pool.query('DELETE FROM media WHERE id = $1', [req.params.id]);
    broadcast('new_media');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getMediaById(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, c.name AS category_name, c.slug AS category_slug
       FROM media m
       LEFT JOIN categories c ON c.id = m.category_id
       WHERE m.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFeed, listMedia, getMediaById, uploadMedia, deleteMedia };
