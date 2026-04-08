export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const redirectUri = process.env.REDIRECT_URI

  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'playlist-modify-public',
    'playlist-modify-private'
  ].join(' ')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    show_dialog: 'false'
  })

  res.redirect('https://accounts.spotify.com/authorize?' + params)
}
