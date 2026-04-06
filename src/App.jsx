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
        const graded = grades[i] !== undefined
        const isCurrent = i === current
        const col = graded ? GRADE_COLOR[grades[i].label] : null
        return (
          <div key={i} style={{
            width: isCurrent ? '20px' : '7px', height: '7px', borderRadius: '4px',
            background: isCurrent ? '#f0ebe3' : graded ? col : 'rgba(255,255,255,0.12)',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', flexShrink: 0
          }} />
        )
      })}
    </div>
  )
}

function GradeButton({ grade, selected, onSelect }) {
  const col = GRADE_COLOR[grade.label]
  const isSel = selected === grade.label
  return (
    <button onClick={function() { onSelect(grade) }} style={{
      background: isSel ? 'rgba(' + (col === '#4ade80' ? '74,222,128' : col === '#60a5fa' ? '96,165,250' : col === '#fbbf24' ? '251,191,36' : col === '#f97316' ? '249,115,22' : '248,113,113') + ',0.15)' : 'rgba(255,255,255,0.03)',
      border: '1.5px solid ' + (isSel ? col : 'rgba(255,255,255,0.07)'),
      borderRadius: '12px', cursor: 'pointer',
      transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transform: isSel ? 'scale(1.12)' : 'scale(1)',
      aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: isSel ? '0 0 20px ' + col + '33' : 'none',
    }}>
      <span style={{ fontSize: 'clamp(11px, 2.5vw, 15px)', fontWeight: 700, color: isSel ? col : 'rgba(240,235,227,0.5)', transition: 'color 0.15s' }}>
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
  spotifyBtn: { width: '100%', background: '#1db954', border: 'none', borderRadius: '14px', padding: '15px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
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

  // Fetch Spotify user profile once we have a token
  useEffect(function() {
    if (!accessToken || spotifyUser) return
    fetch('/api/me?at=' + accessToken)
      .then(function(r) { return r.json() })
      .then(function(data) { if (data.id) setSpotifyUser(data) })
      .catch(function() {})
  }, [accessToken])

  // Fetch history when we have a user
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
    if (currentIdx < album.tracks.length - 1) {
      setCurrentIdx(function(i) { return i + 1 })
    } else {
      // Calculate final score
      const vals = Object.values(newGrades).map(function(g) { return g.score })
      const finalScore = avg(vals)
      const finalGrade = GRADE_FROM_SCORE(finalScore)

      // Save to Supabase
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
                return { name: t.name, artists: t.artists, grade: newGrades[i]?.label, score: newGrades[i]?.score }
              })
            })
          })
          // Refresh history
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

  // Scrub bar click handler
  function handleScrub(e) {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const seekMs = Math.floor(pct * duration)
    playTrack(album.tracks[currentIdx].uri, seekMs)
  }

  const track = album?.tracks[currentIdx]
  const progress = duration > 0 ? (position / duration) * 100 : 0
  const currentGrade = grades[currentIdx]

  const gradedTracks = album ? album.tracks.map(function(t, i) { return { track: t, grade: grades[i] } }).filter(function(x) { return x.grade }) : []
  const finalScore = gradedTracks.length ? avg(gradedTracks.map(function(x) { return x.grade.score })) : 0
  const finalGrade = GRADE_FROM_SCORE(finalScore)
  const finalCol = GRADE_COLOR[finalGrade]

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'stretch', justifyContent: 'center', background: '#0d0d0d' }}>

      {/* LOGIN */}
      {phase === 'login' && (
        <div style={css.screen}>
          <div style={css.centerContent}>
            <div style={{ marginBottom: '48px', textAlign: 'center' }}>
              <div style={css.logo}>WAX</div>
              <p style={css.tagline}>Grade every track. Know your taste.</p>
            </div>
            <div style={css.card}>
              <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px', textAlign: 'center' }}>
                Connect Spotify Premium to start grading albums. Each track plays from its best moment — you grade, we score.
              </p>
              {authError && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', textAlign: 'center', fontFamily: "'DM Mono', monospace" }}>Login failed — please try again</p>}
              <a href="/api/login" style={{ textDecoration: 'none', display: 'block' }}>
                <button style={css.spotifyBtn}><SpotifyIcon />Continue with Spotify</button>
              </a>
              <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '12px', textAlign: 'center', marginTop: '16px', fontFamily: "'DM Mono', monospace" }}>Spotify Premium required</p>
            </div>
          </div>
        </div>
      )}

      {/* INPUT */}
      {phase === 'input' && (
        <div style={css.screen}>
          <div style={css.topBar}>
            <div style={css.logo}>WAX</div>
            {history.length > 0 && (
              <button onClick={function() { setPhase('history') }} style={css.iconBtn}>My Albums</button>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px 24px' }}>
            <p style={{ ...css.tagline, marginBottom: '32px', textAlign: 'center' }}>Drop an album. Start grading.</p>
            <div style={css.card}>
              <label style={css.inputLabel}>Spotify Album Link</label>
              <input value={urlInput} onChange={function(e) { setUrlInput(e.target.value) }}
                onKeyDown={function(e) { if (e.key === 'Enter') handleLoadAlbum() }}
                placeholder="open.spotify.com/album/..." style={css.input} autoFocus />
              {loadError && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '10px', fontFamily: "'DM Mono', monospace" }}>{loadError}</p>}
              {!ready && <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '12px', marginTop: '10px', fontFamily: "'DM Mono', monospace" }}>⏳ Connecting player...</p>}
              <button onClick={handleLoadAlbum} disabled={loadingAlbum || !ready || !urlInput.trim()} style={{ ...css.primaryBtn, opacity: (loadingAlbum || !ready || !urlInput.trim()) ? 0.4 : 1, cursor: (loadingAlbum || !ready || !urlInput.trim()) ? 'not-allowed' : 'pointer' }}>
                {loadingAlbum ? 'Loading...' : !ready ? 'Connecting...' : 'Start Grading'}
              </button>
            </div>
            <button onClick={handleLogout} style={css.ghostBtn}>Sign Out</button>
          </div>
        </div>
      )}

      {/* GRADING */}
      {phase === 'grading' && album && track && (
        <div style={css.screen}>
          <div style={css.topBar}>
            <button onClick={handleBack} disabled={currentIdx === 0} style={{ ...css.iconBtn, opacity: currentIdx === 0 ? 0.2 : 0.7 }}>← Back</button>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'rgba(240,235,227,0.4)' }}>{currentIdx + 1} / {album.tracks.length}</span>
            <div style={{ width: '60px' }} />
          </div>

          <div style={{ padding: '0 24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {album.image && <img src={album.image} alt={album.name} style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'rgba(240,235,227,0.35)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{album.artist}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.name}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 24px', marginBottom: '20px' }}>
            <ProgressDots total={album.tracks.length} current={currentIdx} grades={grades} />
          </div>

          <div style={{ padding: '0 24px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.2, marginBottom: '3px' }}>{track.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(240,235,227,0.4)', fontFamily: "'DM Mono', monospace" }}>{track.artists}</div>
              </div>

              {/* Scrubable progress bar */}
              <div onClick={handleScrub} style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '10px', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
                <div style={{ height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, #1db954, #4ade80)', width: progress + '%', transition: 'width 0.5s linear', pointerEvents: 'none' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'rgba(240,235,227,0.3)' }}>{formatTime(position)}</span>
                <button onClick={togglePlay} style={{ width: '44px', height: '44px', borderRadius: '50%', background: isPlaying ? 'rgba(240,235,227,0.1)' : '#f0ebe3', border: 'none', cursor: 'pointer', fontSize: '16px', color: isPlaying ? '#f0ebe3' : '#0d0d0d', transition: 'all 0.2s' }}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'rgba(240,235,227,0.3)' }}>{formatTime(duration)}</span>
              </div>

              {track.hook_ms && (
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button onClick={function() { playTrack(track.uri, track.hook_ms) }} style={{ background: 'rgba(29,185,84,0.1)', border: '1px solid rgba(29,185,84,0.3)', borderRadius: '20px', padding: '5px 14px', color: '#1db954', fontSize: '11px', cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>
                    ↩ Jump to hook
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '0 24px' }}>
            <div style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'rgba(240,235,227,0.3)', textAlign: 'center', marginBottom: '12px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              {currentGrade ? currentGrade.label + ' · tap to change' : 'Grade this track'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {GRADES.map(function(g) { return <GradeButton key={g.label} grade={g} selected={currentGrade?.label} onSelect={handleGrade} /> })}
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {phase === 'results' && album && (
        <div style={{ ...css.screen, overflowY: 'auto' }}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '28px' }}>
              {album.image && <img src={album.image} alt={album.name} style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', flexShrink: 0 }} />}
              <div>
                <div style={{ fontSize: '12px', fontFamily: "'DM Mono', monospace", color: 'rgba(240,235,227,0.35)', marginBottom: '4px' }}>{album.artist} · {album.release_year}</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>{album.name}</div>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, ' + finalCol + '15, ' + finalCol + '08)', border: '1px solid ' + finalCol + '30', borderRadius: '24px', padding: '28px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'rgba(240,235,227,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>Your Score</div>
              <div style={{ fontSize: '72px', fontWeight: 800, color: finalCol, lineHeight: 1, marginBottom: '6px' }}>{finalGrade}</div>
              <div style={{ fontSize: '16px', color: 'rgba(240,235,227,0.4)', fontFamily: "'DM Mono', monospace" }}>{finalScore} / 100</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'rgba(240,235,227,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Track by Track</span>
              </div>
              {gradedTracks.map(function(item, i) {
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: i < gradedTracks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.track.name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'rgba(240,235,227,0.3)' }}>{item.grade.score}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: GRADE_COLOR[item.grade.label], minWidth: '28px', textAlign: 'right' }}>{item.grade.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={handleRestart} style={css.primaryBtn}>Grade Another Album</button>
            <button onClick={function() { setPhase('history') }} style={{ ...css.ghostBtn, marginTop: '8px' }}>My Albums</button>
            <button onClick={handleLogout} style={{ ...css.ghostBtn, marginTop: '8px', fontSize: '12px', color: 'rgba(240,235,227,0.25)' }}>Sign Out</button>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {phase === 'history' && (
        <div style={{ ...css.screen, overflowY: 'auto' }}>
          <div style={css.topBar}>
            <button onClick={function() { setPhase('input') }} style={css.iconBtn}>← Back</button>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>My Albums</span>
            <div style={{ width: '60px' }} />
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            {loadingHistory && <p style={{ color: 'rgba(240,235,227,0.3)', fontFamily: "'DM Mono', monospace", fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>Loading...</p>}
            {!loadingHistory && history.length === 0 && (
              <p style={{ color: 'rgba(240,235,227,0.3)', fontFamily: "'DM Mono', monospace", fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>No albums graded yet.</p>
            )}
            {history.map(function(item, i) {
              const col = GRADE_COLOR[item.final_grade] || '#f0ebe3'
              return (
                <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', marginBottom: '10px' }}>
                  {item.album_image && <img src={item.album_image} alt={item.album_name} style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.album_name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(240,235,227,0.4)', fontFamily: "'DM Mono', monospace" }}>{item.album_artist} · {item.album_year}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(240,235,227,0.25)', fontFamily: "'DM Mono', monospace", marginTop: '2px' }}>{new Date(item.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: col, lineHeight: 1 }}>{item.final_grade}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(240,235,227,0.3)', fontFamily: "'DM Mono', monospace" }}>{item.final_score}/100</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
