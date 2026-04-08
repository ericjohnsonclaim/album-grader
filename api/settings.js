import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { spotify_user_id } = req.query
  if (!spotify_user_id) return res.status(400).json({ error: 'Missing spotify_user_id' })

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('spotify_user_id', spotify_user_id)
        .single()
      if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message })
      return res.json(data || { playback_mode: 'hook' })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body
      const { data, error } = await supabase
        .from('settings')
        .upsert({
          spotify_user_id,
          playback_mode: body.playback_mode || 'hook',
          updated_at: new Date().toISOString()
        }, { onConflict: 'spotify_user_id' })
        .select()
      if (error) return res.status(500).json({ error: error.message })
      return res.json(data[0])
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
