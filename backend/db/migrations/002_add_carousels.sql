CREATE TABLE IF NOT EXISTS carousels (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE media
  ADD COLUMN IF NOT EXISTS carousel_id    INTEGER REFERENCES carousels(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS carousel_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_media_carousel ON media(carousel_id, carousel_order);
