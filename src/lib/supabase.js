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

export async function signUp({ email, password, name, role, inviteCode, phone }) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password
  })
  if (authError) throw authError
  if (!authData.user) throw new Error('Sign up failed — no user returned')

  const userId = authData.user.id
  const avatarInitials = name.trim().split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase()

  // 2. Insert profile into users table
  const { error: profileError } = await supabase.from('users').insert({
    id: userId,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role,
    avatar: avatarInitials,
    phone: phone || null,
    invite_code: inviteCode || null,
    plan: role === 'manager' ? 'pro' : null,
    rating: 5.0,
    jobs_completed: 0,
    total_earned: 0,
    stripe_status: 'pending',
    joined_at: new Date().toISOString()
  })
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

export async function getCleanersByInviteCode(inviteCode) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('invite_code', inviteCode)
    .eq('role', 'manager')
    .single()
  if (error) return null
  return data
}

export async function getTeamCleaners(managerId) {
  // Get cleaners linked to this manager via property_cleaners
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'cleaner')
    .order('name')
  if (error) throw error
  return data || []
}

// ── PROPERTIES ────────────────────────────────────────────────────────────────

export async function getProperties(managerId) {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      tasks(*),
      rooms(*),
      inventory(*)
    `)
    .eq('manager_id', managerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createProperty(property) {
  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProperty(id, updates) {
  const { data, error } = await supabase
    .from('properties')
    .update(updates)
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
  // Get all jobs for properties owned by this manager
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
  // Convert base64 to blob for upload
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
