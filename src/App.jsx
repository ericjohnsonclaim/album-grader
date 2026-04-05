import { useState, useRef, useEffect } from 'react'

// ── Constants ──────────────────────────────────────────────────────────────────

const GRADES = ['F','D-','D','D+','C-','C','C+','B-','B','B+','A-','A','A+']

const GRADE_TO_GPA = {
  'F':0,'D-':0.7,'D':1.0,'D+':1.3,
  'C-':1.7,'C':2.0,'C+':2.3,
  'B-':2.7,'B':3.0,'B+':3.3,
  'A-':3.7,'A':4.0,'A+':4.3
}

const GPA_TO_GRADE = gpa => {
  if (gpa >= 4.2) return 'A+'; if (gpa >= 3.85) return 'A'; if (gpa >= 3.5) return 'A-'
  if (gpa >= 3.15) return 'B+'; if (gpa >= 2.85) return 'B'; if (gpa >= 2.5) return 'B-'
  if (gpa >= 2.15) return 'C+'; if (gpa >= 1.85) return 'C'; if (gpa >= 1.5) return 'C-'
  if (gpa >= 1.15) return 'D+'; if (gpa >= 0.85) return 'D'; if (gpa >= 0.4) return 'D-'
  return 'F'
}

const GRADE_COLOR = {
  'A+':'#00e5a0','A':'#00e5a0','A-':'#00e5a0',
  'B+':'#7dd4fc','B':'#7dd4fc','B-':'#7dd4fc',
  'C+':'#fbbf24','C':'#fbbf24','C-':'#fbbf24',
  'D+':'#fb923c','D':'#fb923c','D-':'#fb923c',
  'F':'#f87171'
}

function extractAlbumId(url) {
  const m = url.match(/album\/([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Storage helpers (localStorage for community ratings) ───────────────────────
// In production you'd use a real DB — this persists per-browser as a demo

function getRatings(albumId) {
  try { return JSON.parse(localStorage.getItem(`ag-${albumId}`) || '[]') } catch { return [] }
}

function saveRating(albumId, grade) {
  const existing = getRatings(albumId)
  existing.push({ grade, ts: Date.now() })
  localStorage.setItem(`ag-${albumId}`, JSON.stringify(existing))
}

function communityScore(albumId) {
  const ratings = getRatings(albumId)
  if (!ratings.length) return null
  const avg = ratings.reduce((s, r) => s + GRADE_TO_GPA[r.grade], 0) / ratings.length
  return { grade: GPA_TO_GRADE(avg), count: ratings.length }
}

// ── Audio player hook ──────────────────────────────────────────────────────────

function useAudio(url) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setPlaying(false)
      setProgress(0)
    }
    if (!url) return
    const audio = new Audio(url)
    audioRef.current = audio
    audio.addEventListener('timeupdate', () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0)
    })
    audio.addEventListener('ended', () => setPlaying(false))
    // Auto-play when track changes
    audio.play().then(() => setPlaying(true)).catch(() => {})
    return () => { audio.pause(); audio.src = '' }
  }, [url])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  return { playing, progress, toggle }
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d4',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '24px 16px', position: 'relative'
  },
  bg: {
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at 20% 30%, #1a0a2e 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, #0a1a2e 0%, transparent 60%)'
  },
  wrap: { position: 'relative', zIndex: 1, width: '100%', maxWidth: '560px' },
  heading: {
    textAlign: 'center', marginBottom: '36px'
  },
  eyebrow: {
    fontSize: '10px', letterSpacing: '0.4em', color: '#7c6f8e',
    marginBottom: '10px', fontFamily: "'IBM Plex Mono', monospace", display: 'block'
  },
  h1: {
    fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 400, margin: 0,
    background: 'linear-gradient(135deg, #e8e0d4 0%, #a896c0 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
  },
  card: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '20px', padding: '24px', marginBottom: '14px'
  },
  label: {
    fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", color: '#7c6f8e',
    letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '10px', display: 'block'
  },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
    padding: '13px 16px', color: '#e8e0d4', fontSize: '14px', outline: 'none',
    fontFamily: "'IBM Plex Mono', monospace", boxSizing: 'border-box'
  },
  primaryBtn: {
    width: '100%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    border: 'none', borderRadius: '13px', padding: '14px', color: '#fff',
    fontSize: '15px', cursor: 'pointer', letterSpacing: '0.04em', marginTop: '12px'
  },
  ghostBtn: {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '13px', padding: '14px',
    color: '#a896c0', fontSize: '15px', cursor: 'pointer', letterSpacing: '0.04em', marginTop: '8px'
  },
  error: { color: '#f87171', fontSize: '13px', marginTop: '8px', fontFamily: "'IBM Plex Mono', monospace" }
}

// ── Components ─────────────────────────────────────────────────────────────────

function TrackPlayer({ track, onGrade, currentGrade, isLast, onNext }) {
  const { playing, progress, toggle } = useAudio(track.preview_url)

  return (
    <div>
      {/* Track info + player */}
      <div style={S.card}>
        <span style={S.label}>Now playing</span>
        <div style={{ fontSize: '20px', marginBottom: '4px' }}>{track.name}</div>
        <div style={{ fontSize: '13px', color: '#7c6f8e', marginBottom: '20px', fontFamily: "'IBM Plex Mono', monospace" }}>
          {track.artists} · {formatDuration(track.duration_ms)}
        </div>

        {track.preview_url ? (
          <div>
            {/* Waveform progress bar */}
            <div style={{
              height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px',
              marginBottom: '14px', overflow: 'hidden'
            }}>
              <div style={{
                height: '100%', borderRadius: '4px',
                background: 'linear-gradient(90deg, #7c3aed, #00e5a0)',
                width: `${progress}%`, transition: 'width 0.1s linear'
              }} />
            </div>
            <button onClick={toggle} style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '50px', padding: '10px 24px', color: '#e8e0d4',
              fontSize: '14px', cursor: 'pointer', letterSpacing: '0.05em'
            }}>
              {playing ? '⏸ Pause' : '▶ Play Preview'}
            </button>
          </div>
        ) : (
          <div style={{ color: '#7c6f8e', fontSize: '13px', fontFamily: "'IBM Plex Mono', monospace" }}>
            No preview available for this track
          </div>
        )}
      </div>

      {/* Grade selector */}
      <div style={S.card}>
        <span style={S.label}>Your grade</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '16px' }}>
          {GRADES.map(g => {
            const sel = currentGrade === g
            const col = GRADE_COLOR[g]
            return (
              <button key={g} onClick={() => onGrade(g)} style={{
                background: sel ? col : 'rgba(255,255,255,0.04)',
                border: `1px solid ${sel ? col : 'rgba(255,255,255,0.09)'}`,
                borderRadius: '10px', padding: '10px 2px',
                color: sel ? '#0a0a0f' : col,
                fontSize: '12px', fontWeight: sel ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.12s',
                transform: sel ? 'scale(1.1)' : 'scale(1)'
              }}>
                {g}
              </button>
            )
          })}
        </div>
        <button
          onClick={onNext}
          disabled={!currentGrade}
          style={{
            ...S.primaryBtn, marginTop: 0,
            background: currentGrade ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.05)',
            color: currentGrade ? '#fff' : '#555',
            cursor: currentGrade ? 'pointer' : 'not-allowed'
          }}
        >
          {isLast ? 'See My Score →' : 'Next Track →'}
        </button>
      </div>
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState('input')
  const [urlInput, setUrlInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [album, setAlbum] = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [grades, setGrades] = useState({})
  const [pendingGrade, setPendingGrade] = useState(null)
  const [myScore, setMyScore] = useState(null)
  const [community, setCommunity] = useState(null)

  async function handleLoad() {
    setError('')
    const albumId = extractAlbumId(urlInput.trim())
    if (!albumId) return setError('Paste a full Spotify album URL.')
    setLoading(true)
    try {
      const res = await fetch(`/api/album?id=${albumId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load album')
      setAlbum(data)
      setPhase('grading')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  function handleNext() {
    if (!pendingGrade) return
    const newGrades = { ...grades, [currentIdx]: pendingGrade }
    setGrades(newGrades)
    setPendingGrade(null)
    if (currentIdx < album.tracks.length - 1) {
      setCurrentIdx(currentIdx + 1)
    } else {
      // Done
      const vals = Object.values(newGrades).map(g => GRADE_TO_GPA[g])
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      const final = GPA_TO_GRADE(avg)
      setMyScore(final)
      saveRating(album.id, final)
      setCommunity(communityScore(album.id))
      setPhase('results')
    }
  }

  function restart() {
    setPhase('input'); setUrlInput(''); setAlbum(null)
    setCurrentIdx(0); setGrades({}); setPendingGrade(null)
    setMyScore(null); setCommunity(null); setError('')
  }

  const track = album?.tracks[currentIdx]

  return (
    <div style={S.page}>
      <div style={S.bg} />
      <div style={S.wrap}>

        {/* Header */}
        <div style={S.heading}>
          <span style={S.eyebrow}>◈ Album Taste Test ◈</span>
          <h1 style={S.h1}>Grade the Album</h1>
        </div>

        {/* ── INPUT ── */}
        {phase === 'input' && (
          <div style={S.card}>
            <span style={S.label}>Paste a Spotify album link</span>
            <p style={{ color: '#a896c0', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>
              We'll load every track with a 30-second preview. Listen, grade each one F to A+, and get your album score.
            </p>
            <input
              style={S.input}
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLoad()}
              placeholder="https://open.spotify.com/album/..."
            />
            {error && <div style={S.error}>{error}</div>}
            <button onClick={handleLoad} disabled={loading} style={{
              ...S.primaryBtn,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}>
              {loading ? 'Loading album...' : 'Load Album →'}
            </button>
          </div>
        )}

        {/* ── GRADING ── */}
        {phase === 'grading' && album && track && (
          <div>
            {/* Album header */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
              {album.image && (
                <img src={album.image} alt={album.name} style={{
                  width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover',
                  flexShrink: 0
                }} />
              )}
              <div>
                <div style={{ fontSize: '18px' }}>{album.name}</div>
                <div style={{ fontSize: '13px', color: '#7c6f8e', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {album.artist} · {album.release_year}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '11px', color: '#7c6f8e', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '6px'
              }}>
                <span>Track {currentIdx + 1} of {album.tracks.length}</span>
                <span>{Math.round((currentIdx / album.tracks.length) * 100)}%</span>
              </div>
              <div style={{ height: '2px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px' }}>
                <div style={{
                  height: '100%', borderRadius: '4px',
                  background: 'linear-gradient(90deg, #7c3aed, #00e5a0)',
                  width: `${(currentIdx / album.tracks.length) * 100}%`,
                  transition: 'width 0.4s'
                }} />
              </div>
            </div>

            <TrackPlayer
              track={track}
              currentGrade={pendingGrade}
              onGrade={setPendingGrade}
              isLast={currentIdx === album.tracks.length - 1}
              onNext={handleNext}
            />
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === 'results' && album && (
          <div>
            {/* Album header */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              {album.image && (
                <img src={album.image} alt={album.name} style={{
                  width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0
                }} />
              )}
              <div>
                <div style={{ fontSize: '20px' }}>{album.name}</div>
                <div style={{ fontSize: '13px', color: '#7c6f8e', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {album.artist} · {album.release_year}
                </div>
              </div>
            </div>

            {/* Score cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div style={{ ...S.card, marginBottom: 0, textAlign: 'center', borderColor: `${GRADE_COLOR[myScore]}44` }}>
                <span style={S.label}>Your Score</span>
                <div style={{ fontSize: '72px', color: GRADE_COLOR[myScore], lineHeight: 1, fontWeight: 400 }}>
                  {myScore}
                </div>
              </div>
              <div style={{ ...S.card, marginBottom: 0, textAlign: 'center' }}>
                <span style={S.label}>Community</span>
                {community ? (
                  <>
                    <div style={{ fontSize: '72px', color: GRADE_COLOR[community.grade], lineHeight: 1, fontWeight: 400 }}>
                      {community.grade}
                    </div>
                    <div style={{ fontSize: '11px', color: '#7c6f8e', marginTop: '6px', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {community.count} rating{community.count !== 1 ? 's' : ''}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '36px', color: '#333', marginTop: '16px' }}>—</div>
                )}
              </div>
            </div>

            {/* Track breakdown */}
            <div style={S.card}>
              <span style={S.label}>Track Breakdown</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {album.tracks.map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '9px'
                  }}>
                    <div style={{ flex: 1, marginRight: '12px' }}>
                      <div style={{ fontSize: '14px', color: '#c4b8d8' }}>{t.name}</div>
                      <div style={{ fontSize: '11px', color: '#7c6f8e', fontFamily: "'IBM Plex Mono', monospace" }}>{t.artists}</div>
                    </div>
                    <span style={{
                      fontSize: '14px', fontWeight: 700,
                      color: GRADE_COLOR[grades[i]],
                      fontFamily: "'IBM Plex Mono', monospace", minWidth: '28px', textAlign: 'right'
                    }}>
                      {grades[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={restart} style={S.ghostBtn}>Grade Another Album</button>
          </div>
        )}

      </div>
    </div>
  )
}
