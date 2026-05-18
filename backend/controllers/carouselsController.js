const pool = require('../db/pool');
const cloudinary = require('../lib/cloudinary');
const { broadcast } = require('../lib/sseClients');

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

// Returns carousel metadata + all images — used by ContentModal on click.
async function getCarousel(req, res, next) {
  try {
    const { rows: [carousel] } = await pool.query(
      'SELECT * FROM carousels WHERE id = $1',
      [req.params.id]
    );
    if (!carousel) return res.status(404).json({ error: 'Not found' });

    const { rows: images } = await pool.query(
      'SELECT * FROM media WHERE carousel_id = $1 ORDER BY carousel_order ASC',
      [req.params.id]
    );
    res.json({ data: { ...carousel, type: 'carousel', images } });
  } catch (err) {
    next(err);
  }
}

async function createCarousel(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { title, category_id, tags, cover_index } = req.body;
    const tagsArray = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean))
      : [];
    const catId = category_id ? parseInt(category_id) : null;

    const { rows: carRows } = await pool.query(
      `INSERT INTO carousels (title, category_id, tags) VALUES ($1, $2, $3) RETURNING *`,
      [title || null, catId, tagsArray]
    );
    const carousel = carRows[0];

    const uploadResults = await Promise.all(
      req.files.map((file, index) =>
        uploadToCloudinary(file.buffer, {
          folder: 'portfolio/carousels',
          resource_type: 'image',
        }).then(result => ({ result, index }))
      )
    );

    const mediaRows = await Promise.all(
      uploadResults.map(({ result, index }) =>
        pool.query(
          `INSERT INTO media (cloudinary_id, url, thumbnail_url, type, title, category_id, tags, width, height, carousel_id, carousel_order)
           VALUES ($1, $2, $3, 'image', $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            result.public_id,
            result.secure_url,
            result.secure_url,
            title || null,
            catId,
            tagsArray,
            result.width || null,
            result.height || null,
            carousel.id,
            index,
          ]
        ).then(r => r.rows[0])
      )
    );

    // Set the admin-chosen cover image (defaults to first image if not specified).
    const chosenIndex = Math.min(parseInt(cover_index) || 0, mediaRows.length - 1);
    const coverMediaId = mediaRows[chosenIndex].id;
    await pool.query(
      'UPDATE carousels SET cover_media_id = $1 WHERE id = $2',
      [coverMediaId, carousel.id]
    );

    broadcast('new_media');
    res.status(201).json({ data: { ...carousel, cover_media_id: coverMediaId, images: mediaRows } });
  } catch (err) {
    next(err);
  }
}

async function deleteCarousel(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT cloudinary_id FROM media WHERE carousel_id = $1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    await Promise.all(
      rows.map(r => cloudinary.uploader.destroy(r.cloudinary_id, { resource_type: 'image' }))
    );

    await pool.query('DELETE FROM carousels WHERE id = $1', [id]);
    broadcast('new_media');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function updateCarousel(req, res, next) {
  try {
    const { title, category_id, tags } = req.body;
    const tagsArray = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean))
      : [];

    const { rows } = await pool.query(
      `UPDATE carousels
       SET title = $1, category_id = $2, tags = $3
       WHERE id = $4
       RETURNING *`,
      [title || null, category_id ? parseInt(category_id) : null, tagsArray, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    // Keep carousel images in sync with the new metadata.
    await pool.query(
      `UPDATE media SET title = $1, category_id = $2, tags = $3 WHERE carousel_id = $4`,
      [title || null, category_id ? parseInt(category_id) : null, tagsArray, req.params.id]
    );

    broadcast('new_media');
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCarousel, createCarousel, updateCarousel, deleteCarousel };
