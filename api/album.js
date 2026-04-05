// api/album.js
// Fetches album + tracks from Spotify API server-side

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing album id' });

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    // Get token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    const { access_token } = await tokenRes.json();

    // Fetch album
    const albumRes = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    if (!albumRes.ok) return res.status(albumRes.status).json({ error: 'Album not found' });
    const album = await albumRes.json();

    // Shape the response
    const tracks = album.tracks.items.map(t => ({
      id: t.id,
      name: t.name,
      duration_ms: t.duration_ms,
      preview_url: t.preview_url,
      track_number: t.track_number,
      artists: t.artists.map(a => a.name).join(', ')
    }));

    return res.status(200).json({
      id: album.id,
      name: album.name,
      artist: album.artists.map(a => a.name).join(', '),
      image: album.images[0]?.url,
      release_year: album.release_date?.slice(0, 4),
      total_tracks: album.total_tracks,
      tracks
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
