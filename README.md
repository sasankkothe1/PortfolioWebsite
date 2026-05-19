# Photography Portfolio

A full-stack web application for showcasing photography and videography. There are two sides to this project:

- **Public site** — visitors browse photos and videos in a masonry layout, navigate sections (Travel, Portraits, Street Photography), and search silently by tag.
- **Admin site** — only you can access it to upload new photos and videos, manage categories, add tags, and delete content.

---

## Run Locally

The only thing you need installed is **Docker Desktop**. No databases, no Node.js, nothing else.

> **Before running any command:** Open the **Docker Desktop app** on your Mac and wait until the whale icon in the menu bar stops animating. The daemon must be running first.

### Step 1 — Get your Cloudinary credentials

Cloudinary is where your photos and videos are actually stored. Create a free account at [cloudinary.com](https://cloudinary.com), then go to your **Dashboard**. You'll see three values you need:

- Cloud Name
- API Key
- API Secret

### Step 2 — Create your environment file

The `.env` file holds all the private credentials. It is never committed to git (it is listed in `.gitignore`).

```bash
cp backend/.env.example backend/.env
```

Now open `backend/.env` in a text editor and fill in each line:

| Variable                | What to put here                                                             |
| ----------------------- | ---------------------------------------------------------------------------- |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name from the dashboard                                |
| `CLOUDINARY_API_KEY`    | Your Cloudinary API key                                                      |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret                                                   |
| `JWT_SECRET`            | Any long random string — e.g. `mysecretkey123abc456def789ghi` (min 32 chars) |
| `ADMIN_USERNAME`        | The username you want to use to log in to `/admin`                           |
| `ADMIN_PASSWORD`        | The password you want to use to log in to `/admin`                           |
| `FRONTEND_URL`          | Leave as `http://localhost:5173` for local dev                               |
| `NODE_ENV`              | Leave as `development`                                                       |
| `PORT`                  | Leave as `3001`                                                              |

### Step 3 — Start everything

```bash
docker-compose up --build
```

This downloads and starts three things: the database, the backend server, and the frontend. The first run takes about 2 minutes. Subsequent runs are faster.

### Step 4 — Create your admin user (first time only)

In a second terminal window, run:

```bash
docker-compose exec backend node db/seeds/seed_admin.js
```

This reads `ADMIN_USERNAME` and `ADMIN_PASSWORD` from your `.env` file and creates your login account in the database.

### Step 5 — Open the site

| URL                           | What you'll see  |
| ----------------------------- | ---------------- |
| `http://localhost:5173`       | Public gallery   |
| `http://localhost:5173/admin` | Admin login page |

### To stop

```bash
docker-compose down
```

Your uploaded photos, videos, and data are preserved between restarts.

---

## Hosting (Deploying to the Internet)

Everything is free forever with this setup:

| What            | Where                            | Free tier                                |
| --------------- | -------------------------------- | ---------------------------------------- |
| **Frontend**    | [Vercel](https://vercel.com)     | Unlimited                                |
| **Backend**     | [Render](https://render.com)     | 1 web service (sleeps after 15 min idle) |
| **Database**    | [Supabase](https://supabase.com) | 500 MB, never expires                    |
| **Media files** | Cloudinary                       | 25 GB, never expires                     |

> **Note on Render's free tier:** The backend "sleeps" after 15 minutes of no traffic. The first request after a quiet period takes ~30 seconds to wake up. All requests after that are instant. For a personal portfolio this is acceptable.

---

### Step 1 — Set up the database on Supabase

1. Create a free account at [supabase.com](https://supabase.com) and create a new project
2. Go to **Settings → SQL Editor** in the left sidebar
3. Run each migration file below **in order** — paste the contents and click **Run**:

**Migration 1** — paste the contents of `backend/db/migrations/001_init.sql`

**Migration 2** — paste and run:

```sql
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
```

**Migration 3** — paste and run:

```sql
ALTER TABLE carousels
  ADD COLUMN IF NOT EXISTS cover_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL;
```

4. Get your connection string: **Settings → Database → Connection pooling → Session mode → copy the URI** (port `6543`)

> **Important:** Use the **Session pooler** URL (port `6543`), NOT the direct connection URL. The direct URL uses IPv6 which Render cannot reach.

---

### Step 2 — Deploy the backend on Render

1. Create a free account at [render.com](https://render.com)
2. Click **New → Web Service**
3. Connect your GitHub account and select the `PortfolioWebsite` repo
4. Configure the service:

| Setting            | Value            |
| ------------------ | ---------------- |
| **Root Directory** | `backend`        |
| **Runtime**        | `Node`           |
| **Build Command**  | `npm install`    |
| **Start Command**  | `node server.js` |
| **Instance Type**  | Free             |

5. Under **Environment Variables**, add all of these:

| Variable                | Value                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`          | Your Supabase Session pooler URI (port `6543`)                   |
| `JWT_SECRET`            | Run `openssl rand -hex 32` in your terminal and paste the result |
| `CLOUDINARY_CLOUD_NAME` | From your Cloudinary dashboard                                   |
| `CLOUDINARY_API_KEY`    | From your Cloudinary dashboard                                   |
| `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard                                   |
| `FRONTEND_URL`          | Your Vercel URL — add this after Step 3                          |
| `ADMIN_USERNAME`        | Your chosen admin username                                       |
| `ADMIN_PASSWORD`        | Your chosen admin password                                       |
| `NODE_ENV`              | `production`                                                     |

6. Click **Create Web Service** — Render builds and starts the backend
7. Check the **Logs** tab — you should see:

```
Backend running on port ...
Admin user "your-username" created automatically.
```

The admin user is created automatically on first start. No shell access needed.

8. Copy your Render URL (e.g. `https://portfolio-backend-xxxx.onrender.com`) — you need it for the next step

---

### Step 3 — Deploy the frontend on Vercel

1. Create a free account at [vercel.com](https://vercel.com)
2. Click **New Project → Import Git Repository** and select `PortfolioWebsite`
3. Set **Root Directory** to `frontend`
4. Under **Environment Variables**, add:

| Variable       | Value                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | Your Render backend URL, e.g. `https://portfolio-backend-xxxx.onrender.com` — no trailing slash, no `/api` |

5. Click **Deploy** — Vercel builds the frontend automatically
6. Once deployed, copy your Vercel URL (e.g. `https://yoursite.vercel.app`)

---

### Step 4 — Link frontend and backend

Go back to **Render → your backend service → Environment** and update:

| Variable       | Value                                               |
| -------------- | --------------------------------------------------- |
| `FRONTEND_URL` | Your Vercel URL, e.g. `https://yoursite.vercel.app` |

Render redeploys automatically after saving.

---

### How redeployment works

Both Render and Vercel watch your GitHub repo. Every time you push to `master`, both services redeploy automatically — no manual steps needed.

```bash
git add -A
git commit -m "your message"
git push origin master
# Render redeploys the backend, Vercel redeploys the frontend
```

---

## Troubleshooting

### `docker-credential-desktop: executable file not found`

**When it happens:** Running `docker-compose up --build` for the first time after uninstalling Docker Desktop.

**Cause:** A leftover entry in `~/.docker/config.json` still references Docker Desktop's credential helper.

**Fix:**

```bash
# Remove the credsStore entry
python3 -c "
import json
with open('/Users/$(whoami)/.docker/config.json') as f: cfg = json.load(f)
cfg.pop('credsStore', None)
with open('/Users/$(whoami)/.docker/config.json', 'w') as f: json.dump(cfg, f, indent='\t')
"
```

Then retry `docker-compose up --build`.

---

### `Error loading shared library bcrypt_lib.node: Exec format error`

**When it happens:** Running `docker-compose exec backend node ...` after running `npm install` locally on a Mac.

**Cause:** `npm install` on your Mac compiled native packages (like `bcrypt`) for macOS. When these get copied into the Linux Docker container they are the wrong binary format.

**Fix:** Add `.dockerignore` files (already present in this repo) and wipe old volumes:

```bash
docker-compose down -v
docker-compose up --build
```

The `-v` flag removes stale volumes so Docker installs fresh Linux-compatible packages inside the container.

---

### `connect ENETUNREACH [IPv6 address]:5432` on Render

**When it happens:** Backend on Render fails to connect to Supabase.

**Cause:** The Supabase **direct connection** URL resolves to an IPv6 address. Render's free tier cannot reach IPv6 addresses.

**Fix:** Use the **Session pooler** URL instead of the direct connection:

1. In Supabase → **Settings → Database → Connection pooling**
2. Set Mode to **Session**
3. Copy the URI — it uses port `6543` and resolves to IPv4
4. Update `DATABASE_URL` in Render with this URL

---

### `relation "users" does not exist` on Render

**When it happens:** Backend starts but the admin seed fails with this error.

**Cause:** The database migrations have not been run on Supabase yet — the tables don't exist.

**Fix:** Run the three migration files in Supabase's SQL Editor (see **Step 1** in the Hosting section above).

---

### `Uncaught TypeError: Cannot read properties of undefined (reading 'length')` on Vercel

**When it happens:** Public gallery page crashes immediately after opening the Vercel URL.

**Cause:** `VITE_API_URL` is not set in Vercel, so API requests go to Vercel itself (which returns the HTML page), and the app tries to read `.length` on the HTML string instead of a JSON array.

**Fix:** In Vercel → your project → **Settings → Environment Variables**, add:

```
VITE_API_URL = https://your-render-backend-url.onrender.com
```

Then redeploy (push a commit or click Redeploy in the Vercel dashboard).

---

## How the Project Is Organized

```
portfolio/
├── frontend/           ← everything visitors see in the browser
│   └── src/
│       ├── components/ ← reusable UI pieces (Navbar, cards, modals)
│       ├── pages/      ← one file per URL route
│       ├── hooks/      ← reusable logic (infinite scroll, media fetching)
│       ├── context/    ← admin auth state shared across pages
│       └── api/        ← central HTTP client
│
├── backend/            ← server that handles data and file uploads
│   ├── routes/         ← define URL endpoints
│   ├── controllers/    ← the actual logic for each endpoint
│   ├── middleware/      ← code that runs before endpoints (auth checks, file reading)
│   ├── db/             ← database connection, schema, seed scripts
│   └── lib/            ← Cloudinary setup
│
└── docker-compose.yml  ← starts everything with one command
```

---

## Tech Stack

### Frontend

| Technology            | What it is                                | How it's used here                                                                            |
| --------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| **React**             | A JavaScript library for building UIs     | Every visual element (navbar, photo grid, modals, admin forms) is a React component           |
| **Vite**              | A fast development server and build tool  | Runs the frontend in dev mode; compiles it for production deployment                          |
| **Tailwind CSS**      | A CSS framework using utility class names | Styles are applied directly in JSX using classes like `bg-black text-white px-4 py-2`         |
| **React Router**      | URL navigation library                    | Maps URLs like `/c/travel` and `/admin` to specific page components — no full page reloads    |
| **Axios**             | HTTP request library                      | Sends API requests from the browser to the Express backend (fetch photos, upload files, etc.) |
| **react-masonry-css** | Masonry layout component                  | Arranges photos in columns where each image keeps its natural height — no forced grid         |

### Backend

| Technology               | What it is                        | How it's used here                                                                                                                                                                   |
| ------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Node.js**              | JavaScript runtime for the server | The environment that runs the backend code                                                                                                                                           |
| **Express**              | Web server framework for Node.js  | Defines all the API endpoints (URL routes) and handles incoming requests                                                                                                             |
| **PostgreSQL**           | Relational database               | Stores everything except the media files: titles, tags, categories, admin credentials                                                                                                |
| **Cloudinary**           | Cloud media storage and CDN       | Stores the actual image and video files; serves them to visitors via a fast CDN                                                                                                      |
| **bcrypt**               | Password hashing library          | Scrambles your admin password before saving it — even if the database is compromised, the password cannot be recovered                                                               |
| **JWT (JSON Web Token)** | Authentication token format       | After you log in, a JWT is created and stored in a secure cookie. Think of it as a wristband at a concert — it proves you've already been checked in, without re-checking every time |
| **Multer**               | File upload middleware            | Intercepts uploaded files from the request and holds them in memory                                                                                                                  |
| **Docker Compose**       | Container orchestration tool      | Starts the database, backend, and frontend as three isolated containers with a single command                                                                                        |

---

## Frontend Key Concepts

- **Component** — a reusable piece of UI. For example, `MediaCard.jsx` renders one photo or video tile. It's used hundreds of times, once per photo.

- **Pages vs Components** — pages (`pages/`) correspond to URLs; components (`components/`) are the building blocks inside pages. The `HomePage` uses the `MasonryGrid` component, which uses `MediaCard` components.

- **Props** — data you pass into a component, like arguments to a function. `MediaCard` receives a `media` prop with the photo's URL, title, and type.

- **State** — data that can change over time. When state changes, React automatically re-renders the affected parts of the UI. For example, `sidebarOpen` is a boolean state that shows or hides the side menu.

- **Hooks** — special React functions that manage state and side effects. `useState` stores a value, `useEffect` runs code when something changes (e.g. fetch new photos when the category changes).

- **Masonry Grid** — unlike a fixed 3×3 grid, a masonry layout places photos in equal-width columns but lets each image be as tall as its natural dimensions. Tall portraits stay tall; wide landscapes stay wide.

- **Infinite Scroll** — instead of numbered pages, more photos load automatically as you scroll to the bottom. This is powered by the browser's `IntersectionObserver` API, which fires a callback when a hidden sentinel element enters the viewport.

- **API Client** (`api/client.js`) — a single configured Axios instance shared across the whole app. Every request goes through it, and it automatically sends the login cookie with each request (`withCredentials: true`).

---

## Backend Key Concepts

- **REST API** — the backend exposes a set of URLs (endpoints) that the frontend calls to read or change data. For example, `GET /api/media` returns the list of photos; `POST /api/media` uploads a new one.

- **Route → Controller pattern** — routes (`routes/`) are thin: they just define the URL and call a controller function. Controllers (`controllers/`) contain the actual logic: database queries, Cloudinary calls, error handling.

- **Middleware** — a function that runs between receiving a request and sending a response. `auth.js` middleware checks whether a valid JWT cookie is present; if not, it rejects the request with a 401 error before the controller runs.

- **Multer** — Express doesn't handle file uploads by default. Multer reads the uploaded file from the request and puts it in `req.file.buffer` (in memory, without touching the disk).

- **upload_stream** — Cloudinary's upload function accepts a stream. The backend pipes Multer's in-memory file buffer directly into Cloudinary, which means files are never temporarily saved to the server's disk.

- **httpOnly Cookie** — when you log in, the server sets a cookie with `httpOnly: true`. This means the browser sends it with every request, but JavaScript running on the page cannot read it. This protects your login token from being stolen by malicious scripts.

- **CORS (Cross-Origin Resource Sharing)** — browsers block requests between different origins by default. The backend explicitly allows requests from the frontend URL so they can communicate.

- **Pool** (`db/pool.js`) — opening a new database connection for every request is slow. A pool creates a fixed number of connections at startup and reuses them across requests.

---

## Database Key Concepts

The database has three tables:

- **`users`** — stores your admin username and hashed password
- **`categories`** — stores category names (Travel, Portraits, etc.) and their URL slugs
- **`media`** — stores metadata for every photo/video

A simplified view of the `media` table:

| id  | url                            | type  | title               | category_id | tags                     |
| --- | ------------------------------ | ----- | ------------------- | ----------- | ------------------------ |
| 1   | https://res.cloudinary.com/... | image | Sunset in Santorini | 1           | {greece, sunset, travel} |
| 2   | https://res.cloudinary.com/... | video | Street musicians    | 3           | {street, music, berlin}  |

- **Foreign Key** — `category_id` in the `media` table references the `id` column in `categories`. This is how a photo is linked to a category.

- **`TEXT[]`** — a PostgreSQL column type that stores an array of text values. Tags are stored as an array (e.g. `{paris, sunset, travel}`) on each media row.

- **GIN Index** — a special database index optimized for searching inside arrays. Without it, searching tags would require scanning every row; the GIN index makes it fast.

- **Seed script** — `db/seeds/seed_admin.js` is a one-time setup script that reads your chosen username and password from the `.env` file, hashes the password with bcrypt, and inserts the admin user into the database.

---

## How the Pieces Connect

### When a visitor loads the home page:

```
Browser
  → Vite serves the React app
  → HomePage component mounts
  → Axios sends GET /api/media to Express
  → Express queries PostgreSQL for media rows
  → Returns JSON list of photos with Cloudinary URLs
  → React renders MasonryGrid with MediaCard for each photo
  → img src points to Cloudinary CDN (fast delivery worldwide)
```

### When you upload a photo as admin:

```
You fill the upload form and click Upload
  → Axios sends POST /api/media with the file (multipart/form-data)
  → Express auth middleware checks your JWT cookie
  → Multer reads the file into memory (req.file.buffer)
  → upload_stream pipes the buffer to Cloudinary
  → Cloudinary stores the file and returns a URL
  → Express inserts the URL + title + tags + category into PostgreSQL
  → Returns 201 Created to the browser
  → Dashboard refreshes showing the new photo
```
