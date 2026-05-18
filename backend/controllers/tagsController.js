const pool = require('../db/pool');

async function getSuggestions(req, res, next) {
  try {
    const { q = '' } = req.query;

    // When q is empty return the most-used tags so the admin sees
    // popular tags immediately on focus. When q has text, filter by it.
    const { rows } = await pool.query(
      q.length === 0
        ? `SELECT t.tag, COUNT(*) AS uses
           FROM media, unnest(tags) AS t(tag)
           GROUP BY t.tag
           ORDER BY uses DESC, t.tag ASC
           LIMIT 20`
        : `SELECT DISTINCT t.tag
           FROM media, unnest(tags) AS t(tag)
           WHERE t.tag ILIKE $1
           ORDER BY t.tag
           LIMIT 20`,
      q.length === 0 ? [] : [`%${q}%`]
    );

    res.json({ data: rows.map(r => r.tag) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSuggestions };
