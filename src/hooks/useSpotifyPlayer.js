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
      play
