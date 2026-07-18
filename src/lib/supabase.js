import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zcjwzikydemajehwpegt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjand6aWt5ZGVtYWplaHdwZWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTMzNDksImV4cCI6MjA5ODE2OTM0OX0.Zl7Ubc0zZxlokoijuvsWjkl0iZntBMjgom6jO5IVrzk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// ── AUTH ──────────────────────────────────────────────────────────────────────

export async function signUp({ email, password, name, role, inviteCode, phone, plan }) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password
  })
  if (authError) throw authError
  if (!authData.user) throw new Error('Sign up failed — no user returned')

  const userId = authData.user.id
  const avatarInitials = name.trim().split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase()
  const now = new Date().toISOString()

  const profileData = {
    id: userId,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role,
    avatar: avatarInitials,
    phone: phone || null,
    rating: 5.0,
    jobs_completed: 0,
    total_earned: 0,
    stripe_status: 'pending',
    joined_at: now
  }

  if (role === 'manager') {
    profileData.invite_code = inviteCode || null
    profileData.plan = plan || 'pro'
    profileData.trial_start = now
  } else if (role === 'cleaner') {
    profileData.invite_code = inviteCode || null
    profileData.plan = null
  }

  const { error: profileError } = await supabase.from('users').insert(profileData)
  if (profileError) throw profileError

  return { userId, email, name, role }
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) return null
  return profile
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const profile = await getCurrentUser()
      callback(profile)
    } else {
      callback(null)
    }
  })
}

// ── USERS ─────────────────────────────────────────────────────────────────────

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getTeamCleaners(managerId) {
  const { data: byManagerId, error: e1 } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'cleaner')
    .eq('manager_id', managerId)
    .order('name')

  if (!e1 && byManagerId && byManagerId.length > 0) {
    return byManagerId
  }

  const { data: mgr } = await supabase
    .from('users')
    .select('invite_code')
    .eq('id', managerId)
    .single()

  if (mgr && mgr.invite_code) {
    const { data: byCode, error: e2 } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'cleaner')
      .eq('invite_code', mgr.invite_code)
      .order('name')
    if (!e2) return byCode || []
  }

  return []
}

// ── PROPERTIES ────────────────────────────────────────────────────────────────

export async function getProperties(managerId) {
  const { data, error } = await supabase
    .from('properties')
    .select('id,manager_id,name,address,type,pay,bedrooms,bathrooms,photo,notes,check_in,check_out,same_day,access_code,supply_info,alarm_code,linen_rate,total_beds,linen_bags,assigned_to,guest_rating,created_at,schedule')
    .eq('manager_id', managerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(p => ({
    ...p,
    tasks: p.tasks_data || [],
    rooms: p.rooms_data || [],
    inventory: p.inventory_data || [],
    schedule: p.schedule || [],
    cleanerPhotos: p.cleaner_photos || [],
    linenBagPhotos: p.linen_bag_photos || [],
    cleanerNotes: p.cleaner_notes || '',
    checkIn: p.check_in || '4:00 PM',
    checkOut: p.check_out || '11:00 AM',
    sameDay: p.same_day || false,
    accessCode: p.access_code || '',
    supplyInfo: p.supply_info || '',
    alarmCode: p.alarm_code || '',
    linenRate: p.linen_rate || 10,
    linenBags: p.linen_bags || 0,
    totalBeds: p.total_beds || 1,
    assignedTo: p.assigned_to || null,
  }))
}

export async function createProperty(property) {
  const dbProp = {
    manager_id: property.manager_id,
    name: property.name,
    address: property.address,
    type: property.type || 'Airbnb',
    pay: property.pay || 0,
    bedrooms: property.bedrooms || 1,
    bathrooms: property.bathrooms || 1,
    photo: property.photo || null,
    notes: property.notes || '',
    check_in: property.check_in || property.checkIn || '4:00 PM',
    check_out: property.check_out || property.checkOut || '11:00 AM',
    same_day: property.same_day || property.sameDay || false,
    access_code: property.access_code || property.accessCode || null,
    supply_info: property.supply_info || property.supplyInfo || null,
    alarm_code: property.alarm_code || property.alarmCode || null,
    linen_rate: property.linen_rate || property.linenRate || 10,
    total_beds: property.total_beds || property.totalBeds || property.bedrooms || 1,
    tasks_data: property.tasks || [],
    rooms_data: property.rooms || [],
    inventory_data: property.inventory || [],
    schedule: property.schedule || [],
    cleaner_photos: property.cleanerPhotos || [],
    linen_bag_photos: property.linenBagPhotos || [],
    cleaner_notes: property.cleanerNotes || '',
    linen_bags: property.linenBags || 0,
    assigned_to: property.assignedTo || null,
  }
  const { data, error } = await supabase
    .from('properties')
    .insert(dbProp)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPropertyFull(propertyId) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single()
  if (error) throw error
  return {
    id: data.id,
    name: data.name || '',
    address: data.address || '',
    photo: data.photo || null,
    pay: data.pay || 0,
    bedrooms: data.bedrooms || 0,
    bathrooms: data.bathrooms || 0,
    notes: data.notes || '',
    check_in: data.check_in || '',
    check_out: data.check_out || '',
    checkIn: data.check_in || '',
    checkOut: data.check_out || '',
    same_day: data.same_day || false,
    sameDay: data.same_day || false,
    access_code: data.access_code || '',
    accessCode: data.access_code || '',
    supply_info: data.supply_info || '',
    supplyInfo: data.supply_info || '',
    alarm_code: data.alarm_code || '',
    alarmCode: data.alarm_code || '',
    linen_rate: data.linen_rate || 0,
    linenRate: data.linen_rate || 0,
    total_beds: data.total_beds || 0,
    totalBeds: data.total_beds || 0,
    linen_bags: data.linen_bags || 0,
    linenBags: data.linen_bags || 0,
    tasks: data.tasks_data || [],
    rooms: data.rooms_data || [],
    inventory: data.inventory_data || [],
    cleanerPhotos: data.cleaner_photos || [],
    linenBagPhotos: data.linen_bag_photos || [],
    cleanerNotes: data.cleaner_notes || '',
    schedule: data.schedule || [],
    ical_url: data.ical_url || null,
    icalUrl: data.ical_url || null,
  }
}

export async function updateProperty(id, updates) {
  const dbUpdates = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.address !== undefined) dbUpdates.address = updates.address
  if (updates.type !== undefined) dbUpdates.type = updates.type
  if (updates.pay !== undefined) dbUpdates.pay = updates.pay
  if (updates.bedrooms !== undefined) dbUpdates.bedrooms = updates.bedrooms
  if (updates.bathrooms !== undefined) dbUpdates.bathrooms = updates.bathrooms
  if (updates.photo !== undefined) dbUpdates.photo = updates.photo
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes
  if (updates.checkIn !== undefined) dbUpdates.check_in = updates.checkIn
  if (updates.check_in !== undefined) dbUpdates.check_in = updates.check_in
  if (updates.checkOut !== undefined) dbUpdates.check_out = updates.checkOut
  if (updates.check_out !== undefined) dbUpdates.check_out = updates.check_out
  if (updates.sameDay !== undefined) dbUpdates.same_day = updates.sameDay
  if (updates.same_day !== undefined) dbUpdates.same_day = updates.same_day
  if (updates.accessCode !== undefined) dbUpdates.access_code = updates.accessCode
  if (updates.access_code !== undefined) dbUpdates.access_code = updates.access_code
  if (updates.supplyInfo !== undefined) dbUpdates.supply_info = updates.supplyInfo
  if (updates.supply_info !== undefined) dbUpdates.supply_info = updates.supply_info
  if (updates.alarmCode !== undefined) dbUpdates.alarm_code = updates.alarmCode
  if (updates.alarm_code !== undefined) dbUpdates.alarm_code = updates.alarm_code
  if (updates.linenRate !== undefined) dbUpdates.linen_rate = updates.linenRate
  if (updates.linen_rate !== undefined) dbUpdates.linen_rate = updates.linen_rate
  if (updates.totalBeds !== undefined) dbUpdates.total_beds = updates.totalBeds
  if (updates.total_beds !== undefined) dbUpdates.total_beds = updates.total_beds
  if (updates.tasks !== undefined) dbUpdates.tasks_data = updates.tasks
  if (updates.rooms !== undefined) dbUpdates.rooms_data = updates.rooms
  if (updates.inventory !== undefined) dbUpdates.inventory_data = updates.inventory
  if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule
  if (updates.cleanerPhotos !== undefined) dbUpdates.cleaner_photos = updates.cleanerPhotos
  if (updates.linenBagPhotos !== undefined) dbUpdates.linen_bag_photos = updates.linenBagPhotos
  if (updates.cleanerNotes !== undefined) dbUpdates.cleaner_notes = updates.cleanerNotes
  if (updates.linenBags !== undefined) dbUpdates.linen_bags = updates.linenBags
  if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo
  if (updates.guest_rating !== undefined) dbUpdates.guest_rating = updates.guest_rating
  if (updates.ical_url !== undefined) dbUpdates.ical_url = updates.ical_url

  const { data, error } = await supabase
    .from('properties')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProperty(id) {
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) throw error
}

// ── SCHEDULE SLOTS ────────────────────────────────────────────────────────────

export async function getSlots(propertyId) {
  const { data, error } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('property_id', propertyId)
    .order('date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createSlot(slot) {
  const { data, error } = await supabase
    .from('schedule_slots')
    .insert(slot)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSlot(id, updates) {
  const { data, error } = await supabase
    .from('schedule_slots')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCleanerSlots(cleanerId) {
  const { data, error } = await supabase
    .from('schedule_slots')
    .select('*, properties(*)')
    .or(`cleaner_id.eq.${cleanerId},cleaner_id2.eq.${cleanerId}`)
    .order('date', { ascending: true })
  if (error) throw error
  return data || []
}

// ── JOBS ──────────────────────────────────────────────────────────────────────

export async function getJobs(filter = {}) {
  let query = supabase.from('jobs').select('*').order('created_at', { ascending: false })
  if (filter.cleanerId) query = query.eq('cleaner_id', filter.cleanerId)
  if (filter.propertyId) query = query.eq('property_id', filter.propertyId)
  if (filter.status) query = query.eq('status', filter.status)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createJob(job) {
  const { data, error } = await supabase.from('jobs').insert(job).select().single()
  if (error) throw error
  return data
}

export async function updateJob(id, updates) {
  const { data, error } = await supabase.from('jobs').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getPendingJobs(managerId) {
  const { data, error } = await supabase
    .from('jobs')
    .select(`*, properties!inner(manager_id)`)
    .eq('properties.manager_id', managerId)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── MESSAGES ──────────────────────────────────────────────────────────────────

export async function getMessages(userId, otherUserId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(from_id.eq.${userId},to_id.eq.${otherUserId}),and(from_id.eq.${otherUserId},to_id.eq.${userId})`)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function sendMessage(message) {
  const { data, error } = await supabase.from('messages').insert(message).select().single()
  if (error) throw error
  return data
}

export function subscribeToMessages(userId, callback) {
  return supabase
    .channel(`messages:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `to_id=eq.${userId}`
    }, payload => callback(payload.new))
    .subscribe()
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export async function createNotification(notification) {
  const { error } = await supabase.from('notifications').insert(notification)
  if (error) throw error
}

export async function markNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
  if (error) throw error
}

export function subscribeToNotifications(userId, callback) {
  return supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, payload => callback(payload.new))
    .subscribe()
}

// ── FILE STORAGE ──────────────────────────────────────────────────────────────

export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}

export async function uploadBase64(bucket, path, base64String, mimeType) {
  const base64Data = base64String.split(',')[1]
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })
  return await uploadFile(bucket, path, blob)
}

// ── GUEST REVIEWS ─────────────────────────────────────────────────────────────

export async function saveGuestReview(review) {
  const { data, error } = await supabase
    .from('jobs')
    .update({ guest_rating: review.rating, guest_review: review.comment })
    .eq('id', review.jobId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPropertyReviews(propertyId) {
  const { data, error } = await supabase
    .from('jobs')
    .select('guest_rating, guest_review, completed_at, cleaner_id')
    .eq('property_id', propertyId)
    .not('guest_rating', 'is', null)
    .order('completed_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── REAL-TIME SUBSCRIPTIONS ───────────────────────────────────────────────────

export function subscribeToJobUpdates(propertyId, callback) {
  return supabase
    .channel(`jobs:${propertyId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'jobs',
      filter: `property_id=eq.${propertyId}`
    }, payload => callback(payload))
    .subscribe()
}

export function subscribeToSlotUpdates(cleanerId, callback) {
  return supabase
    .channel(`slots:${cleanerId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'schedule_slots',
      filter: `cleaner_id=eq.${cleanerId}`
    }, payload => callback(payload))
    .subscribe()
}

// ── STORAGE UPLOAD ────────────────────────────────────────────────────────────

export async function uploadVideoToStorage(bucket, path, base64DataUrl, mimeType) {
  const base64Data = base64DataUrl.split(',')[1]
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType || 'video/mp4' })

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: mimeType || 'video/mp4'
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return publicUrl
}

export async function uploadImageToStorage(bucket, path, base64DataUrl) {
  const mimeMatch = base64DataUrl.match(/data:([^;]+);/)
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'

  const base64Data = base64DataUrl.split(',')[1]
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: mimeType
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return publicUrl
}

export function isStorageUrl(str) {
  return str && (str.startsWith('http://') || str.startsWith('https://'))
}

// ── STRIPE CONNECT ────────────────────────────────────────────────────────────

export async function createStripeConnectAccount({ userId, userType, email, name, businessName }) {
  const response = await fetch('/api/create-connect-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userType, email, name, businessName }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to create Stripe account')
  return data
}

export async function payCleanerStripe({ cleanerStripeAccountId, amountCents, jobId, propertyName, managerId }) {
  const response = await fetch('/api/pay-cleaner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cleanerStripeAccountId, amountCents, jobId, propertyName, managerId }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Payment failed')
  return data
}

export async function createStripeCheckoutSession({ managerId, managerEmail, managerName, businessName, plan, stripeCustomerId }) {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ managerId, managerEmail, managerName, businessName, plan, stripeCustomerId }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to create checkout session')
  return data
}

export async function getCleanersByInviteCode(inviteCode) {
  if (!inviteCode) return null
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, business_name, invite_code')
    .eq('role', 'manager')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single()
  if (error) return null
  return data
}

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────

// Save a Web Push subscription to Supabase for a user
export async function savePushSubscription(userId, subscription) {
  const { error } = await supabase
    .from('users')
    .update({ push_subscription: subscription })
    .eq('id', userId)
  if (error) throw error
}

// Send a push notification via Vercel API
export async function sendPushNotification({ userId, title, body, url }) {
  const response = await fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title, body, url }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Push failed')
  return data
}

// Subscribe user to Web Push, save to Supabase
export async function subscribeToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Not supported in this browser')
    return null
  }
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      await savePushSubscription(userId, existing.toJSON())
      return existing
    }
    // VAPID public key — must match VAPID_PUBLIC_KEY env var in Vercel
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.log('[Push] VITE_VAPID_PUBLIC_KEY not set — push skipped')
      return null
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
    await savePushSubscription(userId, sub.toJSON())
    return sub
  } catch (e) {
    console.error('[Push] Subscribe failed:', e.message)
    return null
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

// ── ICAL SYNC ─────────────────────────────────────────────────────────────────

// Fetch and parse an Airbnb/VRBO iCal feed via Vercel API
export async function syncICal(icalUrl) {
  const response = await fetch('/api/ical-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ icalUrl }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'iCal sync failed')
  return data // { bookings: [{checkIn, checkOut, cleanDate, summary, uid}], count }
}
