CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media (
  id             SERIAL PRIMARY KEY,
  cloudinary_id  VARCHAR(255) UNIQUE NOT NULL,
  url            TEXT NOT NULL,
  thumbnail_url  TEXT,
  type           VARCHAR(10) CHECK (type IN ('image','video')) NOT NULL,
  title          VARCHAR(255),
  category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  tags           TEXT[] DEFAULT '{}',
  width          INTEGER,
  height         INTEGER,
  duration       NUMERIC,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_category ON media(category_id);
CREATE INDEX IF NOT EXISTS idx_media_tags     ON media USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_media_created  ON media(created_at DESC);

INSERT INTO categories (name, slug) VALUES
  ('Travel',             'travel'),
  ('Portraits',          'portraits'),
  ('Street Photography', 'street-photography')
ON CONFLICT (slug) DO NOTHING;
