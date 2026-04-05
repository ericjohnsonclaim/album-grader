export default async function handler(req, res) {
  const { rt } = req.query
  if (!rt) return res.status(400).json({ error: 'Missing refresh token' })

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt })
    })
    const data = await r.json()
    if (!r.ok) return res.status(400).json({ error: 'Refresh failed' })
    res.json({ at: data.access_token, ex: data.expires_in })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
