# Album Taste Test 🎵

Grade every track on an album and get a final letter score. Compare with the community.

## Deploy to Vercel in ~10 minutes

### Step 1 — Get Spotify API credentials (free)

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click **Create app**
   - App name: Album Taste Test (or anything)
   - Redirect URI: `http://localhost:3000` (required but unused)
   - Check the "Web API" checkbox
4. Click **Save**
5. On your app page, click **Settings**
6. Copy your **Client ID** and **Client Secret** — you'll need these in Step 3

### Step 2 — Deploy to Vercel

1. Go to https://vercel.com and sign up (free)
2. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```
3. In this project folder, run:
   ```
   npm install
   vercel
   ```
4. Follow the prompts — accept all defaults

### Step 3 — Add your Spotify credentials

1. In the Vercel dashboard, go to your project → **Settings** → **Environment Variables**
2. Add these two variables:
   - `SPOTIFY_CLIENT_ID` → paste your Client ID
   - `SPOTIFY_CLIENT_SECRET` → paste your Client Secret
3. Click **Save**, then go to **Deployments** and click **Redeploy**

That's it — your app is live! 🎉

---

## Running locally

```bash
npm install

# Create a .env.local file:
echo "SPOTIFY_CLIENT_ID=your_id_here" >> .env.local
echo "SPOTIFY_CLIENT_SECRET=your_secret_here" >> .env.local

# Run the Vercel dev server (handles API routes):
npx vercel dev
```

## How it works

- **Frontend**: React + Vite, no CSS framework
- **Backend**: Two Vercel serverless functions in `/api`
  - `/api/album?id=ALBUM_ID` — fetches album + tracks from Spotify
  - Your Spotify credentials live only on the server, never exposed to the browser
- **Audio**: Spotify provides 30-second preview clips for most tracks
- **Ratings**: Stored in localStorage per browser (upgrade to a DB like PlanetScale or Supabase for true community ratings)

## Upgrading community ratings to a real DB

The current community rating is per-browser localStorage. To make it truly shared:

1. Add a Supabase project (free tier works)
2. Create a table: `ratings(album_id text, grade text, created_at timestamptz)`
3. Add `/api/ratings.js` to read/write ratings
4. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your Vercel env vars
