import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { spotify_user_id } = req.query
  if (!spotify_user_id) return res.status(400).json({ error: 'Missing spotify_user_id' })

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('grades').select('*')
        .eq('spotify_user_id', spotify_user_id)
        .order('created_at', { ascending: false })
      if (error) return res.status(500).json({ error: error.message })
      return res.json(data)
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body
      const { data, error } = await supabase.from('grades').insert([{
        spotify_user_id,
        album_id: body.album_id,
        album_name: body.album_name,
        album_artist: body.album_artist,
        album_image: body.album_image,
        album_year: body.album_year,
        album_genres: body.album_genres || [],
        final_score: body.final_score,
        final_grade: body.final_grade,
        track_grades: body.track_grades
      }]).select()
      if (error) return res.status(500).json({ error: error.message })
      return res.json(data[0])
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  if (req.method === 'DELETE') {
    try {
      await supabase.from('grades').delete().eq('spotify_user_id', spotify_user_id)
      await supabase.from('settings').delete().eq('spotify_user_id', spotify_user_id)
      return res.json({ success: true })
    } catch (e) { return res.status(500).json({ error: e.message }) }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
