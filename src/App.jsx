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
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.
