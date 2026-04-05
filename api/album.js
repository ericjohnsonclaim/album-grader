export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id, at } = req.query
  if (!id || !at) return res.status(400).json({ error: 'Missing params' })

  const headers = { 'Authorization': `Bearer ${at}` }

  try {
    const albumRes = await fetch(`https://api.spotify.com/v1/albums/${id}`, { headers })
    if (!albumRes.ok) {
      const e = await albumRes.json()
      return res.status(albumRes.status).json({ error: e.error?.message || 'Album not found' })
    }
    const album = await albumRes.json()

    let tracks = [...album.tracks.items]
    let next = album.tracks.next
    while (next) {
      const p = await fetch(next, { headers })
      const page = await p.json()
      tracks = [...tracks, ...page.items]
      next = page.next
    }

    const trackIds = tracks.map(t => t.id).filter(Boolean)
    const featuresRes = await fetch(
      `https://api.spotify.com/v1/audio-features?ids=${trackIds.slice(0, 100).join(',')}`,
      { headers }
    )
    const featuresData = featuresRes.ok ? await featuresRes.json() : { audio_features: [] }
    const featuresMap = {}
    ;(featuresData.audio_features || []).forEach(f => { if (f) featuresMap[f.id] = f })

    const analysisResults = {}
    const analysisBatch = tracks.slice(0, 20)
    await Promise.allSettled(
      analysisBatch.map(async t => {
        try {
          const r = await fetch(`https://api.spotify.com/v1/audio-analysis/${t.id}`, { headers })
          if (r.ok) {
            const data = await r.json()
            if (data.sections && data.sections.length > 0) {
              const loudest = data.sections.reduce((best, s) =>
                s.loudness > best.loudness ? s : best, data.sections[0])
              analysisResults[t.id] = Math.floor(loudest.start * 1000)
            }
          }
        } catch {}
      })
    )

    return res.json({
      id: album.id,
      name: album.name,
      artist: album.artists.map(a => a.name).join(', '),
      image: album.images[0]?.url,
      release_year: album.release_date?.slice(0, 4),
      tracks:
