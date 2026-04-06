import { useState, useEffect, useRef, useCallback } from 'react'

export function useSpotifyPlayer(accessToken) {
  const [deviceId, setDeviceId] = useState(null)
  const [playerState, setPlayerState] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const playerRef = useRef(null)
  const tokenRef = useRef(accessToken)

  useEffect(() => {
    tokenRef.current = accessToken
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return

    function init() {
      if (playerRef.current) return

      const player = new window.Spotify.Player({
        name: 'Wax Album Grader',
        getOAuthToken: function(cb) { cb(tokenRef.current) },
        volume: 0.85
      })

      player.addListener('ready', function(data) {
        setDeviceId(data.device_id)
        setReady(true)
      })

      player.addListener('not_ready', function() {
        setReady(false)
      })

      player.addListener('player_state_changed', function(state) {
        setPlayerState(state)
      })

      player.addListener('authentication_error', function() {
        setError('auth')
      })

      player.addListener('account_error', function() {
        setError('premium')
      })

      player.addListener('initialization_error', function(data) {
        setError('init: ' + data.message)
      })

      player.connect()
      playerRef.current = player
    }

    window.onSpotifyWebPlaybackSDKReady = init

    if (window.Spotify) {
      init()
    }

    return function() {
      if (playerRef.current) {
        playerRef.current.disconnect()
        playerRef.current = null
      }
      window.onSpotifyWebPlaybackSDKReady = null
    }
  }, [accessToken])

  const playTrack = useCallback(function(uri, seekMs) {
    if (!deviceId || !tokenRef.current) return Promise.resolve()
    return fetch('https://api.spotify.com/v1/me/player/play?device_id=' + deviceId, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + tokenRef.current,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [uri],
        position_ms: seekMs || 0
      })
    })
  }, [deviceId])

  const togglePlay = useCallback(function() {
    if (playerRef.current) playerRef.current.togglePlay()
  }, [])

  return {
    ready: ready,
    error: error,
    isPlaying: playerState ? !playerState.paused : false,
    position: playerState ? playerState.position : 0,
    duration: playerState ? playerState.duration : 0,
    playTrack: playTrack,
    togglePlay: togglePlay
  }
}
