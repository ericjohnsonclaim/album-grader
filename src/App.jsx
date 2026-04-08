import { useState, useEffect, useRef } from 'react'
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer'

const GRADES = [
  { label: 'A+', score: 100 }, { label: 'A', score: 95 }, { label: 'A-', score: 90 },
  { label: 'B+', score: 87 }, { label: 'B', score: 83 }, { label: 'B-', score: 80 },
  { label: 'C+', score: 77 }, { label: 'C', score: 73 }, { label: 'C-', score: 70 },
  { label: 'D+', score: 67 }, { label: 'D', score: 63 }, { label: 'D-', score: 60 },
  { label: 'F', score: 0 },
]

const GRADE_FROM_SCORE = function(score) {
  if (score >= 98) return 'A+'
  if (score >= 92) return 'A'
  if (score >= 88) return 'A-'
  if (score >= 85) return 'B+'
  if (score >= 81) return 'B'
  if (score >= 78) return 'B-'
  if (score >= 75) return 'C+'
  if (score >= 71) return 'C'
  if (score >= 68) return 'C-'
  if (score >= 65) return 'D+'
  if (score >= 61) return 'D'
  if (score >= 55) return 'D-'
  return 'F'
}

const GRADE_COLOR = {
  'A+': '#4ade80', 'A': '#4ade80', 'A-': '#86efac',
  'B+': '#60a5fa', 'B': '#60a5fa', 'B-': '#93c5fd',
  'C+': '#fbbf24', 'C': '#fbbf24', 'C-': '#fcd34d',
  'D+': '#f97316', 'D': '#f97316', 'D-': '#fb923c',
  'F': '#f87171'
}

const SPOTIFY_GREEN = '#1db954'

function extractAlbumId(url) {
  const m = url.match(/album\/([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000)
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

function avg(scores) {
  if (!scores.length) return 0
  return Math.round(scores.reduce(function(a, b) { return a + b }, 0) / scores.length)
}

function saveSession(at, rt) {
  try { localStorage.setItem('wax_session', JSON.stringify({ at, rt })) } catch {}
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem('wax_session') || 'null') } catch { return null }
}
function clearSession() {
  try { localStorage.removeItem('wax_session') } catch {}
}

function ProgressDots({ total, current, grades }) {
  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', padding: '0 8px' }}>
      {Array.from({ length: total }, function(_, i) {
        const grade = grades[i]
        const isCurrent = i === current
        const isSkipped = grade === 'skipped'
        const isGraded = grade && !isSkipped
        const col = isGraded ? GRADE_COLOR[grade.label] : null
        return (
          <div key={i} style={{
            width: isCurrent ? '20px' : '7px',
            height: '7px',
            borderRadius: '4px',
            background: isCurrent ? '#f0ebe3' : isSkipped ? 'rgba(255,255,255,0.15)' : isGraded ? col : 'rgba(255,255,255,0.12)',
            border: isSkipped ? '1px solid rgba(255,255,255,0.25)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            flexShrink: 0
          }} />
        )
      })}
    </div>
  )
}

function GradeButton({ grade, selected, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const isSel = selected === grade.label
  const col = GRADE_COLOR[grade.label]

  return (
    <button
      onClick={function() { onSelect(grade) }}
      onMouseEnter={function() { setHovered(true) }}
      onMouseLeave={function() { setHovered(false) }}
      style={{
        background: isSel ? 'rgba(' + (col === '#4ade80' ? '74,222,128' : col === '#86efac' ? '134,239,172' : col === '#60a5fa' ? '96,165,250' : col === '#93c5fd' ? '147,197,253' : col === '#fbbf24' ? '251,191,36' : col === '#fcd34d' ? '252,211,77' : col === '#f97316' ? '249,115,22' : col === '#fb923c' ? '251,146,60' : '248,113,113') + ',0.15)' : 'rgba(255,255,255,0.03)',
        border: '1.5px solid ' + (isSel ? col : 'rgba(255,255,255,0.07)'),
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isSel ? 'scale(1.12)' : 'scale(1)',
        aspectRatio: '1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isSel ? '0 0 20px ' + col + '33' : 'none',
      }}
    >
      <span style={{
        fontSize: 'clamp(11px, 2.5vw, 15px)',
        fontWeight: 700,
        color: isSel ? col : hovered ? SPOTIFY_GREEN : '#ffffff',
        transition: 'color 0.15s'
      }}>
        {grade.label}
      </span>
    </button>
  )
}

function SpotifyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

const css = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: '#0d0d0d', color: '#f0ebe3', maxWidth: '480px', margin: '0 auto', width: '100%' },
  centerContent: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' },
  logo: { fontSize: 'clamp(36px, 8vw, 52px)', fontWeight: 800, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #f0ebe3 0%, rgba(240,235,227,0.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' },
  tagline: { fontSize: '14px', color: 'rgba(240,235,227,0.4)', fontFamily: "'DM Mono', monospace" },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '28px' },
  inputLabel: { display: 'block', fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'rgba(240,235,227,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' },
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px 16px', color: '#f0ebe3', fontSize: '14px', outline: 'none', fontFamily: "'DM Mono', monospace", boxSizing: 'border-box' },
  primaryBtn: { width: '100%', background: '#f0ebe3', border: 'none', borderRadius: '14px', padding: '15px', color: '#0d0d0d', fontSize: '15px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em', marginTop: '12px' },
  spotifyBtn: { width: '100%', background: SPOTIFY_GREEN, border: 'none', borderRadius: '14px', padding: '15px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  ghostBtn: { width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px', color: 'rgba(240,235,227,0.4)', fontSize: '14px', cursor: 'pointer', marginTop: '8px' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', flexShrink: 0 },
  iconBtn: { background: 'none', border: 'none', color: '#f0ebe3', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Mono', monospace", padding: '6px 10px', borderRadius: '8px', opacity: 0.6 }
}

export default function App() {
  const [accessToken, setAccessToken] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const [spotifyUser, setSpotifyUser] = useState(null)
  const [phase, setPhase] = useState('login')
  const [album, setAlbum] = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [grades, setGrades] = useState({})
  const [loadingAlbum, setLoadingAlbum] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [authError, setAuthError] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)
  const hasPlayedRef = useRef(false)

  const { ready, error: playerError, isPlaying, position, duration, playTrack, togglePlay } = useSpotifyPlayer(accessToken)

  useEffect(function() {
    const params = new URLSearchParams(window.location.search)
    const at = params.get('at')
    const rt = params.get('rt')
    const err = params.get('auth_error')
    if (err) { setAuthError(true); setPhase('login'); window.history.replaceState({}, '', '/'); return }
    if (at) {
      setAccessToken(at); setRefreshToken(rt); saveSession(at, rt)
      setPhase('input'); window.history.replaceState({}, '', '/'); return
    }
    const stored = loadSession()
    if (stored?.at) { setAccessToken(stored.at); setRefreshToken(stored.rt); setPhase('input') }
  }, [])

  useEffect(function() {
    if (!accessToken || spotifyUser) return
    fetch('/api/me?at=' + accessToken)
      .then(function(r) { return r.json() })
      .then(function(data) { if (data.id) setSpotifyUser(data) })
      .catch(function() {})
  }, [accessToken])

  useEffect(function() {
    if (!spotifyUser) return
    setLoadingHistory(true)
    fetch('/api/grades?spotify_user_id=' + spotifyUser.id)
      .then(function(r) { return r.json() })
      .then(function(data) { if (Array.isArray(data)) setHistory(data) })
      .catch(function() {})
      .finally(function() { setLoadingHistory(false) })
  }, [spotifyUser])

  useEffect(function() {
    if (ready && album && phase === 'grading' && !hasPlayedRef.current) {
      hasPlayedRef.current = true
      const track = album.tracks[currentIdx]
      playTrack(track.uri, track.hook_ms || 0)
    }
  }, [ready, album, phase])

  useEffect(function() {
    if (ready && album && phase === 'grading' && hasPlayedRef.current) {
      const track = album.tracks[currentIdx]
      playTrack(track.uri, track.hook_ms || 0)
    }
  }, [currentIdx])

  async function handleLoadAlbum() {
    setLoadError('')
    const albumId = extractAlbumId(urlInput)
    if (!albumId) return setLoadError('Paste a full Spotify album URL.')
    setLoadingAlbum(true)
    try {
      const res = await fetch('/api/album?id=' + albumId + '&at=' + accessToken)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load album')
      setAlbum(data); setGrades({}); setCurrentIdx(0)
      hasPlayedRef.current = false; setPhase('grading')
    } catch (e) { setLoadError(e.message) }
    setLoadingAlbum(false)
  }

  async function handleGrade(grade) {
    const newGrades = { ...grades, [currentIdx]: grade }
    setGrades(newGrades)
    advanceOrFinish(newGrades)
  }

  function handleSkip() {
    const newGrades = { ...grades, [currentIdx]: 'skipped' }
    setGrades(newGrades)
    advanceOrFinish(newGrades)
  }

  async function advanceOrFinish(newGrades) {
    if (currentIdx < album.tracks.length - 1) {
      setCurrentIdx(function(i) { return i + 1 })
    } else {
      const gradedOnly = Object.values(newGrades).filter(function(g) { return g !== 'skipped' })
      const vals = gradedOnly.map(function(g) { return g.score })
      const finalScore = vals.length ? avg(vals) : 0
      const finalGrade = GRADE_FROM_SCORE(finalScore)

      if (spotifyUser) {
        try {
          await fetch('/api/grades?spotify_user_id=' + spotifyUser.id, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              album_id: album.id,
              album_name: album.name,
              album_artist: album.artist,
              album_image: album.image,
              album_year: album.release_year,
              final_score: finalScore,
              final_grade: finalGrade,
              track_grades: album.tracks.map(function(t, i) {
                const g = newGrades[i]
                return {
                  name: t.name,
                  artists: t.artists,
                  grade: g === 'skipped' ? 'skipped' : g?.label,
                  score: g === 'skipped' ? null : g?.score
                }
              })
            })
          })
          const histRes = await fetch('/api/grades?spotify_user_id=' + spotifyUser.id)
          const histData = await histRes.json()
          if (Array.isArray(histData)) setHistory(histData)
        } catch (e) {}
      }
      setPhase('results')
    }
  }

  function handleBack() { if (currentIdx > 0) setCurrentIdx(function(i) { return i - 1 }) }

  function handleRestart() {
    setAlbum(null); setGrades({}); setCurrentIdx(0)
    hasPlayedRef.current = false; setLoadError(''); setPhase('input')
  }

  function handleLogout() {
    clearSession(); setAccessToken(null); setRefreshToken(null)
    setAlbum(null); setGrades({}); setSpotifyUser(null)
    setHistory([]); setPhase('login')
  }

  function handleScrub(e) {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const seekMs = Math.floor(pct * duration)
    playTrack(album.tracks[currentIdx].uri, seekMs)
  }

  // Group history by album_id, most recent first
  function groupedHistory() {
    const map = {}
    history.forEach(function(item) {
      if (!map[item.album_id]) map[item.album_id] = []
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
