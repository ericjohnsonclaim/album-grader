export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { q, at } = req.query
  if (!q || !at) return res.status(400).json({ error: 'Missing params' })

  try {
    const r = await fetch(
      'https://api.spotify.com/v1/search?q=' + encodeURIComponent(q) + '&type=album&limit=10&market=US',
      { headers: { 'Authorization': 'Bearer ' + at } }
    )
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Search failed' })

    return res.json(data.albums.items.map(function(a) {
      return {
        id: a.id,
        name: a.name,
        artist: a.artists.map(function(x) { return x.name }).join(', '),
        image: a.images[1]?.url || a.images[0]?.url || null,
        year: a.release_date?.slice(0, 4)
      }
    }))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
