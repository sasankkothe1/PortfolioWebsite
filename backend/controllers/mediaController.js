const pool = require('../db/pool');
const cloudinary = require('../lib/cloudinary');

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function listMedia(req, res) {
  const { category, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const categoryParam = category || null;
  const searchParam = search || null;

  const { rows } = await pool.query(
    `SELECT m.*, c.name AS category_name, c.slug AS category_slug
     FROM media m
     LEFT JOIN categories c ON c.id = m.category_id
     WHERE ($1::text IS NULL OR c.slug = $1)
       AND ($2::text IS NULL OR $2 = ANY(m.tags))
     ORDER BY m.created_at DESC
     LIMIT $3 OFFSET $4`,
    [categoryParam, searchParam, parseInt(limit), offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM media m
     LEFT JOIN categories c ON c.id = m.category_id
     WHERE ($1::text IS NULL OR c.slug = $1)
       AND ($2::text IS NULL OR $2 = ANY(m.tags))`,
    [categoryParam, searchParam]
  );

  const total = parseInt(countRows[0].count);
  res.json({
    data: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
}

async function uploadMedia(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const { title, category_id, tags } = req.body;
  const isVideo = req.file.mimetype.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';

  const options = {
    folder: 'portfolio',
    resource_type: resourceType,
  };

  if (isVideo) {
    options.eager = [{ format: 'jpg', transformation: [{ start_offset: '0' }] }];
    options.eager_async = false;
  }

  const result = await uploadToCloudinary(req.file.buffer, options);

  const url = result.secure_url;
  const cloudinaryId = result.public_id;
  const thumbnailUrl = isVideo
    ? (result.eager?.[0]?.secure_url || cloudinary.url(cloudinaryId, { resource_type: 'video', format: 'jpg' }))
    : url;
  const width = result.width || null;
  const height = result.height || null;
  const duration = result.duration || null;

  const tagsArray = tags
    ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean))
    : [];

  const catId = category_id ? parseInt(category_id) : null;

  const { rows } = await pool.query(
    `INSERT INTO media (cloudinary_id, url, thumbnail_url, type, title, category_id, tags, width, height, duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [cloudinaryId, url, thumbnailUrl, resourceType, title || null, catId, tagsArray, width, height, duration]
  );

  res.status(201).json({ data: rows[0] });
}

async function deleteMedia(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM media WHERE id = $1', [id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });

  const media = rows[0];
  await cloudinary.uploader.destroy(media.cloudinary_id, { resource_type: media.type });
  await pool.query('DELETE FROM media WHERE id = $1', [id]);
  res.status(204).send();
}

module.exports = { listMedia, uploadMedia, deleteMedia };
