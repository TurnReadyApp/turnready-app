import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── AUTH ──────────────────────────────────────────────────────────────
export async function signUp(email, password, name, role, inviteCode) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error

  // Insert into users table
  const { error: profileError } = await supabase.from('users').insert({
    id: data.user.id,
    email,
    name,
    role,
    avatar: name.split(' ').map(n => n[0]).join('').toUpperCase(),
    invite_code: inviteCode || null,
    joined_at: new Date().toISOString()
  })
  if (profileError) throw profileError
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
  return data
}

// ── PROPERTIES ────────────────────────────────────────────────────────
export async function getProperties(managerId) {
  const { data, error } = await supabase
    .from('properties')
    .select(`*, tasks(*), rooms(*), inventory(*)`)
    .eq('manager_id', managerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createProperty(property) {
  const { data, error } = await supabase.from('properties').insert(property).select().single()
  if (error) throw error
  return data
}

export async function updateProperty(id, updates) {
  const { data, error } = await supabase.from('properties').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProperty(id) {
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) throw error
}

// ── JOBS ──────────────────────────────────────────────────────────────
export async function getJobs(filter = {}) {
  let query = supabase.from('jobs').select('*').order('created_at', { ascending: false })
  if (filter.cleanerId) query = query.eq('cleaner_id', filter.cleanerId)
  if (filter.propertyId) query = query.eq('property_id', filter.propertyId)
  if (filter.status) query = query.eq('status', filter.status)
  const { data, error } = await query
  if (error) throw error
  return data
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

// ── CLEANERS ──────────────────────────────────────────────────────────
export async function getCleaners() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'cleaner')
    .order('name')
  if (error) throw error
  return data
}

export async function getCleanerByInviteCode(code) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('invite_code', code)
    .eq('role', 'manager')
    .single()
  if (error) return null
  return data
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────
export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
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

// ── MESSAGES ──────────────────────────────────────────────────────────
export async function getMessages(userId, otherUserId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(from_id.eq.${userId},to_id.eq.${otherUserId}),and(from_id.eq.${otherUserId},to_id.eq.${userId})`)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function sendMessage(message) {
  const { data, error } = await supabase.from('messages').insert(message).select().single()
  if (error) throw error
  return data
}

// ── FILE STORAGE ──────────────────────────────────────────────────────
export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}

// ── SCHEDULE SLOTS ────────────────────────────────────────────────────
export async function getSlots(propertyId) {
  const { data, error } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('property_id', propertyId)
    .order('date', { ascending: true })
  if (error) throw error
  return data
}

export async function createSlot(slot) {
  const { data, error } = await supabase.from('schedule_slots').insert(slot).select().single()
  if (error) throw error
  return data
}

export async function updateSlot(id, updates) {
  const { data, error } = await supabase.from('schedule_slots').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
