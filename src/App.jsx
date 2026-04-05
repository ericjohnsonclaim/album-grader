import { useState, useEffect, useCallback, useRef } from 'react'
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer'

const GRADES = [
  { label: 'A+', score: 100 },
  { label: 'A',  score: 95  },
  { label: 'A-', score: 90  },
  { label: 'B+', score: 87  },
  { label: 'B',  score: 83  },
  { label: 'B-', score: 80  },
  { label: 'C+', score: 77  },
  { label: 'C',  score: 73  },
  { label: 'C-', score: 70  },
  { label: 'D+', score: 67  },
  { label: 'D',  score: 63  },
  { label: 'D-', score: 60  },
  { label: 'F',  score: 0   },
]

const GRADE_FROM_SCORE = score => {
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
  'F':  '#f87171'
}

const GRADE_BG = {
  'A+': 'rgba(74,222,128,0.12)', 'A': 'rgba(74,222,128,0.12)', 'A-': 'rgba(74,222,128,0.08)',
  'B+': 'rgba(96,165,250,0.12)', 'B': 'rgba(96,165,250,0.12)', 'B-': 'rgba(96,165,250,0.08)',
  'C+': 'rgba(251,191,36,0.12)', 'C': 'rgba(251,191,36,0.12)', 'C-': 'rgba(251,191,36,0.08)',
  'D+': 'rgba(249,115,22,0.12)', 'D': 'rgba(249,115,22,0.12)', 'D-': 'rgba(249,115,22,0.08)',
  'F':  'rgba(248,113,113,0.12)'
}

function extractAlbumId(url) {
  const m = url.match(/album\/([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function avg(scores) {
  if (!scores.length) return 0
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
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
      {Array.from({ length: total }, (_, i) => {
        const graded = grades[i] !== undefined
        const isCurrent = i === current
        const col = graded ? GRADE_COLOR[grades[i].label] : null
        return (
          <div key={i} style={{
            width: isCurrent ? '20px' : '7px',
            height: '7px',
            borderRadius: '4px',
            background: isCurrent ? '#f0ebe3' : graded ? col : 'rgba(255,255,255,0.12)',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            flexShrink: 0
          }} />
        )
      })}
    </div>
  )
}

function GradeButton({ grade, selected, onSelect }) {
  const col = GRADE_COLOR[grade.label]
  const bg = GRADE_BG[grade.label]
  const isSel = selected === grade.label
  return (
    <button onClick={() => onSelect(grade)} style={{
      background: isSel ? bg : 'rgba(255,255,255,0.03)',
      border: `1.5px solid ${isSel ? col : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transform: isSel ? 'scale(1.12)' : 'scale(1)',
      aspectRatio: '1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: isSel ? `0 0 20px ${col}33` : 'none',
    }}>
      <span style={{
        fontSize: 'clamp(11px, 2.5vw, 15px)', fontWeight: 700,
        color: isSel ? col : 'rgba(240,235,227,0.5)',
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
  screen: {
    height: '100%', display: 'flex', flexDirection: 'column',
    background: '#0d0d0d', color: '#f0ebe3',
    maxWidth: '480px', margin: '0 auto', width: '100%'
  },
  centerContent: {
    flex: 1, display: 'flex', flexDirection: 'column',
    justifyContent: 'center', padding: '24px'
  },
  logo: {
    fontSize: 'clamp(36px, 8vw, 52px)', fontWeight: 800, letterSpacing: '-0.04em',
    background: 'linear-gradient(135deg, #f0ebe3 0%, rgba(240,235,227,0.5) 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px'
  },
  tagline: { fontSize: '14px', color: 'rgba(240,235,227,0.4)', fontFamily: "'DM Mono', monospace" },
  card: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '24px', padding: '28px'
  },
  inputLabel: {
    display: 'block', fontSize: '11px', fontFamily: "'DM Mono', monospace",
    color: 'rgba(240,235,227,0.35)', letterSpacing: '0.15em',
    textTransform: 'uppercase', marginBottom: '10px'
  },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.06)',
    border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '14px',
    padding: '14px 16px', color: '#f0ebe3', fontSize: '14px', outline: 'none',
    fontFamily: "'DM Mono', monospace", boxSizing: 'border-box'
  },
  primaryBtn: {
    width: '100%', background: '#f0ebe3', border: 'none', borderRadius: '14px',
    padding: '15px', color: '#0d0d0d', fontSize: '15px', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.02em', marginTop: '12px'
  },
  spotifyBtn: {
    width: '100%', background: '#1db954', border: 'none', borderRadius: '14px',
    padding: '15px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
  },
  ghostBtn: {
    width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '14px', padding: '14px', color: 'rgba(240,235,227,0.4)',
    fontSize: '14px', cursor: 'pointer', marginTop: '8px'
  },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px 12px', flexShrink: 0
  },
  iconBtn: {
    background: 'none', border: 'none', color: '#f0ebe3', cursor: 'pointer',
    fontSize: '13px', fontFamily: "'DM Mono', monospace", padding: '6px 10px', borderRadius: '8px'
  }
}

export default function App() {
  const [accessToken, setAccessToken] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const [phase, setPhase] = useState('login')
  const [album, setAlbum] = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [grades, setGrades] = useState({})
  const [loadingAlbum, setLoadingAlbum] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [authError, setAuthError] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const hasPlayedRef = useRef(false)

  const { ready, error: playerError, isPlaying, position, duration, playTrack, togglePlay } = useSpotifyPlayer(accessToken)

  useEffect(() => {
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

  useEffect(() => {
    if (ready && album && phase === 'grading' && !hasPlayedRef.current) {
      hasPlayedRef.current = true
      const track = album.tracks[currentIdx]
      playTrack(track.uri, track.hook_ms)
    }
  }, [ready, album, phase])

  useEffect(() => {
    if (ready && album && phase === 'grading' && hasPlayedRef.current) {
      const track = album.tracks[currentIdx]
      playTrack(track.uri, track.hook_ms)
    }
  }, [currentIdx])

  async function handleLoadAlbum() {
    setLoadError('')
    const albumId = extractAlbumId(urlInput)
    if (!albumId) return setLoadError('Paste a full Spotify album URL.')
    setLoadingAlbum(true)
    try {
      const res = await fetch(`/api/album?id=${albumId}&at=${accessToken}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load album')
      setAlbum(data); setGrades({}); setCurrentIdx(0)
      hasPlayedRef.current = false; setPhase('grading')
    } catch (e) { setLoadError(e.message) }
    setLoadingAlbum(false)
  }

  function handleGrade(grade) {
    const newGrades = { ...grades, [currentIdx]: grade }
    setGrades(newGrades)
    if (currentIdx < album.tracks.length - 1) {
      setCurrentIdx(i => i + 1)
    } else {
      setPhase('results')
    }
  }

  function handleBack() { if (currentIdx > 0) setCurrentIdx(i => i - 1) }

  function handleRestart() {
    setAlbum(null); setGrades({}); setCurrentIdx(0)
    hasPlayedRef.current = false; setLoadError(''); setPhase('input')
  }

  function handleLogout() {
    clearSession(); setAccessToken(null); setRefreshToken(null)
    setAlbum(null); setGrades({}); setPhase('login')
  }

  const track = album?.tracks[currentIdx]
  const isPlaying_ = isPlaying
  const progress = duration > 0 ? (position / duration) * 100 : 0
  const currentGrade = grades[currentIdx]

  const gradedTracks = album ? album.tracks.map((t, i) => ({ track: t, grade: grades[i] })).filter(x => x.grade) : []
  const finalScore = gradedTracks.length ? avg(gradedTracks.map(x => x.grade.score)) : 0
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
              {authError && (
                <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', textAlign: 'center', fontFamily: "'DM Mono', monospace" }}>
                  Login failed — please try again
                </p>
              )}
              <a href="/api/login" style={{ textDecoration: 'none', display: 'block' }}>
                <button style={css.spotifyBtn}><SpotifyIcon />Continue with Spotify</button>
              </a>
              <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '12px', textAlign: 'center', marginTop: '16px', fontFamily: "'DM Mono', monospace" }}>
                Spotify Premium required
              </p>
            </div>
          </div>
        </div>
      )}

      {/* INPUT */}
      {phase === 'input' && (
        <div style={css.screen}>
          <div style={css.centerContent}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={css.logo}>WAX</div>
              <p style={css.tagline}>Drop an album. Start grading.</p>
            </div>
            <div style={css.card}>
              <label style={css.inputLabel}>Spotify Album Link</label>
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLoadAlbum()}
                placeholder="open.spotify.com/album/..."
                style={css.input}
                autoFocus
              />
              {loadError && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '10px', fontFamily: "'DM Mono', monospace" }}>{loadError}</p>}
              {!ready && <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '12px', marginTop: '10px', fontFamily: "'DM Mono', monospace" }}>⏳ Connecting player...</p>}
              <button onClick={handleLoadAlbum} disabled={loadingAlbum || !ready || !urlInput.trim()} style={{
                ...css.primaryBtn,
                opacity: (loadingAlbum || !ready || !urlInput.trim()) ? 0.4 : 1,
                cursor: (loadingAlbum || !ready || !urlInput.trim()) ? 'not-allowed' : 'pointer'
              }}>
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
            <button onClick={handleBack} disabled={currentIdx === 0} style={{ ...css.iconBtn, opacity: currentIdx === 0 ? 0.2 : 0.7 }}>
              ← Back
            </button>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'rgba(240,235,227,0.4)' }}>
              {currentIdx + 1} / {album.tracks.length}
            </span>
            <div style={{ width: '60px' }} />
          </div>

          <div style={{ padding: '0 24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {album.image && <img src={album.image} alt={album.name} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'rgba(240,235,227,0.35)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{album.artist}</div>
                <div style={{ fontSize: '17px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.name}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 24px', marginBottom: '28px' }}>
            <ProgressDots total={album.tracks.length} current={currentIdx} grades={grades} />
          </div>

          <div style={{ padding: '0 24px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.2, marginBottom: '4px' }}>{track.name}</div>
                <div style={{ fontSize: '13px', color: 'rgba(240,235,227,0.4)', fontFamily: "'DM Mono', monospace" }}>{track.artists}</div>
              </div>

              <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '14px', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, #1db954, #4ade80)', width: `${progress}%`, transition: 'width 0.5s linear' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'rgba(240,235,227,0.3)' }}>{formatTime(position)}</span>
                <button onClick={togglePlay} style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: isPlaying_ ? 'rgba(240,235,227,0.1)' : '#f0ebe3',
                  border: 'none', cursor: 'pointer', fontSize: '16px',
                  color: isPlaying_ ? '#f0ebe3' : '#0d0d0d', transition: 'all 0.2s'
                }}>
                  {isPlaying_ ? '⏸' : '▶'}
                </button>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'rgba(240,235,227,0.3)' }}>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 24px' }}>
            <div style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'rgba(240,235,227,0.3)', textAlign: 'center', marginBottom: '14px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              {currentGrade ? `${currentGrade.label} · tap to change` : 'Grade this track'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {GRADES.map(g => <GradeButton key={g.label} grade={g} selected={currentGrade?.label} onSelect={handleGrade} />)}
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {phase === 'results' && album && (
        <div style={{ ...css.screen, overflowY: 'auto' }}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px' }}>
              {album.image && <img src={album.image} alt={album.name} style={{ width: '80px', height: '80px', borderRadius: '14px', objectFit: 'cover', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', flexShrink: 0 }} />}
              <div>
                <div style={{ fontSize: '12px', fontFamily: "'DM Mono', monospace", color: 'rgba(240,235,227,0.35)', marginBottom: '4px' }}>{album.artist} · {album.release_year}</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>{album.name}</div>
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${finalCol}15, ${finalCol}08)`, border: `1px solid ${finalCol}30`, borderRadius: '24px', padding: '32px', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'rgba(240,235,227,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>Your Score</div>
              <div style={{ fontSize: '80px', fontWeight: 800, color: finalCol, lineHeight: 1, marginBottom: '8px' }}>{finalGrade}</div>
              <div style={{ fontSize: '18px', color: 'rgba(240,235,227,0.4)', fontFamily: "'DM Mono', monospace" }}>{finalScore} / 100</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: 'rgba(240,235,227,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Track by Track</span>
              </div>
              {gradedTracks.map(({ track, grade }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: i < gradedTracks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(240,235,227,0.3)', fontFamily: "'DM Mono', monospace" }}>{track.artists}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'rgba(240,235,227,0.3)' }}>{grade.score}</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: GRADE_COLOR[grade.label], minWidth: '30px', textAlign: 'right' }}>{grade.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleRestart} style={css.primaryBtn}>Grade Another Album</button>
            <button onClick={handleLogout} style={css.ghostBtn}>Sign Out</button>
          </div>
        </div>
      )}

    </div>
  )
}
