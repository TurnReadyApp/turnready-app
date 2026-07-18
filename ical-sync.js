// api/ical-sync.js — Vercel serverless function
// Fetches an iCal URL (Airbnb/VRBO/etc) and returns parsed bookings
// No npm packages needed — plain iCal parsing

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { icalUrl } = req.body || {}
  if (!icalUrl) return res.status(400).json({ error: 'icalUrl is required' })

  // Validate it looks like an iCal URL
  if (!icalUrl.startsWith('http')) {
    return res.status(400).json({ error: 'icalUrl must start with http/https' })
  }

  try {
    const response = await fetch(icalUrl, {
      headers: { 'User-Agent': 'TurnReady/1.0' },
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    if (!response.ok) {
      return res.status(502).json({ error: `Failed to fetch iCal: HTTP ${response.status}` })
    }

    const text = await response.text()
    if (!text.includes('BEGIN:VCALENDAR')) {
      return res.status(400).json({ error: 'URL does not return a valid iCal feed' })
    }

    const bookings = parseICal(text)
    return res.status(200).json({ bookings, count: bookings.length })

  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ error: 'iCal URL timed out after 10 seconds' })
    }
    console.error('[ical-sync] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

// Minimal iCal parser — extracts VEVENT blocks and returns checkIn/checkOut dates
function parseICal(text) {
  const bookings = []
  // Unfold long lines (iCal spec: lines ending in CRLF + whitespace are continuations)
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  let inEvent = false
  let current = {}

  for (const raw of lines) {
    const line = raw.trim()
    if (line === 'BEGIN:VEVENT') { inEvent = true; current = {}; continue }
    if (line === 'END:VEVENT') {
      inEvent = false
      if (current.checkOut) {
        // iCal DTSTART for all-day is checkout date for previous guest
        // DTEND is the day guests leave (check-out), DTSTART is check-in
        bookings.push({
          summary: current.summary || 'Booked',
          checkIn: current.checkIn || null,
          checkOut: current.checkOut || null,
          uid: current.uid || null,
          // Turnaround day = checkout date (when cleaning needs to happen)
          cleanDate: current.checkOut || null,
        })
      }
      continue
    }
    if (!inEvent) continue

    if (line.startsWith('DTSTART')) {
      current.checkIn = parseICalDate(line.split(':')[1] || line.split(';')[1]?.split(':')[1])
    } else if (line.startsWith('DTEND')) {
      current.checkOut = parseICalDate(line.split(':')[1] || line.split(';')[1]?.split(':')[1])
    } else if (line.startsWith('SUMMARY:')) {
      current.summary = line.slice(8).replace(/\\,/g, ',').replace(/\\n/g, ' ')
    } else if (line.startsWith('UID:')) {
      current.uid = line.slice(4)
    }
  }

  // Sort by checkIn date ascending
  return bookings
    .filter(b => b.checkIn && b.checkOut)
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
}

// Convert iCal date string (20260715 or 20260715T140000Z) to YYYY-MM-DD
function parseICalDate(val) {
  if (!val) return null
  const s = val.trim()
  if (s.length >= 8) {
    const y = s.slice(0, 4)
    const m = s.slice(4, 6)
    const d = s.slice(6, 8)
    return `${y}-${m}-${d}`
  }
  return null
}
