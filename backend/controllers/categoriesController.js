const pool = require('../db/pool');

async function listCategories(req, res) {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY name ASC');
  res.json({ data: rows });
}

async function createCategory(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  try {
    const { rows } = await pool.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slug]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Category already exists' });
    throw err;
  }
}

module.exports = { listCategories, createCategory };
