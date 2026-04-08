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
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    if (!grades || grades.length === 0) return res.status(400).json({ error: 'No grades yet' })

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

    if (topTracks.length === 0) return res.status(400).json({ error: 'No graded tracks with IDs found. Try grading a few more albums first.' })

    // Get recommendations
    const recParams = new URLSearchParams({
      seed_tracks: topTracks.join(','),
      limit: 30,
      min_popularity: 20
    })

    const recRes = await fetch('https://api.spotify.com/v1/recommendations?' + recParams, { headers })
    if (!recRes.ok) {
      const e = await recRes.json()
      return res.status(recRes.status).json({ error: e.error?.message || 'Recommendations failed' })
    }
    const recData = await recRes.json()
    const trackUris = recData.tracks.map(function(t) { return t.uri })

    // Get or create WAX Picks playlist
    const userRes = await fetch('https://api.spotify.com/v1/me', { headers })
    const user = await userRes.json()

    const playlistsRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', { headers })
    const playlistsData = await playlistsRes.json()
    let playlist = (playlistsData.items || []).find(function(p) { return p.name === 'WAX Picks' })

    if (!playlist) {
      const createRes = await fetch('https://api.spotify.com/v1/users/' + user.id + '/playlists', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'WAX Picks',
          description: 'Recommendations powered by your WAX album reviews.',
          public: true
        })
      })
      playlist = await createRes.json()
    }

    await fetch('https://api.spotify.com/v1/playlists/' + playlist.id + '/tracks', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ uris: trackUris })
    })

    return res.json({
      playlist_id: playlist.id,
      playlist_url: 'https://open.spotify.com/playlist/' + playlist.id,
      track_count: trackUris.length
    })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
