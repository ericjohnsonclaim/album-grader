import { useState, useEffect, useRef, useCallback } from 'react'

export function useSpotifyPlayer(accessToken) {
  const [deviceId, setDeviceId] = useState(null)
  const [playerState, setPlayerState] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const playerRef = useRef(null)
  const tokenRef = useRef(accessToken)

  useEffect(() => { tokenRef.current = accessToken }, [accessToken])

  useEffect(() => {
    if (!accessToken) return

    const init = () => {
      if (playerRef.current) return

      const player = new window.Spotify.Player({
        name: 'Wax — Album Grader',
        getOAuthToken: cb => cb(tokenRef.current),
        volume: 0.85
      })

      player.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id)
        setReady(true)
      })
      player.addListener('not_ready', () => setReady(false))
      player.addListener('player_state_changed', state => setPlayerState(state))
      player.addListener('authentication_error', () => setError('auth'))
      player.addListener('account_error', () => setError('premium'))
      player.addListener('initialization_error', ({ message }) => setError('init: ' + message))

      player.connect()
      playerRef.current = player
    }

    if (window.Spotify) {
      init()
    } else {
      window.onSpotifyWebPlaybackSDKReady = init
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
        playerRef.current = null
      }
    }
  }, [accessToken])

  const playTrack = useCallback(async (uri, seekMs = null) => {
    if (!deviceId || !tokenRef.current) return
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenRef.current}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [uri],
        ...(seekMs !== null ? { position_ms: seekMs } : {})
      })
    })
  }, [deviceId])

  const togglePlay = useCallback(() => playerRef.current?.togglePlay(), [])

  const isPlaying = playerState ? !playerState.paused : false
  const position = playerState?.position ?? 0
  const duration = playerState?.duration ?? 0

  return { ready, error, isPlaying, position, duration, playTrack, togglePlay }
}
