import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { spotify_user_id, at } = req.query
  if (!spotify_user_id || !at) return res.status(400).json({ error: 'Missing params' })

  const headers = { 'Authorization': 'Bearer ' + at, 'Content-Type': 'application/json' }

  try {
    const { data: grades, error } = await supabase
      .from('grades')
      .select('*')
      .eq('spotify_user_id', spotify_user_id)
      .order('final_score', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    if (!grades || grades.length === 0) return res.status(400).json({ error: 'No grades yet' })

    // Only use fully reviewed albums (no asterisk)
    const cleanGrades = grades.filter(g => g.final_grade && !g.final_grade.includes('*'))

    // Calculate track count: 2 per album reviewed, min 6, max 30
    const trackCount = Math.min(Math.max(cleanGrades.length * 2, 6), 30)

    // Build seed tracks from top graded tracks
    const trackScores = {}
    grades.forEach(function(review) {
      if (!review.track_grades) return
      review.track_grades.forEach(function(tg) {
        if (!tg.track_id || tg.grade === 'skipped' || !tg.score) return
        if (!trackScores[tg.track_id] || tg.score > trackScores[tg.track_id]) {
          trackScores[tg.track_id] = tg.score
        }
      })
    })

    const topTracks = Object.entries(trackScores)
      .sort(function(a, b) { return b[1] - a[1] })
      .slice(0, 5)
      .map(function(t) { return t[0] })

    let seedParams = {}
    if (topTracks.length >= 2) {
      seedParams.seed_tracks = topTracks.join(',')
    } else {
      // Fall back to artist seeds from top albums
      const artistIds = []
      for (const review of cleanGrades.slice(0, 5)) {
        try {
          const albumRes = await fetch('https://api.spotify.com/v1/albums/' + review.album_id, { headers })
          if (albumRes.ok) {
            const album = await albumRes.json()
            if (album.artists) {
              album.artists.forEach(function(a) {
                if (!artistIds.includes(a.id)) artistIds.push(a.id)
              })
            }
          }
        } catch {}
        if (artistIds.length >= 3) break
      }
      if (artistIds.length === 0) {
        return res.status(400).json({ error: 'Grade a few more albums first to get recommendations.' })
      }
      seedParams.seed_artists = artistIds.slice(0, 5).join(',')
    }

    const recParams = new URLSearchParams({
      ...seedParams,
      limit: String(trackCount),
      min_popularity: '20'
    })

    const recRes = await fetch('https://api.spotify.com/v1/recommendations?' + recParams.toString(), { headers })
    const recText = await recRes.text()

    let recData
    try {
      recData = JSON.parse(recText)
    } catch {
      return res.status(500).json({ error: 'Spotify returned invalid response' })
    }

    if (!recRes.ok) {
      return res.status(recRes.status).json({ error: recData.error?.message || 'Recommendations failed' })
    }

    if (!recData.tracks || recData.tracks.length === 0) {
      return res.status(400).json({ error: 'No recommendations found. Try grading more albums.' })
    }

    const trackUris = recData.tracks.map(function(t) { return t.uri })

    // Get Spotify user
    const userRes = await fetch('https://api.spotify.com/v1/me', { headers })
    const userText = await userRes.text()
    let user
    try { user = JSON.parse(userText) } catch {
      return res.status(500).json({ error: 'Could not get Spotify user' })
    }
    if (!userRes.ok) return res.status(401).json({ error: 'Spotify auth expired — sign out and back in.' })

    // Find or create WAX Picks playlist
    const playlistsRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', { headers })
    const playlistsText = await playlistsRes.text()
    let playlistsData
    try { playlistsData = JSON.parse(playlistsText) } catch { playlistsData = { items: [] } }

    let playlist = (playlistsData.items || []).find(function(p) { return p.name === 'WAX Picks' })

    if (!playlist) {
      const createRes = await fetch('https://api.spotify.com/v1/users/' + user.id + '/playlists', {
        method: 'POST', headers,
        body: JSON.stringify({
          name: 'WAX Picks',
          description: 'Recommendations powered by your WAX album reviews. ' + cleanGrades.length + ' albums · ' + trackCount + ' tracks',
          public: true
        })
      })
      const createText = await createRes.text()
      try { playlist = JSON.parse(createText) } catch {
        return res.status(500).json({ error: 'Could not create playlist' })
      }
    }

    // Update playlist tracks
    const updateRes = await fetch('https://api.spotify.com/v1/playlists/' + playlist.id + '/tracks', {
      method: 'PUT', headers,
      body: JSON.stringify({ uris: trackUris })
    })
    if (!updateRes.ok) return res.status(500).json({ error: 'Could not update playlist' })

    return res.json({
      playlist_id: playlist.id,
      playlist_url: 'https://open.spotify.com/playlist/' + playlist.id,
      track_count: trackUris.length,
      albums_used: cleanGrades.length
    })

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown error' })
  }
}
