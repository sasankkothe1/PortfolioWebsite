const pool = require('../db/pool');

async function getSuggestions(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) return res.status(400).json({ error: 'Query must be at least 3 characters' });

    const { rows } = await pool.query(
      `SELECT DISTINCT t.tag
       FROM media, unnest(tags) AS t(tag)
       WHERE t.tag ILIKE $1
       ORDER BY t.tag
       LIMIT 10`,
      [`%${q}%`]
    );

    res.json({ data: rows.map(r => r.tag) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSuggestions };
