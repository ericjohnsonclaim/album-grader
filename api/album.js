export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const id = req.query.id
  const at = req.query.at
  if (!id || !at) return res.status(400).json({ error: 'Missing params' })

  const headers = { 'Authorization': 'Bearer ' + at }

  try {
    const albumRes = await fetch('https://api.spotify.com/v1/albums/' + id, { headers })
    if (!albumRes.ok) {
      const e = await albumRes.json()
      return res.status(albumRes.status).json({ error: e.error ? e.error.message : 'Album not found' })
    }
    const album = await albumRes.json()

    let tracks = album.tracks.items.slice()
    let next = album.tracks.next
    while (next) {
      const p = await fetch(next, { headers })
      const page = await p.json()
      tracks = tracks.concat(page.items)
      next = page.next
    }

    // Fetch artist genres
    const artistIds = album.artists.map(function(a) { return a.id }).slice(0, 5).join(',')
    let genres = []
    try {
      const artistRes = await fetch('https://api.spotify.com/v1/artists?ids=' + artistIds, { headers })
      if (artistRes.ok) {
        const artistData = await artistRes.json()
        const allGenres = []
        artistData.artists.forEach(function(a) {
          if (a.genres) a.genres.forEach(function(g) {
            if (!allGenres.includes(g)) allGenres.push(g)
          })
        })
        genres = allGenres.slice(0, 5)
      }
    } catch (e) {}

    const trackIds = tracks.map(function(t) { return t.id }).filter(Boolean)
    let featuresMap = {}
    try {
      const featuresRes = await fetch(
        'https://api.spotify.com/v1/audio-features?ids=' + trackIds.slice(0, 100).join(','),
        { headers }
      )
      if (featuresRes.ok) {
        const featuresData = await featuresRes.json()
        const list = featuresData.audio_features || []
        list.forEach(function(f) { if (f) featuresMap[f.id] = f })
      }
    } catch (e) {}

    const analysisResults = {}
    await Promise.allSettled(
      tracks.slice(0, 20).map(async function(t) {
        try {
          const r = await fetch('https://api.spotify.com/v1/audio-analysis/' + t.id, { headers })
          if (r.ok) {
            const data = await r.json()
            if (data.sections && data.sections.length > 0) {
              let loudest = data.sections[0]
              data.sections.forEach(function(s) {
                if (s.loudness > loudest.loudness) loudest = s
              })
              analysisResults[t.id] = Math.floor(loudest.start * 1000)
            }
          }
        } catch (e) {}
      })
    )

    return res.json({
      id: album.id,
      name: album.name,
      artist: album.artists.map(function(a) { return a.name }).join(', '),
      image: album.images[0] ? album.images[0].url : null,
      release_year: album.release_date ? album.release_date.slice(0, 4) : null,
      genres: genres,
      tracks: tracks.map(function(t) {
        return {
          id: t.id,
          uri: t.uri,
          name: t.name,
          duration_ms: t.duration_ms,
          artists: t.artists.map(function(a) { return a.name }).join(', '),
          track_number: t.track_number,
          hook_ms: analysisResults[t.id] !== undefined ? analysisResults[t.id] : null,
          energy: featuresMap[t.id] ? featuresMap[t.id].energy : null
        }
      })
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
