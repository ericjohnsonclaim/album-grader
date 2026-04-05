export default async function handler(req, res) {
  const { code, error } = req.query
  if (error) return res.redirect(`/?auth_error=${error}`)

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectUri = process.env.REDIRECT_URI

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
    })

    const data = await tokenRes.json()
    if (!tokenRes.ok) return res.redirect(`/?auth_error=token_failed`)

    const params = new URLSearchParams({
      at: data.access_token,
      rt: data.refresh_token,
      ex: data.expires_in
    })
    res.redirect(`/?${params}`)
  } catch (e) {
    res.redirect(`/?auth_error=server_error`)
  }
}
