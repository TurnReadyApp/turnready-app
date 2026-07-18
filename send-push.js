// api/send-push.js — Vercel serverless function
// Sends a Web Push notification to a user stored in Supabase
// Requires: web-push npm package, VAPID keys set in Vercel env vars

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://zcjwzikydemajehwpegt.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configure VAPID — keys generated once via: npx web-push generate-vapid-keys
// Store in Vercel: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
webpush.setVapidDetails(
  'mailto:' + (process.env.VAPID_EMAIL || 'support@turnready.app'),
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, title, body, url } = req.body || {}

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('[send-push] VAPID keys not configured — skipping push')
    return res.status(200).json({ skipped: true, reason: 'VAPID not configured' })
  }

  try {
    // Load push subscription from Supabase
    const { data: userRow, error: dbErr } = await supabase
      .from('users')
      .select('push_subscription')
      .eq('id', userId)
      .single()

    if (dbErr || !userRow) {
      return res.status(404).json({ error: 'User not found' })
    }

    const subscription = userRow.push_subscription
    if (!subscription || !subscription.endpoint) {
      return res.status(200).json({ skipped: true, reason: 'No push subscription for user' })
    }

    const payload = JSON.stringify({
      title: title || 'TurnReady',
      body: body || '',
      url: url || '/',
    })

    await webpush.sendNotification(subscription, payload)
    console.log('[send-push] Sent push to', userId)
    return res.status(200).json({ success: true })

  } catch (err) {
    // Subscription expired or invalid — clear it from DB
    if (err.statusCode === 410 || err.statusCode === 404) {
      await supabase.from('users').update({ push_subscription: null }).eq('id', userId)
      return res.status(200).json({ skipped: true, reason: 'Subscription expired and removed' })
    }
    console.error('[send-push] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
