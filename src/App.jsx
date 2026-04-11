
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer'

const GRADES = [
  { label: 'A+', score: 100 }, { label: 'A', score: 95 }, { label: 'A-', score: 90 },
  { label: 'B+', score: 87 }, { label: 'B', score: 83 }, { label: 'B-', score: 80 },
  { label: 'C+', score: 77 }, { label: 'C', score: 73 }, { label: 'C-', score: 70 },
  { label: 'D+', score: 67 }, { label: 'D', score: 63 }, { label: 'D-', score: 60 },
  { label: 'F', score: 0 },
]

const GRADE_FROM_SCORE = s => {
  if (s >= 98) return 'A+'; if (s >= 92) return 'A'; if (s >= 88) return 'A-'
  if (s >= 85) return 'B+'; if (s >= 81) return 'B'; if (s >= 78) return 'B-'
  if (s >= 75) return 'C+'; if (s >= 71) return 'C'; if (s >= 68) return 'C-'
  if (s >= 65) return 'D+'; if (s >= 61) return 'D'; if (s >= 55) return 'D-'
  return 'F'
}

const GRADE_COLOR = {
  'A+': '#4ade80', 'A': '#4ade80', 'A-': '#86efac',
  'B+': '#60a5fa', 'B': '#60a5fa', 'B-': '#93c5fd',
  'C+': '#fbbf24', 'C': '#fbbf24', 'C-': '#fcd34d',
  'D+': '#f97316', 'D': '#f97316', 'D-': '#fb923c',
  'F': '#f87171'
}

const GREEN = '#1db954'

function formatTime(ms) {
  const s = Math.floor(ms / 1000)
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

function avg(scores) {
  if (!scores.length) return 0
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

function saveSession(at, rt) { try { localStorage.setItem('wax_s', JSON.stringify({ at, rt })) } catch {} }
function loadSession() { try { return JSON.parse(localStorage.getItem('wax_s') || 'null') } catch { return null } }
function clearSession() { try { localStorage.removeItem('wax_s') } catch {} }

async function generateTasteCard(user, history, scorecard) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080; canvas.height = 1080
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, 1080, 1080)
  const grad = ctx.createRadialGradient(200, 200, 0, 200, 200, 800)
  grad.addColorStop(0, 'rgba(29,185,84,0.15)'); grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1080)
  ctx.fillStyle = '#f0ebe3'; ctx.font = 'bold 96px serif'; ctx.fillText('WAX', 80, 130)
  ctx.fillStyle = 'rgba(240,235,227,0.4)'; ctx.font = '32px monospace'; ctx.fillText('TASTE PROFILE', 80, 180)
  ctx.fillStyle = '#f0ebe3'; ctx.font = 'bold 48px serif'; ctx.fillText(user?.name || 'Music Lover', 80, 280)
  const cleanHistory = history.filter(h => h.final_grade && !h.final_grade.includes('*'))
  const allScores = cleanHistory.map(h => h.final_score).filter(Boolean)
  const overallAvg = allScores.length ? avg(allScores) : 0
  const overallGrade = GRADE_FROM_SCORE(overallAvg)
  ctx.fillStyle = GRADE_COLOR[overallGrade] || '#4ade80'; ctx.font = 'bold 200px serif'; ctx.fillText(overallGrade, 80, 560)
  ctx.fillStyle = 'rgba(240,235,227,0.5)'; ctx.font = '36px monospace'; ctx.fillText('OVERALL GRADE', 80, 610)
  ctx.fillStyle = '#f0ebe3'; ctx.font = 'bold 64px serif'; ctx.fillText(history.length, 80, 740)
  ctx.fillStyle = 'rgba(240,235,227,0.4)'; ctx.font = '28px monospace'; ctx.fillText('ALBUMS REVIEWED', 80, 780)
  ctx.fillStyle = '#f0ebe3'; ctx.font = 'bold 64px serif'; ctx.fillText(overallAvg + '/100', 400, 740)
  ctx.fillStyle = 'rgba(240,235,227,0.4)'; ctx.font = '28px monospace'; ctx.fillText('AVG SCORE', 400, 780)
  const topGenre = scorecard[0]?.genre || 'Eclectic'
  ctx.fillStyle = GREEN; ctx.font = 'bold 48px serif'; ctx.fillText(topGenre.toUpperCase(), 80, 880)
  ctx.fillStyle = 'rgba(240,235,227,0.4)'; ctx.font = '28px monospace'; ctx.fillText('TOP GENRE', 80, 920)
  scorecard.slice(0, 4).forEach((item, i) => {
    const x = 600, y = 680 + i * 90, col = GRADE_COLOR[item.grade] || '#4ade80'
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.roundRect(x, y, 380, 12, 6); ctx.fill()
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, (item.score / 100) * 380, 12, 6); ctx.fill()
    ctx.fillStyle = '#f0ebe3'; ctx.font = '26px monospace'; ctx.fillText(item.genre.slice(0, 18), x, y - 8)
    ctx.fillStyle = col; ctx.font = 'bold 26px monospace'; ctx.fillText(item.grade, x + 340, y - 8)
  })
  ctx.fillStyle = 'rgba(240,235,227,0.2)'; ctx.font = '24px monospace'
  ctx.fillText('wax.app · grade every track · know your taste', 80, 1020)
  return canvas.toDataURL('image/png')
}

function ProgressDots({ total, current, grades }) {
  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', padding: '0 8px' }}>
      {Array.from({ length: total }, (_, i) => {
        const grade = grades[i], isCurrent = i === current
        const isSkipped = grade === 'skipped', isGraded = grade && !isSkipped
        const col = isGraded ? GRADE_COLOR[grade.label] : null
        return <div key={i} style={{ width: isCurrent ? '20px' : '7px', height: '7px', borderRadius: '4px', background: isCurrent ? '#f0ebe3' : isSkipped ? 'rgba(255,255,255,0.15)' : isGraded ? col : 'rgba(255,255,255,0.12)', border: isSkipped ? '1px solid rgba(255,255,255,0.3)' : 'none', transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', flexShrink: 0 }} />
      })}
    </div>
  )
}

function GradeButton({ grade, selected, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const isSel = selected === grade.label, col = GRADE_COLOR[grade.label]
  return (
    <button onClick={() => onSelect(grade)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: isSel ? col + '25' : 'rgba(255,255,255,0.03)', border: '1.5px solid ' + (isSel ? col : 'rgba(255,255,255,0.07)'), borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)', transform: isSel ? 'scale(1.12)' : 'scale(1)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isSel ? '0 0 20px ' + col + '33' : 'none' }}>
      <span style={{ fontSize: 'clamp(11px,2.5vw,15px)', fontWeight: 700, color: isSel ? col : hovered ? GREEN : '#fff', transition: 'color 0.15s' }}>{grade.label}</span>
    </button>
  )
}

function SpotifyIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
}

const css = {
  screen: { height: '100%', display: 'flex', flexDirection: 'column', background: '#0d0d0d', color: '#f0ebe3', maxWidth: '480px', margin: '0 auto', width: '100%' },
  centerContent: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' },
  logo: { fontSize: 'clamp(36px,8vw,52px)', fontWeight: 800, letterSpacing: '-0.04em', background: 'linear-gradient(135deg,#f0ebe3 0%,rgba(240,235,227,0.5) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' },
  tagline: { fontSize: '14px', color: 'rgba(240,235,227,0.4)', fontFamily: "'DM Mono',monospace" },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '28px' },
  inputLabel: { display: 'block', fontSize: '11px', fontFamily: "'DM Mono',monospace", color: 'rgba(240,235,227,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' },
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px 16px', color: '#f0ebe3', fontSize: '14px', outline: 'none', fontFamily: "'DM Mono',monospace", boxSizing: 'border-box' },
  primaryBtn: { width: '100%', background: '#f0ebe3', border: 'none', borderRadius: '14px', padding: '15px', color: '#0d0d0d', fontSize: '15px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em', marginTop: '12px' },
  greenBtn: { width: '100%', background: GREEN, border: 'none', borderRadius: '14px', padding: '15px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  spotifyBtn: { width: '100%', background: GREEN, border: 'none', borderRadius: '14px', padding: '15px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  ghostBtn: { width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px', color: 'rgba(240,235,227,0.4)', fontSize: '14px', cursor: 'pointer', marginTop: '8px' },
  dangerBtn: { width: '100%', background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '14px', padding: '14px', color: '#f87171', fontSize: '14px', cursor: 'pointer', marginTop: '8px' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', flexShrink: 0 },
  iconBtn: { background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Mono',monospace", padding: '6px 10px', borderRadius: '8px', opacity: 1 }
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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [reviewSort, setReviewSort] = useState('recent')
  const [playbackMode, setPlaybackMode] = useState('start')
  const [savingSettings, setSavingSettings] = useState(false)
  const [waxPicksLoading, setWaxPicksLoading] = useState(false)
  const [waxPicksResult, setWaxPicksResult] = useState(null)
  const [waxPicksError, setWaxPicksError] = useState('')
  const [generatingCard, setGeneratingCard] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [expandedReviews, setExpandedReviews] = useState({})
  const hasPlayedRef = useRef(false)
  const searchTimerRef = useRef(null)
  const tokenRef = useRef(null)

  const { ready, isPlaying, position, duration, playTrack, togglePlay } = useSpotifyPlayer(accessToken)

  useEffect(() => { tokenRef.current = accessToken }, [accessToken])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const at = params.get('at'), rt = params.get('rt'), err = params.get('auth_error')
    if (err) { setAuthError(true); setPhase('login'); window.history.replaceState({}, '', '/'); return }
    if (at) { setAccessToken(at); setRefreshToken(rt); saveSession(at, rt); setPhase('input'); window.history.replaceState({}, '', '/'); return }
    const stored = loadSession()
    if (stored?.at) { setAccessToken(stored.at); setRefreshToken(stored.rt); setPhase('input') }
  }, [])

  useEffect(() => {
    if (!accessToken || spotifyUser) return
    fetch('/api/me?at=' + accessToken).then(r => r.json()).then(d => { if (d.id) setSpotifyUser(d) }).catch(() => {})
  }, [accessToken])

  useEffect(() => {
    if (!spotifyUser) return
    setLoadingHistory(true)
    fetch('/api/grades?spotify_user_id=' + spotifyUser.id).then(r => r.json()).then(d => { if (Array.isArray(d)) setHistory(d) }).catch(() => {}).finally(() => setLoadingHistory(false))
    fetch('/api/settings?spotify_user_id=' + spotifyUser.id).then(r => r.json()).then(d => { if (d.playback_mode) setPlaybackMode(d.playback_mode) }).catch(() => {})
  }, [spotifyUser])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(async () => {
      const token = tokenRef.current
      if (!token) return
      setSearching(true)
      try {
        const r = await fetch('/api/search?q=' + encodeURIComponent(searchQuery.trim()) + '&at=' + token)
        const d = await r.json()
        if (Array.isArray(d)) setSearchResults(d)
        else setSearchResults([])
      } catch { setSearchResults([]) }
      setSearching(false)
    }, 400)
  }, [searchQuery])

  useEffect(() => {
    if (ready && album && phase === 'grading' && !hasPlayedRef.current) {
      hasPlayedRef.current = true
      const seekMs = playbackMode === 'hook' ? 30000 : 0
      playTrack(album.tracks[currentIdx].uri, seekMs)
    }
  }, [ready, album, phase])

  useEffect(() => {
    if (ready && album && phase === 'grading' && hasPlayedRef.current) {
      const seekMs = playbackMode === 'hook' ? 30000 : 0
      playTrack(album.tracks[currentIdx].uri, seekMs)
    }
  }, [currentIdx])

  async function handleSelectAlbum(albumResult) {
    setLoadError(''); setLoadingAlbum(true)
    try {
      const r = await fetch('/api/album?id=' + albumResult.id + '&at=' + tokenRef.current)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not load album')
      setAlbum(d); setGrades({}); setCurrentIdx(0)
      hasPlayedRef.current = false; setSearchQuery(''); setSearchResults([])
      setPhase('grading')
    } catch (e) { setLoadError(e.message) }
    setLoadingAlbum(false)
  }

  async function handleGrade(grade) {
    const newGrades = { ...grades, [currentIdx]: grade }
    setGrades(newGrades)
    await advanceOrFinish(newGrades)
  }

  async function handleSkip() {
    const newGrades = { ...grades, [currentIdx]: 'skipped' }
    setGrades(newGrades)
    await advanceOrFinish(newGrades)
  }

  async function advanceOrFinish(newGrades) {
    if (currentIdx < album.tracks.length - 1) { setCurrentIdx(i => i + 1); return }
    const gradedOnly = Object.values(newGrades).filter(g => g !== 'skipped')
    const hasSkippedTracks = Object.values(newGrades).some(g => g === 'skipped')
    const finalScore = gradedOnly.length ? avg(gradedOnly.map(g => g.score)) : 0
    const finalGrade = GRADE_FROM_SCORE(finalScore) + (hasSkippedTracks ? '*' : '')
    if (spotifyUser) {
      try {
        await fetch('/api/grades?spotify_user_id=' + spotifyUser.id, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            album_id: album.id, album_name: album.name, album_artist: album.artist,
            album_image: album.image, album_year: album.release_year, album_genres: album.genres || [],
            final_score: finalScore, final_grade: finalGrade,
            track_grades: album.tracks.map((t, i) => {
              const g = newGrades[i]
              return { track_id: t.id, name: t.name, artists: t.artists, grade: g === 'skipped' ? 'skipped' : g?.label, score: g === 'skipped' ? null : g?.score }
            })
          })
        })
        const h = await fetch('/api/grades?spotify_user_id=' + spotifyUser.id)
        const hd = await h.json()
        if (Array.isArray(hd)) setHistory(hd)
      } catch {}
    }
    setPhase('results')
  }

  async function handleSavePlaybackMode(mode) {
    setPlaybackMode(mode); setSavingSettings(true)
    try {
      await fetch('/api/settings?spotify_user_id=' + spotifyUser.id, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playback_mode: mode })
      })
    } catch {}
    setSavingSettings(false)
  }

  async function handleGenerateWaxPicks() {
    setWaxPicksLoading(true); setWaxPicksError(''); setWaxPicksResult(null)
    try {
      const cleanReviews = history.filter(h => h.final_grade && !h.final_grade.includes('*'))
      const r = await fetch('/api/waxpicks?at=' + tokenRef.current, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: cleanReviews })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      setWaxPicksResult(d)
    } catch (e) { setWaxPicksError(e.message) }
    setWaxPicksLoading(false)
  }

  async function handleGenerateTasteCard() {
    setGeneratingCard(true)
    try {
      const dataUrl = await generateTasteCard(spotifyUser, history, sc)
      const a = document.createElement('a')
      a.href = dataUrl; a.download = 'wax-taste-profile.png'; a.click()
    } catch (e) { console.error(e) }
    setGeneratingCard(false)
  }

  async function handleReset() {
    try {
      await fetch('/api/grades?spotify_user_id=' + spotifyUser.id, { method: 'DELETE' })
      setHistory([]); setPlaybackMode('start'); setConfirmReset(false); setWaxPicksResult(null)
    } catch {}
  }

  function handleScrub(e) {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    playTrack(album.tracks[currentIdx].uri, Math.floor(((e.clientX - rect.left) / rect.width) * duration))
  }

  function handleSkip30() {
    if (!duration) return
    const newPos = Math.min(position + 30000, duration - 1000)
    playTrack(album.tracks[currentIdx].uri, newPos)
  }

  function handleLogout() {
    clearSession(); setAccessToken(null); setRefreshToken(null)
    setAlbum(null); setGrades({}); setSpotifyUser(null); setHistory([]); setPhase('login')
  }

  function scorecard() {
    const map = {}
    history.forEach(r => {
      if (!r.album_genres || !r.final_score || !r.final_grade || r.final_grade.includes('*')) return
      r.album_genres.forEach(g => { if (!map[g]) map[g] = []; map[g].push(r.final_score) })
    })
    return Object.entries(map).map(([genre, scores]) => ({
      genre, score: avg(scores), count: scores.length, grade: GRADE_FROM_SCORE(avg(scores))
    })).sort((a, b) => b.score - a.score).slice(0, 10)
  }

  // Group history by artist
  function groupedByArtist() {
    const map = {}
    history.forEach(item => {
      const artist = item.album_artist || 'Unknown'
      if (!map[artist]) map[artist] = []
      map[artist].push(item)
    })
    return Object.entries(map)
      .map(([artist, reviews]) => ({ artist, reviews, avgScore: avg(reviews.map(r => r.final_score).filter(Boolean)), latest: reviews[0] }))
      .sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at))
  }

  // Sort reviews
  function sortedReviews(reviews) {
    const sorted = [...reviews]
    if (reviewSort === 'highest') sorted.sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
    else if (reviewSort === 'lowest') sorted.sort((a, b) => (a.final_score || 0) - (b.final_score || 0))
    else if (reviewSort === 'az') sorted.sort((a, b) => (a.album_name || '').localeCompare(b.album_name || ''))
    else sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return sorted
  }

  const track = album?.tracks[currentIdx]
  const progress = duration > 0 ? (position / duration) * 100 : 0
  const currentGrade = grades[currentIdx]
  const gradedOnly = album ? Object.values(grades).filter(g => g !== 'skipped') : []
  const hasSkippedTracks = album ? Object.values(grades).some(g => g === 'skipped') : false
  const finalScore = gradedOnly.length ? avg(gradedOnly.map(g => g.score)) : 0
  const finalGradeLabel = GRADE_FROM_SCORE(finalScore) + (hasSkippedTracks ? '*' : '')
  const finalCol = GRADE_COLOR[GRADE_FROM_SCORE(finalScore)]
  const sc = scorecard()
  const cleanScores = history.filter(h => h.final_grade && !h.final_grade.includes('*')).map(h => h.final_score).filter(Boolean)
  const overallAvg = cleanScores.length ? avg(cleanScores) : 0
  const cleanReviewCount = history.filter(h => h.final_grade && !h.final_grade.includes('*')).length
  const artistGroups = groupedByArtist()

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
              <p style={{ color: 'rgba(240,235,227,0.5)', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px', textAlign: 'center' }}>Connect Spotify Premium to start grading albums.</p>
              {authError && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', textAlign: 'center', fontFamily: "'DM Mono',monospace" }}>Login failed — please try again</p>}
              <a href="/api/login" style={{ textDecoration: 'none', display: 'block' }}>
                <button style={css.spotifyBtn}><SpotifyIcon />Continue with Spotify</button>
              </a>
              <p style={{ color: 'rgba(240,235,227,0.25)', fontSize: '12px', textAlign: 'center', marginTop: '16px', fontFamily: "'DM Mono',monospace" }}>Spotify Premium required</p>
            </div>
          </div>
        </div>
      )}

      {/* INPUT */}
      {phase === 'input' && (
        <div style={{ ...css.screen, overflowY: 'auto' }}>
          <div style={css.topBar}>
            <div style={css.logo}>WAX</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {history.length > 0 && <button onClick={() => setPhase('reviews')} style={css.iconBtn}>Reviews</button>}
              <button onClick={handleLogout} style={css.iconBtn}>Sign out</button>
            </div>
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={css.inputLabel}>Search for an album</label>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Artist or album name..." style={css.input} autoFocus />
              {loadError && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '8px', fontFamily: "'DM Mono',monospace" }}>{loadError}</p>}
              {!ready && <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '12px', marginTop: '8px', fontFamily: "'DM Mono',monospace" }}>⏳ Connecting player...</p>}
            </div>

            {searching && <p style={{ color: 'rgba(240,235,227,0.3)', fontSize: '13px', fontFamily: "'DM Mono',monospace", marginBottom: '16px' }}>Searching...</p>}

            {searchResults.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                {searchResults.map(a => (
                  <div key={a.id} onClick={() => !loadingAlbum && handleSelectAlbum(a)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden', cursor: loadingAlbum ? 'not-allowed' : 'pointer', opacity: loadingAlbum ? 0.5 : 1 }}>
                    {a.image && <img src={a.image} alt={a.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                      <div style={{ fontSize: '11px', color: '#fff', fontFamily: "'DM Mono',monospace", marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.artist}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(240,235,227,0.3)', fontFamily: "'DM Mono',monospace" }}>{a.year}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loadingAlbum && <p style={{ color: 'rgba(240,235,227,0.4)', fontSize: '13px', fontFamily: "'DM Mono',monospace", textAlign: 'center', marginBottom: '16px' }}>Loading album...</p>}

            {/* Playback mode */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '11px', fontFamily: "'DM Mono',monospace", color: 'rgba(240,235,227,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Playback Mode</span>
              </div>
              <div style={{ display: 'flex' }}>
                {[{ value: 'start', label: 'Full Song' }, { value: 'hook', label: 'Start at 0:30' }].map(opt => {
                  const isSel = playbackMode === opt.value
                  return (
                    <button key={opt.value} onClick={() => handleSavePlaybackMode(opt.value)} style={{ flex: 1, padding: '12px', background: isSel ? 'rgba(29,185,84,0.1)' : 'transparent', border: 'none', borderRight: opt.value === 'start' ? '1px solid rgba(255,255,255,0.06)' : 'none', color: isSel ? GREEN : 'rgba(240,235,227,0.4)', fontSize: '13px', fontWeight: isSel ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Mono',monospace", transition: 'all 0.15s' }}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* WAX Picks on home */}
            {cleanReviewCount >= 3 && (
              <div style={{ background: 'rgba(29,185,84,0.06)', border: '1px solid rgba(29,185,84,0.2)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: GREEN, marginBottom: '4px' }}>WAX Picks</div>
                <p style={{ fontSize: '12px', color: 'rgba(240,235,227,0.5)', marginBottom: '12px', lineHeight: 1.5 }}>
                  {cleanReviewCount * 2} tracks · AI-powered · based on {cleanReviewCount} reviewed albums
                </p>
                {waxPicksResult ? (
                  <a href={waxPicksResult.playlist_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                    <button style={{ ...css.greenBtn, marginTop: 0 }}><SpotifyIcon /> Open WAX Picks ({waxPicksResult.track_count} tracks)</button>
                  </a>
                ) : (
                  <button onClick={handleGenerateWaxPicks} disabled={waxPicksLoading} style={{ ...css.greenBtn, marginTop: 0, opacity: waxPicksLoading ? 0.6 : 1 }}>
                    {waxPicksLoading ? 'Generating...' : '✦ Generate WAX Picks'}
                  </button>
                )}
                {waxPicksError && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '8px', fontFamily: "'DM Mono',monospace" }}>{waxPicksError}</p>}
              </div>
            )}

            {spotifyUser && <p style={{ fontSize: '12px', color: 'rgba(240,235,227,0.25)', fontFamily: "'DM Mono',monospace", textAlign: 'center' }}>Signed in as {spotifyUser.name || spotifyUser.email}</p>}
          </div>
        </div>
      )}

      {/* GRADING */}
      {phase === 'grading' && album && track && (
        <div style={css.screen}>
          <div style={css.topBar}>
            <button onClick={() => { if (currentIdx === 0) { setAlbum(null); setGrades({}); hasPlayedRef.current = false; setPhase('input') } else { setCurrentIdx(i => i - 1) } }} style={{ ...css.iconBtn, opacity: 0.7 }}>← Back</button>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '12px', color: 'rgba(240,235,227,0.4)' }}>{currentIdx + 1} / {album.tracks.length}</span>
            <button onClick={handleSkip} style={{ ...css.iconBtn, opacity: 0.7 }}>Skip →</button>
          </div>

          <div style={{ padding: '0 24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {album.image && <img src={album.image} alt={album.name} style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontFamily: "'DM Mono',monospace", color: 'rgba(240,235,227,0.35)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{album.artist}</div>
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
                <div style={{ fontSize: '12px', color: '#ffffff', fontFamily: "'DM Mono',monospace" }}>{track.artists}</div>
              </div>

              <div onClick={handleScrub} style={{ height: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', marginBottom: '12px', overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ height: '100%', borderRadius: '6px', background: 'linear-gradient(90deg,' + GREEN + ',#4ade80)', width: progress + '%', transition: 'width 0.5s linear', pointerEvents: 'none' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', color: 'rgba(240,235,227,0.3)' }}>{formatTime(position)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button onClick={togglePlay} style={{ width: '44px', height: '44px', borderRadius: '50%', background: isPlaying ? 'rgba(240,235,227,0.1)' : '#f0ebe3', border: 'none', cursor: 'pointer', fontSize: '16px', color: isPlaying ? '#f0ebe3' : '#0d0d0d', transition: 'all 0.2s' }}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <button onClick={handleSkip30} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '6px 12px', color: '#f0ebe3', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Mono',monospace", whiteSpace: 'nowrap' }}>
                    +30s
                  </button>
                </div>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', color: 'rgba(240,235,227,0.3)' }}>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 24px' }}>
            <div style={{ fontSize: '11px', fontFamily: "'DM Mono',monospace", color: GREEN, textAlign: 'center', marginBottom: '12px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              {currentGrade && currentGrade !== 'skipped' ? currentGrade.label + ' · tap to change' : currentGrade === 'skipped' ? 'Skipped · tap to grade' : 'Grade this track'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px' }}>
              {GRADES.map(g => <GradeButton key={g.label} grade={g} selected={currentGrade !== 'skipped' ? currentGrade?.label : null} onSelect={handleGrade} />)}
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
                <div style={{ fontSize: '12px', fontFamily: "'DM Mono',monospace", color: 'rgba(240,235,227,0.35)', marginBottom: '4px' }}>{album.artist} · {album.release_year}</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>{album.name}</div>
                {album.genres?.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {album.genres.slice(0, 3).map(g => <span key={g} style={{ fontSize: '10px', fontFamily: "'DM Mono',monospace", color: 'rgba(240,235,227,0.35)', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '2px 8px' }}>{g}</span>)}
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,' + finalCol + '15,' + finalCol + '08)', border: '1px solid ' + finalCol + '30', borderRadius: '24px', padding: '28px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontFamily: "'DM Mono',monospace", color: 'rgba(240,235,227,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>Your Score</div>
              <div style={{ fontSize: '72px', fontWeight: 800, color: finalCol, lineHeight: 1, marginBottom: '6px' }}>{finalGradeLabel}</div>
              <div style={{ fontSize: '16px', color: 'rgba(240,235,227,0.4)', fontFamily: "'DM Mono',monospace" }}>{finalScore} / 100</div>
              {hasSkippedTracks && <div style={{ fontSize: '12px', color: 'rgba(240,235,227,0.3)', fontFamily: "'DM Mono',monospace", marginTop: '6px' }}>* score excludes skipped tracks</div>}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '11px', fontFamily: "'DM Mono',monospace", color: 'rgba(240,235,227,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Track by Track</span>
              </div>
              {album.tracks.map((t, i) => {
                const g = grades[i], isSkipped = g === 'skipped'
                const col = g && !isSkipped ? GRADE_COLOR[g.label] : null
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: i < album.tracks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {!isSkipped && g && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', color: 'rgba(240,235,227,0.3)' }}>{g.score}</span>}
                      <span style={{ fontSize: '14px', fontWeight: 700, color: isSkipped ? 'rgba(255,255,255,0.2)' : col, minWidth: '28px', textAlign: 'right', fontFamily: "'DM Mono',monospace" }}>
                        {isSkipped ? '—' : g ? g.label : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={() => { setAlbum(null); setGrades({}); setCurrentIdx(0); hasPlayedRef.current = false; setPhase('input') }} style={css.primaryBtn}>Grade Another Album</button>
            <button onClick={() => setPhase('reviews')} style={{ ...css.ghostBtn, marginTop: '8px' }}>My Reviews</button>
          </div>
        </div>
      )}

      {/* MY REVIEWS */}
      {phase === 'reviews' && (
        <div style={{ ...css.screen, overflowY: 'auto' }}>
          <div style={css.topBar}>
            <button onClick={() => { setSelectedArtist(null); setPhase('input') }} style={css.iconBtn}>← Back</button>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>{selectedArtist ? selectedArtist : 'My Reviews'}</span>
            <button onClick={() => setSelectedArtist(null)} style={{ ...css.iconBtn, opacity: selectedArtist ? 1 : 0, pointerEvents: selectedArtist ? 'auto' : 'none' }}>All</button>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {/* Taste profile */}
            {history.length > 0 && !selectedArtist && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontFamily: "'DM Mono',monospace", color: 'rgba(240,235,227,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px' }}>Your Taste Profile</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {[{ label: 'Albums', value: history.length }, { label: 'Avg Score', value: overallAvg + '/100' }, { label: 'Artists', value: artistGroups.length }].map(stat => (
                    <div key={stat.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: GREEN }}>{stat.value}</div>
                      <div style={{ fontSize: '10px', fontFamily: "'DM Mono',monospace", color: 'rgba(240,235,227,0.3)', marginTop: '2px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
                {sc.slice(0, 4).map((item, i) => {
                  const col = GRADE_COLOR[item.grade]
                  return (
                    <div key={i} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#f0ebe3', textTransform: 'capitalize' }}>{item.genre}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: col, fontFamily: "'DM Mono',monospace" }}>{item.grade}</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: item.score + '%', background: col, borderRadius: '4px' }} />
                      </div>
                    </div>
                  )
                })}
                <button onClick={handleGenerateTasteCard} disabled={generatingCard} style={{ ...css.primaryBtn, marginTop: '16px', opacity: generatingCard ? 0.6 : 1 }}>
                  {generatingCard ? 'Generating...' : '⬇ Download Taste Card'}
                </button>
              </div>
            )}

            {/* WAX Picks */}
            {cleanReviewCount >= 3 && !selectedArtist && (
              <div style={{ background: 'rgba(29,185,84,0.06)', border: '1px solid rgba(29,185,84,0.2)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: GREEN, marginBottom: '6px' }}>WAX Picks</div>
                <p style={{ fontSize: '13px', color: 'rgba(240,235,227,0.5)', marginBottom: '12px', lineHeight: 1.5 }}>AI-powered playlist from your taste profile.</p>
                {waxPicksResult ? (
                  <a href={waxPicksResult.playlist_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                    <button style={{ ...css.greenBtn, marginTop: 0 }}><SpotifyIcon /> Open WAX Picks</button>
                  </a>
                ) : (
                  <button onClick={handleGenerateWaxPicks} disabled={waxPicksLoading} style={{ ...css.greenBtn, marginTop: 0, opacity: waxPicksLoading ? 0.6 : 1 }}>
                    {waxPicksLoading ? 'Generating...' : '✦ Generate WAX Picks'}
                  </button>
                )}
                {waxPicksError && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '8px', fontFamily: "'DM Mono',monospace" }}>{waxPicksError}</p>}
              </div>
            )}

            {/* Sort bar */}
            {history.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[{ value: 'recent', label: 'Recent' }, { value: 'highest', label: 'Highest' }, { value: 'lowest', label: 'Lowest' }, { value: 'az', label: 'A–Z' }].map(opt => (
                  <button key={opt.value} onClick={() => setReviewSort(opt.value)} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid ' + (reviewSort === opt.value ? GREEN : 'rgba(255,255,255,0.1)'), background: reviewSort === opt.value ? 'rgba(29,185,84,0.1)' : 'transparent', color: reviewSort === opt.value ? GREEN : 'rgba(240,235,227,0.4)', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Mono',monospace" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Artist buckets — only show when not filtered */}
            {!selectedArtist && artistGroups.filter(a => a.reviews.length >= 2).length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontFamily: "'DM Mono',monospace", color: 'rgba(240,235,227,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '10px' }}>By Artist</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {artistGroups.filter(a => a.reviews.length >= 2).map(a => {
                    const col = GRADE_COLOR[GRADE_FROM_SCORE(a.avgScore)] || '#f0ebe3'
                    return (
                      <button key={a.artist} onClick={() => setSelectedArtist(a.artist)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', cursor: 'pointer', color: '#f0ebe3' }}>
                        {a.reviews[0]?.album_image && <img src={a.reviews[0].album_image} alt={a.artist} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />}
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{a.artist}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: col, fontFamily: "'DM Mono',monospace" }}>{a.reviews.length}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Review list */}
            {loadingHistory && <p style={{ color: 'rgba(240,235,227,0.3)', fontFamily: "'DM Mono',monospace", fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>Loading...</p>}
            {!loadingHistory && history.length === 0 && <p style={{ color: 'rgba(240,235,227,0.3)', fontFamily: "'DM Mono',monospace", fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No reviews yet.</p>}

            {!loadingHistory && sortedReviews(selectedArtist ? history.filter(h => h.album_artist === selectedArtist) : history).map((entry, i) => {
              const gradeBase = entry.final_grade?.replace('*', '')
              const col = GRADE_COLOR[gradeBase] || '#f0ebe3'
              const entryKey = entry.id || i
              const isExpanded = !!expandedReviews[entryKey]
              return (
                <div key={entryKey} style={{ marginBottom: '10px' }}>
                  <div onClick={() => setExpandedReviews(prev => ({ ...prev, [entryKey]: !prev[entryKey] }))}
                    style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid ' + (isExpanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'), borderRadius: isExpanded ? '16px 16px 0 0' : '16px', cursor: 'pointer' }}>
                    {entry.album_image && <img src={entry.album_image} alt={entry.album_name} style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.album_name}</div>
                      <div style={{ fontSize: '12px', color: '#ffffff', fontFamily: "'DM Mono',monospace" }}>{entry.album_artist} · {entry.album_year}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(240,235,227,0.25)', fontFamily: "'DM Mono',monospace", marginTop: '2px' }}>
                        {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: col, lineHeight: 1 }}>{entry.final_grade}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(240,235,227,0.3)', fontFamily: "'DM Mono',monospace" }}>{entry.final_score}/100</div>
                    </div>
                  </div>
                  {isExpanded && entry.track_grades && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
                      {entry.track_grades.map((tg, k) => {
                        const tCol = tg.grade && tg.grade !== 'skipped' ? GRADE_COLOR[tg.grade] : null
                        return (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderTop: k > 0 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                            <span style={{ fontSize: '13px', color: 'rgba(240,235,227,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%' }}>{tg.name}</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: tg.grade === 'skipped' ? 'rgba(255,255,255,0.2)' : tCol, fontFamily: "'DM Mono',monospace" }}>
                              {tg.grade === 'skipped' ? '—' : tg.grade || '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Reset */}
            {history.length > 0 && !selectedArtist && (
              <div style={{ marginTop: '24px' }}>
                {!confirmReset ? (
                  <button onClick={() => setConfirmReset(true)} style={css.dangerBtn}>Reset All Reviews</button>
                ) : (
                  <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', color: '#f87171', marginBottom: '14px' }}>This will permanently delete all your reviews. Are you sure?</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setConfirmReset(false)} style={{ ...css.ghostBtn, marginTop: 0, flex: 1 }}>Cancel</button>
                      <button onClick={handleReset} style={{ flex: 1, background: '#f87171', border: 'none', borderRadius: '14px', padding: '14px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Yes, Reset</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
