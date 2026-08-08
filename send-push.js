// api/send-push.js — Vercel serverless function (CommonJS)
const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://zcjwzikydemajehwpegt.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

webpush.setVapidDetails(
  'mailto:' + (process.env.VAPID_EMAIL || 'support@turnready.app'),
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, title, body, url } = req.body || {}
  console.log('[send-push] Request for userId:', userId, 'title:', title)

  if (!userId) return res.status(400).json({ error: 'userId is required' })

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('[send-push] VAPID keys not configured')
    return res.status(200).json({ skipped: true, reason: 'VAPID not configured' })
  }

  try {
    const { data: userRow, error: dbErr } = await supabase
      .from('users')
      .select('push_subscription')
      .eq('id', userId)
      .single()

    if (dbErr || !userRow) {
      console.log('[send-push] User not found:', userId)
      return res.status(404).json({ error: 'User not found' })
    }

    const subscription = userRow.push_subscription
    if (!subscription || !subscription.endpoint) {
      console.log('[send-push] No push subscription for user:', userId)
      return res.status(200).json({ skipped: true, reason: 'No push subscription' })
    }

    const payload = JSON.stringify({
      title: title || 'TurnReady',
      body: body || '',
      url: url || '/',
    })

    console.log('[send-push] Sending push to:', userId, 'endpoint:', subscription.endpoint.slice(0, 50))
    await webpush.sendNotification(subscription, payload)
    console.log('[send-push] ✅ Push sent successfully to:', userId)
    return res.status(200).json({ success: true })

  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await supabase.from('users').update({ push_subscription: null }).eq('id', userId)
      console.log('[send-push] Subscription expired, cleared for:', userId)
      return res.status(200).json({ skipped: true, reason: 'Subscription expired' })
    }
    console.error('[send-push] Error:', err.message, err.statusCode)
    return res.status(500).json({ error: err.message })
  }
}
