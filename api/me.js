export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const at = req.query.at
  if (!at) return res.status(400).json({ error: 'Missing token' })

  try {
    const r = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': 'Bearer ' + at }
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message })
    return res.json({
      id: data.id,
      name: data.display_name,
      email: data.email,
      image: data.images?.[0]?.url || null
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
